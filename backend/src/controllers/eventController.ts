import { Response } from 'express';
import mongoose from 'mongoose';
import { Event } from '../models/Event.js';
import { EventMembership } from '../models/EventMembership.js';
import { Conversation } from '../models/Conversation.js';
import { Team } from '../models/Team.js';
import { Task } from '../models/Task.js';
import { TaskActivity } from '../models/TaskActivity.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { OrganizationMembership } from '../models/OrganizationMembership.js';
import { EventRole, OrgRole, ConversationType, TaskStatus } from '../constants/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orgId, name, type, venue, timezone, zones, startDate, endDate, description } = req.body;

    if (!name || !venue || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'Event name, venue, startDate, and endDate are required.',
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid start date or end date format.' });
      return;
    }

    if (end <= start) {
      res.status(400).json({ success: false, message: 'End date must be after start date.' });
      return;
    }

    // Resolve or auto-provision Organization so users are never blocked
    let targetOrgId = orgId;
    let targetOrgDoc: any = null;
    if (targetOrgId) {
      targetOrgDoc = await Organization.findById(targetOrgId);
    }

    if (!targetOrgDoc) {
      const membership = await OrganizationMembership.findOne({
        userId: req.user!._id,
        status: 'active',
      }).populate('orgId');

      if (membership && membership.orgId) {
        targetOrgDoc = membership.orgId;
        targetOrgId = targetOrgDoc._id;
      } else {
        const orgName = `${req.user!.name}'s Events`;
        const slugBase = req.user!.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'events-org';
        const slug = `${slugBase}-${Date.now().toString().slice(-4)}`;

        targetOrgDoc = await Organization.create({
          name: orgName,
          slug,
          ownerId: req.user!._id,
        });

        await OrganizationMembership.create({
          userId: req.user!._id,
          orgId: targetOrgDoc._id,
          role: OrgRole.OWNER,
          status: 'active',
        });
        targetOrgId = targetOrgDoc._id;
      }
    }

    const event = await Event.create({
      orgId: new mongoose.Types.ObjectId(targetOrgId),
      name,
      type: type || 'wedding',
      venue,
      timezone: timezone || 'Asia/Kolkata',
      zones: zones && zones.length > 0 ? zones : ['Main Stage', 'Entrance & Reception', 'Dining Area', 'Guest Lounge'],
      managerId: req.user!._id,
      startDate: start,
      endDate: end,
      description: description || '',
      status: 'planning',
    });

    // Add manager membership
    await EventMembership.create({
      eventId: event._id,
      userId: req.user!._id,
      role: EventRole.EVENT_MANAGER,
      status: 'active',
    });

    // Automatically create Global Event Conversation
    await Conversation.create({
      eventId: event._id,
      type: ConversationType.GLOBAL_EVENT,
      title: `${name} - All Hands Operations`,
      participantIds: [req.user!._id],
    });

    res.status(201).json({ success: true, data: event, organization: targetOrgDoc });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error creating event.' });
  }
};

export const getEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;

    // Find all events where user has membership OR is manager
    const memberships = await EventMembership.find({ userId, status: 'active' }).select('eventId role teamId');
    const memberEventIds = memberships.map((m) => m.eventId);

    const events = await Event.find({
      $or: [{ _id: { $in: memberEventIds } }, { managerId: userId }],
    })
      .populate('managerId', 'name email phone avatarUrl')
      .sort({ startDate: 1 });

    res.status(200).json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching events.' });
  }
};

export const getEventById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id).populate('managerId', 'name email phone avatarUrl');

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const teams = await Team.find({ eventId: event._id, isActive: true })
      .populate('leadId', 'name email phone avatarUrl')
      .populate('memberIds', 'name email phone avatarUrl');

    const totalTasks = await Task.countDocuments({ eventId: event._id, parentTaskId: null });
    const completedTasks = await Task.countDocuments({
      eventId: event._id,
      parentTaskId: null,
      status: 'COMPLETED',
    });
    const blockedTasks = await Task.countDocuments({
      eventId: event._id,
      status: 'BLOCKED',
    });
    const urgentTasks = await Task.countDocuments({
      eventId: event._id,
      $or: [{ priority: 'CRITICAL' }, { priority: 'URGENT' }, { isUrgentEscalated: true }],
    });

    // Check user's role in this event
    const membership = await EventMembership.findOne({
      eventId: event._id,
      userId: req.user!._id,
      status: 'active',
    });

    const isManager = event.managerId.toString() === req.user!._id.toString();
    const orgMembership = await OrganizationMembership.findOne({
      orgId: event.orgId,
      userId: req.user!._id,
      status: 'active',
    });
    const isOrgAdmin = orgMembership && (orgMembership.role === OrgRole.OWNER || orgMembership.role === OrgRole.ADMIN);

    if (!isManager && !membership && !isOrgAdmin) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have access to this event.',
      });
      return;
    }

    const effectiveRole = isManager || isOrgAdmin ? EventRole.EVENT_MANAGER : membership?.role;

    res.status(200).json({
      success: true,
      data: {
        event,
        teams,
        metrics: {
          totalTasks,
          completedTasks,
          blockedTasks,
          urgentTasks,
          readinessPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
        userRole: effectiveRole,
        userTeamId: membership?.teamId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error retrieving event.' });
  }
};

export const updateEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, venue, zones, status, startDate, endDate, description } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    if (name) event.name = name;
    if (venue) event.venue = venue;
    if (zones) event.zones = zones;
    if (status) {
      if (status === 'archived') {
        const unresolvedTasks = await Task.countDocuments({
          eventId: event._id,
          status: { $nin: [TaskStatus.COMPLETED] },
        });

        if (unresolvedTasks > 0) {
          res.status(400).json({
            success: false,
            message: `Cannot archive event. There are ${unresolvedTasks} unresolved or blocked task(s) remaining.`,
          });
          return;
        }
      }
      event.status = status;
    }
    if (startDate) event.startDate = new Date(startDate);
    if (endDate) event.endDate = new Date(endDate);
    if (description !== undefined) event.description = description;

    await event.save();
    res.status(200).json({ success: true, data: event });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating event.' });
  }
};

