import { View, Text, TouchableOpacity } from "react-native";
// @ts-expect-error
import { FontAwesome } from "react-native-vector-icons";
import { formatMessageTimestamp } from "../../utilities/dateUtils";
import { formatTime } from "../../utilities/formatTime";

interface RecordingPlayerHeaderProps {
  showReadStatus: boolean;
  displayIsRead: boolean;
  onToggleReadStatus: () => void;
  timestamp?: Date;
  duration: number | null;
  styles: any;
}

const RecordingPlayerHeader = ({
  showReadStatus,
  displayIsRead,
  onToggleReadStatus,
  timestamp,
  duration,
  styles,
}: RecordingPlayerHeaderProps) => {
  return (
    <View style={styles.headerRow}>
      <View style={styles.leftHeader}>
        {showReadStatus && (
          <TouchableOpacity
            onPress={onToggleReadStatus}
            style={styles.readStatusContainer}
            activeOpacity={0.7}
          >
            <FontAwesome
              name={displayIsRead ? "check-circle" : "circle-o"}
              size={16}
              style={[styles.readIcon, displayIsRead && styles.readIconActive]}
            />
          </TouchableOpacity>
        )}
        {timestamp && (
          <>
            {showReadStatus && <View style={styles.separator} />}
            <View style={styles.timestampContainer}>
              <FontAwesome name="clock-o" size={12} style={styles.timestampIcon} />
              <Text style={styles.timestamp}>{formatMessageTimestamp(timestamp) || ""}</Text>
            </View>
          </>
        )}
      </View>
      {duration != null && duration > 0 && (
        <View style={styles.durationBadge}>
          <FontAwesome name="headphones" size={12} style={styles.durationIcon} />
          <Text style={styles.durationText}>{formatTime(duration)}</Text>
        </View>
      )}
    </View>
  );
};

export default RecordingPlayerHeader;
