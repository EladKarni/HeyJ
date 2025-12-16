import { View, FlatList } from "react-native";
import Message from "../../objects/Message";
import MessageItem from "./MessageItem";
import Profile from "../../objects/Profile";

interface MessageSectionProps {
  title: string;
  data: Message[];
  currentUri: string;
  setCurrentUri: (uri: string) => void;
  currentUserUid: string;
  otherProfile: Profile | null;
  currentUserProfile: Profile;
  autoplay: boolean;
  isAutoPlaying: boolean;
  playNextUnreadMessage?: () => void;
  messageContainerStyle: any;
}

const MessageSection = ({
  title,
  data,
  currentUri,
  setCurrentUri,
  currentUserUid,
  otherProfile,
  currentUserProfile,
  autoplay,
  isAutoPlaying,
  playNextUnreadMessage,
  messageContainerStyle,
}: MessageSectionProps) => {
  return (
    <View>
      <FlatList
        data={data}
        renderItem={({ item: message }) => (
          <MessageItem
            message={message}
            currentUri={currentUri}
            setCurrentUri={setCurrentUri}
            currentUserUid={currentUserUid}
            otherProfile={otherProfile}
            currentUserProfile={currentUserProfile}
            autoplay={autoplay}
            isAutoPlaying={isAutoPlaying}
            playNextUnreadMessage={playNextUnreadMessage}
            styles={{ messageContainer: messageContainerStyle }}
          />
        )}
      />
    </View>
  );
};

export default MessageSection;
