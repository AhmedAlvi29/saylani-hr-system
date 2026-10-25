import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Announcement } from '../models/Announcement';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { logAudit } from '../middleware/audit';

const router = Router();

// Announcements: List
router.get('/comms/announcements', authenticate, async (req: Request, res: Response, next) => {
  try {
    const filter: any = { isActive: true };
    if (req.user?.companyId) filter.companyId = req.user.companyId;

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: announcements });
  } catch (error) {
    next(error);
  }
});

// Announcements: Create (Admin & HR)
const announcementSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(5),
  priority: z.enum(['normal', 'important']).default('normal'),
  targetRole: z.enum(['all', 'hr', 'employee']).default('all'),
});

router.post('/comms/announcements', authenticate, requireRole('admin', 'hr'), async (req: Request, res: Response, next) => {
  try {
    const data = announcementSchema.parse(req.body);

    const announcement = await Announcement.create({
      ...data,
      companyId: req.user?.companyId,
      createdBy: req.user!.id,
      authorName: req.user!.name,
    });

    await logAudit(req, {
      action: 'POST_ANNOUNCEMENT',
      entity: 'Announcement',
      entityId: announcement._id.toString(),
      details: `Posted announcement: "${data.title}"`,
    });

    res.status(201).json({ success: true, message: 'Announcement posted.', data: announcement });
  } catch (error) {
    next(error);
  }
});

// Notifications: Get My Notifications
router.get('/comms/notifications', authenticate, async (req: Request, res: Response, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({ userId: req.user!.id, read: false });

    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (error) {
    next(error);
  }
});

// Mark Single Notification as Read
router.patch('/comms/notifications/:id/read', authenticate, async (req: Request, res: Response, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      { read: true },
      { new: true }
    );
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
});

// Mark All Notifications as Read
router.patch('/comms/notifications/read-all', authenticate, async (req: Request, res: Response, next) => {
  try {
    await Notification.updateMany({ userId: req.user!.id, read: false }, { read: true });
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
});

// Audit Log: List & Filter (Admin ONLY!)
router.get('/comms/audit-logs', authenticate, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { action, entity, actorEmail, limit = 50, page = 1 } = req.query;
    const filters = z
      .object({
        action: z.string().optional(),
        entity: z.string().optional(),
        actorEmail: z.string().optional(),
      })
      .parse({ action, entity, actorEmail });

    const filter: any = {};
    if (req.user?.companyId) filter.companyId = req.user.companyId;
    if (filters.action) filter.action = { $eq: filters.action };
    if (filters.entity) filter.entity = { $eq: filters.entity };
    if (filters.actorEmail) filter.actorEmail = { $eq: filters.actorEmail };

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * pageSize;

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
    ]);

    res.json({
      success: true,
      data: {
        logs,
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

export default router;
