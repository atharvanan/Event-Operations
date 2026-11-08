import { Router } from 'express';
import { register, login, getMe, updateLanguage } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.patch('/language', authenticate, updateLanguage);

export default router;
