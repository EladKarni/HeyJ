import { NavigationProp } from "@react-navigation/native";
import { Alert } from "react-native";
import { handleError, handleApiError } from "./errorHandler";
import UUID from "react-native-uuid";
import { supabase } from "@utilities/Supabase";
import Message from "@objects/Message";
import Profile from "@objects/Profile";
import Conversation from "@objects/Conversation";
import { RootStackParamList } from "@app-types/navigation";
import { logAgentEvent } from "./AgentLogger";
import AppLogger from "@/utilities/AppLogger";

export const sendMessage = async (
  navigation: NavigationProp<RootStackParamList>,
  profileData: {
    profile: Profile | null;
    conversations: Conversation[];
  },
  uri: string,
  conversationId: string
) => {
  AppLogger.debug("📨 sendMessage called with conversationId", { conversationId });
  
  // Debug: Check if this specific conversation is causing issues
  const TARGET_ID = "510a9c8e-d532-411c-9b46-c885eecbf33d";
  const isTargetConversation = conversationId === TARGET_ID;
  
  if (isTargetConversation) {
    AppLogger.debug("🎯 DEBUG: This is the target conversation!", { conversationId });
    
    // Check user profile directly
    if (profileData.profile) {
      AppLogger.debug("👤 User profile check", {
        uid: profileData.profile.uid,
        hasConversations: !!profileData.profile.conversations,
        conversationCount: profileData.profile.conversations?.length || 0,
        hasTargetConversation: profileData.profile.conversations?.includes(conversationId) || false,
        allConversationIds: profileData.profile.conversations
      });
    }
    
    // Check conversations array
    AppLogger.debug("💬 Conversations array check", {
      conversationCount: profileData.conversations.length,
      hasTargetConversation: profileData.conversations.some(c => c.conversationId === conversationId),
      allConversationIds: profileData.conversations.map(c => c.conversationId)
    });
  }

  const { profile, conversations } = profileData;

  if (!profile) {
    AppLogger.error("❌ No profile available in sendMessage");
    Alert.alert("Error", "You must be logged in to send messages.");
    return;
  }

  let conversation = conversations.find(
    (c) => c.conversationId === conversationId
  );

  // If not found in local array, try to fetch it directly from database
  if (!conversation) {
    AppLogger.warn("⚠️ Conversation not found in local array, fetching from database", { conversationId });
    AppLogger.debug("Available conversations:", { conversationIds: conversations.map(c => c.conversationId) });
    
    try {
      const { data: conversationData, error: fetchError } = await supabase
        .from("conversations")
        .select("*")
        .eq("conversationId", conversationId)
        .single();

      if (fetchError) {
        AppLogger.error("❌ Error fetching conversation from database", fetchError instanceof Error ? fetchError : new Error(String(fetchError)));
        Alert.alert("Error", "Conversation not found. Please try again.");
        return;
      }

      if (!conversationData) {
        AppLogger.error("❌ Conversation not found in database", { conversationId });
        Alert.alert("Error", "Conversation not found. Please try again.");
        return;
      }

      // Create Conversation object from database data
      conversation = await Conversation.fromJSON(conversationData);
      AppLogger.debug("✅ Successfully fetched conversation from database", { conversationId: conversation.conversationId });
      
      // Also ensure this conversation is added to user's profile conversations array
      // This prevents future "not found" issues
      if (!profile.conversations.includes(conversationId)) {
        AppLogger.debug("📝 Adding conversation to user profile for future access", { conversationId });
        const { error: updateProfileError } = await supabase
          .from("profiles")
          .update({
            conversations: [...profile.conversations, conversationId],
          })
          .eq("uid", profile.uid);
          
        if (updateProfileError) {
          AppLogger.warn("⚠️ Failed to update user profile with new conversation", updateProfileError instanceof Error ? updateProfileError : new Error(String(updateProfileError)));
        }
      }
    } catch (error) {
      AppLogger.error("❌ Error creating conversation from database data", error instanceof Error ? error : new Error(String(error)));
      Alert.alert("Error", "Conversation not found. Please try again.");
      return;
    }
  }

  AppLogger.debug("✅ Found conversation", { conversationId: conversation.conversationId });

  try {
    const messageId = UUID.v4().toString();
    const fileName = `message_${messageId}.mp3`;

    AppLogger.debug("📤 Fetching audio from URI", { uri });
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    AppLogger.debug("✅ Audio fetched, size", { size: buffer.byteLength });

    AppLogger.debug("☁️ Uploading to Supabase storage", { fileName });
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("message_audios")
      .upload(fileName, buffer, { contentType: "audio/mp3" });

    if (uploadError) {
      const errorMessage = handleApiError(uploadError, "Failed to upload audio");
      Alert.alert("Error", errorMessage);
      return;
    }

    if (!uploadData) {
      Alert.alert("Error", "Failed to upload audio. Please try again.");
      return;
    }

    AppLogger.debug("✅ Audio uploaded, path", { path: uploadData.path });
    const url = supabase.storage
      .from("message_audios")
      .getPublicUrl(uploadData.path).data.publicUrl;
    AppLogger.debug("✅ Public URL", { url });

    const message = new Message(messageId, new Date(), profile.uid, url, false);

    AppLogger.debug("💾 Inserting message into database...");
    const { data: messageData, error: messageError } = await supabase
      .from("messages")
      .insert(message.toJSON());

    if (messageError) {
      const errorMessage = handleApiError(messageError, "Failed to save message");
      Alert.alert("Error", errorMessage);
      return;
    }

    AppLogger.debug("✅ Message inserted, updating conversation...");
    const updatedMessages = [
      ...conversation.toJSON().messages,
      message.messageId,
    ];
    const newConversation = {
      ...conversation.toJSON(),
      messages: updatedMessages,
    };

    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .upsert(newConversation);

    if (conversationError) {
      handleError(conversationError, "SendMessage - conversation update", true, "We were unable to send your message. Please try again.");
      return;
    }

    AppLogger.debug("✅ Conversation updated, ensuring both users have it in their profiles...");
    logAgentEvent({
      location: 'SendMessage.tsx:sendMessage',
      message: 'conversation updated, checking profiles',
      data: {
        conversationId,
        messageId,
        senderUid: profile.uid,
      },
      hypothesisId: 'A',
    });

    // Ensure both users have this conversation ID in their profiles
    const otherUid = conversation.uids.find((id: string) => id !== profile.uid);
    logAgentEvent({
      location: 'SendMessage.tsx:sendMessage',
      message: 'found other user uid',
      data: {
        conversationId,
        otherUid,
        hasOtherUid: !!otherUid,
      },
      hypothesisId: 'A',
    });
    if (otherUid) {
      // Get the other user's profile
      const { data: otherProfileData, error: otherProfileError } = await supabase
        .from("profiles")
        .select()
        .eq("uid", otherUid)
        .single();
      logAgentEvent({
        location: 'SendMessage.tsx:sendMessage',
        message: 'fetched other user profile',
        data: {
          conversationId,
          otherUid,
          hasProfile: !!otherProfileData,
          hasError: !!otherProfileError,
          error: otherProfileError?.message || null,
          otherConversations: otherProfileData?.conversations || [],
          hasConversation: otherProfileData?.conversations?.includes(conversationId) || false,
        },
        hypothesisId: 'A',
      });

      if (!otherProfileError && otherProfileData) {
        const otherConversations = Array.isArray(otherProfileData.conversations)
          ? otherProfileData.conversations
          : [];

        // Add conversation ID if not already present
        if (!otherConversations.includes(conversationId)) {
          AppLogger.debug("📝 Adding conversation to other user's profile...");
          logAgentEvent({
            location: 'SendMessage.tsx:sendMessage',
            message: 'updating other user profile with conversation',
            data: {
              conversationId,
              otherUid,
              currentConversationsCount: otherConversations.length,
            },
            hypothesisId: 'A',
          });
          const { error: updateOtherError } = await supabase
            .from("profiles")
            .update({
              conversations: [...otherConversations, conversationId],
            })
            .eq("uid", otherUid);
          logAgentEvent({
            location: 'SendMessage.tsx:sendMessage',
            message: 'other user profile update result',
            data: {
              conversationId,
              otherUid,
              updateError: updateOtherError?.message || null,
              success: !updateOtherError,
            },
            hypothesisId: 'A',
          });

          if (updateOtherError) {
            AppLogger.error("⚠️ Error updating other user's profile:", updateOtherError);
          } else {
            AppLogger.debug("✅ Other user's profile updated");
          }
        } else {
          logAgentEvent({
            location: 'SendMessage.tsx:sendMessage',
            message: 'other user already has conversation',
            data: { conversationId, otherUid },
            hypothesisId: 'A',
          });
        }
      } else {
        logAgentEvent({
          location: 'SendMessage.tsx:sendMessage',
          message: 'error fetching other user profile',
          data: {
            conversationId,
            otherUid,
            error: otherProfileError?.message || null,
          },
          hypothesisId: 'A',
        });
      }
    }

    // Also ensure current user has it (in case it's missing)
    const currentConversations = Array.isArray(profile.conversations)
      ? profile.conversations
      : [];

    if (!currentConversations.includes(conversationId)) {
      AppLogger.debug("📝 Adding conversation to current user's profile...");
      const { error: updateCurrentError } = await supabase
        .from("profiles")
        .update({
          conversations: [...currentConversations, conversationId],
        })
        .eq("uid", profile.uid);

      if (updateCurrentError) {
        AppLogger.error("⚠️ Error updating current user's profile:", updateCurrentError);
      } else {
        AppLogger.debug("✅ Current user's profile updated");
      }
    }

    AppLogger.debug("✅ Message sent successfully!");
  } catch (error: any) {
    handleError(error, "SendMessage", true, "Failed to send message");
  }
};
