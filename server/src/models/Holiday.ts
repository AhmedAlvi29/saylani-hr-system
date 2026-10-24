import mongoose, { Schema, Document } from 'mongoose';

export interface IHoliday extends Document {
  name: string;
  date: string; // YYYY-MM-DD
  isRecurring: boolean;
  year?: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    name: { type: String, required: true, trim: true },
    date: { type: String, required: true }, // Format "YYYY-MM-DD"
    isRecurring: { type: Boolean, default: false },
    year: { type: Number },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

HolidaySchema.index({ date: 1 }, { unique: true });

export const Holiday = mongoose.model<IHoliday>('Holiday', HolidaySchema);
