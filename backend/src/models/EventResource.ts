import mongoose, { Document, Schema } from 'mongoose';

export interface IEventResourceDoc extends Document {
  eventId: mongoose.Types.ObjectId;
  uploaderId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: 'Floor Plan' | 'Schedule' | 'Checklist' | 'Briefing' | 'Media' | 'Other';
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

const eventResourceSchema = new Schema<IEventResourceDoc>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    uploaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: {
      type: String,
      enum: ['Floor Plan', 'Schedule', 'Checklist', 'Briefing', 'Media', 'Other'],
      default: 'Other',
    },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSizeBytes: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

eventResourceSchema.index({ eventId: 1, category: 1 });

export const EventResource = mongoose.model<IEventResourceDoc>('EventResource', eventResourceSchema);

