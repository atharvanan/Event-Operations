import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  getVapidKey,
  subscribePush,
  unsubscribePush,
  getNotifications,
  markNotificationRead,
} from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);

router.get('/vapid-key', getVapidKey);
router.post('/subscribe', subscribePush);
router.post('/unsubscribe', unsubscribePush);
router.get('/', getNotifications);
router.patch('/:id/read', markNotificationRead);

export default router;
