import mongoose, { Document, Schema } from 'mongoose';
import { EventRole } from '../constants/index.js';

export interface IEventMembership extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: EventRole;
  teamId?: mongoose.Types.ObjectId;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const eventMembershipSchema = new Schema<IEventMembership>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: Object.values(EventRole),
      required: true,
    },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

eventMembershipSchema.index({ eventId: 1, userId: 1 }, { unique: true });
eventMembershipSchema.index({ eventId: 1, role: 1 });
eventMembershipSchema.index({ teamId: 1 });

export const EventMembership = mongoose.model<IEventMembership>(
  'EventMembership',
  eventMembershipSchema
);
