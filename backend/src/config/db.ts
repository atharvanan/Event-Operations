import mongoose from 'mongoose';
import { config } from './index.js';

export const connectDB = async (uri?: string): Promise<void> => {
  try {
    const connectionUri = uri || config.mongodbUri;
    await mongoose.connect(connectionUri);
    console.log(`[DB] Successfully connected to MongoDB`);
  } catch (error) {
    console.error(`[DB] MongoDB connection error:`, error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.error(`[DB] Error disconnecting MongoDB:`, error);
  }
};
