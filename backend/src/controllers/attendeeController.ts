import { Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Attendee } from '../models/Attendee.js';
import { Event } from '../models/Event.js';
import { EventMembership } from '../models/EventMembership.js';
import { OrganizationMembership } from '../models/OrganizationMembership.js';
import { EventRole, OrgRole } from '../constants/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { getIO } from '../sockets/io.js';
import { sanitizeHtml } from '../utils/sanitize.js';

async function checkEventMembership(
  eventId: string,
  userId: mongoose.Types.ObjectId,
  allowedRoles?: EventRole[]
) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return { ok: false, status: 404, message: 'Event not found.' };
  }

  const event = await Event.findById(eventId);
  if (!event) {
    return { ok: false, status: 404, message: 'Event not found.' };
  }

  const isManager = event.managerId.toString() === userId.toString();
  if (isManager) {
    return { ok: true, event, role: EventRole.EVENT_MANAGER };
  }

  const orgMembership = await OrganizationMembership.findOne({
    orgId: event.orgId,
    userId,
    status: 'active',
  });
  if (
    orgMembership &&
    (orgMembership.role === OrgRole.OWNER || orgMembership.role === OrgRole.ADMIN)
  ) {
    return { ok: true, event, role: EventRole.EVENT_MANAGER };
  }

  const membership = await EventMembership.findOne({
    eventId: event._id,
    userId,
    status: 'active',
  });

  if (!membership) {
    return {
      ok: false,
      status: 403,
      message: 'Forbidden. You do not have access to this event.',
    };
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    return {
      ok: false,
      status: 403,
      message: 'Forbidden. Insufficient event permissions for this action.',
    };
  }

  return { ok: true, event, role: membership.role };
}

function generateTicketCode(): string {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `EO-${random}`;
}

export const getAttendees = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { search, status } = req.query;

    const access = await checkEventMembership(eventId, req.user!._id);
    if (!access.ok) {
      res.status(access.status!).json({ success: false, message: access.message });
      return;
    }

    const filter: any = { eventId: access.event!._id };
    if (status && typeof status === 'string') {
      filter.status = status;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { ticketCode: { $regex: q, $options: 'i' } },
      ];
    }

    const [attendees, registeredCount, checkedInCount] = await Promise.all([
      Attendee.find(filter)
        .populate('checkedInBy', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
      Attendee.countDocuments({ eventId: access.event!._id, status: { $ne: 'cancelled' } }),
      Attendee.countDocuments({ eventId: access.event!._id, status: 'checked_in' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        attendees,
        stats: {
          registeredCount,
          checkedInCount,
          capacity: access.event!.registrationConfig?.capacity || 500,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error retrieving attendees.' });
  }
};

export const registerAttendee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { name, email, phone, ticketType, notes } = req.body;

    const access = await checkEventMembership(eventId, req.user!._id, [
      EventRole.EVENT_MANAGER,
      EventRole.TEAM_LEAD,
    ]);
    if (!access.ok) {
      res.status(access.status!).json({ success: false, message: access.message });
      return;
    }

    const event = access.event!;
    if (event.registrationConfig && event.registrationConfig.enabled === false) {
      res.status(400).json({
        success: false,
        message: 'Registration is currently closed for this event.',
      });
      return;
    }

    if (!name || !email) {
      res.status(400).json({
        success: false,
        message: 'Attendee name and email address are required.',
      });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await Attendee.findOne({ eventId: event._id, email: normalizedEmail });
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'An attendee with this email is already registered for this event.',
      });
      return;
    }

    const capacity = event.registrationConfig?.capacity || 500;
    const activeCount = await Attendee.countDocuments({
      eventId: event._id,
      status: { $ne: 'cancelled' },
    });
    if (activeCount >= capacity) {
      res.status(400).json({
        success: false,
        message: `Event attendee capacity (${capacity}) has been reached.`,
      });
      return;
    }

    let ticketCode = generateTicketCode();
    let collision = await Attendee.exists({ eventId: event._id, ticketCode });
    while (collision) {
      ticketCode = generateTicketCode();
      collision = await Attendee.exists({ eventId: event._id, ticketCode });
    }

    const qrPayload = `EVENTOPS:${event._id.toString()}:${ticketCode}`;

    const attendee = await Attendee.create({
      eventId: event._id,
      name: sanitizeHtml(String(name).trim()),
      email: normalizedEmail,
      phone: phone ? sanitizeHtml(String(phone).trim()) : undefined,
      ticketCode,
      qrPayload,
      ticketType: ['General', 'VIP', 'Speaker', 'Staff'].includes(ticketType)
        ? ticketType
        : 'General',
      notes: notes ? sanitizeHtml(String(notes).trim()) : undefined,
      status: 'registered',
    });

    res.status(201).json({ success: true, data: attendee });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error registering attendee.' });
  }
};

