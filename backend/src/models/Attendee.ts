import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendeeDoc extends Document {
  eventId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  ticketCode: string;
  qrPayload: string;
  ticketType: 'General' | 'VIP' | 'Speaker' | 'Staff';
  status: 'registered' | 'checked_in' | 'cancelled';
  checkedInAt?: Date;
  checkedInBy?: mongoose.Types.ObjectId;
  checkInIdempotencyKey?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendeeSchema = new Schema<IAttendeeDoc>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    ticketCode: { type: String, required: true, trim: true, uppercase: true },
    qrPayload: { type: String, required: true, trim: true },
    ticketType: {
      type: String,
      enum: ['General', 'VIP', 'Speaker', 'Staff'],
      default: 'General',
    },
    status: {
      type: String,
      enum: ['registered', 'checked_in', 'cancelled'],
      default: 'registered',
    },
    checkedInAt: { type: Date },
    checkedInBy: { type: Schema.Types.ObjectId, ref: 'User' },
    checkInIdempotencyKey: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

attendeeSchema.index({ eventId: 1, ticketCode: 1 }, { unique: true });
attendeeSchema.index({ eventId: 1, email: 1 }, { unique: true });
attendeeSchema.index({ eventId: 1, status: 1 });

export const Attendee = mongoose.model<IAttendeeDoc>('Attendee', attendeeSchema);

