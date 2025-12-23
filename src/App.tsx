// React
import { useEffect, useState } from "react";
import { View, Text } from "react-native";

// Third-party libraries
import { User } from "@supabase/supabase-js";

// Utilities & Providers
import { supabase } from "@utilities/Supabase";
import { AppProviders } from "@utilities/AppProviders";
import { AuthProviders } from "@utilities/AuthProviders";
import { logAgentEvent } from "@utilities/AgentLogger";

// Components
import AppNavigator from "@components/navigation/AppNavigator";
import AuthNavigator from "@components/navigation/AuthNavigator";


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

export default function App() {
  logAgentEvent({
    location: 'App.tsx:App',
    message: 'App component rendering',
    data: {},
    hypothesisId: 'E',
  });

  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoadingUser(false);
      }
    );

    return () => {
      authListener.subscription;
    };
  }, []);

  if (loadingUser) {
    logAgentEvent({
      location: 'App.tsx:loading',
      message: 'App loading user',
      data: {},
      hypothesisId: 'E',
    });
    return <View />;
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