export const checkInAttendee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { qrPayload, ticketCode, attendeeId, idempotencyKey } = req.body;

    const access = await checkEventMembership(eventId, req.user!._id, [
      EventRole.EVENT_MANAGER,
      EventRole.TEAM_LEAD,
      EventRole.TEAM_MEMBER,
    ]);
    if (!access.ok) {
      res.status(access.status!).json({ success: false, message: access.message });
      return;
    }

    const event = access.event!;
    if (event.registrationConfig && event.registrationConfig.checkInOpen === false) {
      res.status(400).json({
        success: false,
        code: 'CHECKIN_CLOSED',
        message: 'Check-in is currently paused for this event.',
      });
      return;
    }

    let lookupCode = ticketCode ? String(ticketCode).trim().toUpperCase() : '';
    if (qrPayload && typeof qrPayload === 'string') {
      const trimmed = qrPayload.trim();
      if (trimmed.startsWith('EVENTOPS:')) {
        const parts = trimmed.split(':');
        if (parts.length !== 3 || parts[1] !== event._id.toString()) {
          res.status(404).json({
            success: false,
            code: 'INVALID_TICKET',
            message: 'Invalid QR ticket or pass belongs to a different event.',
          });
          return;
        }
        lookupCode = parts[2].toUpperCase();
      } else {
        lookupCode = trimmed.toUpperCase();
      }
    }

    let attendee: any = null;
    if (attendeeId && mongoose.Types.ObjectId.isValid(attendeeId)) {
      attendee = await Attendee.findOne({ _id: attendeeId, eventId: event._id });
    } else if (lookupCode) {
      attendee = await Attendee.findOne({ eventId: event._id, ticketCode: lookupCode });
    }

    if (!attendee) {
      res.status(404).json({
        success: false,
        code: 'INVALID_TICKET',
        message: 'Ticket code not found for this event. Verify the pass and try again.',
      });
      return;
    }

    if (attendee.status === 'cancelled') {
      res.status(400).json({
        success: false,
        code: 'TICKET_CANCELLED',
        message: `Ticket ${attendee.ticketCode} has been cancelled and cannot be checked in.`,
        data: attendee,
      });
      return;
    }

    if (attendee.status === 'checked_in') {
      if (idempotencyKey && attendee.checkInIdempotencyKey === idempotencyKey) {
        const populated = await Attendee.findById(attendee._id).populate('checkedInBy', 'name email');
        res.status(200).json({
          success: true,
          code: 'CHECKED_IN',
          message: `${attendee.name} is checked in.`,
          data: populated,
        });
        return;
      }

      const populated = await Attendee.findById(attendee._id).populate('checkedInBy', 'name email');
      res.status(409).json({
        success: false,
        code: 'ALREADY_CHECKED_IN',
        message: `${attendee.name} (${attendee.ticketCode}) was already checked in${
          attendee.checkedInAt
            ? ` at ${new Date(attendee.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : ''
        }.`,
        data: populated,
      });
      return;
    }

    attendee.status = 'checked_in';
    attendee.checkedInAt = new Date();
    attendee.checkedInBy = req.user!._id;
    if (idempotencyKey) {
      attendee.checkInIdempotencyKey = String(idempotencyKey);
    }
    await attendee.save();

    const populated = await Attendee.findById(attendee._id).populate('checkedInBy', 'name email');

    const socketIO = getIO();
    if (socketIO) {
      socketIO.emit('attendee:checked_in', {
        eventId: event._id.toString(),
        attendee: populated,
      });
    }

    res.status(200).json({
      success: true,
      code: 'CHECKED_IN',
      message: `${attendee.name} checked in successfully!`,
      data: populated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error processing check-in.' });
  }
};

export const updateAttendee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId, attendeeId } = req.params;
    const { status, ticketType, notes } = req.body;

    const access = await checkEventMembership(eventId, req.user!._id, [
      EventRole.EVENT_MANAGER,
      EventRole.TEAM_LEAD,
    ]);
    if (!access.ok) {
      res.status(access.status!).json({ success: false, message: access.message });
      return;
    }

    const attendee = await Attendee.findOne({ _id: attendeeId, eventId: access.event!._id });
    if (!attendee) {
      res.status(404).json({ success: false, message: 'Attendee not found.' });
      return;
    }

    if (status && ['registered', 'checked_in', 'cancelled'].includes(status)) {
      attendee.status = status;
      if (status === 'registered') {
        attendee.checkedInAt = undefined;
        attendee.checkedInBy = undefined;
        attendee.checkInIdempotencyKey = undefined;
      } else if (status === 'checked_in' && !attendee.checkedInAt) {
        attendee.checkedInAt = new Date();
        attendee.checkedInBy = req.user!._id;
      }
    }
    if (ticketType && ['General', 'VIP', 'Speaker', 'Staff'].includes(ticketType)) {
      attendee.ticketType = ticketType;
    }
    if (notes !== undefined) {
      attendee.notes = sanitizeHtml(String(notes).trim());
    }

    await attendee.save();
    const populated = await Attendee.findById(attendee._id).populate('checkedInBy', 'name email');
    res.status(200).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating attendee.' });
  }
};

