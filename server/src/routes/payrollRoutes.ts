import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PayrollRun } from '../models/PayrollRun';
import { Payslip } from '../models/Payslip';
import { Employee } from '../models/Employee';
import { generatePayrollDraft, finalizePayroll } from '../services/payrollService';
import { generatePayslipPdfBuffer } from '../services/pdfService';
import { authenticate } from '../middleware/auth';
import { requireRole, enforceDataScope } from '../middleware/rbac';
import { logAudit } from '../middleware/audit';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(apiLimiter);

// Generate Monthly Payroll Draft (HR or Admin)
const draftSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM'),
});

router.post('/payroll/draft', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const { month } = draftSchema.parse(req.body);

    const result = await generatePayrollDraft(month, req.user!.id, req.user?.companyId);

    await logAudit(req, {
      action: 'GENERATE_PAYROLL_DRAFT',
      entity: 'PayrollRun',
      entityId: (result.run as any)._id.toString(),
      details: `Generated payroll draft for month ${month} for ${result.payslipCount} employees. Total Net: PKR ${result.run.totalNet.toLocaleString()}`,
      afterJson: result.run.toObject(),
    });

    res.status(200).json({
      success: true,
      message: `Payroll draft for ${month} generated with ${result.payslipCount} payslips.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// List All Payroll Runs (HR & Admin)
router.get('/payroll/runs', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const filter = req.user?.companyId ? { companyId: req.user.companyId } : {};
    const runs = await PayrollRun.find(filter)
      .populate('generatedBy', 'name email')
      .populate('finalizedBy', 'name email')
      .sort({ month: -1 });

    res.json({ success: true, data: runs });
  } catch (error) {
    next(error);
  }
});

// Get Single Payroll Run Details and Payslips (HR & Admin)
router.get('/payroll/runs/:month', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const month = String(req.params.month).trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({ success: false, message: 'Invalid month format (YYYY-MM).' });
      return;
    }
    const filter: any = { month };
    if (req.user?.companyId) filter.companyId = String(req.user.companyId);

    const run = await PayrollRun.findOne(filter)
      .populate('generatedBy', 'name email')
      .populate('finalizedBy', 'name email');

    if (!run) {
      res.status(404).json({ success: false, message: `No payroll records found for ${month}.` });
      return;
    }

    const payslips = await Payslip.find({ payrollRunId: run._id })
      .populate({
        path: 'employeeId',
        select: 'employeeCode firstName lastName email departmentId designationId',
        populate: [
          { path: 'departmentId', select: 'name code' },
          { path: 'designationId', select: 'title' },
        ],
      })
      .sort({ netSalary: -1 });

    res.json({
      success: true,
      data: {
        run,
        payslips,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Finalize & Lock Monthly Payroll (Admin ONLY!)
router.post('/payroll/runs/:month/finalize', authenticate, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const month = String(req.params.month).trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({ success: false, message: 'Invalid month format (YYYY-MM).' });
      return;
    }
    const run = await finalizePayroll(month, req.user!.id, req.user?.companyId);

    await logAudit(req, {
      action: 'FINALIZE_AND_LOCK_PAYROLL',
      entity: 'PayrollRun',
      entityId: run._id.toString(),
      details: `Admin finalized and permanently locked payroll for month ${month}. Total payout: PKR ${run.totalNet.toLocaleString()}`,
      afterJson: run.toObject(),
    });

    res.json({
      success: true,
      message: `Payroll for ${month} finalized and locked successfully. Payslips published to employees.`,
      data: run,
    });
  } catch (error) {
    next(error);
  }
});

// Get My Payslips (Employee Self-Service)
router.get('/payroll/my-payslips', authenticate, async (req: Request, res: Response, next) => {
  try {
    const employeeId = req.user?.employeeId ? String(req.user.employeeId).trim() : undefined;
    if (!employeeId || !/^[0-9a-fA-F]{24}$/.test(employeeId)) {
      res.json({ success: true, data: [] });
      return;
    }

    // Only show locked/finalized payslips to employees, or all if admin/HR
    const filter: any = { employeeId };
    if (req.user?.role === 'employee') {
      filter.isLocked = true;
    }

    const payslips = await Payslip.find(filter).sort({ month: -1 });
    res.json({ success: true, data: payslips });
  } catch (error) {
    next(error);
  }
});

// Download Official PDF Payslip
router.get('/payroll/payslip/:id/pdf', authenticate, async (req: Request, res: Response, next) => {
  try {
    const id = String(req.params.id).trim();
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      res.status(400).json({ success: false, message: 'Invalid payslip ID.' });
      return;
    }
    const payslip = await Payslip.findById(id);
    if (!payslip) {
      res.status(404).json({ success: false, message: 'Payslip not found.' });
      return;
    }

    // Strict Scope check: Employee can only download own payslip!
    if (req.user?.role === 'employee' && payslip.employeeId.toString() !== req.user.employeeId) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot access another employee’s payslip.' });
      return;
    }

    const employee = await Employee.findById(payslip.employeeId)
      .populate('departmentId', 'name code')
      .populate('designationId', 'title');

    if (!employee) {
      res.status(404).json({ success: false, message: 'Associated employee record not found.' });
      return;
    }

    const pdfBuffer = await generatePayslipPdfBuffer(payslip, employee);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Payslip_${employee.employeeCode}_${payslip.month}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
