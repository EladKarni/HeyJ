import { getDatabase } from '../database';
import Profile from '@objects/Profile';

export const saveProfile = async (profile: Partial<Profile>): Promise<void> => {
  const db = getDatabase();
  const now = Date.now();

  await db.runAsync(
    `INSERT OR REPLACE INTO profiles_cache
     (uid, profilePicture, name, email, userCode, syncedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      profile.uid!,
      profile.profilePicture || '',
      profile.name || '',
      profile.email || '',
      profile.userCode || '',
      now,
    ]
  );
};

export const getProfile = async (uid: string): Promise<Profile | null> => {
  const db = getDatabase();

  const row = await db.getFirstAsync<{
    uid: string;
    profilePicture: string;
    name: string;
    email: string;
    userCode: string;
  }>(
    'SELECT uid, profilePicture, name, email, userCode FROM profiles_cache WHERE uid = ?',
    [uid]
  );

  if (!row) return null;

  return new Profile(
    row.uid,
    row.profilePicture,
    row.name,
    row.email,
    [], // conversations - not stored in cache
    row.userCode,
    null // oneSignalPlayerId - not stored in cache
  );
};

export const saveProfiles = async (profiles: Profile[]): Promise<void> => {
  for (const profile of profiles) {
    await saveProfile(profile);
  }
};
