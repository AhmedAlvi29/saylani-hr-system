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

export const getAdminDashboardMetrics = async (companyId?: string) => {
  const currentYear = new Date().getFullYear();
  const cFilter = companyId ? { companyId } : {};

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  // Run all primary queries in parallel instead of 15 sequential database calls
  const [activeEmployees, exitedThisYear, departments, latestRun, recentAuditLogs] = await Promise.all([
    Employee.find({
      ...cFilter,
      employmentStatus: { $in: ['active', 'probation'] },
    })
      .select('departmentId grossSalary gender joiningDate')
      .lean(),

    Employee.countDocuments({
      ...cFilter,
      employmentStatus: 'leaver',
      exitDate: { $gte: new Date(`${currentYear}-01-01`) },
    }),

    Department.find({ ...cFilter, isActive: true }).select('name code').lean(),

    PayrollRun.findOne(cFilter).sort({ status: -1, month: -1 }).select('totalGross').lean(),

    AuditLog.find(cFilter).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const activeCount = activeEmployees.length;
  const avgHeadcount = Math.max(1, activeCount + exitedThisYear / 2);
  const attritionRate = Math.round((exitedThisYear / avgHeadcount) * 100 * 10) / 10;
  const totalPayrollCost = latestRun?.totalGross || 0;
  const avgSalary = activeCount > 0 ? Math.round(totalPayrollCost / activeCount) : 0;

  // In-memory department & demographic aggregation (<1ms)
  const deptCountMap = new Map<string, number>();
  const deptGrossMap = new Map<string, number>();

  let maleCount = 0;
  let femaleCount = 0;
  let under1Year = 0;
  let oneToThreeYears = 0;
  let overThreeYears = 0;

  for (const emp of activeEmployees) {
    const dId = emp.departmentId ? emp.departmentId.toString() : '';
    if (dId) {
      deptCountMap.set(dId, (deptCountMap.get(dId) || 0) + 1);
      deptGrossMap.set(dId, (deptGrossMap.get(dId) || 0) + (emp.grossSalary || 0));
    }

    if (emp.gender === 'male') maleCount++;
    else if (emp.gender === 'female') femaleCount++;

    if (emp.joiningDate) {
      const jDate = new Date(emp.joiningDate);
      if (jDate > oneYearAgo) under1Year++;
      else if (jDate > threeYearsAgo) oneToThreeYears++;
      else overThreeYears++;
    }
  }

  const otherGenderCount = activeCount - maleCount - femaleCount;

  const deptHeadcounts = departments.map((dept) => ({
    department: dept.name,
    code: dept.code,
    count: deptCountMap.get((dept as any)._id.toString()) || 0,
  }));

  const deptPayroll = departments.map((dept) => ({
    department: dept.name,
    cost: deptGrossMap.get((dept as any)._id.toString()) || 0,
  }));

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

export const getHrDashboardMetrics = async (companyId?: string) => {
  const todayStr = getTodayDateString();
  const cFilter = companyId ? { companyId } : {};

  // Calculate 14-day start date for bulk range query (eliminating 28 sequential queries)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 13);
  const startDate14 = pastDate.toISOString().split('T')[0];

  const monthStart = `${todayStr.substring(0, 7)}-01`;
  const leaveMatch: any = { status: 'approved' };
  if (companyId) leaveMatch.companyId = companyId;
  const lateMatch: any = { date: { $gte: monthStart, $lte: todayStr }, status: 'late' };
  if (companyId) lateMatch.companyId = companyId;

  // Run all primary queries concurrently in parallel
  const [
    activeCount,
    todayAttendance,
    onLeaveToday,
    pendingLeaves,
    pendingCorrections,
    fourteenDayAttendance,
    fourteenDayLeaves,
    departments,
    leavesByType,
    lateAgg,
  ] = await Promise.all([
    Employee.countDocuments({ ...cFilter, employmentStatus: { $in: ['active', 'probation'] } }),
    Attendance.find({ ...cFilter, date: todayStr }).select('status').lean(),
    LeaveRequest.countDocuments({ ...cFilter, status: 'approved', startDate: { $lte: todayStr }, endDate: { $gte: todayStr } }),
    LeaveRequest.countDocuments({ ...cFilter, status: 'pending' }),
    Attendance.countDocuments({ ...cFilter, 'correction.status': 'pending' }),
    Attendance.find({ ...cFilter, date: { $gte: startDate14, $lte: todayStr } }).select('date status').lean(),
    LeaveRequest.find({ ...cFilter, status: 'approved', startDate: { $lte: todayStr }, endDate: { $gte: startDate14 } }).select('startDate endDate').lean(),
    Department.find({ ...cFilter, isActive: true }).select('name code').lean(),
    LeaveRequest.aggregate([
      { $match: leaveMatch },
      { $group: { _id: '$leaveType', totalDays: { $sum: '$workingDays' }, count: { $sum: 1 } } },
    ]),
    Attendance.aggregate([
      { $match: lateMatch },
      { $group: { _id: '$employeeId', lateCount: { $sum: 1 }, totalLateMinutes: { $sum: '$lateMinutes' } } },
      { $sort: { lateCount: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const presentToday = todayAttendance.filter((a) => a.status === 'present').length;
  const lateToday = todayAttendance.filter((a) => a.status === 'late').length;
  const halfDayToday = todayAttendance.filter((a) => a.status === 'half_day').length;
  const totalPendingApprovals = pendingLeaves + pendingCorrections;

  // Compute 14-day trend in memory in < 1ms
  const attMapByDate = new Map<string, { present: number; late: number; halfDay: number }>();
  for (const r of fourteenDayAttendance) {
    if (!attMapByDate.has(r.date)) {
      attMapByDate.set(r.date, { present: 0, late: 0, halfDay: 0 });
    }
    const bucket = attMapByDate.get(r.date)!;
    if (r.status === 'present') bucket.present++;
    else if (r.status === 'late') bucket.late++;
    else if (r.status === 'half_day') bucket.halfDay++;
  }

  const trendData: any[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const bucket = attMapByDate.get(dateStr) || { present: 0, late: 0, halfDay: 0 };
    const leaveCount = fourteenDayLeaves.filter((l) => l.startDate <= dateStr && l.endDate >= dateStr).length;

    trendData.push({
      date: dateStr.substring(5),
      present: bucket.present,
      late: bucket.late,
      halfDay: bucket.halfDay,
      onLeave: leaveCount,
      total: bucket.present + bucket.late + bucket.halfDay,
    });
  }

  const absenteeismByDept = await Promise.all(
    departments.map(async (dept) => {
      const empCount = await Employee.countDocuments({
        ...cFilter,
        departmentId: dept._id,
        employmentStatus: { $in: ['active', 'probation'] },
      });
      return {
        department: dept.name,
        code: dept.code,
        employees: empCount,
      };
    })
  );

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

export const getEmployeeDashboardMetrics = async (employeeId: string, companyId?: string) => {
  const todayStr = getTodayDateString();
  const currentYear = new Date().getFullYear();

  // Working hours this week vs 40 hours target
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const mondayStr = monday.toISOString().split('T')[0];
  const monthStart = `${todayStr.substring(0, 7)}-01`;

  const annFilter: any = { isActive: true };
  if (companyId) annFilter.companyId = companyId;

  // Run all independent queries in parallel
  const [todayRecord, weekRecords, lateCountMonth, rawLeaveBalance, lastPayslip, announcements] = await Promise.all([
    Attendance.findOne({ employeeId, date: todayStr }).lean(),
    Attendance.find({ employeeId, date: { $gte: mondayStr, $lte: todayStr } }).select('workingHours').lean(),
    Attendance.countDocuments({ employeeId, date: { $gte: monthStart, $lte: todayStr }, status: 'late' }),
    LeaveBalance.findOne({ employeeId, year: currentYear }).lean(),
    Payslip.findOne({ employeeId, isLocked: true }).sort({ month: -1 }).lean(),
    Announcement.find(annFilter).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const hoursThisWeek = weekRecords.reduce((acc, curr) => acc + (curr.workingHours || 0), 0);

  let leaveBalance: any = rawLeaveBalance;
  if (!leaveBalance) {
    const emp = await Employee.findById(employeeId).select('companyId').lean();
    leaveBalance = await LeaveBalance.create({
      companyId: companyId || emp?.companyId,
      employeeId,
      year: currentYear,
      annualQuota: 14,
      sickQuota: 8,
      casualQuota: 10,
    });
  }

  return {
    todayAttendance: todayRecord,
    workingHoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
    weeklyTargetHours: 40,
    lateCountThisMonth: lateCountMonth,
    leaveBalances: {
      annual: {
        total: leaveBalance.annualQuota,
        used: leaveBalance.annualUsed || 0,
        remaining: Math.max(0, leaveBalance.annualQuota - (leaveBalance.annualUsed || 0)),
      },
      sick: {
        total: leaveBalance.sickQuota,
        used: leaveBalance.sickUsed || 0,
        remaining: Math.max(0, leaveBalance.sickQuota - (leaveBalance.sickUsed || 0)),
      },
      casual: {
        total: leaveBalance.casualQuota,
        used: leaveBalance.casualUsed || 0,
        remaining: Math.max(0, leaveBalance.casualQuota - (leaveBalance.casualUsed || 0)),
      },
      unpaid: {
        used: leaveBalance.unpaidUsed || 0,
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
