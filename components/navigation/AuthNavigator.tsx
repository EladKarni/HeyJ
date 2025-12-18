// Navigation
import { createStackNavigator } from "@react-navigation/stack";

// Screens
import LoginScreen from "../../screens/LoginScreen";
import SignupScreen from "../../screens/SignupScreen";

// Types & Styles
import { AuthStackParamList } from "../../types/navigation";
import { colors } from "../../styles/theme";

const AuthStack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitleVisible: false,
          headerTintColor: colors.text,
          headerStyle: {
            backgroundColor: colors.backgroundSecondary,
          },
        }}
      />
    </AuthStack.Navigator>
  );
};

export default AuthNavigator;
