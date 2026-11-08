import { Response } from 'express';
import mongoose from 'mongoose';
import { Evidence } from '../models/Evidence.js';
import { Task } from '../models/Task.js';
import { TaskActivity } from '../models/TaskActivity.js';
import { Event } from '../models/Event.js';
import { EventMembership } from '../models/EventMembership.js';
import { EvidenceReviewStatus, MediaType, TaskStatus, EventRole } from '../constants/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { getIO } from '../sockets/io.js';
import { Notification } from '../models/Notification.js';
import { sendPushToUser } from '../utils/push.js';

export const uploadEvidence = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { caption, stage } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'No media file uploaded.' });
      return;
    }

    const task = await Task.findById(taskId);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }

    const userId = req.user!._id;
    const event = await Event.findById(task.eventId);
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

    // Check upload permission
    if (!isManager && !isLead && !isAssignee) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to upload proof for this task.',
      });
      return;
    }

    const isVideo = file.mimetype.startsWith('video/');
    const fileUrl = `/uploads/evidence/${file.filename}`;

    const evidence = await Evidence.create({
      taskId: task._id,
      uploaderId: userId,
      fileUrl,
      mediaType: isVideo ? MediaType.VIDEO : MediaType.PHOTO,
      fileSizeBytes: file.size,
      caption: caption || '',
      stage: stage === 'during_progress' ? 'during_progress' : 'completion_proof',
      reviewStatus: EvidenceReviewStatus.PENDING,
    });

    // Log Activity in Task
    const act = await TaskActivity.create({
      taskId: task._id,
      actorId: userId,
      action: 'EVIDENCE_SUBMITTED',
      newValue: isVideo ? 'Video Proof' : 'Photo Proof',
      reason: caption || 'Proof of work submitted for inspection',
    });

    const populated = await Evidence.findById(evidence._id)
      .populate('uploaderId', 'name email phone avatarUrl');

    const socketIO = getIO();
    if (socketIO) {
      socketIO.emit('activity:new', {
        ...act.toObject(),
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
      socketIO.emit('evidence:new', populated);
    }

    if (event?.managerId && event.managerId.toString() !== userId.toString()) {
      const notif = await Notification.create({
        recipientId: event.managerId,
        eventId: event._id,
        entityType: 'evidence',
        entityId: evidence._id,
        type: 'PROOF_UPLOADED',
        title: `📸 New Proof Submitted: ${task.title}`,
        body: `${req.user!.name} uploaded ${isVideo ? 'video' : 'photo'} proof for review.`,
      });
      sendPushToUser(event.managerId.toString(), {
        title: notif.title,
        body: notif.body,
        data: { taskId: task._id.toString(), eventId: event._id.toString() },
      });
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error uploading evidence.' });
  }
};

export const getTaskEvidence = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    const evidenceItems = await Evidence.find({ taskId: new mongoose.Types.ObjectId(taskId) })
      .populate('uploaderId', 'name email phone avatarUrl')
      .populate('reviewerId', 'name email phone avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: evidenceItems });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching evidence.' });
  }
};

