import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/*--Notification characteristics---*/
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/*--Notification permissions---*/
export async function registerForNotifications() {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permission denied");
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("Expo push token:", token);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return token;
}

/*--Test notification upon logging in---*/
export async function sendLocalTestNotification() {

  console.log("Scheduling notification");
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Test Notification",
      body: "Welcome to Sahara",
    },
    trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 0.5,
        repeats: false,
     },
  });

  console.log("Done");
}
