/**
 * Web implementation of database
 *
 * SQLite doesn't work on web, so we'll use a no-op implementation
 * or localStorage fallback for web platform.
 */

import { DATABASE_VERSION } from './schema';

// Mock database for web
let isInitialized = false;

export const initDatabase = async (): Promise<void> => {
  console.warn('📦 Database not available on web - using in-memory fallback');
  isInitialized = true;
};

export const getDatabase = (): any => {
  if (!isInitialized) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  // Return mock database
  return {
    execAsync: async () => {},
    runAsync: async () => {},
    getAllAsync: async () => [],
    getFirstAsync: async () => null,
    closeAsync: async () => {},
  };
};

export const closeDatabase = async (): Promise<void> => {
  isInitialized = false;
  console.log('📦 Database closed (web no-op)');
};

export const setSyncMetadata = async (key: string, value: string): Promise<void> => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`sync_metadata_${key}`, value);
  }
};

export const getSyncMetadata = async (key: string): Promise<string | null> => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(`sync_metadata_${key}`);
  }
  return null;
};
