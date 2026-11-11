import { Response } from 'express';
import mongoose from 'mongoose';
import { Event } from '../models/Event.js';
import { EventMembership } from '../models/EventMembership.js';
import { OrganizationMembership } from '../models/OrganizationMembership.js';
import { Team } from '../models/Team.js';
import { Task } from '../models/Task.js';
import { Attendee } from '../models/Attendee.js';
import { Evidence } from '../models/Evidence.js';
import { EventResource } from '../models/EventResource.js';
import { OrgRole, EventRole, TaskStatus } from '../constants/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { sanitizeHtml } from '../utils/sanitize.js';

async function getUserAuthorizedEventIds(userId: mongoose.Types.ObjectId) {
  const [eventMemberships, orgMemberships] = await Promise.all([
    EventMembership.find({ userId, status: 'active' }).select('eventId role teamId'),
    OrganizationMembership.find({ userId, status: 'active' }).select('orgId role'),
  ]);

  const adminOrgIds = orgMemberships
    .filter((m) => m.role === OrgRole.OWNER || m.role === OrgRole.ADMIN)
    .map((m) => m.orgId);

  const memberEventIds = eventMemberships.map((m) => m.eventId);

  const events = await Event.find({
    $or: [
      { _id: { $in: memberEventIds } },
      { managerId: userId },
      ...(adminOrgIds.length > 0 ? [{ orgId: { $in: adminOrgIds } }] : []),
    ],
  })
    .populate('managerId', 'name email phone avatarUrl')
    .sort({ startDate: 1 })
    .lean();

  return { events, eventMemberships, orgMemberships };
}

export const getDashboardSummary = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { events } = await getUserAuthorizedEventIds(userId);
    const eventIds = events.map((e) => e._id);

    const [
      totalAttendees,
      openTasksCount,
      attendeeAgg,
      taskAgg,
      teams,
      myUrgentTasks,
    ] = await Promise.all([
      Attendee.countDocuments({ eventId: { $in: eventIds }, status: { $ne: 'cancelled' } }),
      Task.countDocuments({
        eventId: { $in: eventIds },
        status: { $nin: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
      }),
      Attendee.aggregate([
        { $match: { eventId: { $in: eventIds }, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: '$eventId',
            registeredCount: { $sum: 1 },
            checkedInCount: { $sum: { $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0] } },
          },
        },
      ]),
      Task.aggregate([
        { $match: { eventId: { $in: eventIds } } },
        {
          $group: {
            _id: '$eventId',
            totalTasksCount: { $sum: 1 },
            completedTasksCount: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          },
        },
      ]),
      Team.find({ eventId: { $in: eventIds }, isActive: true }).select('leadId memberIds').lean(),
      Task.find({
        eventId: { $in: eventIds },
        status: { $nin: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
      })
        .populate('eventId', 'name venue startDate')
        .populate('teamId', 'name colorHex')
        .populate('assigneeId', 'name email avatarUrl')
        .sort({ dueTime: 1 })
        .limit(6)
        .lean(),
    ]);

    const uniqueMemberSet = new Set<string>();
    teams.forEach((tm) => {
      if (tm.leadId) uniqueMemberSet.add(tm.leadId.toString());
      (tm.memberIds || []).forEach((id: any) => uniqueMemberSet.add(id.toString()));
    });

    const attMap = new Map(attendeeAgg.map((a) => [a._id.toString(), a]));
    const taskMap = new Map(taskAgg.map((t) => [t._id.toString(), t]));

    const enrichedEvents = events.map((ev) => {
      const att = attMap.get(ev._id.toString());
      const tsk = taskMap.get(ev._id.toString());
      return {
        ...ev,
        registeredCount: att?.registeredCount || 0,
        checkedInCount: att?.checkedInCount || 0,
        totalTasksCount: tsk?.totalTasksCount || 0,
        completedTasksCount: tsk?.completedTasksCount || 0,
      };
    });

    const upcomingEvents = enrichedEvents.filter((e) => e.status !== 'archived' && e.status !== 'completed');

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalEvents: events.length,
          totalAttendees,
          openTasks: openTasksCount,
          teamMembers: uniqueMemberSet.size,
        },
        upcomingEvents: upcomingEvents.length > 0 ? upcomingEvents : enrichedEvents.slice(0, 3),
        myUrgentTasks,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error loading dashboard summary.' });
  }
};

