import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./Supabase";
import { View } from "react-native";
import Profile from "../objects/Profile";
import Conversation from "../objects/Conversation";

const ProfileContext = createContext<{
  appReady: boolean;
  user: User | null;
  viewProfile: boolean;
  setViewProfile: React.Dispatch<React.SetStateAction<boolean>>;
  profile: Profile | null;
  saveProfile: (profile: Profile) => Promise<void>;
  getProfile: () => void;
  conversations: Conversation[];
  profiles: Profile[];
} | null>(null);

const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [appReady, setAppReady] = useState(false);

  const [user, setUser] = useState<User | null>({
    id: "",
    app_metadata: {},
    user_metadata: {},
    aud: "",
    created_at: "",
  });
  const [viewProfile, setViewProfile] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      authListener.subscription;
    };
  }, []);

  const [profile, setProfile] = useState<Profile | null>(null);

  const getProfile = () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const { id } = user;

    supabase
      .from("profiles")
      .select("*")
      .eq("uid", id)
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching profile:", error);
          setProfile(null);
          return;
        }
        
        if (data && data[0]) {
          try {
            const profile = Profile.fromJSON(data[0]);
            setProfile(profile);
          } catch (err: unknown) {
            console.error("Error parsing profile:", err);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      });
  };

  const updateProfile = () => {
    if (!user) {
      return;
    }

    const channel = supabase.channel(user.id + "_profile");

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: "uid=eq." + user.id,
        },
        async () => {
          await supabase
            .from("profiles")
            .select("*")
            .eq("uid", user.id)
            .then(({ data, error }) => {
              if (data && data[0]) {
                const profile = Profile.fromJSON(data[0]);
                setProfile(profile);
              } else {
                setProfile(null);
              }
            });
        }
      )
      .subscribe();
  };

  useEffect(() => {
    updateProfile();
    // Push notifications disabled for testing
  }, [user]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAppReady(true);
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [profile]);

  // useEffect(() => {
  //   getProfile();
  // }, []);

  useEffect(() => {
    getProfile();
  }, [user]);

  const saveProfile = async (profile: Profile) => {
    const { error } = await supabase
      .from("profiles")
      .upsert(profile.toJSONWithoutConversations());

    if (!error) {
      getProfile();
    } else {
      console.error("Error saving profile:", error);
    }
  };

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const getConversations = async () => {
    if (!profile || !profile.conversations || profile.conversations.length === 0) {
      setConversations([]);
      return;
    }

    let conversations: Conversation[] = [];

    await Promise.all(
      profile.conversations.map(async (id: string) => {
        try {
          const { data: conversationData, error } = await supabase
            .from("conversations")
            .select()
            .eq("conversationId", id);

          if (conversationData && conversationData[0]) {
            conversations.push(
              await Conversation.fromJSON(conversationData[0])
            );
          }
        } catch (error) {
          console.error("Error fetching conversation:", error);
        }
      })
    );

    setConversations(conversations);
  };

  useEffect(() => {
    if (profile) {
      getConversations();
    }
  }, [profile]);

  const updateConversations = async () => {
    if (!profile || !profile.conversations || profile.conversations.length === 0) {
      return;
    }

    profile.conversations.forEach((id: string) => {
      try {
        const channel = supabase.channel(id + "_conversation");

        channel
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "conversations",
              filter: "conversationId=eq." + id,
            },
            async () => {
              const { data: conversationData, error } = await supabase
                .from("conversations")
                .select()
                .eq("conversationId", id);

              if (conversationData && conversationData[0]) {
                const updatedConversation = await Conversation.fromJSON(
                  conversationData[0]
                );

                setConversations((prevConversations) =>
                  prevConversations.map((c) =>
                    c.conversationId === id ? updatedConversation : c
                  )
                );
              }
            }
          )
          .subscribe();
      } catch (error) {
        console.error("Error fetching conversation:", error);
      }
    });
  };

  useEffect(() => {
    if (profile) {
      updateConversations();
    }
  }, [profile]);

  const [profiles, setProfiles] = useState<Profile[]>([]);

  const getProfiles = async () => {
    if (!conversations || conversations.length === 0) {
      setProfiles([]);
      return;
    }

    let profiles: Profile[] = [];

    await Promise.all(
      conversations.map(async (c) => {
        const uid = c.uids.filter((id) => id !== profile?.uid)[0];

        if (!uid) {
          return;
        }

        try {
          const { data, error } = await supabase
            .from("profiles")
            .select()
            .eq("uid", uid);

          if (data && data[0]) {
            profiles.push(Profile.fromJSON(data[0]));
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      })
    );

    setProfiles(profiles);
  };

  useEffect(() => {
    getProfiles();
  }, [conversations]);

  if (!appReady) {
    return <View />;
  }

  return (
    <ProfileContext.Provider
      value={{
        appReady,
        user,
        viewProfile,
        setViewProfile,
        profile,
        saveProfile,
        getProfile,
        conversations,
        profiles,
      }}
    >
      <View style={{ flex: 1 }}>{children}</View>
    </ProfileContext.Provider>
  );
};

const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};

export { ProfileProvider, useProfile };
