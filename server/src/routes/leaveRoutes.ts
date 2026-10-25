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
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(apiLimiter);

// Calculate Working Days preview (helper for UI form)
const calculateDaysSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid startDate format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid endDate format'),
});

router.get('/leaves/calculate-days', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { startDate, endDate } = calculateDaysSchema.parse(req.query);
    const result = await calculateWorkingDays(startDate, endDate, req.user?.companyId ? String(req.user.companyId) : undefined);
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
const leaveBalanceQuerySchema = z.object({
  employeeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid employee ID').optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

router.get('/leaves/balance', authenticate, enforceDataScope, async (req: Request, res: Response, next) => {
  try {
    const query = leaveBalanceQuerySchema.parse(req.query);
    const candidateId = req.user?.role === 'employee' ? req.user.employeeId : (query.employeeId || req.user?.employeeId);

    if (!candidateId || !/^[0-9a-fA-F]{24}$/.test(String(candidateId))) {
      res.status(400).json({ success: false, message: 'Valid employee ID is required.' });
      return;
    }

    const employeeId = String(candidateId);
    const year = query.year || new Date().getFullYear();
    const balance = await getOrCreateLeaveBalance(employeeId, year, req.user?.companyId ? String(req.user.companyId) : undefined);

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
const leaveRequestsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  leaveType: z.enum(['annual', 'sick', 'casual', 'unpaid']).optional(),
});

router.get('/leaves/requests', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const query = leaveRequestsQuerySchema.parse(req.query);
    const filter: any = {};
    if (req.user?.companyId) filter.companyId = String(req.user.companyId);
    if (query.status) filter.status = String(query.status);
    if (query.leaveType) filter.leaveType = String(query.leaveType);

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
