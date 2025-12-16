// OneSignal removed for testing purposes
// All push notification functionality is disabled

export const removeToken = async (uid: string) => {
  console.log("OneSignal disabled - removeToken called");
};

export async function registerForPushNotificationsAsync() {
  console.log("OneSignal disabled - registerForPushNotificationsAsync called");
}

export async function sendPushNotification(
  toUid: string,
  fromName: string,
  fromPhoto: string,
  conversationId: string,
  messageUrl: string
) {
  console.log("OneSignal disabled - sendPushNotification called");
}
