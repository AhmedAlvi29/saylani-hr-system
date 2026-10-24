import mongoose, { Schema, Document } from 'mongoose';

export interface IPayslip extends Document {
  payrollRunId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  month: string; // "YYYY-MM"
  basicSalary: number;
  hra: number;
  medicalAllowance: number;
  grossSalary: number;
  prorationFactor: number; // default 1.0
  proratedGross: number;
  dailyRate: number; // gross / workingDays
  workingDays: number;
  presentDays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  halfDays: number;
  lateDays: number;
  latePenaltyDays: number; // 3 lates = 0.5 day
  absentDeduction: number;
  unpaidDeduction: number;
  halfDayDeduction: number;
  lateDeduction: number;
  totalDeductions: number;
  annualGross: number; // gross * 12
  annualTax: number;
  monthlyTax: number;
  netSalary: number;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PayslipSchema = new Schema<IPayslip>(
  {
    payrollRunId: { type: Schema.Types.ObjectId, ref: 'PayrollRun', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    month: { type: String, required: true, index: true },
    basicSalary: { type: Number, required: true },
    hra: { type: Number, required: true },
    medicalAllowance: { type: Number, required: true },
    grossSalary: { type: Number, required: true },
    prorationFactor: { type: Number, default: 1 },
    proratedGross: { type: Number, required: true },
    dailyRate: { type: Number, required: true },
    workingDays: { type: Number, required: true },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    latePenaltyDays: { type: Number, default: 0 },
    absentDeduction: { type: Number, default: 0 },
    unpaidDeduction: { type: Number, default: 0 },
    halfDayDeduction: { type: Number, default: 0 },
    lateDeduction: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    annualGross: { type: Number, required: true },
    annualTax: { type: Number, default: 0 },
    monthlyTax: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PayslipSchema.index({ payrollRunId: 1, employeeId: 1 }, { unique: true });
PayslipSchema.index({ employeeId: 1, month: 1 }, { unique: true });

export const Payslip = mongoose.model<IPayslip>('Payslip', PayslipSchema);
