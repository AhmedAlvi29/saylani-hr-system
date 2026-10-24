import mongoose, { Schema, Document } from 'mongoose';

export interface IDesignation extends Document {
  title: string;
  departmentId: mongoose.Types.ObjectId;
  grade?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DesignationSchema = new Schema<IDesignation>(
  {
    title: { type: String, required: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    grade: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DesignationSchema.index({ title: 1, departmentId: 1 }, { unique: true });

export const Designation = mongoose.model<IDesignation>('Designation', DesignationSchema);
