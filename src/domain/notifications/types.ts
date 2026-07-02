import type { Database } from "@/lib/db/types";

export type NotificationPreferencesRow = Database["public"]["Tables"]["notification_preferences"]["Row"];
export type NotificationPreferencesUpdateRow = Database["public"]["Tables"]["notification_preferences"]["Update"];
export type PushSubscriptionRow = Database["public"]["Tables"]["push_subscriptions"]["Row"];
export type PushSubscriptionInsertRow = Database["public"]["Tables"]["push_subscriptions"]["Insert"];
export type PushSubscriptionUpdateRow = Database["public"]["Tables"]["push_subscriptions"]["Update"];

export type NotificationPreferences = {
  userId: string;
  dailyReminderEnabled: boolean;
  monthlyReviewEnabled: boolean;
  recurringNotificationsEnabled: boolean;
  limitAlertsEnabled: boolean;
  overspendingEnabled: boolean;
  unusualSpendingEnabled: boolean;
  savingsOpportunitiesEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpdateNotificationPreferencesInput = {
  dailyReminderEnabled?: boolean;
  monthlyReviewEnabled?: boolean;
  recurringNotificationsEnabled?: boolean;
  limitAlertsEnabled?: boolean;
};

export type RegisterPushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
};

export type NotificationEligibilityInput = {
  preferences: Pick<NotificationPreferences, "dailyReminderEnabled" | "monthlyReviewEnabled">;
  now: Date;
  timezone: string;
  lastSentAt?: string | null;
  hasActivityToday?: boolean;
};

export type NotificationEligibilityResult = {
  eligible: boolean;
  reason: "eligible" | "disabled" | "outside_window" | "already_sent" | "already_active";
};
