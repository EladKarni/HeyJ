// React
import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text } from "react-native";
import * as SplashScreen from 'expo-splash-screen';

// Third-party libraries
import { User } from "@supabase/supabase-js";

// Utilities & Providers
import { supabase } from "@utilities/Supabase";
import { AppProviders } from "@utilities/AppProviders";
import { AuthProviders } from "@utilities/AuthProviders";
import { logAgentEvent } from "@utilities/AgentLogger";
import { withTimeout, TIMEOUTS } from "@utilities/timeoutUtils";
import AppLogger from "@utilities/AppLogger";

// Components
import AppNavigator from "@components/navigation/AppNavigator";
import AuthNavigator from "@components/navigation/AuthNavigator";
import LoadingScreen from "@components/LoadingScreen";
import AppErrorBoundary from "@components/AppErrorBoundary";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();


global.Buffer = require("buffer").Buffer;

// Global error handler
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    logAgentEvent({
      location: 'App.tsx:global',
      message: 'Global error caught',
      data: {
        errorMessage: error?.message || String(error),
        errorStack: error?.stack,
        isFatal: isFatal,
      },
      hypothesisId: 'E',
    });
    console.error("Global error:", error, "isFatal:", isFatal);
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

function AppContent() {
  logAgentEvent({
    location: 'App.tsx:App',
    message: 'App component rendering',
    data: {},
    hypothesisId: 'E',
  });

  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const loadingUserRef = useRef(true);

  const setLoadingUserAndRef = useCallback((value: boolean) => {
    loadingUserRef.current = value;
    setLoadingUser(value);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        AppLogger.critical("Auth initialization started");

        // Get initial session with timeout
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          TIMEOUTS.AUTH_INIT,
          "Auth session check timed out"
        );

        if (error) {
          // Handle corrupted refresh token specifically
          if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid Refresh Token')) {
            AppLogger.critical("Corrupted refresh token detected - clearing auth storage");
            await supabase.auth.signOut();
            setUser(null);
            setLoadingUserAndRef(false);
            return;
          }
          throw error;
        }

        setUser(session?.user ?? null);
        AppLogger.critical("Auth initialization completed", {
          hasUser: !!session?.user
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        AppLogger.error("Failed to initialize auth", error instanceof Error ? error : new Error(errorMessage));
        AppLogger.critical("Auth initialization failed", { error: errorMessage });
        setAuthError(errorMessage);

        // Graceful degradation - proceed as logged out
        setUser(null);
      } finally {
        setLoadingUserAndRef(false);
      }
    };

    // Set up auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // Safety timeout - force proceed if auth takes too long
    const safetyTimeout = setTimeout(() => {
      if (loadingUserRef.current) {
        AppLogger.critical("Auth safety timeout triggered - proceeding as logged out");
        setUser(null);
        setLoadingUserAndRef(false);
      }
    }, TIMEOUTS.AUTH_INIT);

    initializeAuth();

    return () => {
      clearTimeout(safetyTimeout);
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (!loadingUser) {
      await SplashScreen.hideAsync();
      setAppReady(true);
    }
  }, [loadingUser]);

  useEffect(() => {
    if (!loadingUser) {
      onLayoutRootView();
    }
  }, [loadingUser, onLayoutRootView]);

  if (loadingUser || !appReady) {
    logAgentEvent({
      location: 'App.tsx:loading',
      message: 'App loading user',
      data: {},
      hypothesisId: 'E',
    });
    return <LoadingScreen />;
  }

  if (user) {
    logAgentEvent({
      location: 'App.tsx:authenticated',
      message: 'App rendering authenticated stack',
      data: { hasUser: !!user },
      hypothesisId: 'E',
    });
    try {
      return (
        <AppProviders>
          <AppNavigator />
        </AppProviders>
      );
    } catch (error) {
      logAgentEvent({
        location: 'App.tsx:error',
        message: 'App render error in authenticated stack',
        data: {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        hypothesisId: 'E',
      });
      console.error("Error rendering authenticated stack:", error);
      return <View><Text>Error loading app</Text></View>;
    }
  } else {
    return (
      <AuthProviders>
        <AuthNavigator />
      </AuthProviders>
    );
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}