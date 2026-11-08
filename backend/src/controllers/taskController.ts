import { Response } from 'express';
import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { TaskActivity } from '../models/TaskActivity.js';
import { Evidence } from '../models/Evidence.js';
import { Team } from '../models/Team.js';
import { Event } from '../models/Event.js';
import { EventMembership } from '../models/EventMembership.js';
import { TaskStatus, TaskPriority, EventRole, EvidenceReviewStatus } from '../constants/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { Notification } from '../models/Notification.js';
import { sendPushToUser } from '../utils/push.js';
import { getIO } from '../sockets/io.js';

export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const {
      teamId,
      parentTaskId,
      title,
      description,
      zone,
      priority,
      assigneeId,
      startTime,
      dueTime,
      dependencies,
      evidenceRequired,
      minEvidenceCount,
      evidenceTypes,
    } = req.body;

    if (!title || !dueTime) {
      res.status(400).json({ success: false, message: 'Task title and due time are required.' });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const userId = req.user!._id;
    const isManager = event.managerId.toString() === userId.toString();

    // If creating a microtask
    if (parentTaskId) {
      const parentTask = await Task.findById(parentTaskId);
      if (!parentTask) {
        res.status(404).json({ success: false, message: 'Parent task not found.' });
        return;
      }

      // Check if user is manager or team lead for parentTask.teamId
      const membership = await EventMembership.findOne({
        eventId: event._id,
        userId,
        status: 'active',
      });

      const isLead =
        membership?.role === EventRole.TEAM_LEAD &&
        membership?.teamId?.toString() === parentTask.teamId.toString();

      if (!isManager && !isLead) {
        res.status(403).json({
          success: false,
          message: 'Only the Event Manager or the assigned Team Lead can create microtasks.',
        });
        return;
      }

      const microtask = await Task.create({
        eventId: event._id,
        teamId: parentTask.teamId,
        parentTaskId: parentTask._id,
        title,
        description: description || '',
        zone: zone || parentTask.zone,
        priority: priority || parentTask.priority || TaskPriority.MEDIUM,
        assigneeId: assigneeId ? new mongoose.Types.ObjectId(assigneeId) : undefined,
        creatorId: userId,
        startTime: startTime ? new Date(startTime) : undefined,
        dueTime: new Date(dueTime),
        dependencies: dependencies ? dependencies.map((d: string) => new mongoose.Types.ObjectId(d)) : [],
        evidenceRequired: evidenceRequired !== undefined ? evidenceRequired : true,
        minEvidenceCount: minEvidenceCount || 1,
        evidenceTypes: evidenceTypes || ['PHOTO'],
        status: TaskStatus.TO_DO,
      });

      // Audit Log
      await TaskActivity.create({
        taskId: microtask._id,
        actorId: userId,
        action: 'MICROTASK_CREATED',
        newValue: title,
        reason: 'Microtask created under parent task',
      });

      const populated = await Task.findById(microtask._id)
        .populate('assigneeId', 'name email phone avatarUrl')
        .populate('creatorId', 'name email');

      res.status(201).json({ success: true, data: populated });
      return;
    }

    // Creating a Team-Level (Parent) Task
    if (!teamId) {
      res.status(400).json({ success: false, message: 'Team ID is required for team-level tasks.' });
      return;
    }

    const team = await Team.findById(teamId);
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found.' });
      return;
    }

    // Only Event Manager can assign team-level tasks
    if (!isManager) {
      res.status(403).json({
        success: false,
        message: 'Only the Event Manager can assign team-level outcome tasks.',
      });
      return;
    }

    const parentTask = await Task.create({
      eventId: event._id,
      teamId: team._id,
      parentTaskId: null,
      title,
      description: description || '',
      zone: zone || '',
      priority: priority || TaskPriority.MEDIUM,
      assigneeId: assigneeId ? new mongoose.Types.ObjectId(assigneeId) : team.leadId,
      creatorId: userId,
      startTime: startTime ? new Date(startTime) : undefined,
      dueTime: new Date(dueTime),
      dependencies: dependencies ? dependencies.map((d: string) => new mongoose.Types.ObjectId(d)) : [],
      evidenceRequired: evidenceRequired !== undefined ? evidenceRequired : true,
      minEvidenceCount: minEvidenceCount || 1,
      evidenceTypes: evidenceTypes || ['PHOTO'],
      status: TaskStatus.TO_DO,
    });

    // Audit Log
    await TaskActivity.create({
      taskId: parentTask._id,
      actorId: userId,
      action: 'PARENT_TASK_CREATED',
      newValue: title,
      reason: 'Team outcome task created by Event Manager',
    });

    const populated = await Task.findById(parentTask._id)
      .populate('assigneeId', 'name email phone avatarUrl')
      .populate('teamId', 'name colorHex icon')
      .populate('creatorId', 'name email');

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error creating task.' });
  }
};

