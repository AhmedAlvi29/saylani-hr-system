import { Employee, IEmployee } from '../models/Employee';
import { Attendance } from '../models/Attendance';
import { LeaveRequest } from '../models/LeaveRequest';
import { PayrollRun, IPayrollRun } from '../models/PayrollRun';
import { Payslip, IPayslip } from '../models/Payslip';
import { Holiday } from '../models/Holiday';
import { Company } from '../models/Company';
import { Notification } from '../models/Notification';

export const calculateAnnualTax = (annualGross: number): number => {
  if (annualGross <= 600000) {
    return 0;
  } else if (annualGross <= 1200000) {
    return (annualGross - 600000) * 0.05;
  } else if (annualGross <= 2400000) {
    return 30000 + (annualGross - 1200000) * 0.15;
  } else if (annualGross <= 3600000) {
    return 210000 + (annualGross - 2400000) * 0.25;
  } else {
    return 510000 + (annualGross - 3600000) * 0.35;
  }
};

// Calculate total working days in a given month (excluding weekends and public holidays)
export const getWorkingDaysInMonth = async (
  year: number,
  monthNumber: number // 1 to 12
): Promise<{ workingDays: number; totalDays: number; holidays: string[] }> => {
  const company = await Company.findOne();
  const weekendDays = company?.weekendDays || [0, 6];

  const totalDays = new Date(year, monthNumber, 0).getDate();
  const monthStr = String(monthNumber).padStart(2, '0');
  const startStr = `${year}-${monthStr}-01`;
  const endStr = `${year}-${monthStr}-${String(totalDays).padStart(2, '0')}`;

  const holidays = await Holiday.find({
    date: { $gte: startStr, $lte: endStr },
  }).lean();
  const holidaySet = new Set(holidays.map((h) => h.date));

  let workingDays = 0;
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, monthNumber - 1, day);
    const dateStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = d.getDay();

    if (!weekendDays.includes(dayOfWeek) && !holidaySet.has(dateStr)) {
      workingDays++;
    }
  }

  return { workingDays: Math.max(1, workingDays), totalDays, holidays: holidays.map((h) => h.date) };
};

