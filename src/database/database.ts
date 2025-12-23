import * as SQLite from "expo-sqlite";
import { DATABASE_NAME, DATABASE_VERSION, SCHEMA } from "./schema";
import AppLogger from "@/utilities/AppLogger";

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<void> => {
  try {
    if (db) {
      AppLogger.debug("📦 Database already initialized");
      return;
    }

    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    AppLogger.debug("📦 Database opened successfully");

    // Create tables
    await db.execAsync(SCHEMA.CONVERSATIONS);
    await db.execAsync(SCHEMA.MESSAGES);
    await db.execAsync(SCHEMA.PROFILES_CACHE);
    await db.execAsync(SCHEMA.PENDING_MESSAGES);
    await db.execAsync(SCHEMA.SYNC_METADATA);

    // Create indexes
    for (const index of SCHEMA.INDEXES) {
      await db.execAsync(index);
    }

    AppLogger.debug("✅ Database schema created");

    // Set database version
    await setSyncMetadata("db_version", DATABASE_VERSION.toString());
  } catch (error) {
    AppLogger.error("❌ Error initializing database:", error);
    throw error;
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
    AppLogger.debug("📦 Database closed");
  }
};

// Metadata helpers
export const setSyncMetadata = async (
  key: string,
  value: string
): Promise<void> => {
  const database = getDatabase();
  await database.runAsync(
    "INSERT OR REPLACE INTO sync_metadata (key, value, updatedAt) VALUES (?, ?, ?)",
    [key, value, Date.now()]
  );
};

export const getSyncMetadata = async (key: string): Promise<string | null> => {
  const database = getDatabase();
  const result = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_metadata WHERE key = ?",
    [key]
  );
  return result?.value || null;
};
