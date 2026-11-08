import { Router } from 'express';
import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
} from '../controllers/teamController.js';
import { authenticate, requireEventRole } from '../middlewares/auth.js';
import { EventRole } from '../constants/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Team endpoints scoped under /events/:eventId/teams
router.post('/', requireEventRole([EventRole.EVENT_MANAGER]), createTeam);
router.get('/', getTeams);
router.get('/:teamId', getTeamById);
router.patch('/:teamId', requireEventRole([EventRole.EVENT_MANAGER]), updateTeam);

export default router;

