import mongoose, { Document, Schema } from 'mongoose';

export interface ITaskActivityDoc extends Document {
  taskId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  action: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const taskActivitySchema = new Schema<ITaskActivityDoc>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    previousValue: { type: String },
    newValue: { type: String },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

taskActivitySchema.index({ taskId: 1, createdAt: -1 });

export const TaskActivity = mongoose.model<ITaskActivityDoc>('TaskActivity', taskActivitySchema);
