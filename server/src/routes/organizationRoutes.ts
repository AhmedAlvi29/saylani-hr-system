import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Company } from '../models/Company';
import { Department } from '../models/Department';
import { Designation } from '../models/Designation';
import { Holiday } from '../models/Holiday';
import { User } from '../models/User';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { logAudit } from '../middleware/audit';
import { hashPassword } from '../services/authService';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(apiLimiter);

// Company Settings
router.get('/org/settings', authenticate, async (req: Request, res: Response, next) => {
  try {
    const company = req.user?.companyId ? await Company.findById(req.user.companyId) : await Company.findOne();
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
});

const updateSettingsSchema = z.object({
  name: z.string().min(2).optional(),
  officeStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm').optional(),
  graceMinutes: z.number().min(0).max(60).optional(),
  halfDayThresholdHours: z.number().min(1).max(12).optional(),
  weekendDays: z.array(z.number()).optional(),
  officeLocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      radiusMeters: z.number().min(10),
    })
    .optional(),
});

router.put('/org/settings', authenticate, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const data = updateSettingsSchema.parse(req.body);
    const company = req.user?.companyId ? await Company.findById(req.user.companyId) : await Company.findOne();
    if (!company) {
      res.status(404).json({ success: false, message: 'Company settings not found.' });
      return;
    }

    const before = company.toObject();
    Object.assign(company, data);
    await company.save();

    await logAudit(req, {
      action: 'UPDATE_COMPANY_SETTINGS',
      entity: 'Company',
      entityId: company._id.toString(),
      details: 'Updated organization settings and timing configuration.',
      beforeJson: before,
      afterJson: company.toObject(),
    });

    res.json({ success: true, message: 'Company settings updated successfully.', data: company });
  } catch (error) {
    next(error);
  }
});

// Departments
router.get('/org/departments', authenticate, async (req: Request, res: Response, next) => {
  try {
    const filter = req.user?.companyId ? { companyId: req.user.companyId } : {};
    const departments = await Department.find(filter).sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
});

router.post('/org/departments', authenticate, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      code: z.string().min(2).max(10),
      description: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const department = await Department.create({
      ...data,
      companyId: req.user?.companyId,
    });

    await logAudit(req, {
      action: 'CREATE_DEPARTMENT',
      entity: 'Department',
      entityId: department._id.toString(),
      details: `Created department ${data.name} (${data.code})`,
      afterJson: department.toObject(),
    });

    res.status(201).json({ success: true, message: 'Department created successfully.', data: department });
  } catch (error) {
    next(error);
  }
});

// Designations
router.get('/org/designations', authenticate, async (req: Request, res: Response, next) => {
  try {
    const filter = req.user?.companyId ? { companyId: req.user.companyId } : {};
    const designations = await Designation.find(filter).populate('departmentId', 'name code').sort({ title: 1 });
    res.json({ success: true, data: designations });
  } catch (error) {
    next(error);
  }
});

router.post('/org/designations', authenticate, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const schema = z.object({
      title: z.string().min(2),
      departmentId: z.string(),
      grade: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const designation = await Designation.create({
      ...data,
      companyId: req.user?.companyId,
    });

    await logAudit(req, {
      action: 'CREATE_DESIGNATION',
      entity: 'Designation',
      entityId: designation._id.toString(),
      details: `Created designation ${data.title}`,
      afterJson: designation.toObject(),
    });

    res.status(201).json({ success: true, message: 'Designation created successfully.', data: designation });
  } catch (error) {
    next(error);
  }
});

// Holidays
router.get('/org/holidays', authenticate, async (req: Request, res: Response, next) => {
  try {
    const filter = req.user?.companyId ? { companyId: req.user.companyId } : {};
    const holidays = await Holiday.find(filter).sort({ date: 1 });
    res.json({ success: true, data: holidays });
  } catch (error) {
    next(error);
  }
});

