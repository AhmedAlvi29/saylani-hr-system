import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Attendance } from '../models/Attendance';
import {
  checkInEmployee,
  checkOutEmployee,
  getDailyAttendanceBoard,
  requestCorrection,
  reviewCorrection,
  getTodayDateString,
} from '../services/attendanceService';
import { authenticate } from '../middleware/auth';
import { requireRole, enforceDataScope } from '../middleware/rbac';
import { logAudit } from '../middleware/audit';

const router = Router();

// Check-in (Web or Camera + Location)
router.post('/attendance/check-in', authenticate, async (req: Request, res: Response, next) => {
  try {
    const employeeId = req.user?.employeeId || req.body.employeeId;
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'No employee record associated with this user.' });
      return;
    }

    const { source = 'web', latitude, longitude, accuracy, faceVerified } = req.body;

    const record = await checkInEmployee({
      employeeId,
      source,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      accuracy: accuracy ? parseFloat(accuracy) : undefined,
      faceVerified: Boolean(faceVerified),
      companyId: req.user?.companyId,
    });

    await logAudit(req, {
      action: 'ATTENDANCE_CHECK_IN',
      entity: 'Attendance',
      entityId: record._id.toString(),
      details: `Checked in via ${source} at ${record.checkInTime}. Status: ${record.status}.`,
    });

    res.status(200).json({
      success: true,
      message: record.isLate ? `Checked in (Late by ${record.lateMinutes} mins).` : 'Checked in successfully on time!',
      data: record,
    });
  } catch (error) {
    next(error);
  }
});

// Check-out
router.post('/attendance/check-out', authenticate, async (req: Request, res: Response, next) => {
  try {
    const employeeId = req.user?.employeeId || req.body.employeeId;
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'No employee record associated with this user.' });
      return;
    }

    const { notes } = req.body;
    const record = await checkOutEmployee({
      employeeId,
      notes,
      companyId: req.user?.companyId,
    });

    await logAudit(req, {
      action: 'ATTENDANCE_CHECK_OUT',
      entity: 'Attendance',
      entityId: record._id.toString(),
      details: `Checked out at ${record.checkOutTime}. Working hours: ${record.workingHours}h. Status: ${record.status}.`,
    });

    res.json({
      success: true,
      message: `Checked out successfully! Total working time: ${record.workingHours} hours.`,
      data: record,
    });
  } catch (error) {
    next(error);
  }
});

// Get Today's Status for Logged-in User
router.get('/attendance/today', authenticate, async (req: Request, res: Response, next) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      res.json({ success: true, data: null });
      return;
    }

    const todayStr = getTodayDateString();
    const record = await Attendance.findOne({ employeeId, date: todayStr });

    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

// Daily Attendance Board (Admin & HR)
router.get('/attendance/board', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const { date, departmentId } = req.query;
    const board = await getDailyAttendanceBoard(date as string, departmentId as string, req.user?.companyId);
    res.json({ success: true, data: board });
  } catch (error) {
    next(error);
  }
});

// Attendance History (Calendar / List View)
router.get('/attendance/history', authenticate, enforceDataScope, async (req: Request, res: Response, next) => {
  try {
    const { employeeId, startDate, endDate, month } = req.query;

    const filter: any = {};
    if (req.user?.companyId) {
      filter.companyId = req.user.companyId;
    }

    if (req.user?.role === 'employee') {
      filter.employeeId = req.user.employeeId;
    } else if (employeeId) {
      filter.employeeId = employeeId;
    }

    if (month) {
      filter.date = { $regex: `^${month}` };
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const records = await Attendance.find(filter)
      .populate('employeeId', 'firstName lastName employeeCode')
      .sort({ date: -1 })
      .limit(200);

    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
});

// Request Attendance Correction (Employee)
const correctionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  requestedCheckIn: z.string().optional(),
  requestedCheckOut: z.string().optional(),
  reason: z.string().min(5, 'Please provide a detailed reason'),
});

router.post('/attendance/correction', authenticate, async (req: Request, res: Response, next) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'No employee record associated with this account.' });
      return;
    }

    const data = correctionSchema.parse(req.body);
    const record = await requestCorrection({
      employeeId,
      date: data.date,
      requestedCheckIn: data.requestedCheckIn ? new Date(data.requestedCheckIn) : undefined,
      requestedCheckOut: data.requestedCheckOut ? new Date(data.requestedCheckOut) : undefined,
      reason: data.reason,
    });

    await logAudit(req, {
      action: 'REQUEST_ATTENDANCE_CORRECTION',
      entity: 'Attendance',
      entityId: record._id.toString(),
      details: `Correction requested for date ${data.date}: "${data.reason}"`,
    });

    res.status(200).json({
      success: true,
      message: 'Attendance correction request submitted for HR review.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
});

// Pending Corrections List (Admin & HR)
router.get('/attendance/corrections', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const filter: any = { 'correction.status': 'pending' };
    if (req.user?.companyId) filter.companyId = req.user.companyId;

    const corrections = await Attendance.find(filter)
      .populate('employeeId', 'firstName lastName employeeCode departmentId')
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: corrections });
  } catch (error) {
    next(error);
  }
});

// Review Attendance Correction (HR or Admin)
router.post('/attendance/corrections/:id/review', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const schema = z.object({
      action: z.enum(['approved', 'rejected']),
      comment: z.string().optional(),
    });
    const { action, comment } = schema.parse(req.body);

    const record = await reviewCorrection({
      attendanceId: req.params.id,
      reviewerId: req.user!.id,
      action,
      comment,
    });

    await logAudit(req, {
      action: `REVIEW_ATTENDANCE_CORRECTION_${action.toUpperCase()}`,
      entity: 'Attendance',
      entityId: record._id.toString(),
      details: `Correction for date ${record.date} was ${action}. Comment: "${comment || 'None'}"`,
    });

    res.json({
      success: true,
      message: `Attendance correction has been ${action}.`,
      data: record,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
