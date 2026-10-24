import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../config/db';
import { Company } from '../models/Company';
import { Department } from '../models/Department';
import { Designation } from '../models/Designation';
import { User } from '../models/User';
import { Employee } from '../models/Employee';
import { Holiday } from '../models/Holiday';
import { LeaveBalance } from '../models/LeaveBalance';
import { Policy } from '../models/Policy';
import { hashPassword } from '../services/authService';

async function seed() {
  console.log('Seeding demo records for development testing only...');
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
    });
  }

  // 2. Departments
  const itDept = await Department.findOneAndUpdate(
    { code: 'ENG' },
    { name: 'Engineering', code: 'ENG', description: 'Tech & Development' },
    { upsert: true, new: true }
  );
  const hrDept = await Department.findOneAndUpdate(
    { code: 'HR' },
    { name: 'Human Resources', code: 'HR', description: 'Talent & People Ops' },
    { upsert: true, new: true }
  );

  // 3. Designations
  const devDesig = await Designation.findOneAndUpdate(
    { title: 'Full Stack Engineer', departmentId: itDept._id },
    { title: 'Full Stack Engineer', departmentId: itDept._id, grade: 'L2' },
    { upsert: true, new: true }
  );
  const hrDesig = await Designation.findOneAndUpdate(
    { title: 'HR Specialist', departmentId: hrDept._id },
    { title: 'HR Specialist', departmentId: hrDept._id, grade: 'M1' },
    { upsert: true, new: true }
  );

  // 4. Admin Account
  const adminHash = await hashPassword('Admin@123456');
  await User.findOneAndUpdate(
    { email: 'admin@saylani.org' },
    {
      name: 'Super Admin',
      email: 'admin@saylani.org',
      passwordHash: adminHash,
      role: 'admin',
      mustChangePassword: false,
      isActive: true,
    },
    { upsert: true }
  );

  // 5. HR Account
  const hrHash = await hashPassword('Hr@123456');
  await User.findOneAndUpdate(
    { email: 'hr@saylani.org' },
    {
      name: 'Sarah Khan (HR)',
      email: 'hr@saylani.org',
      passwordHash: hrHash,
      role: 'hr',
      mustChangePassword: false,
      isActive: true,
    },
    { upsert: true }
  );

  // 6. Demo Employee Account
  const empHash = await hashPassword('Employee@123456');
  let empUser = await User.findOne({ email: 'ali.raza@saylani.org' });
  if (!empUser) {
    empUser = await User.create({
      name: 'Ali Raza',
      email: 'ali.raza@saylani.org',
      passwordHash: empHash,
      role: 'employee',
      mustChangePassword: false,
      isActive: true,
    });
  }

  const basic = 120000;
  const hra = Math.round(basic * 0.4);
  const med = Math.round(basic * 0.1);
  const gross = basic + hra + med;

  const emp = await Employee.findOneAndUpdate(
    { employeeCode: 'EMP-001' },
    {
      employeeCode: 'EMP-001',
      firstName: 'Ali',
      lastName: 'Raza',
      email: 'ali.raza@saylani.org',
      phone: '+92 300 1234567',
      address: 'Gulshan-e-Iqbal, Karachi',
      departmentId: itDept._id,
      designationId: devDesig._id,
      joiningDate: new Date('2026-01-15'),
      employmentStatus: 'active',
      gender: 'male',
      basicSalary: basic,
      hra,
      medicalAllowance: med,
      grossSalary: gross,
      userId: empUser._id,
    },
    { upsert: true, new: true }
  );

  empUser.employeeId = emp._id as any;
  await empUser.save();

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
      casualUsed: 0,
      unpaidUsed: 0,
    },
    { upsert: true }
  );

  console.log('✅ Demo seed completed successfully!');
  console.log('Admin login: admin@saylani.org / Admin@123456');
  console.log('HR login: hr@saylani.org / Hr@123456');
  console.log('Employee login: ali.raza@saylani.org / Employee@123456');

  await disconnectDB();
}

seed().catch(console.error);
