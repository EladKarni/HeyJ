import { View, Text } from "react-native";

interface PlayingIndicatorProps {
  styles: any;
}

const PlayingIndicator = ({ styles }: PlayingIndicatorProps) => {
  return (
    <View style={styles.footerRow}>
      <View style={styles.playingIndicator}>
        <View style={styles.playingDot} />
        <Text style={styles.playingText}>Playing</Text>
      </View>
    </View>
  );
};

export default PlayingIndicator;