export const getTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { teamId, status, priority, zone, assigneeId, parentOnly, isUrgent } = req.query;

    const filter: any = { eventId: new mongoose.Types.ObjectId(eventId) };

    if (teamId) filter.teamId = new mongoose.Types.ObjectId(teamId as string);
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (zone) filter.zone = zone;
    if (assigneeId) filter.assigneeId = new mongoose.Types.ObjectId(assigneeId as string);
    if (parentOnly === 'true') filter.parentTaskId = null;
    if (isUrgent === 'true') {
      filter.$or = [
        { priority: TaskPriority.CRITICAL },
        { priority: TaskPriority.URGENT },
        { isUrgentEscalated: true },
      ];
    }

    const tasks = await Task.find(filter)
      .populate('assigneeId', 'name email phone avatarUrl')
      .populate('teamId', 'name colorHex icon')
      .populate('creatorId', 'name email')
      .sort({ dueTime: 1 });

    // Attach microtask counts to parent tasks
    const tasksWithSubtaskCounts = await Promise.all(
      tasks.map(async (task) => {
        if (!task.parentTaskId) {
          const totalMicrotasks = await Task.countDocuments({ parentTaskId: task._id });
          const completedMicrotasks = await Task.countDocuments({
            parentTaskId: task._id,
            status: TaskStatus.COMPLETED,
          });
          return {
            ...task.toObject(),
            microtasksCount: totalMicrotasks,
            completedMicrotasksCount: completedMicrotasks,
          };
        }
        return task.toObject();
      })
    );

    res.status(200).json({ success: true, data: tasksWithSubtaskCounts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching tasks.' });
  }
};

export const getTaskById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate('assigneeId', 'name email phone avatarUrl')
      .populate('teamId', 'name colorHex icon')
      .populate('creatorId', 'name email')
      .populate('dependencies', 'title status dueTime');

    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }

    // Retrieve child microtasks if this is a parent task
    let microtasks: any[] = [];
    if (!task.parentTaskId) {
      microtasks = await Task.find({ parentTaskId: task._id })
        .populate('assigneeId', 'name email phone avatarUrl')
        .sort({ dueTime: 1 });
    }

    // Retrieve chronological activity history
    const activities = await TaskActivity.find({ taskId: task._id })
      .populate('actorId', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        task,
        microtasks,
        activities,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error retrieving task.' });
  }
};

