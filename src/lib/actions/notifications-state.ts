import type { NotificationPreferences } from "@/domain/notifications/types";

export type NotificationPreferencesActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  preferences: NotificationPreferences | null;
};

export const initialNotificationPreferencesActionState: NotificationPreferencesActionState = {
  status: "idle",
  message: null,
  preferences: null,
};
