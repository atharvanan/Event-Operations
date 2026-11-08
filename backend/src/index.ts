import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { config } from './config/index.js';
import { setupSocketServer } from './sockets/socketManager.js';
import { setIO } from './sockets/io.js';

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

setIO(io);
setupSocketServer(io);

const startServer = async () => {
  await connectDB();
  server.listen(config.port, () => {
    console.log(`[Server] Event Operations API running on port ${config.port} (${config.nodeEnv})`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
