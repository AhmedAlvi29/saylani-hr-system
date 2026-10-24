import mongoose, { Schema, Document } from 'mongoose';

export type EmploymentStatus = 'active' | 'probation' | 'leaver' | 'inactive';
export type Gender = 'male' | 'female' | 'other';

export interface IEmployee extends Document {
  companyId?: mongoose.Types.ObjectId;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  departmentId: mongoose.Types.ObjectId;
  designationId?: mongoose.Types.ObjectId;
  joiningDate: Date;
  exitDate?: Date;
  employmentStatus: EmploymentStatus;
  gender: Gender;
  basicSalary: number;
  hra: number; // 40% of basic
  medicalAllowance: number; // 10% of basic
  grossSalary: number; // 1.5 * basic
  userId?: mongoose.Types.ObjectId;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    employeeCode: { type: String, required: true, uppercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    designationId: { type: Schema.Types.ObjectId, ref: 'Designation' },
    joiningDate: { type: Date, required: true, default: Date.now },
    exitDate: { type: Date },
    employmentStatus: {
      type: String,
      enum: ['active', 'probation', 'leaver', 'inactive'],
      default: 'active',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'male',
    },
    basicSalary: { type: Number, required: true, min: 0 },
    hra: { type: Number, required: true, min: 0 },
    medicalAllowance: { type: Number, required: true, min: 0 },
    grossSalary: { type: Number, required: true, min: 0 },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

EmployeeSchema.index({ companyId: 1, employeeCode: 1 });
EmployeeSchema.index({ companyId: 1, email: 1 });

// Helpful virtual for full name
EmployeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

EmployeeSchema.set('toJSON', { virtuals: true });
EmployeeSchema.set('toObject', { virtuals: true });

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
