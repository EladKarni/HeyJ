import { View, Text } from "react-native";
// @ts-expect-error
import { Ionicons } from "react-native-vector-icons";
import { styles } from "../../styles/SignupScreen.styles";

interface RequirementItemProps {
  met: boolean;
  text: string;
}

const RequirementItem = ({ met, text }: RequirementItemProps) => (
  <View style={styles.requirementItem}>
    <Ionicons
      name={met ? "checkmark-circle" : "ellipse-outline"}
      size={16}
      color={met ? "#00cc44" : "#999"}
    />
    <Text style={[styles.requirementText, met && styles.requirementTextMet]}>
      {text}
    </Text>
  </View>
);

export default RequirementItem;
