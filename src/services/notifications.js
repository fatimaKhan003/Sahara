import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { API_BASE } from "../../api";

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
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

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
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Test Notification",
      body: "Welcome to Sahara",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      repeats: false,
    },
  });
  // console.log("Scheduled notification");
}

/*--Notification actions*/
export async function setupNotificationActions() {
  await Notifications.setNotificationCategoryAsync("MEDICATION_REMINDER", [
    {
      identifier: "TAKEN",
      buttonTitle: "Mark as Taken",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "SNOOZE",
      buttonTitle: "Snooze 10 min",
      options: { opensAppToForeground: false },
    },
  ]);
}

export function setupNotificationResponseListener() {
  Notifications.addNotificationResponseReceivedListener(async (response) => {
    const action = response.actionIdentifier;

    const data = response.notification.request.content.data;

    const { medId, logId, name } = data;

    try {
      await Notifications.dismissNotificationAsync(
        response.notification.request.identifier,
      );
    } catch (err) {
      console.warn("Failed to dismiss notification", err);
    }

    if (action === "TAKEN") {
      try {
        await fetch(`${API_BASE}/api/medications/dose-log/${medId}/${logId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "taken" }),
        });
      } catch (err) {
        console.error("Failed to mark dose taken", err);
      }
    }

    if (action === "SNOOZE") {
      const snoozeTime = new Date(Date.now() + 10 * 60 * 1000); // minutes * seconds * milliseconds
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Medication Reminder",
          body: `Take ${name}`,
          data: { medId, logId, name },
          categoryIdentifier: "MEDICATION_REMINDER",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: snoozeTime,
        },
      });
      console.log("Snoozed notification for", name, "until", snoozeTime);
    }
  });
}

/*--Schedule notifications--*/
export async function scheduleMedicationNotifications(medications) {
  for (const med of medications) {
    for (const log of med.doseLogs) {
      if (log.status !== "pending" || log.notificationScheduled) continue;
      const scheduledDate = new Date(log.scheduledAt);

      if (scheduledDate < new Date()) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Medication Reminder",
          body: `Take ${med.name} (${med.dose})`,
          data: {
            medId: med._id,
            logId: log._id,
            name: med.name,
          },
          categoryIdentifier: "MEDICATION_REMINDER",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduledDate,
        },
      });

      fetch(
        `${API_BASE}/api/medications/mark-notification/${med._id}/${log._id}`,
        {
          method: "PATCH",
        },
      ).catch((err) => console.error("Failed to mark notification", err));
      console.log(
        "Scheduled notification for",
        med.name,
        "at",
        log.scheduledAt,
      );
    }
  }
}

export async function cancelMedicationNotifications(medId) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  for (const notif of scheduled) {
    const data = notif.content?.data;

    if (data?.medId === medId) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}
