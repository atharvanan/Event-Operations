import { Router } from 'express';
import {
  getConversations,
  getConversationMessages,
  sendMessage,
  uploadVoiceNote,
  uploadChatAttachment,
  createDirectConversation,
} from '../controllers/chatController.js';
import { authenticate } from '../middlewares/auth.js';
import { chatMediaUpload } from '../utils/storage.js';

const router = Router();

router.use(authenticate);

// Conversations for an event
router.get('/events/:eventId/conversations', getConversations);
router.post('/events/:eventId/conversations/direct', createDirectConversation);

// Messages in a conversation
router.get('/conversations/:conversationId/messages', getConversationMessages);
router.post('/conversations/:conversationId/messages', sendMessage);
router.post(
  '/conversations/:conversationId/voice-note',
  chatMediaUpload.single('file'),
  uploadVoiceNote
);
router.post(
  '/conversations/:conversationId/media',
  chatMediaUpload.single('file'),
  uploadChatAttachment
);

export default router;

