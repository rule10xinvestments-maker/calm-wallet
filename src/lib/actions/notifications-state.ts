import type { NotificationPreferences } from "@/domain/notifications/types";

export type NotificationPreferencesMessageKey =
  | "notifications.authRequired"
  | "notifications.enableFirst"
  | "notifications.notReady"
  | "notifications.preferencesUpdated"
  | "notifications.serverNotReady"
  | "notifications.subscriptionSaved"
  | "notifications.testCouldNotSend"
  | "notifications.testSent"
  | "notifications.updateError";

export type NotificationPreferencesActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  messageKey?: NotificationPreferencesMessageKey | null;
  preferences: NotificationPreferences | null;
};

export const initialNotificationPreferencesActionState: NotificationPreferencesActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  preferences: null,
};
