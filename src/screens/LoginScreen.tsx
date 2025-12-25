// React
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";

// Components (for future OAuth implementation - currently commented out at line 121)
import OAuthButton from "@components/auth/OAuthButton";
import HeyJLogo from "@components/HeyJLogo";

// Utilities
import { signInWithEmail } from "@utilities/AuthHelper";

// Types & Styles
import { LoginScreenProps } from "@app-types/navigation";
import { styles } from "@styles/screens/LoginScreen.styles";
import { colors } from "@styles/theme";
import AppLogger from "@/utilities/AppLogger";


const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      AppLogger.debug('🎯 LoginScreen: Starting signin...');
      await signInWithEmail(email, password);
      AppLogger.debug('🎯 LoginScreen: Signin completed');
      // Keep loading true - auth state change will handle navigation
    } catch (error: any) {
      AppLogger.error('🎯 LoginScreen: Auth error:', error);
      Alert.alert("Error", error.message || "Authentication failed");
      setLoading(false);
      return;
    }

    // If we get here with loading still true, we're waiting for auth state change
    AppLogger.debug('🎯 LoginScreen: Waiting for auth state change...');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { minHeight: '100%' }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { minHeight: '100%' }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, { minHeight: '100%' }]}>
          <View style={styles.logoContainer}>
            <HeyJLogo width={120} height={120} />
          </View>
          <Text style={styles.title}>Welcome to HeyJ</Text>
          <Text style={styles.subtitle}>Voice messaging made simple</Text>

          {/* Email/Password Section */}
          <View style={styles.emailSection}>
            <Text style={styles.sectionTitle}>Sign In</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />


            <View style={{ position: 'relative' }}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 10, top: 12 }}
                onPress={() => setShowPassword((prev) => !prev)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Image
                  source={showPassword ? require('@assets/hidden.png') : require('@assets/eye.png')}
                  style={{ width: 24, height: 24, tintColor: '#c48b6eff' }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

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

          {/* OAuth Section - commented out until social logins are setup */}
          {false && (
            <View style={styles.oauthSection}>
              <Text style={styles.divider}>OR</Text>
              <Text style={styles.sectionTitle}>Continue with</Text>
              <View style={styles.oauthButtons}>
                <OAuthButton type="google" />
                <OAuthButton type="apple" />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
