import mongoose, { Document, Schema } from 'mongoose';
import { TaskPriority, TaskStatus, MediaType } from '../constants/index.js';

export interface ITaskDoc extends Document {
  eventId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  parentTaskId?: mongoose.Types.ObjectId | null;
  title: string;
  description: string;
  zone?: string;
  status: TaskStatus;
  priority: TaskPriority;
  isUrgentEscalated: boolean;
  escalationReason?: string;
  assigneeId?: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  startTime?: Date;
  dueTime: Date;
  completedAt?: Date;
  dependencies: mongoose.Types.ObjectId[];
  evidenceRequired: boolean;
  minEvidenceCount: number;
  evidenceTypes: MediaType[];
  reworkReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITaskDoc>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    parentTaskId: { type: Schema.Types.ObjectId, ref: 'Task', default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    zone: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.TO_DO,
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
    },
    isUrgentEscalated: { type: Boolean, default: false },
    escalationReason: { type: String, trim: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date },
    dueTime: { type: Date, required: true },
    completedAt: { type: Date },
    dependencies: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    evidenceRequired: { type: Boolean, default: true },
    minEvidenceCount: { type: Number, default: 1 },
    evidenceTypes: [{ type: String, enum: Object.values(MediaType) }],
    reworkReason: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ eventId: 1, teamId: 1, status: 1 });
taskSchema.index({ eventId: 1, parentTaskId: 1 });
taskSchema.index({ assigneeId: 1 });
taskSchema.index({ dueTime: 1 });

export const Task = mongoose.model<ITaskDoc>('Task', taskSchema);
