import mongoose, { Schema, Document } from 'mongoose';

export interface IDesignation extends Document {
  companyId?: mongoose.Types.ObjectId;
  title: string;
  departmentId: mongoose.Types.ObjectId;
  grade?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DesignationSchema = new Schema<IDesignation>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    title: { type: String, required: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    grade: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DesignationSchema.index({ companyId: 1, title: 1, departmentId: 1 });

export const Designation = mongoose.model<IDesignation>('Designation', DesignationSchema);