export const getDashboardTasks = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { scope, status, priority, eventId, search } = req.query;
    const { events } = await getUserAuthorizedEventIds(userId);
    const authorizedIds = events.map((e) => e._id);

    const filter: any = {
      eventId: eventId && authorizedIds.some((id) => id.toString() === eventId)
        ? new mongoose.Types.ObjectId(eventId as string)
        : { $in: authorizedIds },
    };

    if (scope === 'mine') {
      filter.$or = [{ assigneeId: userId }, { creatorId: userId }];
    }
    if (status && typeof status === 'string') filter.status = status;
    if (priority && typeof priority === 'string') filter.priority = priority;
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { zone: { $regex: q, $options: 'i' } },
          ],
        },
      ];
    }

    const tasks = await Task.find(filter)
      .populate('eventId', 'name venue startDate')
      .populate('teamId', 'name colorHex icon')
      .populate('assigneeId', 'name email phone avatarUrl')
      .sort({ dueTime: 1 })
      .lean();

    res.status(200).json({ success: true, data: tasks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error loading tasks.' });
  }
};

export const getDashboardTeams = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { events } = await getUserAuthorizedEventIds(userId);
    const eventIds = events.map((e) => e._id);

    const teams = await Team.find({ eventId: { $in: eventIds }, isActive: true })
      .populate('eventId', 'name venue startDate status')
      .populate('leadId', 'name email phone avatarUrl')
      .populate('memberIds', 'name email phone avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    const tasks = await Task.find({ eventId: { $in: eventIds } }).select('teamId status').lean();

    const enrichedTeams = teams.map((tm: any) => {
      const teamTasks = tasks.filter((t) => t.teamId.toString() === tm._id.toString());
      const completedTasks = teamTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
      const blockedTasks = teamTasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
      const inProgressTasks = teamTasks.filter(
        (t) => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.ACKNOWLEDGED
      ).length;

      return {
        ...tm,
        metrics: {
          totalTasks: teamTasks.length,
          completedTasks,
          blockedTasks,
          inProgressTasks,
          readinessPercentage:
            teamTasks.length > 0 ? Math.round((completedTasks / teamTasks.length) * 100) : 0,
        },
      };
    });

    res.status(200).json({ success: true, data: { teams: enrichedTeams, events } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error loading teams.' });
  }
};

export const getDashboardAttendees = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { eventId, search, status } = req.query;
    const { events } = await getUserAuthorizedEventIds(userId);
    const authorizedIds = events.map((e) => e._id);

    const filter: any = {
      eventId: eventId && authorizedIds.some((id) => id.toString() === eventId)
        ? new mongoose.Types.ObjectId(eventId as string)
        : { $in: authorizedIds },
    };

    if (status && typeof status === 'string') filter.status = status;
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { ticketCode: { $regex: q, $options: 'i' } },
      ];
    }

    const attendees = await Attendee.find(filter)
      .populate('eventId', 'name venue startDate')
      .populate('checkedInBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: { attendees, events } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error loading attendees.' });
  }
};

export const getEventResources = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const userId = req.user!._id;
    const { events } = await getUserAuthorizedEventIds(userId);

    const isAll = eventId === 'all';
    const targetIds = isAll
      ? events.map((e) => e._id)
      : events.filter((e) => e._id.toString() === eventId).map((e) => e._id);

    if (!isAll && targetIds.length === 0) {
      res.status(403).json({ success: false, message: 'Forbidden. No access to this event resources.' });
      return;
    }

    const [resources, eventTasks] = await Promise.all([
      EventResource.find({ eventId: { $in: targetIds } })
        .populate('eventId', 'name venue')
        .populate('uploaderId', 'name email avatarUrl')
        .sort({ createdAt: -1 })
        .lean(),
      Task.find({ eventId: { $in: targetIds } }).select('_id title teamId zone').lean(),
    ]);

    const taskIds = eventTasks.map((t) => t._id);
    const evidenceProofs = await Evidence.find({ taskId: { $in: taskIds } })
      .populate('uploaderId', 'name email avatarUrl')
      .populate({
        path: 'taskId',
        select: 'title zone eventId teamId',
        populate: [
          { path: 'eventId', select: 'name' },
          { path: 'teamId', select: 'name colorHex' },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        resources,
        evidenceProofs,
        events,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error loading resources.' });
  }
};

export const uploadEventResource = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { title, description, category } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'Please attach a file to upload.' });
      return;
    }

    const userId = req.user!._id;
    const { events } = await getUserAuthorizedEventIds(userId);
    const targetEvent = events.find((e) => e._id.toString() === eventId);

    if (!targetEvent) {
      res.status(403).json({ success: false, message: 'Forbidden. You do not belong to this event.' });
      return;
    }

    const allowedCategories = ['Floor Plan', 'Schedule', 'Checklist', 'Briefing', 'Media', 'Other'];
    const resource = await EventResource.create({
      eventId: targetEvent._id,
      uploaderId: userId,
      title: sanitizeHtml(String(title || file.originalname).trim()),
      description: description ? sanitizeHtml(String(description).trim()) : '',
      category: allowedCategories.includes(category) ? category : 'Other',
      fileUrl: `/uploads/resources/${file.filename}`,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
    });

    const populated = await EventResource.findById(resource._id)
      .populate('eventId', 'name venue')
      .populate('uploaderId', 'name email avatarUrl');

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error uploading resource.' });
  }
};

