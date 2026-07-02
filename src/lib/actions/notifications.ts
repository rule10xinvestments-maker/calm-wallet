"use server";

import { revalidatePath } from "next/cache";
import { notificationCopyTemplates } from "@/domain/notifications/copy";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseNotificationService } from "@/domain/notifications/service";
import { sendWebPushNotification } from "@/lib/server/web-push-sender";
import {
  initialNotificationPreferencesActionState,
  type NotificationPreferencesActionState,
} from "@/lib/actions/notifications-state";

function checkboxValue(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

export async function updateNotificationPreferencesAction(
  _prevState: NotificationPreferencesActionState,
  formData: FormData,
): Promise<NotificationPreferencesActionState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      ...initialNotificationPreferencesActionState,
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  try {
    const service = await createSupabaseNotificationService();
    const preferences = await service.updateNotificationPreferences(user.id, {
      dailyReminderEnabled: checkboxValue(formData.get("dailyReminderEnabled")),
      monthlyReviewEnabled: checkboxValue(formData.get("monthlyReviewEnabled")),
      recurringNotificationsEnabled: checkboxValue(formData.get("recurringNotificationsEnabled")),
      limitAlertsEnabled: checkboxValue(formData.get("limitAlertsEnabled")),
    });

    revalidatePath("/assistant");

    return {
      status: "success",
      message: "Notification preferences updated.",
      preferences,
    };
  } catch {
    return {
      ...initialNotificationPreferencesActionState,
      status: "error",
      message: "Notification settings could not be saved.",
    };
  }
}

export async function registerPushSubscriptionAction(
  _prevState: NotificationPreferencesActionState,
  formData: FormData,
): Promise<NotificationPreferencesActionState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      ...initialNotificationPreferencesActionState,
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  try {
    const service = await createSupabaseNotificationService();
    await service.registerPushSubscription(user.id, {
      endpoint: String(formData.get("endpoint") ?? ""),
      p256dh: String(formData.get("p256dh") ?? ""),
      auth: String(formData.get("auth") ?? ""),
      userAgent: typeof formData.get("userAgent") === "string" ? String(formData.get("userAgent")) : null,
    });
    const preferences = await service.getNotificationPreferences(user.id);

    return {
      status: "success",
      message: "Notification subscription saved.",
      preferences,
    };
  } catch {
    return {
      ...initialNotificationPreferencesActionState,
      status: "error",
      message: "Notifications are not ready yet.",
    };
  }
}

export async function sendTestPushNotificationAction(
  _prevState: NotificationPreferencesActionState,
  _formData: FormData,
): Promise<NotificationPreferencesActionState> {
  void _prevState;
  void _formData;

  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      ...initialNotificationPreferencesActionState,
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  try {
    const service = await createSupabaseNotificationService();
    const subscriptions = await service.listActivePushSubscriptions(user.id);

    if (subscriptions.length === 0) {
      return {
        ...initialNotificationPreferencesActionState,
        status: "error",
        message: "Enable notifications first.",
      };
    }

    let sawUnconfigured = false;

    for (const subscription of subscriptions) {
      const result = await sendWebPushNotification(subscription, {
        title: notificationCopyTemplates.test.title,
        body: notificationCopyTemplates.test.body,
        url: "/",
        notificationType: "test",
        tag: "calm-wallet-test",
      });

      if (result.status === "sent") {
        const preferences = await service.getNotificationPreferences(user.id);
        return {
          status: "success",
          message: "Test notification sent.",
          preferences,
        };
      }

      if (result.status === "expired") {
        await service.disablePushSubscription(user.id, subscription.endpoint);
      }

      if (result.status === "unconfigured") {
        sawUnconfigured = true;
        break;
      }
    }

    return {
      ...initialNotificationPreferencesActionState,
      status: "error",
      message: sawUnconfigured ? "Server notifications are not ready yet." : "Test notification could not be sent.",
    };
  } catch {
    return {
      ...initialNotificationPreferencesActionState,
      status: "error",
      message: "Test notification could not be sent.",
    };
  }
}
