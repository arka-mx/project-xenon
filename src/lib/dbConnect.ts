import mongoose from 'mongoose';
import { ensureDefaultAdminUser } from '@/lib/ensureDefaultAdmin';

type ConnectionObject = {
  isConnected?: number;
};

const connection: ConnectionObject = {};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown database error';
}

async function dbConnect(): Promise<void> {
  // Check if already connected
  if (connection.isConnected) {
    console.log('Using existing database connection');
    await ensureDefaultAdminUser();
    return;
  }

  // Check if mongoose has an active connection
  if (mongoose.connections[0]?.readyState === 1) {
    connection.isConnected = mongoose.connections[0].readyState;
    console.log('Using existing mongoose connection');
    await ensureDefaultAdminUser();
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in environment variables');
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    connection.isConnected = db.connections[0].readyState;
    console.log('Database connected successfully');
    await ensureDefaultAdminUser();
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('Database connection failed:', message);
    connection.isConnected = 0;
    throw new Error(`DB Connection Error: ${message}`);
  }
}

export default dbConnect;
