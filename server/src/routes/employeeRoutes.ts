import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Employee } from '../models/Employee';
import { User } from '../models/User';
import { Department } from '../models/Department';
import { Designation } from '../models/Designation';
import { Attendance } from '../models/Attendance';
import { LeaveRequest } from '../models/LeaveRequest';
import { Payslip } from '../models/Payslip';
import { authenticate } from '../middleware/auth';
import { requireRole, enforceDataScope } from '../middleware/rbac';
import { logAudit } from '../middleware/audit';
import { hashPassword } from '../services/authService';
import { getOrCreateLeaveBalance } from '../services/leaveService';

const router = Router();

// Employee Directory with Search, Filter & Pagination
router.get('/employees', authenticate, enforceDataScope, async (req: Request, res: Response, next) => {
  try {
    const { search, department, status, page = 1, limit = 20 } = req.query;

    const query: any = {};

    // If role is employee, force own employeeId
    if (req.user?.role === 'employee') {
      query._id = req.user.employeeId;
    } else {
      if (department) query.departmentId = department;
      if (status) query.employmentStatus = status;
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { employeeCode: { $regex: search, $options: 'i' } },
        ];
      }
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * pageSize;

    const [total, employees] = await Promise.all([
      Employee.countDocuments(query),
      Employee.find(query)
        .populate('departmentId', 'name code')
        .populate('designationId', 'title')
        .sort({ employeeCode: 1 })
        .skip(skip)
        .limit(pageSize),
    ]);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          total,
          page: pageNum,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Employee 360 Profile
router.get('/employees/:id', authenticate, enforceDataScope, async (req: Request, res: Response, next) => {
  try {
    const employeeId = req.params.id;

    // Strict scope check
    if (req.user?.role === 'employee' && req.user.employeeId !== employeeId) {
      res.status(403).json({ success: false, message: 'Forbidden: You can only view your own profile.' });
      return;
    }

    const employee = await Employee.findById(employeeId)
      .populate('departmentId', 'name code')
      .populate('designationId', 'title')
      .populate('userId', 'email role isActive lastLogin mustChangePassword');

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    // Related 360 data
    const [recentAttendance, recentLeaves, leaveBalance, recentPayslips] = await Promise.all([
      Attendance.find({ employeeId }).sort({ date: -1 }).limit(10),
      LeaveRequest.find({ employeeId }).sort({ createdAt: -1 }).limit(5),
      getOrCreateLeaveBalance(employeeId),
      Payslip.find({ employeeId, isLocked: true }).sort({ month: -1 }).limit(6),
    ]);

    res.json({
      success: true,
      data: {
        employee,
        recentAttendance,
        recentLeaves,
        leaveBalance,
        recentPayslips,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Register New Employee (HR or Admin)
const registerEmployeeSchema = z.object({
  employeeCode: z.string().min(2).toUpperCase(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  departmentId: z.string(),
  designationId: z.string().optional(),
  joiningDate: z.string().optional(),
  employmentStatus: z.enum(['active', 'probation']).default('active'),
  gender: z.enum(['male', 'female', 'other']).default('male'),
  basicSalary: z.number().min(1000, 'Basic salary must be at least 1,000'),
  temporaryPassword: z.string().min(6).default('Welcome@123'),
});

router.post('/employees', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const data = registerEmployeeSchema.parse(req.body);

    // 1. Duplicate check
    const existingCode = await Employee.findOne({ employeeCode: data.employeeCode });
    if (existingCode) {
      res.status(409).json({ success: false, message: `Employee code ${data.employeeCode} already exists.` });
      return;
    }

    const existingEmail = await User.findOne({ email: data.email.toLowerCase() });
    if (existingEmail) {
      res.status(409).json({ success: false, message: `Email ${data.email} is already in use.` });
      return;
    }

    // 2. Calculate Gross = 1.5 * Basic
    const basic = data.basicSalary;
    const hra = Math.round(basic * 0.4);
    const medical = Math.round(basic * 0.1);
    const gross = basic + hra + medical; // exactly 1.5 * basic

    // 3. Create User Login with temporary password
    const passwordHash = await hashPassword(data.temporaryPassword);
    const user = await User.create({
      name: `${data.firstName} ${data.lastName}`,
      email: data.email.toLowerCase(),
      passwordHash,
      role: 'employee',
      mustChangePassword: true,
      isActive: true,
    });

    // 4. Create Employee record
    const employee = await Employee.create({
      employeeCode: data.employeeCode,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      address: data.address,
      departmentId: data.departmentId,
      designationId: data.designationId || undefined,
      joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
      employmentStatus: data.employmentStatus,
      gender: data.gender,
      basicSalary: basic,
      hra,
      medicalAllowance: medical,
      grossSalary: gross,
      userId: user._id,
    });

    user.employeeId = employee._id as any;
    await user.save();

    // 5. Initialize Leave Balance
    await getOrCreateLeaveBalance(employee._id.toString());

    await logAudit(req, {
      action: 'REGISTER_EMPLOYEE',
      entity: 'Employee',
      entityId: employee._id.toString(),
      details: `Registered employee ${data.employeeCode} (${data.firstName} ${data.lastName}) with basic salary PKR ${basic.toLocaleString()}`,
      afterJson: employee.toObject(),
    });

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully and user login credentials generated.',
      data: {
        employee,
        login: {
          email: user.email,
          temporaryPassword: data.temporaryPassword,
          mustChangePassword: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update Employee Details
router.put('/employees/:id', authenticate, enforceDataScope, async (req: Request, res: Response, next) => {
  try {
    const employeeId = req.params.id;
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    const before = employee.toObject();

    // If Employee role: can only edit phone and address
    if (req.user?.role === 'employee') {
      const allowedSchema = z.object({
        phone: z.string().optional(),
        address: z.string().optional(),
      });
      const allowedData = allowedSchema.parse(req.body);
      if (allowedData.phone !== undefined) employee.phone = allowedData.phone;
      if (allowedData.address !== undefined) employee.address = allowedData.address;
    } else {
      // HR or Admin can edit job details, department, designation, salary
      const hrSchema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        departmentId: z.string().optional(),
        designationId: z.string().optional(),
        employmentStatus: z.enum(['active', 'probation', 'leaver', 'inactive']).optional(),
        gender: z.enum(['male', 'female', 'other']).optional(),
        basicSalary: z.number().min(1000).optional(),
      });
      const data = hrSchema.parse(req.body);

      if (data.firstName) employee.firstName = data.firstName;
      if (data.lastName) employee.lastName = data.lastName;
      if (data.phone !== undefined) employee.phone = data.phone;
      if (data.address !== undefined) employee.address = data.address;
      if (data.departmentId) employee.departmentId = data.departmentId as any;
      if (data.designationId) employee.designationId = data.designationId as any;
      if (data.employmentStatus) employee.employmentStatus = data.employmentStatus;
      if (data.gender) employee.gender = data.gender;

      if (data.basicSalary && data.basicSalary !== employee.basicSalary) {
        employee.basicSalary = data.basicSalary;
        employee.hra = Math.round(data.basicSalary * 0.4);
        employee.medicalAllowance = Math.round(data.basicSalary * 0.1);
        employee.grossSalary = employee.basicSalary + employee.hra + employee.medicalAllowance;
      }
    }

    await employee.save();

    await logAudit(req, {
      action: 'UPDATE_EMPLOYEE',
      entity: 'Employee',
      entityId: employee._id.toString(),
      details: `Updated employee details for ${employee.employeeCode}`,
      beforeJson: before,
      afterJson: employee.toObject(),
    });

    res.json({ success: true, message: 'Employee profile updated.', data: employee });
  } catch (error) {
    next(error);
  }
});

// CSV Import with Dry-Run validation
router.post('/employees/import-csv', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const { rows, dryRun = true } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ success: false, message: 'Please provide an array of employee rows to import.' });
      return;
    }

    const errors: Array<{ row: number; field: string; reason: string }> = [];
    const validRows: any[] = [];
    const departments = await Department.find();
    const deptMap = new Map<string, any>();
    departments.forEach((d) => {
      deptMap.set(d.code.toUpperCase(), d._id);
      deptMap.set(d.name.toUpperCase(), d._id);
    });

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const row = rows[i];

      // Required fields
      if (!row.employeeCode) errors.push({ row: rowNum, field: 'employeeCode', reason: 'Missing employee code.' });
      if (!row.firstName) errors.push({ row: rowNum, field: 'firstName', reason: 'Missing first name.' });
      if (!row.lastName) errors.push({ row: rowNum, field: 'lastName', reason: 'Missing last name.' });
      if (!row.email) errors.push({ row: rowNum, field: 'email', reason: 'Missing email.' });
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push({ row: rowNum, field: 'email', reason: 'Invalid email format.' });
      }

      // Department check
      const deptKey = (row.department || row.departmentCode || '').toUpperCase();
      const departmentId = deptMap.get(deptKey);
      if (!departmentId) {
        errors.push({ row: rowNum, field: 'department', reason: `Unknown department '${row.department}'.` });
      }

      // Salary check
      const basic = parseFloat(row.basicSalary || row.salary);
      if (isNaN(basic) || basic <= 0) {
        errors.push({ row: rowNum, field: 'basicSalary', reason: 'Basic salary must be greater than 0.' });
      }

      // Check duplicates in existing DB
      if (row.employeeCode) {
        const existCode = await Employee.findOne({ employeeCode: row.employeeCode.toUpperCase() });
        if (existCode) {
          errors.push({ row: rowNum, field: 'employeeCode', reason: `Employee code ${row.employeeCode} already exists.` });
        }
      }
      if (row.email) {
        const existEmail = await User.findOne({ email: row.email.toLowerCase() });
        if (existEmail) {
          errors.push({ row: rowNum, field: 'email', reason: `Email ${row.email} is already in use.` });
        }
      }

      if (errors.filter((e) => e.row === rowNum).length === 0) {
        validRows.push({
          ...row,
          departmentId,
          basicSalary: basic,
        });
      }
    }

    if (dryRun) {
      res.json({
        success: true,
        dryRun: true,
        totalRows: rows.length,
        validCount: validRows.length,
        errorCount: errors.length,
        errors,
        preview: validRows.slice(0, 5),
      });
      return;
    }

    // Execute actual import for valid rows
    const importedEmployees: any[] = [];
    for (const valid of validRows) {
      const basic = valid.basicSalary;
      const hra = Math.round(basic * 0.4);
      const medical = Math.round(basic * 0.1);
      const gross = basic + hra + medical;

      const passwordHash = await hashPassword('Welcome@123');
      const user = await User.create({
        name: `${valid.firstName} ${valid.lastName}`,
        email: valid.email.toLowerCase(),
        passwordHash,
        role: 'employee',
        mustChangePassword: true,
        isActive: true,
      });

      const emp = await Employee.create({
        employeeCode: valid.employeeCode.toUpperCase(),
        firstName: valid.firstName,
        lastName: valid.lastName,
        email: valid.email.toLowerCase(),
        phone: valid.phone,
        departmentId: valid.departmentId,
        basicSalary: basic,
        hra,
        medicalAllowance: medical,
        grossSalary: gross,
        employmentStatus: 'active',
        gender: valid.gender || 'male',
        userId: user._id,
      });

      user.employeeId = emp._id as any;
      await user.save();
      await getOrCreateLeaveBalance(emp._id.toString());
      importedEmployees.push(emp);
    }

    await logAudit(req, {
      action: 'CSV_IMPORT_EMPLOYEES',
      entity: 'Employee',
      details: `Imported ${importedEmployees.length} employees from CSV.`,
    });

    res.json({
      success: true,
      dryRun: false,
      importedCount: importedEmployees.length,
      errors,
    });
  } catch (error) {
    next(error);
  }
});

// CSV Export
router.get('/employees/export-csv', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const employees = await Employee.find()
      .populate('departmentId', 'name code')
      .populate('designationId', 'title')
      .sort({ employeeCode: 1 });

    const headers = [
      'Employee Code',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Department',
      'Designation',
      'Status',
      'Basic Salary',
      'HRA',
      'Medical',
      'Gross Salary',
      'Joining Date',
    ];

    const lines = [headers.join(',')];
    employees.forEach((e: any) => {
      lines.push(
        [
          `"${e.employeeCode}"`,
          `"${e.firstName}"`,
          `"${e.lastName}"`,
          `"${e.email}"`,
          `"${e.phone || ''}"`,
          `"${e.departmentId?.name || ''}"`,
          `"${e.designationId?.title || ''}"`,
          `"${e.employmentStatus}"`,
          e.basicSalary,
          e.hra,
          e.medicalAllowance,
          e.grossSalary,
          `"${e.joiningDate?.toISOString().split('T')[0] || ''}"`,
        ].join(',')
      );
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="saylani_hcm_employees.csv"');
    res.send(lines.join('\n'));
  } catch (error) {
    next(error);
  }
});

export default router;
