import mongoose from 'mongoose';
import { env } from './env.js';
import { logEvent } from '../common/utils/logger.js';

export async function connectDatabase() {
  await mongoose.connect(env.MONGODB_URI);
  logEvent('info', 'database_connected');
  mongoose.connection.on('disconnected', () => logEvent('error', 'database_disconnected'));
  mongoose.connection.on('error', (error) => logEvent('error', 'database_error', { errorMessage: error.message.slice(0, 300) }));
}
