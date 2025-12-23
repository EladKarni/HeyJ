// React
import React, { useEffect, useState } from "react";

// Navigation
import { NavigationContainer } from "@react-navigation/native";

// Third-party libraries
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";

// Utilities & Providers
import { ProfileProvider } from "./ProfileProvider";
import { ConversationsProvider } from "./ConversationsProvider";
import { FriendshipProvider } from "../providers/FriendshipProvider";
import { AudioSettingsProvider } from "./AudioSettingsProvider";
import ModalWrapper from "./ModalWrapper";
import { initDatabase } from "../database/database";
import AppLogger from "./AppLogger";

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        AppLogger.debug("Initializing database...");
        await initDatabase();
        AppLogger.debug("Database initialized successfully");
        setDbInitialized(true);
      } catch (error) {
        AppLogger.error("Failed to initialize database", error instanceof Error ? error : new Error(String(error)));
      }
    };

    initializeApp();
  }, []);

  if (!dbInitialized) {
    return null; // or a loading spinner
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
