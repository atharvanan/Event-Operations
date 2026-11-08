import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { Notification } from '../models/Notification.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { getVapidPublicKey } from '../utils/push.js';

export const getVapidKey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: {
      publicKey: getVapidPublicKey(),
    },
  });
};

export const subscribePush = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    res.status(400).json({ success: false, message: 'Invalid push subscription payload' });
    return;
  }

  await PushSubscription.findOneAndUpdate(
    { userId, endpoint },
    {
      userId,
      endpoint,
      keys,
      userAgent: req.headers['user-agent'],
    },
    { upsert: true, new: true }
  );

  res.status(201).json({ success: true, message: 'Push subscription registered successfully' });
};

export const unsubscribePush = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const { endpoint } = req.body;

  await PushSubscription.deleteOne({ userId, endpoint });
  res.json({ success: true, message: 'Unsubscribed from push notifications' });
};

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipientId: userId }),
    Notification.countDocuments({ recipientId: userId, isRead: false }),
  ]);

  res.json({
    success: true,
    data: {
      notifications,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit),
    },
  });
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const { id } = req.params;

  if (id === 'all') {
    await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
    return;
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(id), recipientId: userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    res.status(404).json({ success: false, message: 'Notification not found' });
    return;
  }

  res.json({ success: true, data: notification });
};
