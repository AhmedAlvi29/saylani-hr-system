import { Request } from 'express';
import { AuditLog } from '../models/AuditLog';
import mongoose from 'mongoose';

interface AuditOptions {
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  beforeJson?: any;
  afterJson?: any;
}

export const logAudit = async (req: Request, options: AuditOptions): Promise<void> => {
  try {
    const actorId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;
    const actorEmail = req.user?.email || 'system@saylani.org';
    const actorRole = req.user?.role || 'system';

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    await AuditLog.create({
      actorId,
      actorEmail,
      actorRole,
      action: options.action,
      entity: options.entity,
      entityId: options.entityId,
      details: options.details,
      beforeJson: options.beforeJson,
      afterJson: options.afterJson,
      ipAddress,
      userAgent,
    });
  } catch (err: any) {
    console.error('[AuditLog] Failed to record audit log:', err.message);
  }
};
