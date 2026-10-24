import mongoose, { Schema, Document } from 'mongoose';

export interface IAiLog extends Document {
  companyId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userRole: string;
  prompt: string;
  toolCalls?: Array<{
    toolName: string;
    arguments: any;
    resultPreview?: any;
  }>;
  responsePreview?: string;
  aiModel: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const AiLogSchema = new Schema<IAiLog>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, required: true },
    prompt: { type: String, required: true },
    toolCalls: { type: [Schema.Types.Mixed], default: [] },
    responsePreview: { type: String },
    aiModel: { type: String, default: 'gemini-2.5-flash' },
    durationMs: { type: Number, default: 0 },
    success: { type: Boolean, default: true },
    errorMessage: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AiLog = mongoose.model<IAiLog>('AiLog', AiLogSchema);
