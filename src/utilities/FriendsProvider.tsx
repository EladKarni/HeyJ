import React, { createContext, useContext, useEffect, useState } from "react";
import FriendRequest from "@objects/FriendRequest";
import Profile from "@objects/Profile";
import { useProfile } from "./ProfileProvider";
import { logAgentEvent } from "./AgentLogger";
import { FriendRequestService } from "../services/friendship/FriendRequestService";
import { FriendshipService } from "../services/friendship/FriendshipService";


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

export const FriendsProvider = ({ children }: { children: React.ReactNode }) => {
  logAgentEvent({
    location: 'FriendsProvider.tsx:FriendsProvider',
    message: 'FriendsProvider rendering',
    data: {},
    hypothesisId: 'A',
  });

  let profile;
  try {
    const profileContext = useProfile();
    profile = profileContext.profile;
    logAgentEvent({
      location: 'FriendsProvider.tsx:FriendsProvider',
      message: 'FriendsProvider useProfile success',
      data: { hasProfile: !!profile },
      hypothesisId: 'A',
    });
  } catch (error) {
    logAgentEvent({
      location: 'FriendsProvider.tsx:FriendsProvider',
      message: 'FriendsProvider useProfile error',
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

    try {
      const requests = await FriendRequestService.fetchFriendRequests(profile.uid);
      setFriendRequests(requests);
    } catch (error) {
      logAgentEvent({
        location: 'FriendsProvider.tsx:getFriendRequests',
        message: 'Error fetching friend requests',
        data: {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        hypothesisId: 'A',
      });
      setFriendRequests([]);
    }
  };

  const getFriends = async () => {
    if (!profile) {
      setFriends([]);
      return;
    }

    try {
      const friendProfiles = await FriendRequestService.fetchFriends(profile.uid);
      setFriends(friendProfiles);
    } catch (error) {
      logAgentEvent({
        location: 'FriendsProvider.tsx:getFriends',
        message: 'Error fetching friends',
        data: {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        hypothesisId: 'A',
      });
      setFriends([]);
    }
  };

  const sendFriendRequest = async (
    userCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    try {
      const result = await FriendshipService.sendFriendRequest(userCode, profile);
      if (result.success) {
        await getFriendRequests();
      }
      return result;
    } catch (error) {
      logAgentEvent({
        location: 'FriendsProvider.tsx:sendFriendRequest',
        message: 'Error sending friend request',
        data: {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        hypothesisId: 'A',
      });
      return { success: false, error: "Failed to send friend request" };
    }
  };

  const acceptFriendRequest = async (
    requestId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    try {
      const result = await FriendshipService.acceptFriendRequest(requestId, profile);
      if (result.success) {
        await getFriendRequests();
        await getFriends();
      }
      return result;
    } catch (error) {
      logAgentEvent({
        location: 'FriendsProvider.tsx:acceptFriendRequest',
        message: 'Error accepting friend request',
        data: {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        hypothesisId: 'A',
      });
      return { success: false, error: "Failed to accept friend request" };
    }
  };

  const rejectFriendRequest = async (
    requestId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    try {
      const result = await FriendRequestService.rejectRequest(requestId, profile.uid);
      if (result.success) {
        await getFriendRequests();
      }
      return result;
    } catch (error) {
      logAgentEvent({
        location: 'FriendsProvider.tsx:rejectFriendRequest',
        message: 'Error rejecting friend request',
        data: {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        hypothesisId: 'A',
      });
      return { success: false, error: "Failed to reject friend request" };
    }
  };

  const blockUser = async (
    requestId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    try {
      const result = await FriendshipService.blockUser(requestId, profile.uid);
      if (result.success) {
        await getFriendRequests();
        await getFriends();
      }
      return result;
    } catch (error) {
      logAgentEvent({
        location: 'FriendsProvider.tsx:blockUser',
        message: 'Error blocking user',
        data: {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        hypothesisId: 'A',
      });
      return { success: false, error: "Failed to block user" };
    }
  };

  const cancelFriendRequest = async (
    requestId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    try {
      const result = await FriendRequestService.cancelRequest(requestId, profile.uid);
      if (result.success) {
        await getFriendRequests();
      }
      return result;
    } catch (error) {
      logAgentEvent({
        location: 'FriendsProvider.tsx:cancelFriendRequest',
        message: 'Error canceling friend request',
        data: {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        hypothesisId: 'A',
      });
      return { success: false, error: "Failed to cancel friend request" };
    }
  };

  const checkFriendshipStatus = async (otherUserId: string): Promise<"accepted" | "pending" | "rejected" | "blocked" | "none"> => {
    if (!profile) {
      return "none";
    }

    try {
      return await FriendRequestService.checkFriendshipStatus(profile.uid, otherUserId);
    } catch (error) {
      logAgentEvent({
        location: 'FriendsProvider.tsx:checkFriendshipStatus',
        message: 'Error checking friendship status',
        data: {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        hypothesisId: 'A',
      });
      return "none";
    }
  };

  useEffect(() => {
    if (profile) {
      getFriendRequests();
      getFriends();
    }
  }, [profile]);

  const value: FriendsContextType = {
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
  };

  return (
    <FriendsContext.Provider value={value}>
      {children}
    </FriendsContext.Provider>
  );
};

export const useFriends = () => {
  const context = useContext(FriendsContext);
  if (context === null) {
    throw new Error("useFriends must be used within a FriendsProvider");
  }
  return context;
};