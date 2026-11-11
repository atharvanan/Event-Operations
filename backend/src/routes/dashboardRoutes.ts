import { Router } from 'express';
import {
  getDashboardSummary,
  getDashboardTasks,
  getDashboardTeams,
  getDashboardAttendees,
  getEventResources,
  uploadEventResource,
} from '../controllers/dashboardController.js';
import { authenticate } from '../middlewares/auth.js';
import { resourceUpload } from '../utils/storage.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard/summary', getDashboardSummary);
router.get('/dashboard/tasks', getDashboardTasks);
router.get('/dashboard/teams', getDashboardTeams);
router.get('/dashboard/attendees', getDashboardAttendees);
router.get('/events/:eventId/resources', getEventResources);
router.post('/events/:eventId/resources', resourceUpload.single('file'), uploadEventResource);

export default router;

