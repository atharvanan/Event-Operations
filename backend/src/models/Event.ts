import mongoose, { Document, Schema } from 'mongoose';

export interface IEventDoc extends Document {
  orgId: mongoose.Types.ObjectId;
  name: string;
  type: string;
  venue: string;
  timezone: string;
  zones: string[];
  managerId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'live_setup' | 'in_progress' | 'completed' | 'archived';
  description?: string;
  permissions: {
    allowWorkersGlobalChat: boolean;
    allowWorkersTeamChat: boolean;
    requireLeadReviewFirst: boolean;
    allowLeadTaskCreation: boolean;
    allowWorkerSelfAssignment: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEventDoc>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, default: 'wedding', trim: true },
    venue: { type: String, required: true, trim: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    zones: [{ type: String, trim: true }],
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['planning', 'live_setup', 'in_progress', 'completed', 'archived'],
      default: 'planning',
    },
    description: { type: String, trim: true },
    permissions: {
      allowWorkersGlobalChat: { type: Boolean, default: true },
      allowWorkersTeamChat: { type: Boolean, default: true },
      requireLeadReviewFirst: { type: Boolean, default: true },
      allowLeadTaskCreation: { type: Boolean, default: true },
      allowWorkerSelfAssignment: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ orgId: 1, status: 1 });

export const Event = mongoose.model<IEventDoc>('Event', eventSchema);
