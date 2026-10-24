import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveBalance extends Document {
  employeeId: mongoose.Types.ObjectId;
  year: number;
  annualQuota: number; // default 14
  sickQuota: number; // default 8
  casualQuota: number; // default 10
  annualUsed: number;
  sickUsed: number;
  casualUsed: number;
  unpaidUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    year: { type: Number, required: true, default: () => new Date().getFullYear() },
    annualQuota: { type: Number, default: 14 },
    sickQuota: { type: Number, default: 8 },
    casualQuota: { type: Number, default: 10 },
    annualUsed: { type: Number, default: 0 },
    sickUsed: { type: Number, default: 0 },
    casualUsed: { type: Number, default: 0 },
    unpaidUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

LeaveBalanceSchema.index({ employeeId: 1, year: 1 }, { unique: true });

export const LeaveBalance = mongoose.model<ILeaveBalance>('LeaveBalance', LeaveBalanceSchema);
