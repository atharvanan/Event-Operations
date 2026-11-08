import { generateVAPIDKeys, setVapidDetails, sendNotification } from 'web-push';
import { PushSubscription } from '../models/PushSubscription.js';

// VAPID keys - use environment or generate safe fallback pairs for zero-cost operation
const defaultVapidSubject = 'mailto:admin@eventops.local';
let publicKey = process.env.VAPID_PUBLIC_KEY;
let privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
  // Generate a valid base64url VAPID keypair if not configured in environment
  const vapidKeys = generateVAPIDKeys();
  publicKey = vapidKeys.publicKey;
  privateKey = vapidKeys.privateKey;
}

setVapidDetails(defaultVapidSubject, publicKey, privateKey);

export function getVapidPublicKey(): string {
  return publicKey!;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    eventId?: string;
    taskId?: string;
  };
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'test') return;
    const subscriptions = await PushSubscription.find({ userId });
    if (!subscriptions || subscriptions.length === 0) return;

    const stringPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-192x192.png',
      data: payload.data || {},
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          stringPayload
        );
      } catch (err: any) {
        // If subscription is expired or unsubscribed (404/410), delete it
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}
