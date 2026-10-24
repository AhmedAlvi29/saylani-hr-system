import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
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
