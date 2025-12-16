import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import OAuthButton from "../components/auth/OAuthButton";
import { signInWithEmail } from "../utilities/AuthHelper";

const LoginScreen = ({ navigation }: { navigation?: any }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      console.log('🎯 LoginScreen: Starting signin...');
      await signInWithEmail(email, password);
      console.log('🎯 LoginScreen: Signin completed');
      // Keep loading true - auth state change will handle navigation
    } catch (error: any) {
      console.error('🎯 LoginScreen: Auth error:', error);
      Alert.alert("Error", error.message || "Authentication failed");
      setLoading(false);
      return;
    }
    
    // If we get here with loading still true, we're waiting for auth state change
    console.log('🎯 LoginScreen: Waiting for auth state change...');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to HeyJ</Text>
          <Text style={styles.subtitle}>Voice messaging made simple</Text>

          {/* Email/Password Section */}
          <View style={styles.emailSection}>
            <Text style={styles.sectionTitle}>Sign In</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />

            <TouchableOpacity
              style={[styles.emailButton, loading && styles.emailButtonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              <Text style={styles.emailButtonText}>
                {loading ? "Signing In..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => navigation?.navigate?.("Signup")}
            >
              <Text style={styles.toggleButtonText}>
                Don't have an account? Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* OAuth Section */}
          <View style={styles.oauthSection}>
            <Text style={styles.divider}>OR</Text>
            <Text style={styles.sectionTitle}>Continue with</Text>
            <View style={styles.oauthButtons}>
              <OAuthButton type="google" />
              <OAuthButton type="apple" />
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
  },
  emailSection: {
    width: "100%",
    maxWidth: 400,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  emailButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#000",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  emailButtonDisabled: {
    backgroundColor: "#666",
  },
  emailButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  toggleButton: {
    marginTop: 15,
    padding: 10,
  },
  toggleButtonText: {
    color: "#007AFF",
    fontSize: 14,
    textAlign: "center",
  },
  oauthSection: {
    width: "100%",
    alignItems: "center",
  },
  divider: {
    fontSize: 14,
    color: "#999",
    marginVertical: 20,
  },
  oauthButtons: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#fff",
  },
  confirmationIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  confirmationTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
    textAlign: "center",
  },
  confirmationText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  confirmationEmail: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    marginBottom: 20,
  },
  confirmationInstructions: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  confirmationTips: {
    backgroundColor: "#f0f8ff",
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    width: "100%",
    maxWidth: 400,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  tipText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    lineHeight: 20,
  },
  primaryButton: {
    width: "100%",
    maxWidth: 400,
    height: 50,
    backgroundColor: "#000",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    width: "100%",
    maxWidth: 400,
    height: 50,
    backgroundColor: "transparent",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  secondaryButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
