import { supabase } from "../../utilities/Supabase";
import AppLogger from "@/utilities/AppLogger";

export interface UserLookupResult {
  uid: string;
  userCode: string;
  name: string;
}

export class UserLookupService {
  static async findByUserCode(
    userCode: string
  ): Promise<UserLookupResult | null> {
    try {
      const trimmedCode = userCode.trim().toLowerCase();
      const { data: allProfiles, error: fetchError } = await supabase
        .from("profiles")
        .select("uid,userCode,name");

      if (fetchError) {
        throw new Error("Failed to search for user");
      }

      const foundUser = allProfiles?.find(
        (p) => p.userCode?.trim().toLowerCase() === trimmedCode
      );

      return foundUser || null;
    } catch (error) {
      AppLogger.error("Error looking up user by code:", error);
      return null;
    }
  }

  static async validateUserForFriendship(
    userCode: string,
    currentUserId: string
  ): Promise<{ success: boolean; user?: UserLookupResult; error?: string }> {
    const user = await this.findByUserCode(userCode);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.uid === currentUserId) {
      return { success: false, error: "You cannot add yourself as a friend" };
    }

    return { success: true, user };
  }
}
