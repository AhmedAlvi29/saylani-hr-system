import mongoose, { Schema, Document } from 'mongoose';

export type PayrollStatus = 'draft' | 'finalized';

export interface IPayrollRun extends Document {
  companyId?: mongoose.Types.ObjectId;
  month: string; // "YYYY-MM"
  year: number;
  workingDays: number;
  status: PayrollStatus;
  totalGross: number;
  totalDeductions: number;
  totalTax: number;
  totalNet: number;
  employeeCount: number;
  generatedBy: mongoose.Types.ObjectId;
  finalizedBy?: mongoose.Types.ObjectId;
  finalizedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollRunSchema = new Schema<IPayrollRun>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    month: { type: String, required: true, index: true }, // "YYYY-MM"
    year: { type: Number, required: true },
    workingDays: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
    totalGross: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    totalNet: { type: Number, default: 0 },
    employeeCount: { type: Number, default: 0 },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    finalizedAt: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

PayrollRunSchema.index({ companyId: 1, month: 1 });

export const PayrollRun = mongoose.model<IPayrollRun>('PayrollRun', PayrollRunSchema);
