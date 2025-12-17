import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../utilities/Supabase";
import AddFriendModal from "./AddFriendModal";
import { useState } from "react";

interface ProfileButtonsProps {
  styles: any;
}

const ProfileButtons = ({ styles }: ProfileButtonsProps) => {
  const [showAddFriend, setShowAddFriend] = useState(false);

  return (
    <View style={styles.buttonsContainer}>
      <TouchableOpacity
        style={styles.addFriendButton}
        onPress={() => setShowAddFriend(true)}
      >
        <MaterialCommunityIcons name="account-plus" size={24} color="#000" />
        <Text style={styles.addFriendButtonText}>Add Friend by Code</Text>
      </TouchableOpacity>
      
      <AddFriendModal
        visible={showAddFriend}
        onClose={() => setShowAddFriend(false)}
      />

      <TouchableOpacity
        style={styles.saveButton}
        onPress={() => {
          supabase.auth.signOut();
        }}
      >
        <Text style={styles.saveLabel}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProfileButtons;
