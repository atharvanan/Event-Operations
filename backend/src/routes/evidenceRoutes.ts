import { Router } from 'express';
import {
  uploadEvidence,
  getTaskEvidence,
  getEventEvidenceInbox,
  reviewEvidence,
} from '../controllers/evidenceController.js';
import { authenticate } from '../middlewares/auth.js';
import { evidenceUpload } from '../utils/storage.js';

const router = Router();

router.use(authenticate);

// Evidence upload against task
router.post('/tasks/:taskId/evidence', evidenceUpload.single('file'), uploadEvidence);

// Get evidence for a task
router.get('/tasks/:taskId/evidence', getTaskEvidence);

// Event-wide evidence review inbox (for Manager & Leads)
router.get('/events/:eventId/evidence/inbox', getEventEvidenceInbox);

// Review (approve/reject) evidence
router.patch('/evidence/:evidenceId/review', reviewEvidence);

export default router;

