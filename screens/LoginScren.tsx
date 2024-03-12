import { StyleSheet, View } from "react-native";
import React from "react";
import OAuthButton from "../components/auth/OAuthButton";

export default function LoginScren() {
  return (
    <View style={styles.container}>
      <OAuthButton type="google" />
      <OAuthButton type="apple" />
      <OAuthButton type="facebook" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
