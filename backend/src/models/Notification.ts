import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationDoc extends Document {
  recipientId: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  type: string;
  title: string;
  body: string;
  entityType?: 'task' | 'evidence' | 'chat' | 'event';
  entityId?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotificationDoc>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    entityType: { type: String, enum: ['task', 'evidence', 'chat', 'event'] },
    entityId: { type: Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotificationDoc>('Notification', notificationSchema);
