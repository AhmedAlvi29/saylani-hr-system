import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import { connectDB, disconnectDB } from '../config/db';
import { Company } from '../models/Company';
import { Department } from '../models/Department';
import { Designation } from '../models/Designation';
import { User } from '../models/User';
import { Employee } from '../models/Employee';
import { Holiday } from '../models/Holiday';
import { Attendance } from '../models/Attendance';
import { LeaveRequest } from '../models/LeaveRequest';
import { LeaveBalance } from '../models/LeaveBalance';
import { PayrollRun } from '../models/PayrollRun';
import { Payslip } from '../models/Payslip';
import { Announcement } from '../models/Announcement';
import { Notification } from '../models/Notification';
import { Policy } from '../models/Policy';
import { hashPassword } from '../services/authService';

async function seed() {
  console.log('Seeding rich demo records into MongoDB Atlas for hackathon judging...');
  await connectDB();

  // 1. Company Setup
  let company = await Company.findOne();
  if (!company) {
    company = await Company.create({
      name: 'Saylani Systems Ltd',
      code: 'SAYLANI',
      officeStartTime: '09:00',
      graceMinutes: 15,
      halfDayThresholdHours: 5,
      weekendDays: [0, 6],
      officeLocation: {
        latitude: 24.8607,
        longitude: 67.0011,
        radiusMeters: 150,
      },
      isSetupComplete: true,
      initializedAt: new Date(),
    });
  } else {
    company.isSetupComplete = true;
    await company.save();
  }

  // 2. Core Policies
  await Policy.deleteMany({});
  await Policy.create([
    {
      title: 'Working Hours & Attendance Policy',
      category: 'attendance',
      content:
        'Official office hours begin promptly at 09:00 AM with a 15-minute grace period until 09:15 AM. Check-ins after 09:15 AM are classified as Late. Working hours under 5 hours are recorded as Half Day. Employees missing check-in without approved leave are recorded as Absent. Three late arrivals in a single calendar month incur a 0.5-day salary deduction.',
    },
    {
      title: 'Annual & Sick Leave Policy',
      category: 'leave',
      content:
        'Full-time employees receive 14 days of Annual Leave, 8 days of Sick Leave, and 10 days of Casual Leave each calendar year. Unpaid Leave is subject to manager approval. Leave requests must be submitted at least 24 hours in advance. Overlapping leave requests and requests exceeding available quotas are not permitted.',
    },
    {
      title: 'Payroll & Compensation Guidelines',
      category: 'payroll',
      content:
        'Gross salary consists of Basic Salary + 40% House Rent Allowance (HRA) + 10% Medical Allowance (Gross = 1.5 x Basic). Daily deduction rate is calculated as Gross divided by working days in that calendar month. Deductions apply to absent days, unpaid leaves, half-days, and late penalties. Payroll is drafted monthly by HR and finalized by Admin.',
    },
  ]);

  // 3. Public Holidays
  await Holiday.deleteMany({});
  await Holiday.create([
    { name: 'Pakistan Day', date: '2026-03-23', isRecurring: true, description: 'National Republic Day' },
    { name: 'Labor Day', date: '2026-05-01', isRecurring: true, description: 'International Workers Day' },
    { name: 'Independence Day', date: '2026-08-14', isRecurring: true, description: 'National Independence Day' },
    { name: 'Iqbal Day', date: '2026-11-09', isRecurring: true, description: 'National Poet Memorial Day' },
  ]);

  // 4. Departments & Designations
  const itDept = await Department.findOneAndUpdate(
    { code: 'ENG' },
    { name: 'Engineering', code: 'ENG', description: 'Tech & Software Architecture', isActive: true },
    { upsert: true, new: true }
  );
  const hrDept = await Department.findOneAndUpdate(
    { code: 'HR' },
    { name: 'Human Resources', code: 'HR', description: 'People Ops & Talent', isActive: true },
    { upsert: true, new: true }
  );
  const opsDept = await Department.findOneAndUpdate(
    { code: 'OPS' },
    { name: 'Operations', code: 'OPS', description: 'Operations & Facilities', isActive: true },
    { upsert: true, new: true }
  );
  const mktDept = await Department.findOneAndUpdate(
    { code: 'MKT' },
    { name: 'Marketing', code: 'MKT', description: 'Growth & Branding', isActive: true },
    { upsert: true, new: true }
  );

  const desigSE = await Designation.findOneAndUpdate(
    { title: 'Senior Software Engineer', departmentId: itDept._id },
    { title: 'Senior Software Engineer', departmentId: itDept._id, grade: 'L3', isActive: true },
    { upsert: true, new: true }
  );
  const desigDev = await Designation.findOneAndUpdate(
    { title: 'Software Engineer', departmentId: itDept._id },
    { title: 'Software Engineer', departmentId: itDept._id, grade: 'L2', isActive: true },
    { upsert: true, new: true }
  );
  const desigHRO = await Designation.findOneAndUpdate(
    { title: 'HR Officer', departmentId: hrDept._id },
    { title: 'HR Officer', departmentId: hrDept._id, grade: 'L1', isActive: true },
    { upsert: true, new: true }
  );
  const desigOpsLead = await Designation.findOneAndUpdate(
    { title: 'Operations Lead', departmentId: opsDept._id },
    { title: 'Operations Lead', departmentId: opsDept._id, grade: 'M1', isActive: true },
    { upsert: true, new: true }
  );
  const desigMkt = await Designation.findOneAndUpdate(
    { title: 'Growth Specialist', departmentId: mktDept._id },
    { title: 'Growth Specialist', departmentId: mktDept._id, grade: 'L2', isActive: true },
    { upsert: true, new: true }
  );

  // 5. Admin User
  const adminHash = await hashPassword('Admin@123456');
  const adminUser = await User.findOneAndUpdate(
    { email: 'admin@saylani.org' },
    {
      name: 'Super Admin',
      email: 'admin@saylani.org',
      passwordHash: adminHash,
      role: 'admin',
      mustChangePassword: false,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  // 6. HR User
  const hrHash = await hashPassword('Hr@123456');
  const hrUser = await User.findOneAndUpdate(
    { email: 'hr@saylani.org' },
    {
      name: 'Sarah Khan (HR)',
      email: 'hr@saylani.org',
      passwordHash: hrHash,
      role: 'hr',
      mustChangePassword: false,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  // 7. Demo Employees
  const empPasswordHash = await hashPassword('Employee@123456');

  const employeeDefs = [
    {
      code: 'EMP-001',
      first: 'Ali',
      last: 'Raza',
      email: 'ali.raza@saylani.org',
      phone: '+92 300 1234567',
      address: 'Gulshan-e-Iqbal, Karachi',
      dept: itDept._id,
      desig: desigSE._id,
      basic: 120000,
      joining: new Date('2026-01-15'),
      gender: 'male',
    },
    {
      code: 'EMP-002',
      first: 'Zainab',
      last: 'Tariq',
      email: 'zainab.tariq@saylani.org',
      phone: '+92 321 9876543',
      address: 'DHA Phase 5, Karachi',
      dept: hrDept._id,
      desig: desigHRO._id,
      basic: 80000,
      joining: new Date('2026-02-01'),
      gender: 'female',
    },
    {
      code: 'EMP-003',
      first: 'Hamza',
      last: 'Sheikh',
      email: 'hamza.sheikh@saylani.org',
      phone: '+92 333 5551234',
      address: 'North Nazimabad, Karachi',
      dept: opsDept._id,
      desig: desigOpsLead._id,
      basic: 90000,
      joining: new Date('2026-02-15'),
      gender: 'male',
    },
    {
      code: 'EMP-004',
      first: 'Bilal',
      last: 'Khan',
      email: 'bilal.khan@saylani.org',
      phone: '+92 345 7778899',
      address: 'PECHS Block 6, Karachi',
      dept: itDept._id,
      desig: desigDev._id,
      basic: 95000,
      joining: new Date('2026-03-01'),
      gender: 'male',
    },
    {
      code: 'EMP-005',
      first: 'Ayesha',
      last: 'Siddiqui',
      email: 'ayesha.siddiqui@saylani.org',
      phone: '+92 312 4443322',
      address: 'Clifton Block 4, Karachi',
      dept: mktDept._id,
      desig: desigMkt._id,
      basic: 85000,
      joining: new Date('2026-03-15'),
      gender: 'female',
    },
  ];

  const createdEmployees: any[] = [];

  for (const ed of employeeDefs) {
    let u = await User.findOne({ email: ed.email });
    if (!u) {
      u = await User.create({
        name: `${ed.first} ${ed.last}`,
        email: ed.email,
        passwordHash: empPasswordHash,
        role: 'employee',
        mustChangePassword: false,
        isActive: true,
      });
    }

    const hra = Math.round(ed.basic * 0.4);
    const med = Math.round(ed.basic * 0.1);
    const gross = ed.basic + hra + med;

    const emp = await Employee.findOneAndUpdate(
      { employeeCode: ed.code },
      {
        employeeCode: ed.code,
        firstName: ed.first,
        lastName: ed.last,
        email: ed.email,
        phone: ed.phone,
        address: ed.address,
        departmentId: ed.dept,
        designationId: ed.desig,
        joiningDate: ed.joining,
        employmentStatus: 'active',
        gender: ed.gender,
        basicSalary: ed.basic,
        hra,
        medicalAllowance: med,
        grossSalary: gross,
        userId: u._id,
      },
      { upsert: true, new: true }
    );

    u.employeeId = emp._id as any;
    await u.save();

    await LeaveBalance.findOneAndUpdate(
      { employeeId: emp._id, year: 2026 },
      {
        employeeId: emp._id,
        year: 2026,
        annualQuota: 14,
        sickQuota: 8,
        casualQuota: 10,
        annualUsed: 2,
        sickUsed: 1,
        casualUsed: 1,
        unpaidUsed: 0,
      },
      { upsert: true }
    );

    createdEmployees.push(emp);
  }

  // 8. Past 14-day Attendance records for trend charts
  console.log('Generating 14-day attendance records for rich visual analytics...');
  await Attendance.deleteMany({});

  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay();

    // Skip weekends (Sun=0, Sat=6)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    for (let j = 0; j < createdEmployees.length; j++) {
      const emp = createdEmployees[j];
      const isToday = i === 0;

      // Create realistic attendance distribution
      let status: 'present' | 'late' | 'half_day' = 'present';
      let checkInHour = 8;
      let checkInMin = 50 + (j % 9);
      let isLate = false;
      let lateMinutes = 0;

      // Make Hamza and Ali occasionally late to populate top late-comers chart
      if ((j === 0 && i % 4 === 0) || (j === 2 && i % 3 === 0)) {
        status = 'late';
        checkInHour = 9;
        checkInMin = 22 + (i % 15);
        isLate = true;
        lateMinutes = checkInMin - 15;
      } else if (j === 3 && i === 5) {
        status = 'half_day';
      }

      const checkInTime = new Date(d);
      checkInTime.setHours(checkInHour, checkInMin, 0, 0);

      const checkOutTime = new Date(d);
      checkOutTime.setHours(status === 'half_day' ? 13 : 17, 30, 0, 0);

      const workingHours = status === 'half_day' ? 4.2 : 8.5;

      await Attendance.create({
        employeeId: emp._id,
        date: dateStr,
        checkInTime,
        checkOutTime: isToday ? (j === 0 ? undefined : checkOutTime) : checkOutTime,
        status,
        workingHours: isToday && j === 0 ? 0 : workingHours,
        isLate,
        lateMinutes,
        checkInSource: j % 2 === 0 ? 'web' : 'camera',
      });
    }
  }

  // 9. Leave Requests (1 approved, 2 pending for HR review)
  await LeaveRequest.deleteMany({});
  await LeaveRequest.create([
    {
      employeeId: createdEmployees[0]._id, // Ali Raza
      leaveType: 'annual',
      startDate: '2026-11-12',
      endDate: '2026-11-13',
      workingDays: 2,
      reason: 'Family out of station travel',
      status: 'approved',
      reviewedBy: hrUser._id,
      reviewerComment: 'Approved by HR manager.',
      reviewedAt: new Date(),
    },
    {
      employeeId: createdEmployees[1]._id, // Zainab
      leaveType: 'casual',
      startDate: '2026-11-16',
      endDate: '2026-11-17',
      workingDays: 2,
      reason: 'Attending cousin wedding ceremony',
      status: 'pending',
    },
    {
      employeeId: createdEmployees[3]._id, // Bilal
      leaveType: 'sick',
      startDate: '2026-11-20',
      endDate: '2026-11-20',
      workingDays: 1,
      reason: 'Routine medical dental checkup',
      status: 'pending',
    },
  ]);

  // 10. Announcements
  await Announcement.deleteMany({});
  await Announcement.create([
    {
      title: '🎉 Saylani Hackathon 2026 Official Launch',
      content:
        'Welcome all teams to the Saylani Hackathon HCM Lite evaluation. All employee self-service and management modules are live and connected to MongoDB Atlas.',
      priority: 'important',
      targetRole: 'all',
      createdBy: adminUser._id,
      authorName: adminUser.name,
      isActive: true,
    },
    {
      title: 'Monthly Performance & Payroll Finalization',
      content:
        'All managers are requested to review pending attendance corrections and leave applications prior to month-end payroll locking.',
      priority: 'normal',
      targetRole: 'all',
      createdBy: hrUser._id,
      authorName: hrUser.name,
      isActive: true,
    },
  ]);

  // 11. Initial Payroll Run for previous month so payslips are ready for PDF download
  await PayrollRun.deleteMany({});
  await Payslip.deleteMany({});

  const lastMonthStr = '2026-09';
  const run = await PayrollRun.create({
    month: lastMonthStr,
    year: 2026,
    workingDays: 22,
    status: 'finalized',
    totalGross: 742500,
    totalDeductions: 8200,
    totalTax: 12500,
    totalNet: 721800,
    employeeCount: createdEmployees.length,
    generatedBy: hrUser._id,
    finalizedBy: adminUser._id,
    finalizedAt: new Date(),
  });

  for (const emp of createdEmployees) {
    const gross = emp.grossSalary;
    const dailyRate = Math.round((gross / 22) * 100) / 100;
    const net = gross - 1500; // approximate net

    await Payslip.create({
      payrollRunId: run._id,
      employeeId: emp._id,
      month: lastMonthStr,
      basicSalary: emp.basicSalary,
      hra: emp.hra,
      medicalAllowance: emp.medicalAllowance,
      grossSalary: gross,
      prorationFactor: 1.0,
      proratedGross: gross,
      dailyRate,
      workingDays: 22,
      presentDays: 22,
      absentDays: 0,
      unpaidLeaveDays: 0,
      halfDays: 0,
      lateDays: 1,
      latePenaltyDays: 0,
      absentDeduction: 0,
      unpaidDeduction: 0,
      halfDayDeduction: 0,
      lateDeduction: 0,
      totalDeductions: 0,
      annualGross: gross * 12,
      annualTax: 18000,
      monthlyTax: 1500,
      netSalary: net,
      isLocked: true,
    });
  }

  console.log('\n======================================================');
  console.log('✅ ATLAS SEEDING COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('Admin Account:    admin@saylani.org    / Admin@123456');
  console.log('HR Account:       hr@saylani.org       / Hr@123456');
  console.log('Employee Account: ali.raza@saylani.org / Employee@123456');
  console.log('======================================================\n');

  await disconnectDB();
}

seed().catch(console.error);
