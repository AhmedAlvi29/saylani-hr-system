export type UserRole = 'admin' | 'hr' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  companyId?: string;
  companyName?: string;
  mustChangePassword?: boolean;
}

export interface Company {
  _id: string;
  name: string;
  code?: string;
  email?: string;
  address?: string;
  phone?: string;
  timezone: string;
  officeStartTime: string;
  graceMinutes: number;
  halfDayThresholdHours: number;
  weekendDays: number[];
  officeLocation?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  isSetupComplete: boolean;
}

export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface Designation {
  _id: string;
  title: string;
  departmentId: Department | string;
  grade?: string;
  isActive: boolean;
}

export interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone?: string;
  address?: string;
  departmentId: Department;
  designationId?: Designation;
  joiningDate: string;
  exitDate?: string;
  employmentStatus: 'active' | 'probation' | 'leaver' | 'inactive';
  gender: 'male' | 'female' | 'other';
  basicSalary: number;
  hra: number;
  medicalAllowance: number;
  grossSalary: number;
  userId?: any;
}

export interface AttendanceRecord {
  _id: string;
  employeeId: any;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'present' | 'late' | 'half_day' | 'absent' | 'missing_checkout';
  workingHours: number;
  isLate: boolean;
  lateMinutes: number;
  checkInSource: 'web' | 'camera';
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    distanceMeters?: number;
    isWithinGeofence?: boolean;
  };
  faceVerified?: boolean;
  notes?: string;
  correction?: {
    status: 'none' | 'pending' | 'approved' | 'rejected';
    requestedCheckIn?: string;
    requestedCheckOut?: string;
    reason?: string;
    reviewerComment?: string;
  };
}

export interface LeaveRequestRecord {
  _id: string;
  employeeId: any;
  leaveType: 'annual' | 'sick' | 'casual' | 'unpaid';
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedBy?: any;
  reviewerComment?: string;
  createdAt: string;
}

export interface LeaveBalanceData {
  annualQuota: number;
  annualUsed: number;
  sickQuota: number;
  sickUsed: number;
  casualQuota: number;
  casualUsed: number;
  unpaidUsed: number;
}

export interface PayrollRunRecord {
  _id: string;
  month: string;
  year: number;
  workingDays: number;
  status: 'draft' | 'finalized';
  totalGross: number;
  totalDeductions: number;
  totalTax: number;
  totalNet: number;
  employeeCount: number;
  generatedBy?: any;
  finalizedBy?: any;
  finalizedAt?: string;
  createdAt: string;
}

export interface PayslipRecord {
  _id: string;
  payrollRunId: string;
  employeeId: any;
  month: string;
  basicSalary: number;
  hra: number;
  medicalAllowance: number;
  grossSalary: number;
  prorationFactor: number;
  proratedGross: number;
  dailyRate: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  halfDays: number;
  lateDays: number;
  latePenaltyDays: number;
  absentDeduction: number;
  unpaidDeduction: number;
  halfDayDeduction: number;
  lateDeduction: number;
  totalDeductions: number;
  annualGross: number;
  annualTax: number;
  monthlyTax: number;
  netSalary: number;
  isLocked: boolean;
}

export interface AnnouncementRecord {
  _id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important';
  authorName: string;
  createdAt: string;
}

export interface NotificationRecord {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLogRecord {
  _id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  beforeJson?: any;
  afterJson?: any;
  ipAddress?: string;
  createdAt: string;
}
