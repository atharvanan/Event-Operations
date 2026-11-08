import mongoose, { Document, Schema } from 'mongoose';
import { MessageType } from '../constants/index.js';

export interface IMessageDoc extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content?: string;
  messageType: MessageType;
  mediaUrl?: string;
  voiceDurationSeconds?: number;
  taskIdReference?: mongoose.Types.ObjectId;
  replyToMessageId?: mongoose.Types.ObjectId;
  readBy: {
    userId: mongoose.Types.ObjectId;
    readAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessageDoc>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true },
    messageType: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT,
    },
    mediaUrl: { type: String },
    voiceDurationSeconds: { type: Number },
    taskIdReference: { type: Schema.Types.ObjectId, ref: 'Task' },
    replyToMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    readBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessageDoc>('Message', messageSchema);
