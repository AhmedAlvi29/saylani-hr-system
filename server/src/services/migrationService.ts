import { Company } from '../models/Company';
import { User } from '../models/User';
import { Employee } from '../models/Employee';
import { Department } from '../models/Department';
import { Designation } from '../models/Designation';
import { Holiday } from '../models/Holiday';
import { Attendance } from '../models/Attendance';
import { LeaveRequest } from '../models/LeaveRequest';
import { LeaveBalance } from '../models/LeaveBalance';
import { PayrollRun } from '../models/PayrollRun';
import { Payslip } from '../models/Payslip';
import { Announcement } from '../models/Announcement';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';
import { AiLog } from '../models/AiLog';
import { Policy } from '../models/Policy';

export async function ensureDataIsolationMigration(): Promise<void> {
  try {
    // 1. Locate primary seeded company (e.g. Saylani Systems Ltd or first registered company)
    let primaryCompany = await Company.findOne();
    if (!primaryCompany) {
      return;
    }

    const companyId = primaryCompany._id;

    // 2. Link any unlinked User records
    await User.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );

    // 3. Link any unlinked Employee records
    await Employee.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );

    // 4. Link Departments & Designations
    await Department.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );
    await Designation.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );

    // 5. Link Holidays & Policies
    await Holiday.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );
    await Policy.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );

    // 6. Link Attendance, Leaves & Payroll
    await Attendance.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );
    await LeaveRequest.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );
    await LeaveBalance.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );
    await PayrollRun.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );
    await Payslip.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );

    // 7. Link Comms & Logs
    await Announcement.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );
    await Notification.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );
    await AuditLog.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );
    await AiLog.updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
      { $set: { companyId } }
    );

    console.log(`[Database Migration] ✅ Verified data isolation links for company: "${primaryCompany.name}"`);
  } catch (err: any) {
    console.warn('[Database Migration] Migration warning:', err.message);
  }
}
