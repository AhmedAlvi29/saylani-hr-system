import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/User';
import { Company } from '../models/Company';
import { Department } from '../models/Department';
import { Designation } from '../models/Designation';
import { Policy } from '../models/Policy';

const JWT_SECRET = process.env.JWT_SECRET || 'saylani_hcm_super_secret_jwt_key_2026_secure';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (user: IUser): string => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      employeeId: user.employeeId ? user.employeeId.toString() : undefined,
      companyId: user.companyId ? user.companyId.toString() : undefined,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const checkSetupStatus = async (): Promise<{ isSetupComplete: boolean; companyName?: string }> => {
  const company = await Company.findOne();
  const adminCount = await User.countDocuments({ role: 'admin' });

  const isComplete = Boolean(company && company.isSetupComplete && adminCount > 0);
  return {
    isSetupComplete: isComplete,
    companyName: company?.name,
  };
};

export const initializeCompanyAndAdmin = async (data: {
  companyName: string;
  officeStartTime?: string;
  graceMinutes?: number;
  halfDayThresholdHours?: number;
  weekendDays?: number[];
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}) => {
  const existingCompany = await Company.findOne();
  if (existingCompany && existingCompany.isSetupComplete) {
    throw new Error('Initial setup has already been completed for this organization.');
  }

  // Create or update company
  let company = existingCompany;
  if (!company) {
    company = new Company();
  }

  company.name = data.companyName;
  company.officeStartTime = data.officeStartTime || '09:00';
  company.graceMinutes = data.graceMinutes ?? 15;
  company.halfDayThresholdHours = data.halfDayThresholdHours ?? 5;
  company.weekendDays = data.weekendDays || [0, 6]; // Sun, Sat
  company.officeLocation = {
    latitude: data.latitude ?? 24.8607,
    longitude: data.longitude ?? 67.0011,
    radiusMeters: data.radiusMeters ?? 150,
  };
  company.isSetupComplete = true;
  company.initializedAt = new Date();
  await company.save();

  // Seed standard default departments if empty
  const deptCount = await Department.countDocuments();
  if (deptCount === 0) {
    const itDept = await Department.create({ name: 'Engineering', code: 'ENG', description: 'Software & Technology' });
    const hrDept = await Department.create({ name: 'Human Resources', code: 'HR', description: 'Talent & Culture' });
    const salesDept = await Department.create({ name: 'Operations', code: 'OPS', description: 'Operations & Facilities' });

    await Designation.create([
      { title: 'Software Engineer', departmentId: itDept._id, grade: 'L2' },
      { title: 'Senior Software Engineer', departmentId: itDept._id, grade: 'L3' },
      { title: 'HR Manager', departmentId: hrDept._id, grade: 'M1' },
      { title: 'HR Officer', departmentId: hrDept._id, grade: 'L1' },
      { title: 'Operations Specialist', departmentId: salesDept._id, grade: 'L2' },
    ]);
  }

  // Seed core policies for AI policy Q&A if empty
  const policyCount = await Policy.countDocuments();
  if (policyCount === 0) {
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
  }

  // Create initial Admin user
  const passwordHash = await hashPassword(data.adminPassword);
  let admin = await User.findOne({ email: data.adminEmail.toLowerCase() });
  if (admin) {
    admin.name = data.adminName;
    admin.passwordHash = passwordHash;
    admin.role = 'admin';
    admin.isActive = true;
    admin.mustChangePassword = false;
    await admin.save();
  } else {
    admin = await User.create({
      name: data.adminName,
      email: data.adminEmail.toLowerCase(),
      passwordHash,
      role: 'admin',
      mustChangePassword: false,
      isActive: true,
    });
  }

  const token = generateToken(admin);

  return {
    company,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      companyId: company._id,
      companyName: company.name,
    },
    token,
  };
};

