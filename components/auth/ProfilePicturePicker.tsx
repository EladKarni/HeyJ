import { View, Text, TouchableOpacity, Image } from "react-native";
// @ts-expect-error
import { AntDesign } from "react-native-vector-icons";
import { ImagePickerAsset } from "expo-image-picker";
import { styles } from "../../styles/SignupScreen.styles";

interface ProfilePicturePickerProps {
  profileImage: ImagePickerAsset | null;
  defaultImage: string;
  onPress: () => void;
}

const ProfilePicturePicker = ({
  profileImage,
  defaultImage,
  onPress,
}: ProfilePicturePickerProps) => {
  return (
    <>
      <TouchableOpacity onPress={onPress} style={styles.imageContainer}>
        <Image
          style={styles.profileImage}
          source={{
            uri: profileImage?.uri || defaultImage,
          }}
        />
        <View style={styles.imageOverlay}>
          <AntDesign name="camera" size={30} color="#fff" />
          <Text style={styles.imageOverlayText}>
            {profileImage ? "Change Photo" : "Add Photo"}
          </Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.optionalText}>(Optional)</Text>
    </>
  );
};

export default ProfilePicturePicker;
