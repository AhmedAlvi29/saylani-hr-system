import { Employee } from '../models/Employee';
import { Attendance } from '../models/Attendance';
import { LeaveRequest } from '../models/LeaveRequest';
import { LeaveBalance } from '../models/LeaveBalance';
import { PayrollRun } from '../models/PayrollRun';
import { Payslip } from '../models/Payslip';
import { Department } from '../models/Department';
import { AuditLog } from '../models/AuditLog';
import { Announcement } from '../models/Announcement';
import { getTodayDateString } from './attendanceService';

export const getAdminDashboardMetrics = async () => {
  const todayStr = getTodayDateString();
  const currentYear = new Date().getFullYear();

  // 1. Headcount & Attrition
  const activeCount = await Employee.countDocuments({ employmentStatus: { $in: ['active', 'probation'] } });
  const exitedThisYear = await Employee.countDocuments({
    employmentStatus: 'leaver',
    exitDate: { $gte: new Date(`${currentYear}-01-01`) },
  });
  const avgHeadcount = Math.max(1, activeCount + exitedThisYear / 2);
  const attritionRate = Math.round((exitedThisYear / avgHeadcount) * 100 * 10) / 10;

  // 2. Payroll Cost & Average Salary
  const latestFinalizedRun = await PayrollRun.findOne({ status: 'finalized' }).sort({ month: -1 });
  const latestAnyRun = latestFinalizedRun || (await PayrollRun.findOne().sort({ month: -1 }));

  const totalPayrollCost = latestAnyRun?.totalGross || 0;
  const avgSalary = activeCount > 0 ? Math.round(totalPayrollCost / activeCount) : 0;

  // 3. Headcount by Department
  const departments = await Department.find({ isActive: true }).lean();
  const deptHeadcounts = await Promise.all(
    departments.map(async (dept) => {
      const count = await Employee.countDocuments({
        departmentId: dept._id,
        employmentStatus: { $in: ['active', 'probation'] },
      });
      return {
        department: dept.name,
        code: dept.code,
        count,
      };
    })
  );

  // 4. Payroll cost by Department
  const deptPayroll = await Promise.all(
    departments.map(async (dept) => {
      const emps = await Employee.find({
        departmentId: dept._id,
        employmentStatus: { $in: ['active', 'probation'] },
      });
      const grossSum = emps.reduce((acc, curr) => acc + (curr.grossSalary || 0), 0);
      return {
        department: dept.name,
        cost: grossSum,
      };
    })
  );

  // 5. Gender & Tenure Breakdown
  const maleCount = await Employee.countDocuments({ gender: 'male', employmentStatus: { $in: ['active', 'probation'] } });
  const femaleCount = await Employee.countDocuments({ gender: 'female', employmentStatus: { $in: ['active', 'probation'] } });
  const otherGenderCount = activeCount - maleCount - femaleCount;

  // Tenure breakdown: < 1 yr, 1-3 yrs, 3+ yrs
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const under1Year = await Employee.countDocuments({
    joiningDate: { $gt: oneYearAgo },
    employmentStatus: { $in: ['active', 'probation'] },
  });
  const oneToThreeYears = await Employee.countDocuments({
    joiningDate: { $lte: oneYearAgo, $gt: threeYearsAgo },
    employmentStatus: { $in: ['active', 'probation'] },
  });
  const overThreeYears = await Employee.countDocuments({
    joiningDate: { $lte: threeYearsAgo },
    employmentStatus: { $in: ['active', 'probation'] },
  });

  // 6. Recent Audit Logs
  const recentAuditLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(10).lean();

  return {
    kpis: {
      headcount: activeCount,
      attritionRateYtd: attritionRate,
      payrollCost: totalPayrollCost,
      avgSalary,
      activeEmployees: activeCount,
      exitsThisYear: exitedThisYear,
    },
    charts: {
      headcountByDept: deptHeadcounts,
      payrollByDept: deptPayroll,
      genderDistribution: [
        { name: 'Male', value: maleCount },
        { name: 'Female', value: femaleCount },
        { name: 'Other', value: Math.max(0, otherGenderCount) },
      ],
      tenureDistribution: [
        { name: '< 1 Year', count: under1Year },
        { name: '1-3 Years', count: oneToThreeYears },
        { name: '3+ Years', count: overThreeYears },
      ],
    },
    auditFeed: recentAuditLogs,
  };
};

