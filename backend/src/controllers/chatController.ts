import { Response } from 'express';
import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Event } from '../models/Event.js';
import { EventMembership } from '../models/EventMembership.js';
import { Task } from '../models/Task.js';
import { ConversationType, MessageType, EventRole } from '../constants/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { getIO } from '../sockets/io.js';

export const getConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const userId = req.user!._id;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const isManager = event.managerId.toString() === userId.toString();

    // Query conversations for this event
    let query: any = { eventId: new mongoose.Types.ObjectId(eventId) };

    if (!isManager) {
      // Non-managers only see channels where they are listed as participant
      query.participantIds = userId;
    }

    const conversations = await Conversation.find(query)
      .populate('teamId', 'name colorHex icon')
      .populate('participantIds', 'name email avatarUrl preferredLanguage')
      .sort({ lastMessageAt: -1 });

    // Attach last message and unread count to each conversation
    const convsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const lastMsg = await Message.findOne({ conversationId: conv._id })
          .populate('senderId', 'name')
          .sort({ createdAt: -1 });

        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: userId },
          'readBy.userId': { $ne: userId },
        });

        return {
          ...conv.toObject(),
          lastMessage: lastMsg,
          unreadCount,
        };
      })
    );

    res.status(200).json({ success: true, data: convsWithDetails });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching conversations.' });
  }
};

export const getConversationMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user!._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found.' });
      return;
    }

    // Check authorization
    const event = await Event.findById(conversation.eventId);
    const isManager = event?.managerId.toString() === userId.toString();
    const isParticipant = conversation.participantIds.some((pId) => pId.toString() === userId.toString());

    if (!isManager && !isParticipant) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have access to this conversation.',
      });
      return;
    }

    const query: any = { conversationId: new mongoose.Types.ObjectId(conversationId) };
    if (before) {
      query.createdAt = { $lt: new Date(before as string) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name email avatarUrl preferredLanguage')
      .populate('taskIdReference', 'title status priority zone')
      .populate({
        path: 'replyToMessageId',
        select: 'content senderId messageType',
        populate: { path: 'senderId', select: 'name' },
      })
      .sort({ createdAt: 1 })
      .limit(Number(limit));

    // Mark unread messages as read
    await Message.updateMany(
      {
        conversationId: conversation._id,
        'readBy.userId': { $ne: userId },
      },
      {
        $addToSet: { readBy: { userId, readAt: new Date() } },
      }
    );

    res.status(200).json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching messages.' });
  }
};

export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { content, messageType = MessageType.TEXT, taskIdReference, replyToMessageId } = req.body;
    const userId = req.user!._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found.' });
      return;
    }

    // Authorization
    const event = await Event.findById(conversation.eventId);
    const isManager = event?.managerId.toString() === userId.toString();
    const isParticipant = conversation.participantIds.some((pId) => pId.toString() === userId.toString());

    if (!isManager && !isParticipant) {
      res.status(403).json({ success: false, message: 'Forbidden. You cannot post in this channel.' });
      return;
    }

    // Configurable Permissions Check
    if (!isManager && event?.permissions) {
      const membership = await EventMembership.findOne({
        eventId: event._id,
        userId,
        status: 'active',
      });
      if (membership?.role === EventRole.TEAM_MEMBER) {
        if (conversation.type === ConversationType.GLOBAL_EVENT && event.permissions.allowWorkersGlobalChat === false) {
          res.status(403).json({
            success: false,
            message: 'Worker posting is currently disabled in Global Event chat by the event manager.',
          });
          return;
        }
        if (conversation.type === ConversationType.TEAM_INTERNAL && event.permissions.allowWorkersTeamChat === false) {
          res.status(403).json({
            success: false,
            message: 'Worker posting is currently disabled in Team chat by the event manager.',
          });
          return;
        }
      }
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: userId,
      content: content || '',
      messageType,
      taskIdReference: taskIdReference ? new mongoose.Types.ObjectId(taskIdReference) : undefined,
      replyToMessageId: replyToMessageId ? new mongoose.Types.ObjectId(replyToMessageId) : undefined,
      readBy: [{ userId, readAt: new Date() }],
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name email avatarUrl preferredLanguage')
      .populate('taskIdReference', 'title status priority zone');

    // Broadcast through Socket.IO room
    const socketIO = getIO();
    if (socketIO) {
      socketIO.to(`conv:${conversationId}`).emit('message:received', populated);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error sending message.' });
  }
};

export const uploadVoiceNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { durationSeconds } = req.body;
    const file = req.file;
    const userId = req.user!._id;

    if (!file) {
      res.status(400).json({ success: false, message: 'No audio file uploaded.' });
      return;
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found.' });
      return;
    }

    const mediaUrl = `/uploads/chat/${file.filename}`;

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: userId,
      content: 'Voice note',
      messageType: MessageType.VOICE_NOTE,
      mediaUrl,
      voiceDurationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
      readBy: [{ userId, readAt: new Date() }],
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name email avatarUrl preferredLanguage');

    const socketIO = getIO();
    if (socketIO) {
      socketIO.to(`conv:${conversationId}`).emit('message:received', populated);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error uploading voice note.' });
  }
};

export const createDirectConversation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { targetUserId } = req.body;
    const userId = req.user!._id;

    if (!targetUserId) {
      res.status(400).json({ success: false, message: 'Target user ID is required.' });
      return;
    }

    // Check if direct conversation already exists between these 2 users for this event
    let conv = await Conversation.findOne({
      eventId: new mongoose.Types.ObjectId(eventId),
      type: ConversationType.DIRECT,
      participantIds: { $all: [userId, new mongoose.Types.ObjectId(targetUserId)] },
    });

    if (conv) {
      res.status(200).json({ success: true, data: conv });
      return;
    }

    conv = await Conversation.create({
      eventId: new mongoose.Types.ObjectId(eventId),
      type: ConversationType.DIRECT,
      title: 'Direct Chat',
      participantIds: [userId, new mongoose.Types.ObjectId(targetUserId)],
    });

    const populated = await Conversation.findById(conv._id)
      .populate('participantIds', 'name email avatarUrl');

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error initiating direct chat.' });
  }
};
