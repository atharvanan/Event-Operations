import mongoose, { Document, Schema } from 'mongoose';
import { EvidenceReviewStatus, MediaType } from '../constants/index.js';

export interface IEvidenceDoc extends Document {
  taskId: mongoose.Types.ObjectId;
  uploaderId: mongoose.Types.ObjectId;
  fileUrl: string;
  thumbnailUrl?: string;
  mediaType: MediaType;
  fileSizeBytes: number;
  caption?: string;
  stage: 'during_progress' | 'completion_proof';
  reviewStatus: EvidenceReviewStatus;
  reviewerId?: mongoose.Types.ObjectId;
  reviewNote?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const evidenceSchema = new Schema<IEvidenceDoc>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    uploaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    mediaType: {
      type: String,
      enum: Object.values(MediaType),
      default: MediaType.PHOTO,
    },
    fileSizeBytes: { type: Number, default: 0 },
    caption: { type: String, trim: true },
    stage: {
      type: String,
      enum: ['during_progress', 'completion_proof'],
      default: 'completion_proof',
    },
    reviewStatus: {
      type: String,
      enum: Object.values(EvidenceReviewStatus),
      default: EvidenceReviewStatus.PENDING,
    },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, trim: true },
    reviewedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

evidenceSchema.index({ taskId: 1, reviewStatus: 1 });
evidenceSchema.index({ uploaderId: 1 });

export const Evidence = mongoose.model<IEvidenceDoc>('Evidence', evidenceSchema);