export const updateTaskStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { status, reason, revisedDueTime } = req.body;

    if (!status || !Object.values(TaskStatus).includes(status)) {
      res.status(400).json({ success: false, message: 'Valid status is required.' });
      return;
    }

    const task = await Task.findById(taskId);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }

    const event = await Event.findById(task.eventId);
    const userId = req.user!._id;
    const isManager = event?.managerId.toString() === userId.toString();

    const membership = await EventMembership.findOne({
      eventId: task.eventId,
      userId,
      status: 'active',
    });

    const isLead =
      membership?.role === EventRole.TEAM_LEAD &&
      membership?.teamId?.toString() === task.teamId.toString();

    const isAssignee = task.assigneeId?.toString() === userId.toString();

    // Check Dependencies: Cannot start task if dependencies are not COMPLETED
    if (
      status === TaskStatus.IN_PROGRESS &&
      task.dependencies &&
      task.dependencies.length > 0
    ) {
      const incompleteDeps = await Task.find({
        _id: { $in: task.dependencies },
        status: { $ne: TaskStatus.COMPLETED },
      });

      if (incompleteDeps.length > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot start task. Prerequisites are not completed: ${incompleteDeps
            .map((d) => d.title)
            .join(', ')}`,
        });
        return;
      }
    }

    // Authorization checks for state transitions:
    // 1. Final Completion Approval of Parent Task -> Only Event Manager
    if (status === TaskStatus.COMPLETED && !task.parentTaskId && !isManager) {
      res.status(403).json({
        success: false,
        message: 'Only the Event Manager can give final completion approval for team-level tasks.',
      });
      return;
    }

    // Evidence Verification Gating: task cannot be completed without approved proof
    if (status === TaskStatus.COMPLETED && task.evidenceRequired && task.minEvidenceCount > 0) {
      const approvedCount = await Evidence.countDocuments({
        taskId: task._id,
        reviewStatus: EvidenceReviewStatus.APPROVED,
      });

      if (approvedCount < task.minEvidenceCount) {
        res.status(400).json({
          success: false,
          message: `Cannot complete task. Requires at least ${task.minEvidenceCount} verified evidence item(s). Currently approved: ${approvedCount}.`,
        });
        return;
      }
    }

    // 2. Rework Requested -> Manager (for parent task) or Team Lead (for microtask)
    if (status === TaskStatus.REWORK_REQUIRED) {
      if (!reason) {
        res.status(400).json({ success: false, message: 'A reason is required when requesting rework.' });
        return;
      }
      if (task.parentTaskId && !isManager && !isLead) {
        res.status(403).json({
          success: false,
          message: 'Only the Team Lead or Event Manager can request rework on a microtask.',
        });
        return;
      }
      if (!task.parentTaskId && !isManager) {
        res.status(403).json({
          success: false,
          message: 'Only the Event Manager can request rework on a team-level task.',
        });
        return;
      }
    }

    // 3. Worker (Member) updates: can only update their own assigned tasks
    if (!isManager && !isLead && !isAssignee) {
      res.status(403).json({
        success: false,
        message: 'You can only update tasks assigned to you.',
      });
      return;
    }

    const oldStatus = task.status;
    task.status = status;

    if (status === TaskStatus.COMPLETED) {
      task.completedAt = new Date();
      task.reworkReason = undefined;
    } else if (status === TaskStatus.REWORK_REQUIRED) {
      task.reworkReason = reason;
      if (revisedDueTime) {
        task.dueTime = new Date(revisedDueTime);
      }
    }

    await task.save();

    // Log Activity Audit Record
    const activity = await TaskActivity.create({
      taskId: task._id,
      actorId: userId,
      action: 'STATUS_CHANGED',
      previousValue: oldStatus,
      newValue: status,
      reason: reason || undefined,
    });

    const updatedTask = await Task.findById(task._id)
      .populate('assigneeId', 'name email phone avatarUrl')
      .populate('teamId', 'name colorHex icon');

    // Real-Time Socket Broadcasts
    const socketIO = getIO();
    if (socketIO) {
      socketIO.emit('task:updated', updatedTask);
      socketIO.emit('activity:new', {
        ...activity.toObject(),
        actorId: {
          _id: req.user!._id,
          name: req.user!.name,
          email: req.user!.email,
          avatarUrl: req.user!.avatarUrl,
        },
        taskId: {
          _id: task._id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          zone: task.zone,
        },
      });
    }

    // Trigger Notification & Push if Blocker or Rework
    if (status === TaskStatus.BLOCKED && event?.managerId) {
      const notif = await Notification.create({
        recipientId: event.managerId,
        eventId: event._id,
        entityType: 'task',
        entityId: task._id,
        type: 'BLOCKER_RAISED',
        title: `🚨 Blocker Reported: ${task.title}`,
        body: reason || 'Task is marked blocked and needs intervention.',
      });
      sendPushToUser(event.managerId.toString(), {
        title: notif.title,
        body: notif.body,
        data: { taskId: task._id.toString(), eventId: event._id.toString() },
      });
    } else if (status === TaskStatus.REWORK_REQUIRED && task.assigneeId) {
      const notif = await Notification.create({
        recipientId: task.assigneeId,
        eventId: event?._id,
        entityType: 'task',
        entityId: task._id,
        type: 'REWORK_REQUIRED',
        title: `⚠️ Rework Required: ${task.title}`,
        body: reason || 'Please inspect comments and re-submit proof.',
      });
      sendPushToUser(task.assigneeId.toString(), {
        title: notif.title,
        body: notif.body,
        data: { taskId: task._id.toString(), eventId: event?._id.toString() },
      });
    }

    res.status(200).json({ success: true, data: updatedTask });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating task status.' });
  }
};

export const reassignTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { assigneeId, dueTime, priority } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }

    const event = await Event.findById(task.eventId);
    const userId = req.user!._id;
    const isManager = event?.managerId.toString() === userId.toString();

    const membership = await EventMembership.findOne({
      eventId: task.eventId,
      userId,
      status: 'active',
    });
    const isLead =
      membership?.role === EventRole.TEAM_LEAD &&
      membership?.teamId?.toString() === task.teamId.toString();

    // Only Manager or Team Lead can reassign / change deadlines
    if (!isManager && !isLead) {
      res.status(403).json({
        success: false,
        message: 'Only the Event Manager or assigned Team Lead can reassign tasks or adjust deadlines.',
      });
      return;
    }

    const auditActions: string[] = [];

    if (assigneeId && assigneeId !== task.assigneeId?.toString()) {
      const oldAssignee = task.assigneeId?.toString() || 'unassigned';
      task.assigneeId = new mongoose.Types.ObjectId(assigneeId);
      auditActions.push(`Reassigned from ${oldAssignee} to ${assigneeId}`);
    }

    if (dueTime && new Date(dueTime).getTime() !== task.dueTime.getTime()) {
      const oldDue = task.dueTime.toISOString();
      task.dueTime = new Date(dueTime);
      auditActions.push(`Deadline changed from ${oldDue} to ${task.dueTime.toISOString()}`);
    }

    if (priority && priority !== task.priority) {
      const oldPriority = task.priority;
      task.priority = priority;
      auditActions.push(`Priority changed from ${oldPriority} to ${priority}`);
    }

    await task.save();

    // Log Audit Record
    if (auditActions.length > 0) {
      await TaskActivity.create({
        taskId: task._id,
        actorId: userId,
        action: 'TASK_MODIFIED',
        newValue: auditActions.join('; '),
      });
    }

    const updatedTask = await Task.findById(task._id)
      .populate('assigneeId', 'name email phone avatarUrl')
      .populate('teamId', 'name colorHex icon');

    res.status(200).json({ success: true, data: updatedTask });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error reassigning task.' });
  }
};

export const escalateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { reason, priority } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }

    const event = await Event.findById(task.eventId);
    const userId = req.user!._id;
    const isManager = event?.managerId.toString() === userId.toString();

    if (!isManager) {
      res.status(403).json({
        success: false,
        message: 'Only the Event Manager can escalate tasks to Urgent/Critical.',
      });
      return;
    }

    task.isUrgentEscalated = true;
    task.escalationReason = reason || 'Escalated by Event Manager for immediate on-site priority';
    if (priority) {
      task.priority = priority;
    } else {
      task.priority = TaskPriority.CRITICAL;
    }

    await task.save();

    await TaskActivity.create({
      taskId: task._id,
      actorId: userId,
      action: 'TASK_ESCALATED',
      newValue: task.priority,
      reason: task.escalationReason,
    });

    const updatedTask = await Task.findById(task._id)
      .populate('assigneeId', 'name email phone avatarUrl')
      .populate('teamId', 'name colorHex icon');

    res.status(200).json({ success: true, data: updatedTask });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error escalating task.' });
  }
};
