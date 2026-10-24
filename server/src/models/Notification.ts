import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 'leave' | 'payroll' | 'attendance' | 'announcement' | 'system';

export interface INotification extends Document {
  companyId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['leave', 'payroll', 'attendance', 'announcement', 'system'],
      default: 'system',
    },
    read: { type: Boolean, default: false, index: true },
    link: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
