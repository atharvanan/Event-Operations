import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTaskStatus,
  reassignTask,
  escalateTask,
} from '../controllers/taskController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Task endpoints
router.post('/events/:eventId/tasks', createTask);
router.get('/events/:eventId/tasks', getTasks);
router.get('/tasks/:taskId', getTaskById);
router.patch('/tasks/:taskId/status', updateTaskStatus);
router.patch('/tasks/:taskId/reassign', reassignTask);
router.post('/tasks/:taskId/escalate', escalateTask);

export default router;

