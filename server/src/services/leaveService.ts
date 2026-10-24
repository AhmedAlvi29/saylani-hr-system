import { LeaveRequest, ILeaveRequest, LeaveType } from '../models/LeaveRequest';
import { LeaveBalance, ILeaveBalance } from '../models/LeaveBalance';
import { Holiday } from '../models/Holiday';
import { Company } from '../models/Company';
import { Notification } from '../models/Notification';
import { Employee } from '../models/Employee';

export const getOrCreateLeaveBalance = async (
  employeeId: string,
  year: number = new Date().getFullYear()
): Promise<ILeaveBalance> => {
  let balance = await LeaveBalance.findOne({ employeeId, year });
  if (!balance) {
    balance = await LeaveBalance.create({
      employeeId,
      year,
      annualQuota: 14,
      sickQuota: 8,
      casualQuota: 10,
      annualUsed: 0,
      sickUsed: 0,
      casualUsed: 0,
      unpaidUsed: 0,
    });
  }
  return balance;
};

// Calculate working days between startDate and endDate, excluding weekends and public holidays
export const calculateWorkingDays = async (
  startDateStr: string,
  endDateStr: string
): Promise<{ workingDays: number; holidaysEncountered: string[]; weekendsEncountered: number }> => {
  const company = await Company.findOne();
  const weekendDays = company?.weekendDays || [0, 6]; // 0 = Sun, 6 = Sat

  // Fetch all public holidays between start and end date
  const holidays = await Holiday.find({
    date: { $gte: startDateStr, $lte: endDateStr },
  }).lean();
  const holidayDateSet = new Set(holidays.map((h) => h.date));

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (start > end) {
    const error: any = new Error('Start date cannot be after end date.');
    error.statusCode = 400;
    throw error;
  }

  let workingDays = 0;
  let weekendsEncountered = 0;
  const holidaysEncountered: string[] = [];

  const curr = new Date(start);
  while (curr <= end) {
    const dayOfWeek = curr.getDay();
    const currStr = curr.toISOString().split('T')[0];

    if (weekendDays.includes(dayOfWeek)) {
      weekendsEncountered++;
    } else if (holidayDateSet.has(currStr)) {
      holidaysEncountered.push(currStr);
    } else {
      workingDays++;
    }

    curr.setDate(curr.getDate() + 1);
  }

  return { workingDays, holidaysEncountered, weekendsEncountered };
};

export const applyForLeave = async (params: {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}) => {
  // 1. Calculate working days
  const { workingDays } = await calculateWorkingDays(params.startDate, params.endDate);
  if (workingDays <= 0) {
    const error: any = new Error(
      'The selected date range contains only weekends or public holidays (0 working days).'
    );
    error.statusCode = 422;
    throw error;
  }

  // 2. Prevent overlapping leaves
  const existingOverlap = await LeaveRequest.findOne({
    employeeId: params.employeeId,
    status: { $in: ['pending', 'approved'] },
    $or: [
      { startDate: { $lte: params.endDate }, endDate: { $gte: params.startDate } },
    ],
  });

  if (existingOverlap) {
    const error: any = new Error(
      `Overlapping leave request detected: You already have a ${existingOverlap.status} request from ${existingOverlap.startDate} to ${existingOverlap.endDate}.`
    );
    error.statusCode = 422;
    throw error;
  }

  // 3. Balance verification
  const year = new Date(params.startDate).getFullYear();
  const balance = await getOrCreateLeaveBalance(params.employeeId, year);

  if (params.leaveType !== 'unpaid') {
    let availableQuota = 0;
    if (params.leaveType === 'annual') {
      availableQuota = balance.annualQuota - balance.annualUsed;
    } else if (params.leaveType === 'sick') {
      availableQuota = balance.sickQuota - balance.sickUsed;
    } else if (params.leaveType === 'casual') {
      availableQuota = balance.casualQuota - balance.casualUsed;
    }

    if (workingDays > availableQuota) {
      const error: any = new Error(
        `Insufficient ${params.leaveType} leave balance. Available: ${availableQuota} days, Requested: ${workingDays} days.`
      );
      error.statusCode = 422;
      throw error;
    }
  }

  // 4. Create request
  const request = await LeaveRequest.create({
    employeeId: params.employeeId,
    leaveType: params.leaveType,
    startDate: params.startDate,
    endDate: params.endDate,
    workingDays,
    reason: params.reason,
    status: 'pending',
  });

  return request;
};

export const reviewLeaveRequest = async (params: {
  requestId: string;
  reviewerId: string;
  action: 'approved' | 'rejected';
  comment?: string;
}) => {
  const request = await LeaveRequest.findById(params.requestId);
  if (!request) {
    const error: any = new Error('Leave request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (request.status !== 'pending') {
    const error: any = new Error(`Leave request has already been ${request.status}.`);
    error.statusCode = 400;
    throw error;
  }

  request.status = params.action;
  request.reviewerComment = params.comment;
  request.reviewedBy = params.reviewerId as any;
  request.reviewedAt = new Date();

  // If approved, update LeaveBalance
  if (params.action === 'approved') {
    const year = new Date(request.startDate).getFullYear();
    const balance = await getOrCreateLeaveBalance(request.employeeId.toString(), year);

    if (request.leaveType === 'annual') {
      balance.annualUsed += request.workingDays;
    } else if (request.leaveType === 'sick') {
      balance.sickUsed += request.workingDays;
    } else if (request.leaveType === 'casual') {
      balance.casualUsed += request.workingDays;
    } else if (request.leaveType === 'unpaid') {
      balance.unpaidUsed += request.workingDays;
    }
    await balance.save();
  }

  await request.save();

  // Send in-app notification to employee's user account
  const employee = await Employee.findById(request.employeeId);
  if (employee && employee.userId) {
    await Notification.create({
      userId: employee.userId,
      title: `Leave Request ${params.action === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your ${request.leaveType} leave request for ${request.startDate} to ${request.endDate} (${request.workingDays} working days) has been ${params.action}. ${params.comment ? `Comment: "${params.comment}"` : ''}`,
      type: 'leave',
      link: '/leaves',
    });
  }

  return request;
};

export const cancelLeaveRequest = async (requestId: string, employeeId: string) => {
  const request = await LeaveRequest.findOne({ _id: requestId, employeeId });
  if (!request) {
    const error: any = new Error('Leave request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (request.status === 'cancelled') {
    const error: any = new Error('Leave request is already cancelled.');
    error.statusCode = 400;
    throw error;
  }

  if (request.status === 'approved') {
    // Revert balance
    const year = new Date(request.startDate).getFullYear();
    const balance = await getOrCreateLeaveBalance(employeeId, year);
    if (request.leaveType === 'annual') {
      balance.annualUsed = Math.max(0, balance.annualUsed - request.workingDays);
    } else if (request.leaveType === 'sick') {
      balance.sickUsed = Math.max(0, balance.sickUsed - request.workingDays);
    } else if (request.leaveType === 'casual') {
      balance.casualUsed = Math.max(0, balance.casualUsed - request.workingDays);
    } else if (request.leaveType === 'unpaid') {
      balance.unpaidUsed = Math.max(0, balance.unpaidUsed - request.workingDays);
    }
    await balance.save();
  }

  request.status = 'cancelled';
  await request.save();
  return request;
};
