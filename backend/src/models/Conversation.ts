import mongoose, { Document, Schema } from 'mongoose';
import { ConversationType } from '../constants/index.js';

export interface IConversationDoc extends Document {
  eventId: mongoose.Types.ObjectId;
  type: ConversationType;
  title: string;
  teamId?: mongoose.Types.ObjectId;
  participantIds: mongoose.Types.ObjectId[];
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversationDoc>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    type: {
      type: String,
      enum: Object.values(ConversationType),
      required: true,
    },
    title: { type: String, required: true, trim: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    participantIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lastMessageAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ eventId: 1, type: 1 });
conversationSchema.index({ participantIds: 1 });

export const Conversation = mongoose.model<IConversationDoc>('Conversation', conversationSchema);
