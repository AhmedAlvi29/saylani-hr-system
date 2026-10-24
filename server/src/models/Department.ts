import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  companyId?: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DepartmentSchema.index({ companyId: 1, name: 1 });
DepartmentSchema.index({ companyId: 1, code: 1 });

export const Department = mongoose.model<IDepartment>('Department', DepartmentSchema);
