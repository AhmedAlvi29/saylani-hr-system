import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { LeaveRequest } from '../models/LeaveRequest';
import {
  applyForLeave,
  reviewLeaveRequest,
  cancelLeaveRequest,
  getOrCreateLeaveBalance,
  calculateWorkingDays,
} from '../services/leaveService';
import { authenticate } from '../middleware/auth';
import { requireRole, enforceDataScope } from '../middleware/rbac';
import { logAudit } from '../middleware/audit';

const router = Router();

// Calculate Working Days preview (helper for UI form)
router.get('/leaves/calculate-days', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      res.status(400).json({ success: false, message: 'startDate and endDate are required.' });
      return;
    }
    const result = await calculateWorkingDays(startDate as string, endDate as string, req.user?.companyId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Apply for Leave
const applyLeaveSchema = z.object({
  leaveType: z.enum(['annual', 'sick', 'casual', 'unpaid']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  reason: z.string().min(3, 'Please provide a reason for the leave application'),
});

router.post('/leaves/apply', authenticate, async (req: Request, res: Response, next) => {
  try {
    const employeeId = req.user?.employeeId || req.body.employeeId;
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'No employee record associated with this account.' });
      return;
    }

    const data = applyLeaveSchema.parse(req.body);

    const request = await applyForLeave({
      employeeId,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
      companyId: req.user?.companyId,
    });

    await logAudit(req, {
      action: 'APPLY_LEAVE',
      entity: 'LeaveRequest',
      entityId: request._id.toString(),
      details: `Applied for ${data.leaveType} leave from ${data.startDate} to ${data.endDate} (${request.workingDays} days). Reason: "${data.reason}"`,
      afterJson: request.toObject(),
    });

    res.status(201).json({
      success: true,
      message: `Leave application for ${request.workingDays} working days submitted for HR approval.`,
      data: request,
    });
  } catch (error) {
    next(error);
  }
});

// Get My Leave History
router.get('/leaves/my-history', authenticate, async (req: Request, res: Response, next) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      res.json({ success: true, data: [] });
      return;
    }

    const filter: any = { employeeId };
    if (req.user?.companyId) filter.companyId = req.user.companyId;

    const requests = await LeaveRequest.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
});

// Get Leave Balance
router.get('/leaves/balance', authenticate, enforceDataScope, async (req: Request, res: Response, next) => {
  try {
    const employeeId = req.user?.role === 'employee' ? req.user.employeeId : req.query.employeeId || req.user?.employeeId;
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'Employee ID is required.' });
      return;
    }

    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const balance = await getOrCreateLeaveBalance(employeeId as string, year, req.user?.companyId);

    res.json({
      success: true,
      data: {
        balance,
        available: {
          annual: Math.max(0, balance.annualQuota - balance.annualUsed),
          sick: Math.max(0, balance.sickQuota - balance.sickUsed),
          casual: Math.max(0, balance.casualQuota - balance.casualUsed),
          unpaidUsed: balance.unpaidUsed,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Review Inbox: List All Leave Requests (HR & Admin)
router.get('/leaves/requests', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const { status, leaveType } = req.query;
    const filter: any = {};
    if (req.user?.companyId) filter.companyId = req.user.companyId;
    if (status) filter.status = status;
    if (leaveType) filter.leaveType = leaveType;

    const requests = await LeaveRequest.find(filter)
      .populate('employeeId', 'firstName lastName employeeCode departmentId')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
});

// Review Leave Request (Approve or Reject by HR / Admin)
const reviewLeaveSchema = z.object({
  action: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
});

router.post('/leaves/requests/:id/review', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const { action, comment } = reviewLeaveSchema.parse(req.body);

    const request = await reviewLeaveRequest({
      requestId: req.params.id,
      reviewerId: req.user!.id,
      action,
      comment,
    });

    await logAudit(req, {
      action: `REVIEW_LEAVE_${action.toUpperCase()}`,
      entity: 'LeaveRequest',
      entityId: request._id.toString(),
      details: `Leave request for ${request.startDate} to ${request.endDate} was ${action}. Comment: "${comment || 'None'}"`,
    });

    res.json({
      success: true,
      message: `Leave request has been ${action}.`,
      data: request,
    });
  } catch (error) {
    next(error);
  }
});

// Cancel Leave Request (Employee)
router.post('/leaves/requests/:id/cancel', authenticate, async (req: Request, res: Response, next) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'No employee record associated with this account.' });
      return;
    }

    const request = await cancelLeaveRequest(req.params.id, employeeId);

    await logAudit(req, {
      action: 'CANCEL_LEAVE_REQUEST',
      entity: 'LeaveRequest',
      entityId: request._id.toString(),
      details: `Employee cancelled leave request for ${request.startDate} to ${request.endDate}`,
    });

    res.json({
      success: true,
      message: 'Leave request has been cancelled.',
      data: request,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
