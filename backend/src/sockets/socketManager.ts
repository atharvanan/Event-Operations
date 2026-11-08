import { Server as SocketIOServer, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Event } from '../models/Event.js';
import { MessageType, ConversationType } from '../constants/index.js';
import { sanitizeHtml } from '../utils/sanitize.js';

interface AuthenticatedSocket extends Socket {
  user?: TokenPayload & { _id: string };
}

export const setupSocketServer = (io: SocketIOServer): void => {
  // Authentication Middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const payload = verifyToken(token);
      socket.user = { ...payload, _id: payload.userId };
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?._id;
    if (!userId) return;

    // Join user-specific notification room
    socket.join(`user:${userId}`);
    console.log(`[Socket] User ${socket.user?.name} (${userId}) connected [${socket.id}]`);

    // 1. Join Conversation Room with Strict Authorization
    socket.on('conversation:join', async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data;
        if (!conversationId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('error:room', { message: 'Conversation not found.' });
          return;
        }

        // Check Authorization
        const event = await Event.findById(conversation.eventId);
        const isManager = event?.managerId.toString() === userId;
        const isParticipant = conversation.participantIds.some(
          (pId) => pId.toString() === userId
        );

        if (!isManager && !isParticipant) {
          socket.emit('error:room_forbidden', {
            message: 'Forbidden. You are not an authorized member of this conversation.',
          });
          return;
        }

        socket.join(`conv:${conversationId}`);
        socket.emit('conversation:joined', { conversationId });
      } catch (err: any) {
        socket.emit('error:room', { message: err.message || 'Error joining conversation room' });
      }
    });

    // 2. Leave Conversation Room
    socket.on('conversation:leave', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.leave(`conv:${data.conversationId}`);
      }
    });

    // 3. Typing Indicator
    socket.on('typing:start', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.to(`conv:${data.conversationId}`).emit('typing:update', {
          conversationId: data.conversationId,
          userId,
          userName: socket.user?.name,
          isTyping: true,
        });
      }
    });

    socket.on('typing:stop', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.to(`conv:${data.conversationId}`).emit('typing:update', {
          conversationId: data.conversationId,
          userId,
          userName: socket.user?.name,
          isTyping: false,
        });
      }
    });

    // 4. Send Real-Time Message via Socket
    socket.on(
      'message:send',
      async (data: {
        conversationId: string;
        content?: string;
        messageType?: MessageType;
        mediaUrl?: string;
        taskIdReference?: string;
        replyToMessageId?: string;
      }) => {
        try {
          const {
            conversationId,
            content,
            messageType = MessageType.TEXT,
            mediaUrl,
            taskIdReference,
            replyToMessageId,
          } = data;

          if (!conversationId) return;

          // Validate empty message and length limits (CHAT-11)
          if ((!content || content.trim() === '') && !mediaUrl) {
            socket.emit('error:message', { message: 'Message content or media is required.' });
            return;
          }

          if (content && content.length > 2000) {
            socket.emit('error:message', { message: 'Message exceeds maximum length of 2000 characters.' });
            return;
          }

          const conversation = await Conversation.findById(conversationId);
          if (!conversation) {
            socket.emit('error:message', { message: 'Conversation not found.' });
            return;
          }

          // Authorization check
          const event = await Event.findById(conversation.eventId);
          const isManager = event?.managerId.toString() === userId;
          const isParticipant = conversation.participantIds.some(
            (pId) => pId.toString() === userId
          );

          if (!isManager && !isParticipant) {
            socket.emit('error:message_forbidden', {
              message: 'You are not permitted to send messages to this channel.',
            });
            return;
          }

          const sanitizedContent = content ? sanitizeHtml(content.trim()) : '';

          // Save Message
          const message = await Message.create({
            conversationId: conversation._id,
            senderId: new mongoose.Types.ObjectId(userId),
            content: sanitizedContent,
            messageType,
            mediaUrl,
            taskIdReference: taskIdReference
              ? new mongoose.Types.ObjectId(taskIdReference)
              : undefined,
            replyToMessageId: replyToMessageId
              ? new mongoose.Types.ObjectId(replyToMessageId)
              : undefined,
            readBy: [{ userId: new mongoose.Types.ObjectId(userId), readAt: new Date() }],
          });

          // Update Conversation last message timestamp
          conversation.lastMessageAt = new Date();
          await conversation.save();

          const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name email avatarUrl preferredLanguage')
            .populate('taskIdReference', 'title status priority zone');

          // Broadcast to everyone in conversation room
          io.to(`conv:${conversationId}`).emit('message:received', populatedMessage);
        } catch (err: any) {
          socket.emit('error:message', { message: err.message || 'Error sending message' });
        }
      }
    );

    socket.on('disconnect', () => {
      console.log(`[Socket] Client ${socket.id} disconnected`);
    });
  });
};

