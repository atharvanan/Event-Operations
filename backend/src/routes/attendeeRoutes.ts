import { Router } from 'express';
import {
  getAttendees,
  registerAttendee,
  checkInAttendee,
  updateAttendee,
} from '../controllers/attendeeController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/events/:eventId/attendees', getAttendees);
router.post('/events/:eventId/attendees', registerAttendee);
router.post('/events/:eventId/attendees/check-in', checkInAttendee);
router.patch('/events/:eventId/attendees/:attendeeId', updateAttendee);

export default router;

