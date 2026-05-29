"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseNotificationService } from "@/domain/notifications/service";
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
    });

    revalidatePath("/assistant");

    return {
      status: "success",
      message: "Notification preferences updated.",
      preferences,
    };
  } catch (error) {
    return {
      ...initialNotificationPreferencesActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to update notification preferences.",
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
  } catch (error) {
    return {
      ...initialNotificationPreferencesActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to save notification subscription.",
    };
  }
}
