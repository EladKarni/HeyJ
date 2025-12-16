import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Hosted Supabase configuration
export const supabaseUrl = "https://ifmwepbepoujfnzisrjz.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXdlcGJlcG91amZuemlzcmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODQzODIsImV4cCI6MjA3NTM2MDM4Mn0.itUOgm94FL8dRPPiNz3TYZm4ca4e8LWlB-FNzrL9298";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth state change listener (logging disabled)
