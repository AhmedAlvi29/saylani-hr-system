import { Attendance, IAttendance, AttendanceStatus } from '../models/Attendance';
import { Company } from '../models/Company';
import { Employee } from '../models/Employee';
import { LeaveRequest } from '../models/LeaveRequest';
import { getDistance } from 'geolib';

// Format date as YYYY-MM-DD in local/server time
export const getTodayDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const checkInEmployee = async (params: {
  employeeId: string;
  source?: 'web' | 'camera';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  faceVerified?: boolean;
  companyId?: string;
}) => {
  const todayStr = getTodayDateString();
  const now = new Date();

  // 1. Check for duplicate check-in today
  const existingRecord = await Attendance.findOne({
    employeeId: params.employeeId,
    date: todayStr,
  });

  if (existingRecord && existingRecord.checkInTime) {
    const error: any = new Error('Employee has already checked in for today.');
    error.statusCode = 409;
    throw error;
  }

  // 2. Fetch employee & company settings for timing & geofence
  const employee = await Employee.findById(params.employeeId);
  const companyId = params.companyId || employee?.companyId?.toString();
  const company = companyId ? await Company.findById(companyId) : await Company.findOne();
  const officeStartTime = company?.officeStartTime || '09:00';
  const graceMinutes = company?.graceMinutes ?? 15;

  const [startHour, startMin] = officeStartTime.split(':').map(Number);
  const lateThresholdDate = new Date(now);
  lateThresholdDate.setHours(startHour, startMin + graceMinutes, 0, 0);

  const isLate = now.getTime() > lateThresholdDate.getTime();
  const lateMinutes = isLate
    ? Math.max(0, Math.floor((now.getTime() - lateThresholdDate.getTime()) / 60000))
    : 0;

  // 3. Geofence & Location evaluation
  let locationData: any = undefined;
  if (params.latitude !== undefined && params.longitude !== undefined) {
    let distanceMeters = 0;
    let isWithinGeofence = true;

    if (company?.officeLocation?.latitude && company?.officeLocation?.longitude) {
      distanceMeters = getDistance(
        { latitude: params.latitude, longitude: params.longitude },
        {
          latitude: company.officeLocation.latitude,
          longitude: company.officeLocation.longitude,
        }
      );
      const allowedRadius = company.officeLocation.radiusMeters || 150;
      isWithinGeofence = distanceMeters <= allowedRadius;

      // If camera attendance is used, enforce geofence rule
      if (params.source === 'camera' && !isWithinGeofence) {
        const error: any = new Error(
          `Location check failed. You are ${Math.round(distanceMeters)}m away from the office (allowed: ${allowedRadius}m).`
        );
        error.statusCode = 422;
        throw error;
      }

      if (params.source === 'camera' && params.accuracy && params.accuracy > 100) {
        const error: any = new Error(
          `GPS accuracy too low (${Math.round(params.accuracy)}m). Please ensure high accuracy GPS is enabled.`
        );
        error.statusCode = 422;
        throw error;
      }
    }

    locationData = {
      latitude: params.latitude,
      longitude: params.longitude,
      accuracy: params.accuracy,
      distanceMeters,
      isWithinGeofence,
    };
  }

  const initialStatus: AttendanceStatus = isLate ? 'late' : 'present';

  const attendance = await Attendance.create({
    companyId: company?._id || employee?.companyId,
    employeeId: params.employeeId,
    date: todayStr,
    checkInTime: now,
    status: initialStatus,
    isLate,
    lateMinutes,
    checkInSource: params.source || 'web',
    location: locationData,
    faceVerified: params.faceVerified || false,
    workingHours: 0,
  });

  return attendance;
};

export const checkOutEmployee = async (params: {
  employeeId: string;
  notes?: string;
  companyId?: string;
}) => {
  const todayStr = getTodayDateString();
  const now = new Date();

  const record = await Attendance.findOne({
    employeeId: params.employeeId,
    date: todayStr,
  });

  if (!record || !record.checkInTime) {
    const error: any = new Error('No check-in record found for today. You must check in before checking out.');
    error.statusCode = 400;
    throw error;
  }

  record.checkOutTime = now;
  if (params.notes) {
    record.notes = params.notes;
  }

  // Calculate working hours
  const diffMs = now.getTime() - record.checkInTime.getTime();
  const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  record.workingHours = hours;

  // Check half day threshold
  const compId = record.companyId || params.companyId;
  const company = compId ? await Company.findById(compId) : await Company.findOne();
  const halfDayThreshold = company?.halfDayThresholdHours ?? 5;

  if (hours < halfDayThreshold) {
    record.status = 'half_day';
  } else if (record.isLate) {
    record.status = 'late';
  } else {
    record.status = 'present';
  }

  await record.save();
  return record;
};

