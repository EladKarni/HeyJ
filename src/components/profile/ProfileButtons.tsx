import { Text, TouchableOpacity } from "react-native";
import { supabase } from "@utilities/Supabase";

interface ProfileButtonsProps {
  styles: any;
}

const ProfileButtons = ({ styles }: ProfileButtonsProps) => {
  return (
    <TouchableOpacity
      style={styles.saveButton}
      onPress={() => {
        supabase.auth.signOut();
      }}
    >
      <Text style={styles.saveLabel}>Sign Out</Text>
    </TouchableOpacity>
  );
};

export default ProfileButtons;
