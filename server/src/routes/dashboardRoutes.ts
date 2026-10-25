import { Router, Request, Response } from 'express';
import {
  getAdminDashboardMetrics,
  getHrDashboardMetrics,
  getEmployeeDashboardMetrics,
} from '../services/dashboardService';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(apiLimiter);

// Admin Dashboard
router.get('/dashboard/admin', authenticate, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const data = await getAdminDashboardMetrics(req.user?.companyId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// HR Dashboard
router.get('/dashboard/hr', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const data = await getHrDashboardMetrics(req.user?.companyId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Employee Self-Service Dashboard
router.get('/dashboard/employee', authenticate, async (req: Request, res: Response, next) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      res.json({
        success: true,
        data: {
          todayAttendance: null,
          workingHoursThisWeek: 0,
          weeklyTargetHours: 40,
          lateCountThisMonth: 0,
          leaveBalances: {
            annual: { total: 14, used: 0, remaining: 14 },
            sick: { total: 8, used: 0, remaining: 8 },
            casual: { total: 10, used: 0, remaining: 10 },
            unpaid: { used: 0 },
          },
          lastPayslip: null,
          announcements: [],
        },
      });
      return;
    }

    const data = await getEmployeeDashboardMetrics(employeeId, req.user?.companyId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