export const getDailyAttendanceBoard = async (dateStr?: string, departmentId?: string, companyId?: string) => {
  const targetDate = dateStr || getTodayDateString();

  // Find all active/probation employees
  const employeeFilter: any = {
    employmentStatus: { $in: ['active', 'probation'] },
  };
  if (companyId) {
    employeeFilter.companyId = companyId;
  }
  if (departmentId) {
    employeeFilter.departmentId = departmentId;
  }

  const employees = await Employee.find(employeeFilter)
    .populate('departmentId', 'name code')
    .populate('designationId', 'title')
    .lean();

  // Find all attendance records for targetDate
  const attFilter: any = { date: targetDate };
  if (companyId) attFilter.companyId = companyId;
  const attendanceRecords = await Attendance.find(attFilter).lean();
  const attendanceMap = new Map<string, any>();
  attendanceRecords.forEach((att) => {
    attendanceMap.set(att.employeeId.toString(), att);
  });

  // Find approved leaves covering targetDate
  const leaveFilter: any = {
    status: 'approved',
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate },
  };
  if (companyId) leaveFilter.companyId = companyId;
  const approvedLeaves = await LeaveRequest.find(leaveFilter).lean();
  const leaveMap = new Map<string, any>();
  approvedLeaves.forEach((leave) => {
    leaveMap.set(leave.employeeId.toString(), leave);
  });

  const board = employees.map((emp) => {
    const empId = emp._id.toString();
    const att = attendanceMap.get(empId);
    const leave = leaveMap.get(empId);

    if (att) {
      return {
        employee: emp,
        attendance: att,
        computedStatus: att.status,
        isOnLeave: false,
      };
    } else if (leave) {
      return {
        employee: emp,
        attendance: null,
        computedStatus: 'on_leave',
        isOnLeave: true,
        leaveDetails: {
          leaveType: leave.leaveType,
          reason: leave.reason,
        },
      };
    } else {
      return {
        employee: emp,
        attendance: null,
        computedStatus: 'absent',
        isOnLeave: false,
      };
    }
  });

  return {
    date: targetDate,
    totalEmployees: employees.length,
    presentCount: board.filter((b) => b.computedStatus === 'present').length,
    lateCount: board.filter((b) => b.computedStatus === 'late').length,
    halfDayCount: board.filter((b) => b.computedStatus === 'half_day').length,
    onLeaveCount: board.filter((b) => b.computedStatus === 'on_leave').length,
    absentCount: board.filter((b) => b.computedStatus === 'absent').length,
    records: board,
  };
};

export const requestCorrection = async (params: {
  employeeId: string;
  date: string;
  requestedCheckIn?: Date;
  requestedCheckOut?: Date;
  reason: string;
}) => {
  let record = await Attendance.findOne({
    employeeId: params.employeeId,
    date: params.date,
  });

  if (!record) {
    // Create placeholder attendance record if none exists
    const emp = await Employee.findById(params.employeeId);
    record = new Attendance({
      companyId: emp?.companyId,
      employeeId: params.employeeId,
      date: params.date,
      status: 'absent',
      checkInSource: 'web',
    });
  }

  record.correction = {
    status: 'pending',
    requestedCheckIn: params.requestedCheckIn,
    requestedCheckOut: params.requestedCheckOut,
    reason: params.reason,
  };

  await record.save();
  return record;
};

export const reviewCorrection = async (params: {
  attendanceId: string;
  reviewerId: string;
  action: 'approved' | 'rejected';
  comment?: string;
}) => {
  const record = await Attendance.findById(params.attendanceId);
  if (!record) {
    const error: any = new Error('Attendance record not found.');
    error.statusCode = 404;
    throw error;
  }

  if (record.correction.status !== 'pending') {
    const error: any = new Error('No pending correction request on this record.');
    error.statusCode = 400;
    throw error;
  }

  record.correction.status = params.action;
  record.correction.reviewerComment = params.comment;
  record.correction.reviewedBy = params.reviewerId as any;
  record.correction.reviewedAt = new Date();

  if (params.action === 'approved') {
    if (record.correction.requestedCheckIn) {
      record.checkInTime = record.correction.requestedCheckIn;
    }
    if (record.correction.requestedCheckOut) {
      record.checkOutTime = record.correction.requestedCheckOut;
    }

    if (record.checkInTime && record.checkOutTime) {
      const diffMs = record.checkOutTime.getTime() - record.checkInTime.getTime();
      const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      record.workingHours = hours;
      record.status = hours >= 5 ? 'present' : 'half_day';
    } else if (record.checkInTime) {
      record.status = 'present';
    }
  }

  await record.save();
  return record;
};
