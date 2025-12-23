import { getDatabase } from "./database";
import AppLogger from "@/utilities/AppLogger";

export const clearAllCache = async (): Promise<void> => {
  const db = getDatabase();

  await db.execAsync("DELETE FROM conversations");
  await db.execAsync("DELETE FROM messages");
  await db.execAsync("DELETE FROM profiles_cache");
  await db.execAsync("DELETE FROM pending_messages");
  await db.execAsync("DELETE FROM sync_metadata");

  AppLogger.debug("✅ All cache cleared");
};
