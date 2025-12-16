import { View, TouchableOpacity, Image } from "react-native";
// @ts-expect-error
import { AntDesign } from "react-native-vector-icons";

interface ProfileImageSectionProps {
  profilePicture: string;
  onPress: () => void;
  styles: any;
}

const ProfileImageSection = ({
  profilePicture,
  onPress,
  styles,
}: ProfileImageSectionProps) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Image
        style={styles.image}
        source={{
          uri: profilePicture,
        }}
      />
      <View style={styles.plusButton}>
        <AntDesign
          name="plus"
          color={styles.modalSheet.backgroundColor}
          size={24}
        />
      </View>
    </TouchableOpacity>
  );
};

export default ProfileImageSection;
