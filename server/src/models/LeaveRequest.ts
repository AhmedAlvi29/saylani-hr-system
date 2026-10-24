import mongoose, { Schema, Document } from 'mongoose';

export type LeaveType = 'annual' | 'sick' | 'casual' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ILeaveRequest extends Document {
  companyId?: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  workingDays: number;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewerComment?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveType: {
      type: String,
      enum: ['annual', 'sick', 'casual', 'unpaid'],
      required: true,
    },
    startDate: { type: String, required: true, index: true },
    endDate: { type: String, required: true, index: true },
    workingDays: { type: Number, required: true, min: 0.5 },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewerComment: { type: String, trim: true },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export const LeaveRequest = mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
