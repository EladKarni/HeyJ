import { View, Text } from "react-native";
// @ts-expect-error
import { Ionicons } from "react-native-vector-icons";
import { styles } from "../../styles/FriendRequestsScreen.styles";

const FriendRequestsEmpty = () => {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="person-add-outline" size={64} color="#999" />
      <Text style={styles.emptyText}>No friend requests</Text>
    </View>
  );
};

export default FriendRequestsEmpty;
