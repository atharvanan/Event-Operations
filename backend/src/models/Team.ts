import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamDoc extends Document {
  eventId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  leadId?: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  colorHex: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeamDoc>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'User' },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    colorHex: { type: String, default: '#3B82F6' },
    icon: { type: String, default: 'Users' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

teamSchema.index({ eventId: 1, name: 1 });

export const Team = mongoose.model<ITeamDoc>('Team', teamSchema);
