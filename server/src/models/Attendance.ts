import mongoose, { Schema, Document } from 'mongoose';

export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'missing_checkout';
export type AttendanceSource = 'web' | 'camera';
export type CorrectionStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface IAttendance extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: string; // "YYYY-MM-DD"
  checkInTime?: Date;
  checkOutTime?: Date;
  status: AttendanceStatus;
  workingHours: number; // in hours, e.g. 7.5
  isLate: boolean;
  lateMinutes: number;
  checkInSource: AttendanceSource;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    distanceMeters?: number;
    isWithinGeofence?: boolean;
  };
  faceVerified?: boolean;
  notes?: string;
  correction: {
    status: CorrectionStatus;
    requestedCheckIn?: Date;
    requestedCheckOut?: Date;
    reason?: string;
    reviewerComment?: string;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: String, required: true, index: true }, // "YYYY-MM-DD"
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    status: {
      type: String,
      enum: ['present', 'late', 'half_day', 'absent', 'missing_checkout'],
      required: true,
      default: 'present',
    },
    workingHours: { type: Number, default: 0 },
    isLate: { type: Boolean, default: false },
    lateMinutes: { type: Number, default: 0 },
    checkInSource: { type: String, enum: ['web', 'camera'], default: 'web' },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      distanceMeters: { type: Number },
      isWithinGeofence: { type: Boolean },
    },
    faceVerified: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    correction: {
      status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
      requestedCheckIn: { type: Date },
      requestedCheckOut: { type: Date },
      reason: { type: String, trim: true },
      reviewerComment: { type: String, trim: true },
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Enforce unique compound index: one attendance record per employee per day
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