export interface RegisterCompanyData {
  companyName: string;
  companyEmail?: string;
  companyAddress?: string;
  companyPhone?: string;
  officeStartTime?: string;
  graceMinutes?: number;
  halfDayThresholdHours?: number;
  weekendDays?: number[];
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export const registerCompanyAndAdmin = async (data: RegisterCompanyData) => {
  const cleanAdminEmail = data.adminEmail.toLowerCase().trim();
  const cleanCompanyName = data.companyName.trim();
  const cleanCompanyEmail = data.companyEmail ? data.companyEmail.toLowerCase().trim() : undefined;

  // 1. Validation & Duplicate checks
  const existingUser = await User.findOne({ email: cleanAdminEmail });
  if (existingUser) {
    const error: any = new Error(`An account with email '${cleanAdminEmail}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const existingCompany = await Company.findOne({
    name: { $regex: new RegExp(`^${cleanCompanyName}$`, 'i') },
  });
  if (existingCompany) {
    const error: any = new Error(`A company with the name '${cleanCompanyName}' is already registered.`);
    error.statusCode = 409;
    throw error;
  }

  if (cleanCompanyEmail) {
    const existingCompEmail = await Company.findOne({ email: cleanCompanyEmail });
    if (existingCompEmail) {
      const error: any = new Error(`A company with email '${cleanCompanyEmail}' is already registered.`);
      error.statusCode = 409;
      throw error;
    }
  }

  // 2. Hash password
  const passwordHash = await hashPassword(data.adminPassword);

  let createdCompany: any = null;
  let createdAdmin: any = null;

  try {
    // 3. Create Company Record
    createdCompany = await Company.create({
      name: cleanCompanyName,
      email: cleanCompanyEmail,
      address: data.companyAddress?.trim(),
      phone: data.companyPhone?.trim(),
      officeStartTime: data.officeStartTime || '09:00',
      graceMinutes: data.graceMinutes ?? 15,
      halfDayThresholdHours: data.halfDayThresholdHours ?? 5,
      weekendDays: data.weekendDays || [0, 6],
      officeLocation: {
        latitude: data.latitude ?? 24.8607,
        longitude: data.longitude ?? 67.0011,
        radiusMeters: data.radiusMeters ?? 150,
      },
      isSetupComplete: true,
      initializedAt: new Date(),
    });

    // 4. Create Initial Admin for this Company
    createdAdmin = await User.create({
      companyId: createdCompany._id,
      name: data.adminName.trim(),
      email: cleanAdminEmail,
      passwordHash,
      role: 'admin',
      mustChangePassword: false,
      isActive: true,
    });

    // 5. Initialize Default Departments & Designations for this company
    const itDept = await Department.create({
      companyId: createdCompany._id,
      name: 'Engineering',
      code: 'ENG',
      description: 'Software & Technology',
    });
    const hrDept = await Department.create({
      companyId: createdCompany._id,
      name: 'Human Resources',
      code: 'HR',
      description: 'Talent & Culture',
    });
    const opsDept = await Department.create({
      companyId: createdCompany._id,
      name: 'Operations',
      code: 'OPS',
      description: 'Operations & Facilities',
    });

    await Designation.create([
      { companyId: createdCompany._id, title: 'Software Engineer', departmentId: itDept._id, grade: 'L2' },
      { companyId: createdCompany._id, title: 'Senior Software Engineer', departmentId: itDept._id, grade: 'L3' },
      { companyId: createdCompany._id, title: 'HR Manager', departmentId: hrDept._id, grade: 'M1' },
      { companyId: createdCompany._id, title: 'HR Officer', departmentId: hrDept._id, grade: 'L1' },
      { companyId: createdCompany._id, title: 'Operations Specialist', departmentId: opsDept._id, grade: 'L2' },
    ]);

    // 6. Initialize Default Policies for this company
    await Policy.create([
      {
        companyId: createdCompany._id,
        title: 'Working Hours & Attendance Policy',
        category: 'attendance',
        content: `Official office hours begin promptly at ${createdCompany.officeStartTime} with a ${createdCompany.graceMinutes}-minute grace period. Check-ins after the grace period are classified as Late. Working hours under ${createdCompany.halfDayThresholdHours} hours are recorded as Half Day. Employees missing check-in without approved leave are recorded as Absent. Three late arrivals in a single calendar month incur a 0.5-day salary deduction.`,
      },
      {
        companyId: createdCompany._id,
        title: 'Annual & Sick Leave Policy',
        category: 'leave',
        content:
          'Full-time employees receive 14 days of Annual Leave, 8 days of Sick Leave, and 10 days of Casual Leave each calendar year. Unpaid Leave is subject to manager approval. Leave requests must be submitted at least 24 hours in advance. Overlapping leave requests and requests exceeding available quotas are not permitted.',
      },
      {
        companyId: createdCompany._id,
        title: 'Payroll & Compensation Guidelines',
        category: 'payroll',
        content:
          'Gross salary consists of Basic Salary + 40% House Rent Allowance (HRA) + 10% Medical Allowance (Gross = 1.5 x Basic). Daily deduction rate is calculated as Gross divided by working days in that calendar month. Deductions apply to absent days, unpaid leaves, half-days, and late penalties. Payroll is drafted monthly by HR and finalized by Admin.',
      },
    ]);

    // 7. Generate JWT Token
    const token = generateToken(createdAdmin);

    return {
      company: {
        id: createdCompany._id,
        name: createdCompany.name,
        email: createdCompany.email,
        address: createdCompany.address,
        phone: createdCompany.phone,
      },
      admin: {
        id: createdAdmin._id,
        name: createdAdmin.name,
        email: createdAdmin.email,
        role: createdAdmin.role,
        companyId: createdCompany._id,
        companyName: createdCompany.name,
      },
      token,
    };
  } catch (err: any) {
    // Rollback created artifacts if setup failed partially
    if (createdAdmin) {
      await User.findByIdAndDelete(createdAdmin._id);
    }
    if (createdCompany) {
      await Company.findByIdAndDelete(createdCompany._id);
      await Department.deleteMany({ companyId: createdCompany._id });
      await Designation.deleteMany({ companyId: createdCompany._id });
      await Policy.deleteMany({ companyId: createdCompany._id });
    }
    throw err;
  }
};
