// React
import { TouchableOpacity } from "react-native";

// Navigation
import { createStackNavigator } from "@react-navigation/stack";

// Third-party libraries
import { Ionicons } from "@expo/vector-icons";

// Utilities & Providers
import { useProfile } from "@utilities/ProfileProvider";
import { useFriends } from "../../providers/FriendshipProvider";
import { logAgentEvent } from "@utilities/AgentLogger";

// Screens
import HomeScreen from "@screens/HomeScreen";
import ConversationScreen from "@screens/ConversationScreen";
import FriendRequestsScreen from "@screens/FriendRequestsScreen";

// Types & Styles
import { RootStackParamList } from "@app-types/navigation";
import { colors } from "@styles/theme";

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  logAgentEvent({
    location: 'AppNavigator.tsx:render',
    message: 'AppNavigator component rendering',
    data: {},
    hypothesisId: 'A',
  });

  let profile, setViewProfile, friendRequests;
  try {
    const profileContext = useProfile();
    profile = profileContext.profile;
    setViewProfile = profileContext.setViewProfile;
    logAgentEvent({
      location: 'AppNavigator.tsx:useProfile',
      message: 'AppNavigator useProfile success',
      data: { hasProfile: !!profile },
      hypothesisId: 'A',
    });
  } catch (error) {
    logAgentEvent({
      location: 'AppNavigator.tsx:useProfile:error',
      message: 'AppNavigator useProfile error',
      data: {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      hypothesisId: 'A',
    });
    throw error;
  }
  try {
    const friendsContext = useFriends();
    friendRequests = friendsContext.friendRequests;
    logAgentEvent({
      location: 'AppNavigator.tsx:useFriends',
      message: 'AppNavigator useFriends success',
      data: { friendRequestsCount: friendRequests?.length || 0 },
      hypothesisId: 'A',
    });
  } catch (error) {
    logAgentEvent({
      location: 'AppNavigator.tsx:useFriends:error',
      message: 'AppNavigator useFriends error',
      data: {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      hypothesisId: 'A',
    });
    throw error;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.backgroundSecondary,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          color: colors.text,
        },
        headerBackTitleStyle: {
          color: colors.text,
        },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={({ route, navigation }) => {
          const incomingCount = (friendRequests || []).filter(
            (req) => req.status === "pending" && req.addresseeId === profile?.uid
          ).length;

          return {
            headerRight: () => (
              <TouchableOpacity
                style={{ left: -25, top: -5 }}
                onPress={() => setViewProfile(true)}
              >
                <Ionicons name="person" size={25} color={colors.text} />
              </TouchableOpacity>
            ),
            headerTitleAlign: "center",
          };
        }}
      />
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{
          headerBackTitleStyle: { color: colors.text },
          headerTintColor: colors.text,
        }}
      />
      <Stack.Screen
        name="FriendRequests"
        component={FriendRequestsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