export const generatePayrollDraft = async (
  monthStr: string, // "YYYY-MM"
  generatedByUserId: string
) => {
  const existingRun = await PayrollRun.findOne({ month: monthStr });
  if (existingRun && existingRun.status === 'finalized') {
    const error: any = new Error(
      `Payroll for ${monthStr} is already finalized and locked. It cannot be regenerated.`
    );
    error.statusCode = 400;
    throw error;
  }

  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(mStr, 10);

  const { workingDays: totalWorkingDays, totalDays } = await getWorkingDaysInMonth(year, monthNum);

  const employees = await Employee.find({
    employmentStatus: { $in: ['active', 'probation', 'leaver'] },
  });

  const payslipItems: any[] = [];
  let sumGross = 0;
  let sumDeductions = 0;
  let sumTax = 0;
  let sumNet = 0;

  const monthStartStr = `${monthStr}-01`;
  const monthEndStr = `${monthStr}-${String(totalDays).padStart(2, '0')}`;

  for (const emp of employees) {
    // 1. Calculate Proration if joined or exited mid-month
    let prorationFactor = 1.0;
    const joiningDate = new Date(emp.joiningDate);
    const monthStart = new Date(monthStartStr);
    const monthEnd = new Date(monthEndStr);

    if (joiningDate > monthEnd) {
      continue; // Not yet joined this month
    }

    if (joiningDate > monthStart) {
      // Calculate active working days from joining date to month end
      const activeStartStr = emp.joiningDate.toISOString().split('T')[0];
      const activeDaysCount = await getActiveWorkingDaysCount(activeStartStr, monthEndStr);
      prorationFactor = Math.min(1.0, activeDaysCount / totalWorkingDays);
    }

    const grossSalary = emp.grossSalary;
    const proratedGross = Math.round(grossSalary * prorationFactor);
    const dailyRate = Math.round((grossSalary / totalWorkingDays) * 100) / 100;

    // 2. Attendance & Late metrics for this month
    const attendanceRecords = await Attendance.find({
      employeeId: emp._id,
      date: { $gte: monthStartStr, $lte: monthEndStr },
    });

    let presentDays = 0;
    let lateDays = 0;
    let halfDays = 0;

    attendanceRecords.forEach((att) => {
      if (att.status === 'present') presentDays++;
      else if (att.status === 'late') {
        presentDays++;
        lateDays++;
      } else if (att.status === 'half_day') {
        halfDays++;
      }
    });

    // 3. Approved unpaid leave days
    const unpaidLeaves = await LeaveRequest.find({
      employeeId: emp._id,
      leaveType: 'unpaid',
      status: 'approved',
      startDate: { $lte: monthEndStr },
      endDate: { $gte: monthStartStr },
    });
    let unpaidLeaveDays = 0;
    unpaidLeaves.forEach((lv) => {
      unpaidLeaveDays += lv.workingDays;
    });

    // 4. Absent days: expected working days - present - on leave
    // For newly set up companies or days with no records:
    // If no attendance record exists on a working day and not on approved leave, count as absent
    const totalRecordedWorkDays = presentDays + halfDays;
    const effectiveWorkingDays = Math.round(totalWorkingDays * prorationFactor);
    const absentDays = Math.max(0, effectiveWorkingDays - totalRecordedWorkDays - unpaidLeaveDays);

    // 5. Late penalty: 3 lates = 0.5 day deduction
    const latePenaltyDays = Math.floor(lateDays / 3) * 0.5;

    // 6. Deductions calculations
    const absentDeduction = Math.round(absentDays * dailyRate);
    const unpaidDeduction = Math.round(unpaidLeaveDays * dailyRate);
    const halfDayDeduction = Math.round(halfDays * 0.5 * dailyRate);
    const lateDeduction = Math.round(latePenaltyDays * dailyRate);

    const totalDeductions = absentDeduction + unpaidDeduction + halfDayDeduction + lateDeduction;

    // 7. Income Tax calculation
    const annualGross = grossSalary * 12;
    const annualTax = Math.round(calculateAnnualTax(annualGross));
    const monthlyTax = Math.round(annualTax / 12);

    // 8. Net salary
    const netSalary = Math.max(0, proratedGross - totalDeductions - monthlyTax);

    sumGross += proratedGross;
    sumDeductions += totalDeductions;
    sumTax += monthlyTax;
    sumNet += netSalary;

    payslipItems.push({
      employeeId: emp._id,
      month: monthStr,
      basicSalary: emp.basicSalary,
      hra: emp.hra,
      medicalAllowance: emp.medicalAllowance,
      grossSalary: emp.grossSalary,
      prorationFactor,
      proratedGross,
      dailyRate,
      workingDays: totalWorkingDays,
      presentDays,
      absentDays,
      unpaidLeaveDays,
      halfDays,
      lateDays,
      latePenaltyDays,
      absentDeduction,
      unpaidDeduction,
      halfDayDeduction,
      lateDeduction,
      totalDeductions,
      annualGross,
      annualTax,
      monthlyTax,
      netSalary,
      isLocked: false,
    });
  }

  // Create or update PayrollRun
  let run = existingRun;
  if (!run) {
    run = new PayrollRun({
      month: monthStr,
      year,
      workingDays: totalWorkingDays,
      status: 'draft',
      generatedBy: generatedByUserId,
    });
  }

  run.totalGross = sumGross;
  run.totalDeductions = sumDeductions;
  run.totalTax = sumTax;
  run.totalNet = sumNet;
  run.employeeCount = payslipItems.length;
  await run.save();

  // Remove previous draft payslips for this run if any
  await Payslip.deleteMany({ payrollRunId: run._id });

  // Insert payslips
  for (const item of payslipItems) {
    item.payrollRunId = run._id;
  }
  await Payslip.insertMany(payslipItems);

  return {
    run,
    payslipCount: payslipItems.length,
  };
};

const getActiveWorkingDaysCount = async (startStr: string, endStr: string): Promise<number> => {
  const company = await Company.findOne();
  const weekendDays = company?.weekendDays || [0, 6];
  const start = new Date(startStr);
  const end = new Date(endStr);

  const holidays = await Holiday.find({
    date: { $gte: startStr, $lte: endStr },
  }).lean();
  const holidaySet = new Set(holidays.map((h) => h.date));

  let count = 0;
  const curr = new Date(start);
  while (curr <= end) {
    const dayOfWeek = curr.getDay();
    const currStr = curr.toISOString().split('T')[0];
    if (!weekendDays.includes(dayOfWeek) && !holidaySet.has(currStr)) {
      count++;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return Math.max(1, count);
};

export const finalizePayroll = async (monthStr: string, adminUserId: string) => {
  const run = await PayrollRun.findOne({ month: monthStr });
  if (!run) {
    const error: any = new Error(`No payroll run found for ${monthStr}.`);
    error.statusCode = 404;
    throw error;
  }

  if (run.status === 'finalized') {
    const error: any = new Error(`Payroll for ${monthStr} is already finalized.`);
    error.statusCode = 400;
    throw error;
  }

  run.status = 'finalized';
  run.finalizedBy = adminUserId as any;
  run.finalizedAt = new Date();
  await run.save();

  // Lock all payslips
  await Payslip.updateMany({ payrollRunId: run._id }, { isLocked: true });

  // Notify all employees that payslips are ready
  const payslips = await Payslip.find({ payrollRunId: run._id }).populate('employeeId');
  for (const slip of payslips) {
    const emp: any = slip.employeeId;
    if (emp && emp.userId) {
      await Notification.create({
        userId: emp.userId,
        title: `Payslip Available for ${monthStr}`,
        message: `Your payslip for ${monthStr} is finalized with Net Salary of PKR ${slip.netSalary.toLocaleString()}. You can now download the official PDF.`,
        type: 'payroll',
        link: '/payroll',
      });
    }
  }

  return run;
};
