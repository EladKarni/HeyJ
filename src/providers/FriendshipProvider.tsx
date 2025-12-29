import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../utilities/Supabase";
import FriendRequest from "../objects/FriendRequest";
import Profile from "../objects/Profile";
import { useProfile } from "../utilities/ProfileProvider";
import { logAgentEvent } from "../utilities/AgentLogger";
import { FriendRequestService } from "../services/friendship/FriendRequestService";
import { FriendshipService } from "../services/friendship/FriendshipService";
import AppLogger from "@/utilities/AppLogger";

interface FriendsContextType {
  friendRequests: FriendRequest[];
  friends: Profile[];
  getFriendRequests: () => Promise<void>;
  getFriends: () => Promise<void>;
  sendFriendRequest: (userCode: string) => Promise<{ success: boolean; error?: string }>;
  acceptFriendRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  rejectFriendRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  blockUser: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  cancelFriendRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  checkFriendshipStatus: (otherUserId: string) => Promise<"accepted" | "pending" | "rejected" | "blocked" | "none">;
}

const FriendsContext = createContext<FriendsContextType | null>(null);

export const FriendshipProvider = ({ children }: { children: React.ReactNode }) => {
  logAgentEvent({
    location: 'FriendshipProvider.tsx:FriendshipProvider',
    message: 'FriendshipProvider rendering',
    data: {},
    hypothesisId: 'A',
  });

  let profile;
  try {
    const profileContext = useProfile();
    profile = profileContext.profile;
    logAgentEvent({
      location: 'FriendshipProvider.tsx:FriendshipProvider',
      message: 'FriendshipProvider useProfile success',
      data: { hasProfile: !!profile },
      hypothesisId: 'A',
    });
  } catch (error) {
    logAgentEvent({
      location: 'FriendshipProvider.tsx:FriendshipProvider',
      message: 'FriendshipProvider useProfile error',
      data: {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      hypothesisId: 'A',
    });
    throw error;
  }

  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);

  const getFriendRequests = async () => {
    if (!profile) {
      setFriendRequests([]);
      return;
    }

    const requests = await FriendRequestService.fetchFriendRequests(profile.uid);
    setFriendRequests(requests);
  };

  const getFriends = async () => {
    if (!profile) {
      setFriends([]);
      return;
    }

    const friendProfiles = await FriendRequestService.fetchFriends(profile.uid);
    setFriends(friendProfiles);
  };

  const sendFriendRequest = async (
    userCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    const result = await FriendshipService.sendFriendRequest(userCode, profile);

    if (result.success) {
      await getFriendRequests();
    }

    return result;
  };

  const acceptFriendRequest = async (
    requestId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    const result = await FriendshipService.acceptFriendRequest(requestId, profile);

    if (result.success) {
      await getFriendRequests();
      await getFriends();
    }

    return result;
  };

  const rejectFriendRequest = async (
    requestId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    const result = await FriendRequestService.rejectRequest(requestId, profile.uid);

    if (result.success) {
      await getFriendRequests();
    }

    return result;
  };

  const blockUser = async (
    requestId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    const result = await FriendshipService.blockUser(requestId, profile.uid);

    if (result.success) {
      await getFriendRequests();
    }

    return result;
  };

  const cancelFriendRequest = async (
    requestId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    const result = await FriendRequestService.cancelRequest(requestId, profile.uid);

    if (result.success) {
      await getFriendRequests();
    }

    return result;
  };

  const checkFriendshipStatus = async (
    otherUserId: string
  ): Promise<"accepted" | "pending" | "rejected" | "blocked" | "none"> => {
    if (!profile) {
      return "none";
    }

    return await FriendRequestService.checkFriendshipStatus(profile.uid, otherUserId);
  };

  useEffect(() => {
    if (profile) {
      getFriendRequests();
      getFriends();
    }
  }, [profile]);

  // Real-time subscription for friend requests
  useEffect(() => {
    if (!profile) {
      return;
    }

    const channel = supabase.channel(`friendships_${profile.uid}`, {
      config: {
        broadcast: { self: true },
      },
    });

    // Listen for new friend requests (INSERT) where user is addressee
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friendships",
          filter: `addressee_id=eq.${profile.uid}`,
        },
        (payload) => {
          AppLogger.debug("🔔 New friend request received!", payload);
          getFriendRequests();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friendships",
          filter: `requester_id=eq.${profile.uid}`,
        },
        (payload) => {
          AppLogger.debug("🔔 Friend request sent!", payload);
          getFriendRequests();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friendships",
          filter: `addressee_id=eq.${profile.uid}`,
        },
        (payload) => {
          AppLogger.debug("🔔 Friend request updated!", payload);
          getFriendRequests();
          getFriends();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friendships",
          filter: `requester_id=eq.${profile.uid}`,
        },
        (payload) => {
          AppLogger.debug("🔔 Friend request status changed!", payload);
          getFriendRequests();
          getFriends();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "friendships",
          filter: `addressee_id=eq.${profile.uid}`,
        },
        (payload) => {
          AppLogger.debug("🔔 Friend request deleted!", payload);
          getFriendRequests();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "friendships",
          filter: `requester_id=eq.${profile.uid}`,
        },
        (payload) => {
          AppLogger.debug("🔔 Friend request cancelled!", payload);
          getFriendRequests();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          AppLogger.debug("✅ Friend requests real-time subscription active");
        } else if (status === "CHANNEL_ERROR") {
          AppLogger.error("❌ Friend requests subscription error");
        } else {
          AppLogger.debug("🔄 Friend requests subscription status:", status);
        }
      });

    return () => {
      AppLogger.debug("🔌 Unsubscribing from friend requests channel");
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return (
    <FriendsContext.Provider
      value={{
        friendRequests,
        friends,
        getFriendRequests,
        getFriends,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        blockUser,
        cancelFriendRequest,
        checkFriendshipStatus,
      }}
    >
      {children}
    </FriendsContext.Provider>
  );
};

export const useFriends = () => {
  const context = useContext(FriendsContext);
  if (!context) {
    throw new Error("useFriends must be used within a FriendshipProvider");
  }
  return context;
};