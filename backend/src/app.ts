import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import orgRoutes from './routes/orgRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import evidenceRoutes from './routes/evidenceRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import attendeeRoutes from './routes/attendeeRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { authenticate } from './middlewares/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = (): Application => {
  const app: Application = express();

  // Basic security and parsing
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Protect evidence & resource media from unauthenticated public access (EVD-04, SEC-03)
  app.use('/uploads/evidence', authenticate);
  app.use('/uploads/resources', authenticate);

  // Static uploads directory
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'event-operations-backend',
    });
  });

  // API v1 Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/orgs', orgRoutes);
  app.use('/api/v1/events', eventRoutes);
  app.use('/api/v1/events/:eventId/teams', teamRoutes);
  app.use('/api/v1', taskRoutes);
  app.use('/api/v1', evidenceRoutes);
  app.use('/api/v1', chatRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1', attendeeRoutes);
  app.use('/api/v1', dashboardRoutes);

  // Fallback 404
  app.use((req: Request, res: Response) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found.` });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