export const addEventMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, role, teamId } = req.body;

    if (!userId || !role) {
      res.status(400).json({ success: false, message: 'User ID and role are required.' });
      return;
    }

    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    let membership = await EventMembership.findOne({
      eventId: event._id,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (membership) {
      membership.role = role;
      if (teamId) membership.teamId = new mongoose.Types.ObjectId(teamId);
      membership.status = 'active';
      await membership.save();
    } else {
      membership = await EventMembership.create({
        eventId: event._id,
        userId: new mongoose.Types.ObjectId(userId),
        role,
        teamId: teamId ? new mongoose.Types.ObjectId(teamId) : undefined,
        status: 'active',
      });
    }

    // Add user to Global Event conversation participants
    await Conversation.updateOne(
      { eventId: event._id, type: ConversationType.GLOBAL_EVENT },
      { $addToSet: { participantIds: new mongoose.Types.ObjectId(userId) } }
    );

    res.status(200).json({ success: true, data: membership });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error assigning member.' });
  }
};

export const updateEventPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      allowWorkersGlobalChat,
      allowWorkersTeamChat,
      requireLeadReviewFirst,
      allowLeadTaskCreation,
      allowWorkerSelfAssignment,
    } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    if (event.managerId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Only the Event Manager can configure permissions.' });
      return;
    }

    if (!event.permissions) {
      event.permissions = {
        allowWorkersGlobalChat: true,
        allowWorkersTeamChat: true,
        requireLeadReviewFirst: true,
        allowLeadTaskCreation: true,
        allowWorkerSelfAssignment: false,
      };
    }

    if (allowWorkersGlobalChat !== undefined) event.permissions.allowWorkersGlobalChat = Boolean(allowWorkersGlobalChat);
    if (allowWorkersTeamChat !== undefined) event.permissions.allowWorkersTeamChat = Boolean(allowWorkersTeamChat);
    if (requireLeadReviewFirst !== undefined) event.permissions.requireLeadReviewFirst = Boolean(requireLeadReviewFirst);
    if (allowLeadTaskCreation !== undefined) event.permissions.allowLeadTaskCreation = Boolean(allowLeadTaskCreation);
    if (allowWorkerSelfAssignment !== undefined) event.permissions.allowWorkerSelfAssignment = Boolean(allowWorkerSelfAssignment);

    await event.save();
    res.status(200).json({ success: true, data: event.permissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating permissions.' });
  }
};

export const getEventActivities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const tasks = await Task.find({ eventId: id }).select('_id');
    const taskIds = tasks.map((t) => t._id);

    const activities = await TaskActivity.find({ taskId: { $in: taskIds } })
      .populate('actorId', 'name email avatarUrl preferredLanguage')
      .populate('taskId', 'title status priority zone')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({ success: true, data: activities });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching activities.' });
  }
};

export const getEventWorkload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const teams = await Team.find({ eventId: id, isActive: true })
      .populate('leadId', 'name email avatarUrl')
      .populate('memberIds', 'name email avatarUrl');

    const tasks = await Task.find({ eventId: id });

    // Teams summary
    const teamsSummary = teams.map((tm) => {
      const teamTasks = tasks.filter((t) => t.teamId.toString() === tm._id.toString());
      const completed = teamTasks.filter((t) => t.status === 'COMPLETED').length;
      const inProgress = teamTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ACKNOWLEDGED').length;
      const blocked = teamTasks.filter((t) => t.status === 'BLOCKED').length;

      return {
        teamId: tm._id,
        teamName: tm.name,
        colorHex: tm.colorHex,
        totalTasks: teamTasks.length,
        completedTasks: completed,
        inProgressTasks: inProgress,
        blockedTasks: blocked,
        membersCount: (tm.memberIds?.length || 0) + (tm.leadId ? 1 : 0),
      };
    });

    // Workers summary
    const workersMap = new Map<string, any>();

    teams.forEach((tm) => {
      const allTeamMembers = [...(tm.memberIds || [])];
      if (tm.leadId) allTeamMembers.push(tm.leadId as any);

      allTeamMembers.forEach((member: any) => {
        const uId = member._id.toString();
        if (!workersMap.has(uId)) {
          workersMap.set(uId, {
            userId: uId,
            name: member.name,
            avatarUrl: member.avatarUrl,
            teamName: tm.name,
            assignedTasksCount: 0,
            activeTasksCount: 0,
            isOverloaded: false,
          });
        }
      });
    });

    tasks.forEach((t) => {
      if (t.assigneeId) {
        const uId = t.assigneeId.toString();
        const worker = workersMap.get(uId);
        if (worker) {
          worker.assignedTasksCount += 1;
          if (t.status === 'IN_PROGRESS' || t.status === 'ACKNOWLEDGED' || t.status === 'SUBMITTED_FOR_REVIEW') {
            worker.activeTasksCount += 1;
          }
        }
      }
    });

    const workersSummary = Array.from(workersMap.values()).map((w) => ({
      ...w,
      isOverloaded: w.activeTasksCount >= 4,
    }));

    res.status(200).json({
      success: true,
      data: {
        teamsSummary,
        workersSummary,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error calculating workload.' });
  }
};
