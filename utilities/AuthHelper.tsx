import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "./Supabase";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { Alert } from "react-native";

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
  console.log('🔐 Starting signup for:', email);
  
  try {
    // First, test basic connectivity
    console.log('🔍 Testing connectivity to Supabase...');
    const { supabaseUrl } = require('./Supabase');
    console.log('   Target URL:', supabaseUrl);
    
    try {
      const healthCheck = await fetch(`${supabaseUrl}/auth/v1/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('✅ Health check status:', healthCheck.status);
      const healthData = await healthCheck.json();
      console.log('   Health response:', healthData);
    } catch (healthError: any) {
      console.error('❌ Health check failed:', healthError.message);
      throw new Error(`Cannot connect to Supabase at ${supabaseUrl}. Make sure Supabase is running and accessible from your device.`);
    }
    
    console.log('📤 Sending signup request...');
    
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

    console.log('📥 Signup response received');
    console.log('   Error:', error);
    console.log('   User:', data?.user?.id);
    console.log('   Session:', data?.session ? 'Present' : 'None');

    if (error) {
      console.error('❌ Signup error:', error);
      throw error;
    }
    
    console.log('✅ Signup successful');
    return data;
  } catch (err: any) {
    console.error('💥 Signup exception:', err);
    console.error('   Message:', err?.message);
    console.error('   Stack:', err?.stack);
    throw err;
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};
