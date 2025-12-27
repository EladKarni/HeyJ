import { supabase } from "../../utilities/Supabase";
import FriendRequest from "../../objects/FriendRequest";
import Profile from "../../objects/Profile";


export class FriendRequestService {
  static async fetchFriendRequests(userId: string): Promise<FriendRequest[]> {
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) {
      console.error("Error fetching friend requests:", error);
      return [];
    }

      if (data) {
        return data.map((r) => FriendRequest.fromJSON(r));
      }
      return [];
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      return [];
    }
  }

  static async fetchFriends(userId: string): Promise<Profile[]> {
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (error) {
        console.error("Error fetching friends:", error);
        return [];
      }

      if (data && data.length > 0) {
        const friendUids = data.map((f) =>
          f.requester_id === userId ? f.addressee_id : f.requester_id
        );

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("uid", friendUids);

        if (profilesError) {
          console.error("Error fetching friend profiles:", profilesError);
          return [];
        }

        if (profilesData) {
          return profilesData.map((p) => Profile.fromJSON(p));
        }
      }
      return [];
    } catch (error) {
      console.error("Error fetching friends:", error);
      return [];
    }
  }

  static async acceptRequest(
    requestId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({
          status: "accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("addressee_id", userId);

      if (error) {
        return { success: false, error: "Failed to accept friend request" };
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      return {
        success: false,
        error: error.message || "Failed to accept friend request",
      };
    }
  }

  static async rejectRequest(
    requestId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("addressee_id", userId);

      if (error) {
        return { success: false, error: "Failed to reject friend request" };
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error rejecting friend request:", error);
      return {
        success: false,
        error: error.message || "Failed to reject friend request",
      };
    }
  }

  static async cancelRequest(
    requestId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", requestId)
        .eq("requester_id", userId);

      if (error) {
        return { success: false, error: "Failed to cancel friend request" };
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error canceling friend request:", error);
      return {
        success: false,
        error: error.message || "Failed to cancel friend request",
      };
    }
  }

  static async checkFriendshipStatus(
    userId: string,
    otherUserId: string
  ): Promise<"accepted" | "pending" | "rejected" | "blocked" | "none"> {
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${userId})`
        )
        .limit(1);

      if (error || !data || data.length === 0) {
        return "none";
      }

      return data[0].status as "accepted" | "pending" | "rejected" | "blocked";
    } catch (error) {
      console.error("Error checking friendship status:", error);
      return "none";
    }
  }
}
