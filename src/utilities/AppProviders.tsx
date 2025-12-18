// React
import React from "react";

// Navigation
import { NavigationContainer } from "@react-navigation/native";

// Third-party libraries
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";

// Utilities & Providers
import { ProfileProvider } from "./ProfileProvider";
import { ConversationsProvider } from "./ConversationsProvider";
import { FriendsProvider } from "./FriendsProvider";
import { AudioSettingsProvider } from "./AudioSettingsProvider";
import ModalWrapper from "./ModalWrapper";

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <ActionSheetProvider>
          <ProfileProvider>
            <ConversationsProvider>
              <FriendsProvider>
                <AudioSettingsProvider>
                  <ModalWrapper>
                    {children}
                  </ModalWrapper>
                </AudioSettingsProvider>
              </FriendsProvider>
            </ConversationsProvider>
          </ProfileProvider>
        </ActionSheetProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};
