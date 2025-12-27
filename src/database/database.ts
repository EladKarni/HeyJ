import * as SQLite from "expo-sqlite";
import { DATABASE_NAME, DATABASE_VERSION, SCHEMA } from "./schema";
import AppLogger from "@/utilities/AppLogger";
import { withTimeout, TIMEOUTS } from "@/utilities/timeoutUtils";

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<void> => {
  const startTime = Date.now();
  try {
    AppLogger.critical("Database initialization started");
    
    if (db) {
      AppLogger.debug("📦 Database already initialized");
      return;
    }

    db = await withTimeout(
      SQLite.openDatabaseAsync(DATABASE_NAME),
      TIMEOUTS.DATABASE_OPEN,
      "Database open timed out"
    );
    AppLogger.debug("📦 Database opened successfully");

    // Create tables with timeouts
    await withTimeout(
      db.execAsync(SCHEMA.CONVERSATIONS),
      TIMEOUTS.DATABASE_SCHEMA,
      "Failed to create conversations table"
    );
    await withTimeout(
      db.execAsync(SCHEMA.MESSAGES),
      TIMEOUTS.DATABASE_SCHEMA,
      "Failed to create messages table"
    );
    await withTimeout(
      db.execAsync(SCHEMA.PROFILES_CACHE),
      TIMEOUTS.DATABASE_SCHEMA,
      "Failed to create profiles_cache table"
    );
    await withTimeout(
      db.execAsync(SCHEMA.PENDING_MESSAGES),
      TIMEOUTS.DATABASE_SCHEMA,
      "Failed to create pending_messages table"
    );
    await withTimeout(
      db.execAsync(SCHEMA.SYNC_METADATA),
      TIMEOUTS.DATABASE_SCHEMA,
      "Failed to create sync_metadata table"
    );

    // Create indexes with timeouts
    for (const index of SCHEMA.INDEXES) {
      await withTimeout(
        db.execAsync(index),
        TIMEOUTS.DATABASE_SCHEMA,
        "Failed to create database index"
      );
    }

    AppLogger.debug("✅ Database schema created");

    // Set database version
    await setSyncMetadata("db_version", DATABASE_VERSION.toString());
    
    AppLogger.critical("Database initialization completed", {
      duration: `${Date.now() - startTime}ms`
    });
  } catch (error) {
    AppLogger.error("❌ Error initializing database:", error instanceof Error ? error : new Error(String(error)));
    AppLogger.critical("Database initialization failed", {
      duration: `${Date.now() - startTime}ms`,
      error: error instanceof Error ? error.message : String(error)
    });
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
