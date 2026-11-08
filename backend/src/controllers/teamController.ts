import { Response } from 'express';
import mongoose from 'mongoose';
import { Team } from '../models/Team.js';
import { Event } from '../models/Event.js';
import { EventMembership } from '../models/EventMembership.js';
import { Conversation } from '../models/Conversation.js';
import { Task } from '../models/Task.js';
import { EventRole, ConversationType } from '../constants/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export const createTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { name, description, colorHex, icon, leadId, memberIds } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Team name is required.' });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const team = await Team.create({
      eventId: event._id,
      name,
      description: description || '',
      colorHex: colorHex || '#3B82F6',
      icon: icon || 'Users',
      leadId: leadId ? new mongoose.Types.ObjectId(leadId) : undefined,
      memberIds: memberIds ? memberIds.map((id: string) => new mongoose.Types.ObjectId(id)) : [],
      isActive: true,
    });

    // Update or assign EventMembership for lead
    if (leadId) {
      await EventMembership.findOneAndUpdate(
        { eventId: event._id, userId: new mongoose.Types.ObjectId(leadId) },
        {
          role: EventRole.TEAM_LEAD,
          teamId: team._id,
          status: 'active',
        },
        { upsert: true, new: true }
      );
    }

    // Update or assign EventMembership for members
    if (memberIds && Array.isArray(memberIds)) {
      for (const mId of memberIds) {
        if (mId !== leadId) {
          await EventMembership.findOneAndUpdate(
            { eventId: event._id, userId: new mongoose.Types.ObjectId(mId) },
            {
              role: EventRole.TEAM_MEMBER,
              teamId: team._id,
              status: 'active',
            },
            { upsert: true, new: true }
          );
        }
      }
    }

    // 1. Automatically scaffold Team Internal Chat channel
    const teamChatParticipants = [
      ...(leadId ? [new mongoose.Types.ObjectId(leadId)] : []),
      ...(memberIds ? memberIds.map((id: string) => new mongoose.Types.ObjectId(id)) : []),
    ];
    await Conversation.create({
      eventId: event._id,
      type: ConversationType.TEAM_INTERNAL,
      teamId: team._id,
      title: `${name} Team Internal`,
      participantIds: teamChatParticipants,
    });

    // 2. Automatically scaffold Manager-to-Team Chat channel
    const managerTeamParticipants = [
      event.managerId,
      ...teamChatParticipants,
    ];
    await Conversation.create({
      eventId: event._id,
      type: ConversationType.MANAGER_TEAM,
      teamId: team._id,
      title: `${name} ↔ Manager Coordination`,
      participantIds: managerTeamParticipants,
    });

    const populatedTeam = await Team.findById(team._id)
      .populate('leadId', 'name email phone avatarUrl')
      .populate('memberIds', 'name email phone avatarUrl');

    res.status(201).json({ success: true, data: populatedTeam });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error creating team.' });
  }
};

export const getTeams = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;

    const teams = await Team.find({ eventId: new mongoose.Types.ObjectId(eventId), isActive: true })
      .populate('leadId', 'name email phone avatarUrl')
      .populate('memberIds', 'name email phone avatarUrl');

    // Attach task metrics to each team
    const teamsWithMetrics = await Promise.all(
      teams.map(async (team) => {
        const totalTasks = await Task.countDocuments({ teamId: team._id, parentTaskId: null });
        const completedTasks = await Task.countDocuments({
          teamId: team._id,
          parentTaskId: null,
          status: 'COMPLETED',
        });
        const blockedTasks = await Task.countDocuments({
          teamId: team._id,
          status: 'BLOCKED',
        });
        const inProgressTasks = await Task.countDocuments({
          teamId: team._id,
          status: 'IN_PROGRESS',
        });

        return {
          ...team.toObject(),
          metrics: {
            totalTasks,
            completedTasks,
            blockedTasks,
            inProgressTasks,
            readinessPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          },
        };
      })
    );

    res.status(200).json({ success: true, data: teamsWithMetrics });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching teams.' });
  }
};

export const getTeamById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId)
      .populate('leadId', 'name email phone avatarUrl')
      .populate('memberIds', 'name email phone avatarUrl');

    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found.' });
      return;
    }

    const tasks = await Task.find({ teamId: team._id, parentTaskId: null })
      .populate('assigneeId', 'name email phone avatarUrl')
      .sort({ dueTime: 1 });

    res.status(200).json({ success: true, data: { team, tasks } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error retrieving team.' });
  }
};

export const updateTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;
    const { name, description, colorHex, icon, leadId, memberIds, isActive } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found.' });
      return;
    }

    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    if (colorHex) team.colorHex = colorHex;
    if (icon) team.icon = icon;
    if (isActive !== undefined) team.isActive = isActive;

    if (leadId !== undefined) {
      team.leadId = leadId ? new mongoose.Types.ObjectId(leadId) : undefined;
      if (leadId) {
        await EventMembership.findOneAndUpdate(
          { eventId: team.eventId, userId: new mongoose.Types.ObjectId(leadId) },
          { role: EventRole.TEAM_LEAD, teamId: team._id, status: 'active' },
          { upsert: true }
        );
      }
    }

    if (memberIds && Array.isArray(memberIds)) {
      team.memberIds = memberIds.map((id: string) => new mongoose.Types.ObjectId(id));
      for (const mId of memberIds) {
        if (mId !== leadId) {
          await EventMembership.findOneAndUpdate(
            { eventId: team.eventId, userId: new mongoose.Types.ObjectId(mId) },
            { role: EventRole.TEAM_MEMBER, teamId: team._id, status: 'active' },
            { upsert: true }
          );
        }
      }
    }

    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('leadId', 'name email phone avatarUrl')
      .populate('memberIds', 'name email phone avatarUrl');

    res.status(200).json({ success: true, data: populatedTeam });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating team.' });
  }
};

