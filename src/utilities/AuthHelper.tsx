import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "./Supabase";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { Alert } from "react-native";
import { removeToken } from "./PushNotifications";
import AppLogger from "@/utilities/AppLogger";

const createSessionFromUrl = async (url: string) => {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) throw new Error(errorCode);
  const { access_token, refresh_token } = params;

  if (!access_token || !refresh_token) return;

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
  return data.session;
};

const redirectUrl = makeRedirectUri({ scheme: "heyj" });

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (data.url) {
    const result = await WebBrowser.openAuthSessionAsync(
      data?.url ?? "",
      redirectUrl
    );
    if (result.type === "success") {
      const { url } = result;
      await createSessionFromUrl(url);
    }
  }
};

export const signInWithApple = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (data.url) {
    const result = await WebBrowser.openAuthSessionAsync(
      data?.url ?? "",
      redirectUrl
    );
    if (result.type === "success") {
      const { url } = result;
      await createSessionFromUrl(url);
    }
  }
};

// Email/Password Authentication for Development
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  metadata?: {
    name?: string;
    profilePicture?: string;
  }
) => {
  AppLogger.debug('🔐 Starting signup for', { email });

  try {
    // Test basic connectivity with a simpler approach
    AppLogger.debug('🔍 Testing connectivity to Supabase...');
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    AppLogger.debug('Target URL', { url: supabaseUrl });

    try {
      // Simple health check
      const healthCheck = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
      });
      AppLogger.debug('Health check status', { status: healthCheck.status });
    } catch (healthError: any) {
      AppLogger.error('Health check failed', healthError);
      // Don't throw - let actual signup attempt determine connectivity
      AppLogger.debug('Continuing with signup despite health check failure');
    }

    AppLogger.debug('📤 Sending signup request...');

    // Add a timeout to prevent hanging forever
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Signup request timed out after 30 seconds')), 30000);
    });

    const signupPromise = metadata
      ? supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })
      : supabase.auth.signUp({
        email,
        password,
      });

    const { data, error } = await Promise.race([signupPromise, timeoutPromise]) as any;

    AppLogger.debug('📥 Signup response received');
    AppLogger.debug('Signup error', { error });
    AppLogger.debug('User ID', { userId: data?.user?.id });
    AppLogger.debug('Session status', { hasSession: !!data?.session });

    if (error) {
      AppLogger.error('❌ Signup error', error);
      throw error;
    }

    AppLogger.debug('✅ Signup successful');
    return data;
  } catch (err: any) {
    AppLogger.error('💥 Signup exception:', err);
    AppLogger.error('   Message:', err?.message);
    AppLogger.error('   Stack:', err?.stack);
    throw err;
  }
};

export const signOut = async () => {
  // Get current user ID before signing out
  const { data: { user } } = await supabase.auth.getUser();

  // Remove push token
  if (user?.id) {
    await removeToken(user.id);
  }

  // Sign out from Supabase
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};
