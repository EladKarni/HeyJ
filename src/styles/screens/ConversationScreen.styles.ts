import { StyleSheet, Platform } from "react-native";
import { spacing, colors } from "../theme";

export const createStyles = (
  buttonWidth: number,
  buttonHeight: number,
  buttonRadius: number,
  insets: { top: number; bottom: number; left: number; right: number }
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContainer: {
      paddingTop: Platform.OS === "ios" ? insets.top - 25 : 15,
      paddingBottom: 250,
      ...(Platform.OS !== "web" && { justifyContent: "flex-end" }),
      flexGrow: 1,
    },
    messageContainer: {
      width: "100%",
      paddingHorizontal: 12,
    },
  });
