import mongoose, { Document, Schema } from 'mongoose';
import { TaskPriority, MediaType } from '../constants/index.js';

export interface ITemplateTask {
  title: string;
  description: string;
  priority: TaskPriority;
  offsetHoursFromStart: number;
  durationHours: number;
  evidenceRequired: boolean;
  minEvidenceCount: number;
  evidenceTypes: MediaType[];
  subtasks?: {
    title: string;
    description: string;
    priority: TaskPriority;
    durationHours: number;
    evidenceRequired: boolean;
  }[];
}

export interface ITemplateTeam {
  name: string;
  description: string;
  colorHex: string;
  icon: string;
  tasks: ITemplateTask[];
}

export interface IEventTemplateDoc extends Document {
  name: string;
  category: string;
  description: string;
  defaultZones: string[];
  teams: ITemplateTeam[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const eventTemplateSchema = new Schema<IEventTemplateDoc>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    defaultZones: [{ type: String, trim: true }],
    teams: [
      {
        name: { type: String, required: true },
        description: { type: String },
        colorHex: { type: String, default: '#3B82F6' },
        icon: { type: String, default: 'Users' },
        tasks: [
          {
            title: { type: String, required: true },
            description: { type: String },
            priority: {
              type: String,
              enum: Object.values(TaskPriority),
              default: TaskPriority.MEDIUM,
            },
            offsetHoursFromStart: { type: Number, default: 0 },
            durationHours: { type: Number, default: 2 },
            evidenceRequired: { type: Boolean, default: true },
            minEvidenceCount: { type: Number, default: 1 },
            evidenceTypes: [{ type: String, enum: Object.values(MediaType) }],
            subtasks: [
              {
                title: { type: String, required: true },
                description: { type: String },
                priority: {
                  type: String,
                  enum: Object.values(TaskPriority),
                  default: TaskPriority.MEDIUM,
                },
                durationHours: { type: Number, default: 1 },
                evidenceRequired: { type: Boolean, default: false },
              },
            ],
          },
        ],
      },
    ],
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const EventTemplate = mongoose.model<IEventTemplateDoc>(
  'EventTemplate',
  eventTemplateSchema
);
