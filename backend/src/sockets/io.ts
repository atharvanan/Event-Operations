import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export const setIO = (instance: SocketIOServer): void => {
  ioInstance = instance;
};

export const getIO = (): SocketIOServer | null => {
  return ioInstance;
};