export const getHrDashboardMetrics = async () => {
  const todayStr = getTodayDateString();
  const currentYear = new Date().getFullYear();

  // 1. Headcount
  const activeCount = await Employee.countDocuments({ employmentStatus: { $in: ['active', 'probation'] } });

  // 2. Today's attendance numbers
  const todayAttendance = await Attendance.find({ date: todayStr });
  const presentToday = todayAttendance.filter((a) => a.status === 'present').length;
  const lateToday = todayAttendance.filter((a) => a.status === 'late').length;
  const halfDayToday = todayAttendance.filter((a) => a.status === 'half_day').length;

  // On leave today
  const onLeaveToday = await LeaveRequest.countDocuments({
    status: 'approved',
    startDate: { $lte: todayStr },
    endDate: { $gte: todayStr },
  });

  // Pending approvals
  const pendingLeaves = await LeaveRequest.countDocuments({ status: 'pending' });
  const pendingCorrections = await Attendance.countDocuments({ 'correction.status': 'pending' });
  const totalPendingApprovals = pendingLeaves + pendingCorrections;

  // 3. Attendance Trend (last 14 days)
  const trendData: any[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const records = await Attendance.find({ date: dateStr });
    const p = records.filter((r) => r.status === 'present').length;
    const l = records.filter((r) => r.status === 'late').length;
    const hd = records.filter((r) => r.status === 'half_day').length;
    const leave = await LeaveRequest.countDocuments({
      status: 'approved',
      startDate: { $lte: dateStr },
      endDate: { $gte: dateStr },
    });

    trendData.push({
      date: dateStr.substring(5), // MM-DD
      present: p,
      late: l,
      halfDay: hd,
      onLeave: leave,
      total: p + l + hd,
    });
  }

  // 4. Absenteeism by Department
  const departments = await Department.find({ isActive: true }).lean();
  const absenteeismByDept = await Promise.all(
    departments.map(async (dept) => {
      const empCount = await Employee.countDocuments({
        departmentId: dept._id,
        employmentStatus: { $in: ['active', 'probation'] },
      });
      // Absent estimate for demonstration: employees minus attendees
      return {
        department: dept.name,
        code: dept.code,
        employees: empCount,
      };
    })
  );

  // 5. Leave utilization by Type
  const leavesByType = await LeaveRequest.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: '$leaveType', totalDays: { $sum: '$workingDays' }, count: { $sum: 1 } } },
  ]);

  // 6. Top 5 late-comers this month
  const monthStart = `${todayStr.substring(0, 7)}-01`;
  const lateAgg = await Attendance.aggregate([
    { $match: { date: { $gte: monthStart, $lte: todayStr }, status: 'late' } },
    { $group: { _id: '$employeeId', lateCount: { $sum: 1 }, totalLateMinutes: { $sum: '$lateMinutes' } } },
    { $sort: { lateCount: -1 } },
    { $limit: 5 },
  ]);

  const topLateComers = await Promise.all(
    lateAgg.map(async (item) => {
      const emp = await Employee.findById(item._id).populate('departmentId', 'name code').lean();
      return {
        employeeId: item._id,
        name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        code: emp?.employeeCode,
        department: (emp?.departmentId as any)?.name,
        lateCount: item.lateCount,
        totalLateMinutes: item.totalLateMinutes,
      };
    })
  );

  return {
    kpis: {
      headcount: activeCount,
      presentToday,
      lateToday,
      halfDayToday,
      onLeaveToday,
      pendingApprovals: totalPendingApprovals,
      pendingLeaves,
      pendingCorrections,
    },
    charts: {
      attendanceTrend: trendData,
      absenteeismByDept,
      leaveByType: leavesByType.map((l) => ({ type: l._id, days: l.totalDays, count: l.count })),
      topLateComers,
    },
  };
};

export const getEmployeeDashboardMetrics = async (employeeId: string) => {
  const todayStr = getTodayDateString();
  const currentYear = new Date().getFullYear();

  // 1. Today's attendance
  const todayRecord = await Attendance.findOne({ employeeId, date: todayStr });

  // 2. Working hours this week vs 40 hours target
  // Find Monday of this week
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const mondayStr = monday.toISOString().split('T')[0];

  const weekRecords = await Attendance.find({
    employeeId,
    date: { $gte: mondayStr, $lte: todayStr },
  });

  const hoursThisWeek = weekRecords.reduce((acc, curr) => acc + (curr.workingHours || 0), 0);

  // 3. Late arrivals this month
  const monthStart = `${todayStr.substring(0, 7)}-01`;
  const lateCountMonth = await Attendance.countDocuments({
    employeeId,
    date: { $gte: monthStart, $lte: todayStr },
    status: 'late',
  });

  // 4. Leave Balance
  let leaveBalance = await LeaveBalance.findOne({ employeeId, year: currentYear });
  if (!leaveBalance) {
    leaveBalance = await LeaveBalance.create({
      employeeId,
      year: currentYear,
      annualQuota: 14,
      sickQuota: 8,
      casualQuota: 10,
    });
  }

  // 5. Last payslip
  const lastPayslip = await Payslip.findOne({ employeeId, isLocked: true })
    .sort({ month: -1 })
    .lean();

  // 6. Recent Active Announcements
  const announcements = await Announcement.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return {
    todayAttendance: todayRecord,
    workingHoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
    weeklyTargetHours: 40,
    lateCountThisMonth: lateCountMonth,
    leaveBalances: {
      annual: {
        total: leaveBalance.annualQuota,
        used: leaveBalance.annualUsed,
        remaining: Math.max(0, leaveBalance.annualQuota - leaveBalance.annualUsed),
      },
      sick: {
        total: leaveBalance.sickQuota,
        used: leaveBalance.sickUsed,
        remaining: Math.max(0, leaveBalance.sickQuota - leaveBalance.sickUsed),
      },
      casual: {
        total: leaveBalance.casualQuota,
        used: leaveBalance.casualUsed,
        remaining: Math.max(0, leaveBalance.casualQuota - leaveBalance.casualUsed),
      },
      unpaid: {
        used: leaveBalance.unpaidUsed,
      },
    },
    lastPayslip: lastPayslip
      ? {
          month: lastPayslip.month,
          netSalary: lastPayslip.netSalary,
          grossSalary: lastPayslip.grossSalary,
          payslipId: lastPayslip._id,
        }
      : null,
    announcements,
  };
};