export const getEventEvidenceInbox = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { reviewStatus, teamId, mediaType } = req.query;

    // Find all tasks belonging to this event
    const taskQuery: any = { eventId: new mongoose.Types.ObjectId(eventId) };
    if (teamId) {
      taskQuery.teamId = new mongoose.Types.ObjectId(teamId as string);
    }

    const eventTasks = await Task.find(taskQuery).select('_id title teamId zone status');
    const taskIds = eventTasks.map((t) => t._id);

    const evidenceQuery: any = { taskId: { $in: taskIds } };
    if (reviewStatus) {
      evidenceQuery.reviewStatus = reviewStatus;
    }
    if (mediaType) {
      evidenceQuery.mediaType = mediaType;
    }

    const items = await Evidence.find(evidenceQuery)
      .populate('uploaderId', 'name email phone avatarUrl')
      .populate('reviewerId', 'name email')
      .populate({
        path: 'taskId',
        select: 'title zone status priority teamId',
        populate: { path: 'teamId', select: 'name colorHex icon' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching evidence inbox.' });
  }
};

export const reviewEvidence = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { evidenceId } = req.params;
    const { reviewStatus, reviewNote, flagTaskRework } = req.body;

    if (!reviewStatus || !Object.values(EvidenceReviewStatus).includes(reviewStatus)) {
      res.status(400).json({ success: false, message: 'Valid review status (APPROVED or REJECTED) is required.' });
      return;
    }

    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      res.status(404).json({ success: false, message: 'Evidence item not found.' });
      return;
    }

    const task = await Task.findById(evidence.taskId);
    if (!task) {
      res.status(404).json({ success: false, message: 'Associated task not found.' });
      return;
    }

    const userId = req.user!._id;
    const event = await Event.findById(task.eventId);
    const isManager = event?.managerId.toString() === userId.toString();

    const membership = await EventMembership.findOne({
      eventId: task.eventId,
      userId,
      status: 'active',
    });

    const isLead =
      membership?.role === EventRole.TEAM_LEAD &&
      membership?.teamId?.toString() === task.teamId.toString();

    // Only Event Manager or the assigned Team Lead can review evidence
    if (!isManager && !isLead) {
      res.status(403).json({
        success: false,
        message: 'Only the Event Manager or assigned Team Lead can verify and approve evidence.',
      });
      return;
    }

    if (reviewStatus === EvidenceReviewStatus.REJECTED && !reviewNote) {
      res.status(400).json({ success: false, message: 'A review note explaining why proof was rejected is required.' });
      return;
    }

    evidence.reviewStatus = reviewStatus;
    evidence.reviewerId = userId;
    evidence.reviewNote = reviewNote || undefined;
    evidence.reviewedAt = new Date();
    await evidence.save();

    // Log Activity
    const action = reviewStatus === EvidenceReviewStatus.APPROVED ? 'EVIDENCE_APPROVED' : 'EVIDENCE_REJECTED';
    const act = await TaskActivity.create({
      taskId: task._id,
      actorId: userId,
      action,
      newValue: reviewStatus,
      reason: reviewNote || (reviewStatus === EvidenceReviewStatus.APPROVED ? 'Proof verified & approved' : 'Proof rejected'),
    });

    // If rejected and requested to flag task as rework
    if (reviewStatus === EvidenceReviewStatus.REJECTED && flagTaskRework) {
      task.status = TaskStatus.REWORK_REQUIRED;
      task.reworkReason = reviewNote;
      await task.save();

      await TaskActivity.create({
        taskId: task._id,
        actorId: userId,
        action: 'STATUS_CHANGED',
        previousValue: task.status,
        newValue: TaskStatus.REWORK_REQUIRED,
        reason: `Rework triggered by rejected evidence: ${reviewNote}`,
      });
    }

    const populated = await Evidence.findById(evidence._id)
      .populate('uploaderId', 'name email phone avatarUrl')
      .populate('reviewerId', 'name email');

    const socketIO = getIO();
    if (socketIO) {
      socketIO.emit('activity:new', {
        ...act.toObject(),
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
      socketIO.emit('evidence:reviewed', populated);
      if (flagTaskRework) {
        socketIO.emit('task:updated', task);
      }
    }

    // Notify the uploader
    if (evidence.uploaderId && evidence.uploaderId.toString() !== userId.toString()) {
      const isApproved = reviewStatus === EvidenceReviewStatus.APPROVED;
      const notif = await Notification.create({
        recipientId: evidence.uploaderId,
        eventId: event?._id,
        entityType: 'evidence',
        entityId: evidence._id,
        type: isApproved ? 'TASK_STATUS_CHANGED' : 'REWORK_REQUIRED',
        title: isApproved ? `✅ Proof Approved: ${task.title}` : `❌ Proof Rejected: ${task.title}`,
        body: reviewNote || (isApproved ? 'Your submission has been verified.' : 'Please review and resubmit proof.'),
      });
      sendPushToUser(evidence.uploaderId.toString(), {
        title: notif.title,
        body: notif.body,
        data: { taskId: task._id.toString(), eventId: event?._id.toString() },
      });
    }

    res.status(200).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error reviewing evidence.' });
  }
};

