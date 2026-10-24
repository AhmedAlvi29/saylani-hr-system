import mongoose, { Schema, Document } from 'mongoose';

export interface IPolicy extends Document {
  companyId?: mongoose.Types.ObjectId;
  title: string;
  category: 'attendance' | 'leave' | 'payroll' | 'conduct' | 'general';
  content: string;
  isActive: boolean;
  lastUpdatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PolicySchema = new Schema<IPolicy>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['attendance', 'leave', 'payroll', 'conduct', 'general'],
      required: true,
    },
    content: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Policy = mongoose.model<IPolicy>('Policy', PolicySchema);
