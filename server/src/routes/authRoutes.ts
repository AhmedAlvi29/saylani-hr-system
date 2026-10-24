import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import {
  checkSetupStatus,
  initializeCompanyAndAdmin,
  comparePassword,
  hashPassword,
  generateToken,
} from '../services/authService';
import { authenticate } from '../middleware/auth';
import { logAudit } from '../middleware/audit';

const router = Router();

// Setup status check
router.get('/setup/status', async (req: Request, res: Response, next) => {
  try {
    const status = await checkSetupStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

// First-run company setup & Admin creation
const setupSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  officeStartTime: z.string().default('09:00'),
  graceMinutes: z.number().default(15),
  halfDayThresholdHours: z.number().default(5),
  weekendDays: z.array(z.number()).default([0, 6]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radiusMeters: z.number().optional(),
  adminName: z.string().min(2, 'Admin name is required'),
  adminEmail: z.string().email('Valid admin email is required'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

router.post('/setup/initialize', async (req: Request, res: Response, next) => {
  try {
    const data = setupSchema.parse(req.body);
    const result = await initializeCompanyAndAdmin(data);

    await logAudit(req, {
      action: 'ORGANIZATION_INITIALIZED',
      entity: 'Company',
      entityId: (result.company as any)._id?.toString(),
      details: `Initialized company ${data.companyName} with admin ${data.adminEmail}`,
    });

    res.status(201).json({
      success: true,
      message: 'Company and Admin account initialized successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/auth/login', async (req: Request, res: Response, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    await logAudit(req, {
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user._id.toString(),
      details: `User ${user.email} (${user.role}) logged in.`,
    });

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          mustChangePassword: user.mustChangePassword,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Change Password (e.g. required on first login with temporary password)
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

router.post('/auth/change-password', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }

    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
    await user.save();

    await logAudit(req, {
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: user._id.toString(),
      details: `User ${user.email} successfully updated password.`,
    });

    res.json({
      success: true,
      message: 'Password updated successfully.',
      data: { mustChangePassword: false },
    });
  } catch (error) {
    next(error);
  }
});

// Current User Info
router.get('/auth/me', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = await User.findById(req.user!.id).populate('employeeId');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
