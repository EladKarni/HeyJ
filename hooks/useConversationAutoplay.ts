import { useEffect, useState, useRef, useCallback } from "react";
import { sortBy } from "lodash";
import Conversation from "../objects/Conversation";
import Profile from "../objects/Profile";
import { getUnreadMessagesFromOtherUser } from "../utilities/conversationUtils";
import { useAudioSettings } from "../utilities/AudioSettingsProvider";

export const useConversationAutoplay = (
  conversation: Conversation | null,
  otherProfile: Profile | null,
  profile: Profile | null
) => {
  const { autoplay } = useAudioSettings();
  const [currentUri, setCurrentUri] = useState("");
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const lastMessageCountRef = useRef<number>(0);
  const lastPlayedMessageIdRef = useRef<string | null>(null);
  const userInterruptedRef = useRef<boolean>(false); // Track if user manually interrupted autoplay

  // Function to stop autoplay (called when user manually interacts)
  const stopAutoplay = useCallback(() => {
    console.log("🛑 User interrupted autoplay");
    userInterruptedRef.current = true;
    setIsAutoPlaying(false);
  }, []);

  // Function to find and play the next unheard message
  const playNextUnreadMessage = useCallback(() => {
    // Don't autoplay if user has manually interrupted
    if (userInterruptedRef.current) {
      console.log("⏸️ Autoplay stopped - user interrupted");
      setIsAutoPlaying(false);
      return;
    }

    if (!autoplay || !conversation || !profile || !otherProfile) {
      setIsAutoPlaying(false);
      return;
    }

    // Get all messages sorted chronologically
    const sortedMessages = sortBy(conversation.messages, (m) => m.timestamp.getTime());

    // Find the current message by matching audioUrl
    const currentMessageIndex = sortedMessages.findIndex(
      (m) => m.audioUrl === currentUri
    );

    if (currentMessageIndex === -1) {
      // If no current message, find the oldest unread message from the other user
      const unreadFromOther = sortedMessages.filter(
        (m) => m.uid === otherProfile.uid && !m.isRead
      );
      if (unreadFromOther.length > 0) {
        const oldestUnread = unreadFromOther[0];
        console.log("▶️ Playing oldest unread message:", oldestUnread.messageId);
        setIsAutoPlaying(true);
        setCurrentUri(oldestUnread.audioUrl);
        return;
      }
      console.log("❌ Current message not found and no unread messages");
      setIsAutoPlaying(false);
      return;
    }

    // Verify the current message is not from the sender (safety check)
    const currentMessage = sortedMessages[currentMessageIndex];
    if (currentMessage && currentMessage.uid === profile.uid) {
      console.log("⚠️ Current message is from sender, stopping autoplay");
      setIsAutoPlaying(false);
      return;
    }

    // Look for the next message in chronological order
    for (let i = currentMessageIndex + 1; i < sortedMessages.length; i++) {
      const nextMessage = sortedMessages[i];

      // Check if it's an incoming message (from other user)
      if (nextMessage.uid !== otherProfile.uid) {
        continue; // Skip outgoing messages
      }

      // If we encounter a read message, stop auto-play
      if (nextMessage.isRead) {
        console.log("✅ Next message is read, stopping auto-play");
        setIsAutoPlaying(false);
        return;
      }

      // Found an unread incoming message - play it
      // Check again if user interrupted before setting URI (race condition protection)
      if (userInterruptedRef.current) {
        console.log("⏸️ Autoplay stopped before playing next message - user interrupted");
        setIsAutoPlaying(false);
        return;
      }
      console.log("▶️ Playing next unread message:", nextMessage.messageId, "URI:", nextMessage.audioUrl);
      // Small delay to ensure previous message has finished
      setTimeout(() => {
        // Double-check user hasn't interrupted during the delay
        if (!userInterruptedRef.current) {
          setCurrentUri(nextMessage.audioUrl);
        } else {
          console.log("⏸️ Autoplay stopped during delay - user interrupted");
          setIsAutoPlaying(false);
        }
      }, 500);
      return;
    }

    // No more messages found
    console.log("✅ No more unread messages");
    setIsAutoPlaying(false);
  }, [autoplay, conversation, profile, otherProfile, currentUri]);

  // Auto-play new messages when they arrive and autoplay is enabled
  useEffect(() => {
    if (!autoplay || !conversation || !profile || !otherProfile) {
      lastMessageCountRef.current = conversation?.messages.length || 0;
      return;
    }

    const currentMessageCount = conversation.messages.length;

    // Check if a new message was added (count increased)
    if (currentMessageCount > lastMessageCountRef.current) {
      // Get all messages sorted by timestamp to find the newest one
      const sortedMessages = sortBy(conversation.messages, (m) => m.timestamp.getTime());
      const newestMessage = sortedMessages[sortedMessages.length - 1];

      // Only trigger autoplay if the newest message is from the other user (incoming)
      // Don't autoplay when the sender sends their own message
      if (newestMessage && newestMessage.uid === otherProfile.uid) {
        // Find the newest unheard message from the other user
        const unheardMessages = getUnreadMessagesFromOtherUser(conversation, otherProfile.uid);

        if (unheardMessages.length > 0) {
          const newestUnheard = unheardMessages[0];

          // Double-check that this message is actually from the other user (safety check)
          if (newestUnheard.uid !== profile.uid) {
            // Only auto-play if this is a different message than we last played
            if (lastPlayedMessageIdRef.current !== newestUnheard.messageId) {
              console.log("🔔 New message received, autoplaying:", newestUnheard.messageId);
              lastPlayedMessageIdRef.current = newestUnheard.messageId;
              setIsAutoPlaying(true);
              setCurrentUri(newestUnheard.audioUrl);
            }
          } else {
            console.log("⚠️ Attempted to autoplay sender's own message, blocking");
          }
        }
      } else {
        // New message is from the sender, don't autoplay anything
        // Also clear currentUri if it was set to prevent any accidental playback
        console.log("📤 New message sent by current user, skipping autoplay");
        if (currentUri) {
          // Check if currentUri points to the sender's own message
          const currentMessage = conversation.messages.find(m => m.audioUrl === currentUri);
          if (currentMessage && currentMessage.uid === profile.uid) {
            console.log("🛑 Clearing currentUri to prevent playing sender's own message");
            setCurrentUri("");
            setIsAutoPlaying(false);
          }
        }
      }
    }

    lastMessageCountRef.current = currentMessageCount;
  }, [conversation?.messages.length, autoplay, profile?.uid, otherProfile?.uid, conversation?.messages, conversation, otherProfile, profile]);

  // Auto-play oldest unheard message when conversation opens and autoplay is enabled
  useEffect(() => {
    if (!autoplay || !conversation || !profile || !otherProfile) {
      return;
    }

    // Reset state when conversation changes
    setCurrentUri("");
    setIsAutoPlaying(false);
    userInterruptedRef.current = false; // Reset interruption flag when conversation changes
    
    // Small delay to ensure component is mounted
    setTimeout(() => {
      // Only autoplay if user hasn't interrupted
      if (!userInterruptedRef.current) {
        playNextUnreadMessage();
      }
    }, 500);
  }, [conversation?.conversationId, autoplay, profile?.uid, otherProfile?.uid, playNextUnreadMessage, conversation, profile, otherProfile]);

  // Stop autoplay immediately when toggle is turned off
  useEffect(() => {
    if (!autoplay) {
      console.log("🔴 Autoplay disabled - stopping autoplay");
      setIsAutoPlaying(false);
      userInterruptedRef.current = true; // Mark as interrupted so it doesn't restart
      // Don't clear currentUri here - let the user finish listening to current message if they want
    } else {
      // When autoplay is re-enabled, reset interruption flag
      // But don't auto-start - let user manually trigger or wait for new messages
      userInterruptedRef.current = false;
    }
  }, [autoplay]);

  // Monitor when current message finishes playing to auto-play next
  useEffect(() => {
    if (!isAutoPlaying || !autoplay || !conversation || !otherProfile) {
      return;
    }

    // Check if any message is currently playing by checking if currentUri matches any message
    const currentMessage = conversation.messages.find(m => m.audioUrl === currentUri);
    if (!currentMessage) {
      return;
    }

    // We'll detect playback completion in RecordingPlayer and trigger next message
    // This effect will handle the transition
  }, [currentUri, isAutoPlaying, autoplay, conversation, otherProfile]);

  return { currentUri, setCurrentUri, isAutoPlaying, playNextUnreadMessage, stopAutoplay };
};

