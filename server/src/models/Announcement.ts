import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  companyId?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  priority: 'normal' | 'important';
  targetRole?: 'all' | 'hr' | 'employee';
  createdBy: mongoose.Types.ObjectId;
  authorName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    priority: { type: String, enum: ['normal', 'important'], default: 'normal' },
    targetRole: { type: String, enum: ['all', 'hr', 'employee'], default: 'all' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Announcement = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
