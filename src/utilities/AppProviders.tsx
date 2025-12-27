// React
import React, { useEffect, useState } from "react";

// Navigation
import { NavigationContainer } from "@react-navigation/native";

// Third-party libraries
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";

// Components
import LoadingScreen from "../components/LoadingScreen";

// Utilities & Providers
import { ProfileProvider } from "./ProfileProvider";
import { ConversationsProvider } from "./ConversationsProvider";
import { FriendshipProvider } from "../providers/FriendshipProvider";
import { AudioSettingsProvider } from "./AudioSettingsProvider";
import ModalWrapper from "./ModalWrapper";
import { initDatabase } from "../database/database";
import AppLogger from "./AppLogger";
import { withTimeout, TIMEOUTS } from "./timeoutUtils";

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        AppLogger.debug("Initializing database...");
        await withTimeout(
          initDatabase(),
          TIMEOUTS.DATABASE_INIT,
          "Database initialization timed out"
        );
        AppLogger.debug("Database initialized successfully");
        setDbInitialized(true);
        setInitError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        AppLogger.error("Failed to initialize database", error instanceof Error ? error : new Error(errorMessage));
        AppLogger.critical("AppProviders: Database initialization failed", { error: errorMessage });
        setInitError(errorMessage);
      }
    };

    initializeApp();
  }, [retryKey]);

  const handleRetry = () => {
    setDbInitialized(false);
    setInitError(null);
    setRetryKey(prev => prev + 1);
  };

  if (initError) {
    return (
      <SafeAreaProvider>
        <LoadingScreen
          error={initError}
          onRetry={handleRetry}
        />
      </SafeAreaProvider>
    );
  }

  if (!dbInitialized) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <ActionSheetProvider>
          <ProfileProvider>
            <ConversationsProvider>
              <FriendshipProvider>
                <AudioSettingsProvider>
                  <ModalWrapper>
                    {children}
                  </ModalWrapper>
                </AudioSettingsProvider>
              </FriendshipProvider>
            </ConversationsProvider>
          </ProfileProvider>
        </ActionSheetProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};
