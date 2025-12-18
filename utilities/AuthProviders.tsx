// React
import React from "react";

// Navigation
import { NavigationContainer } from "@react-navigation/native";

// Third-party libraries
import { SafeAreaProvider } from "react-native-safe-area-context";

interface AuthProvidersProps {
  children: React.ReactNode;
}

export const AuthProviders: React.FC<AuthProvidersProps> = ({ children }) => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </SafeAreaProvider>
  );
};