router.post('/org/holidays', authenticate, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
      isRecurring: z.boolean().default(false),
      description: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const holiday = await Holiday.create({
      ...data,
      companyId: req.user?.companyId,
    });

    await logAudit(req, {
      action: 'CREATE_HOLIDAY',
      entity: 'Holiday',
      entityId: holiday._id.toString(),
      details: `Added public holiday ${data.name} on ${data.date}`,
      afterJson: holiday.toObject(),
    });

    res.status(201).json({ success: true, message: 'Public holiday added.', data: holiday });
  } catch (error) {
    next(error);
  }
});

router.delete('/org/holidays/:id', authenticate, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const id = String(req.params.id).trim();
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      res.status(400).json({ success: false, message: 'Invalid holiday ID format.' });
      return;
    }
    const filter: any = { _id: id };
    if (req.user?.companyId) filter.companyId = String(req.user.companyId);

    const holiday = await Holiday.findOneAndDelete(filter);
    if (!holiday) {
      res.status(404).json({ success: false, message: 'Holiday not found.' });
      return;
    }

    await logAudit(req, {
      action: 'DELETE_HOLIDAY',
      entity: 'Holiday',
      entityId: id,
      details: `Deleted holiday ${holiday.name}`,
    });

    res.json({ success: true, message: 'Holiday removed.' });
  } catch (error) {
    next(error);
  }
});

// System Users Management (Admin creates HR logins, resets passwords, deactivates)
router.get('/org/users', authenticate, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const filter = req.user?.companyId ? { companyId: req.user.companyId } : {};
    const users = await User.find(filter).populate('employeeId', 'employeeCode firstName lastName').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

router.post('/org/users', authenticate, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['hr', 'admin']),
    });
    const data = schema.parse(req.body);

    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      res.status(409).json({ success: false, message: 'A user with this email already exists.' });
      return;
    }

    const passwordHash = await hashPassword(data.password);
    const user = await User.create({
      companyId: req.user?.companyId,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      mustChangePassword: true,
      isActive: true,
    });

    await logAudit(req, {
      action: 'CREATE_USER_LOGIN',
      entity: 'User',
      entityId: user._id.toString(),
      details: `Admin created ${data.role.toUpperCase()} account for ${data.email}`,
    });

    res.status(201).json({
      success: true,
      message: `${data.role.toUpperCase()} account created successfully.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/org/users/:id/toggle', authenticate, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const id = String(req.params.id).trim();
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      res.status(400).json({ success: false, message: 'Invalid user ID format.' });
      return;
    }
    const filter: any = { _id: id };
    if (req.user?.companyId) filter.companyId = String(req.user.companyId);

    const user = await User.findOne(filter);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    user.isActive = !user.isActive;
    await user.save();

    await logAudit(req, {
      action: 'TOGGLE_USER_STATUS',
      entity: 'User',
      entityId: user._id.toString(),
      details: `User ${user.email} marked as ${user.isActive ? 'active' : 'inactive'}.`,
    });

    res.json({ success: true, message: `User account is now ${user.isActive ? 'active' : 'inactive'}.`, data: user });
  } catch (error) {
    next(error);
  }
});

router.post('/org/users/:id/reset-password', authenticate, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const schema = z.object({
      newPassword: z.string().min(6),
    });
    const { newPassword } = schema.parse(req.body);

    const id = String(req.params.id).trim();
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      res.status(400).json({ success: false, message: 'Invalid user ID format.' });
      return;
    }
    const filter: any = { _id: id };
    if (req.user?.companyId) filter.companyId = String(req.user.companyId);

    const user = await User.findOne(filter);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = true;
    await user.save();

    await logAudit(req, {
      action: 'RESET_USER_PASSWORD',
      entity: 'User',
      entityId: user._id.toString(),
      details: `Admin reset password for user ${user.email}`,
    });

    res.json({ success: true, message: 'Password has been reset. User will be prompted to change it on next login.' });
  } catch (error) {
    next(error);
  }
});

export default router;
