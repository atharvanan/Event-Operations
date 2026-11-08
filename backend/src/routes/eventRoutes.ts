import { Router } from 'express';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  addEventMember,
  updateEventPermissions,
  getEventActivities,
  getEventWorkload,
} from '../controllers/eventController.js';
import { authenticate, requireEventRole } from '../middlewares/auth.js';
import { EventRole } from '../constants/index.js';

const router = Router();

router.use(authenticate);

router.post('/', createEvent);
router.get('/', getEvents);
router.get('/:id', getEventById);
router.patch('/:id', requireEventRole([EventRole.EVENT_MANAGER]), updateEvent);
router.put('/:id', requireEventRole([EventRole.EVENT_MANAGER]), updateEvent);
router.post('/:id/members', requireEventRole([EventRole.EVENT_MANAGER]), addEventMember);
router.patch('/:id/permissions', requireEventRole([EventRole.EVENT_MANAGER]), updateEventPermissions);
router.get('/:id/activities', getEventActivities);
router.get('/:id/workload', getEventWorkload);

export default router;
