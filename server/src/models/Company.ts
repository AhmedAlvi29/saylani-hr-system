import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  code?: string;
  timezone: string;
  officeStartTime: string; // e.g. "09:00"
  graceMinutes: number; // default 15
  halfDayThresholdHours: number; // default 5
  weekendDays: number[]; // default [0, 6] (Sun, Sat)
  officeLocation: {
    latitude: number;
    longitude: number;
    radiusMeters: number; // default 150
  };
  isSetupComplete: boolean;
  initializedAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: 'SAYLANI' },
    timezone: { type: String, default: 'Asia/Karachi' },
    officeStartTime: { type: String, default: '09:00' },
    graceMinutes: { type: Number, default: 15 },
    halfDayThresholdHours: { type: Number, default: 5 },
    weekendDays: { type: [Number], default: [0, 6] },
    officeLocation: {
      latitude: { type: Number, default: 24.8607 },
      longitude: { type: Number, default: 67.0011 },
      radiusMeters: { type: Number, default: 150 },
    },
    isSetupComplete: { type: Boolean, default: false },
    initializedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
