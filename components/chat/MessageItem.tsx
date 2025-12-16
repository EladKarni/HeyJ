import { View, StyleSheet } from "react-native";
import Message from "../../objects/Message";
import Profile from "../../objects/Profile";
import RecordingPlayer from "./RecordingPlayer";

interface MessageItemProps {
  message: Message;
  currentUri: string;
  setCurrentUri: (uri: string) => void;
  currentUserUid: string;
  otherProfile: Profile | null;
  currentUserProfile: Profile;
  autoplay: boolean;
  isAutoPlaying: boolean;
  playNextUnreadMessage?: () => void;
  styles: ReturnType<typeof createStyles>;
}

const MessageItem = ({
  message,
  currentUri,
  setCurrentUri,
  currentUserUid,
  otherProfile,
  currentUserProfile,
  autoplay,
  isAutoPlaying,
  playNextUnreadMessage,
  styles,
}: MessageItemProps) => {
  const isIncoming = message.uid === otherProfile?.uid;
  const profilePicture = isIncoming
    ? otherProfile?.profilePicture
    : currentUserProfile.profilePicture;

  return (
    <View style={styles.messageContainer}>
      <RecordingPlayer
        uri={message.audioUrl}
        currentUri={currentUri}
        setCurrentUri={setCurrentUri}
        messageId={message.messageId}
        senderUid={message.uid}
        currentUserUid={currentUserUid}
        isRead={message.isRead}
        timestamp={message.timestamp}
        profilePicture={profilePicture}
        isIncoming={isIncoming}
        autoPlay={autoplay && !message.isRead && isAutoPlaying && isIncoming}
        onPlaybackFinished={isAutoPlaying && isIncoming ? playNextUnreadMessage : undefined}
      />
    </View>
  );
};

const createStyles = () =>
  StyleSheet.create({
    messageContainer: {
      // Styles will be passed from parent
    },
  });

export default MessageItem;
