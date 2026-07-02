import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { registerPushSubscriptionSchema, updateNotificationPreferencesSchema } from "@/domain/notifications/schemas";
import type {
  NotificationEligibilityInput,
  NotificationEligibilityResult,
  NotificationPreferences,
  NotificationPreferencesRow,
  NotificationPreferencesUpdateRow,
  PushSubscriptionInsertRow,
  PushSubscriptionRow,
  PushSubscriptionUpdateRow,
  RegisterPushSubscriptionInput,
  UpdateNotificationPreferencesInput,
} from "@/domain/notifications/types";

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

export type NotificationServiceAdapter = {
  getPreferences(userId: string): QueryResult<NotificationPreferencesRow>;
  insertPreferences(userId: string): QueryResult<NotificationPreferencesRow>;
  updatePreferences(userId: string, updates: NotificationPreferencesUpdateRow): QueryResult<NotificationPreferencesRow>;
  upsertPushSubscription(row: PushSubscriptionInsertRow): QueryResult<PushSubscriptionRow>;
  disablePushSubscription(userId: string, endpoint: string, updates: PushSubscriptionUpdateRow): QueryResult<PushSubscriptionRow>;
};

export type NotificationService = ReturnType<typeof createNotificationService>;

function assertResult<T>(result: { data: T | null; error: { message: string } | null }, fallbackMessage: string) {
  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.data === null) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

function mapPreferences(row: NotificationPreferencesRow): NotificationPreferences {
  return {
    userId: row.user_id,
    dailyReminderEnabled: row.daily_reminder_enabled,
    monthlyReviewEnabled: row.monthly_review_enabled,
    recurringNotificationsEnabled: row.unusual_spending_enabled,
    limitAlertsEnabled: row.overspending_enabled,
    overspendingEnabled: row.overspending_enabled,
    unusualSpendingEnabled: row.unusual_spending_enabled,
    savingsOpportunitiesEnabled: row.savings_opportunities_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getLocalParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
  };
}

function wasSentToday(lastSentAt: string | null | undefined, now: Date, timezone: string) {
  if (!lastSentAt) {
    return false;
  }

  const last = getLocalParts(new Date(lastSentAt), timezone);
  const current = getLocalParts(now, timezone);
  return last.year === current.year && last.month === current.month && last.day === current.day;
}

function wasSentThisMonth(lastSentAt: string | null | undefined, now: Date, timezone: string) {
  if (!lastSentAt) {
    return false;
  }

  const last = getLocalParts(new Date(lastSentAt), timezone);
  const current = getLocalParts(now, timezone);
  return last.year === current.year && last.month === current.month;
}

export function evaluateDailyReminderEligibility(input: NotificationEligibilityInput): NotificationEligibilityResult {
  if (!input.preferences.dailyReminderEnabled) {
    return { eligible: false, reason: "disabled" };
  }

  if (input.hasActivityToday) {
    return { eligible: false, reason: "already_active" };
  }

  const local = getLocalParts(input.now, input.timezone);

  if (local.hour < 20 || local.hour > 21) {
    return { eligible: false, reason: "outside_window" };
  }

  if (wasSentToday(input.lastSentAt, input.now, input.timezone)) {
    return { eligible: false, reason: "already_sent" };
  }

  return { eligible: true, reason: "eligible" };
}

export function evaluateMonthlyReviewEligibility(input: NotificationEligibilityInput): NotificationEligibilityResult {
  if (!input.preferences.monthlyReviewEnabled) {
    return { eligible: false, reason: "disabled" };
  }

  const local = getLocalParts(input.now, input.timezone);

  if (local.day < 1 || local.day > 5) {
    return { eligible: false, reason: "outside_window" };
  }

  if (wasSentThisMonth(input.lastSentAt, input.now, input.timezone)) {
    return { eligible: false, reason: "already_sent" };
  }

  return { eligible: true, reason: "eligible" };
}

export function createNotificationService(adapter: NotificationServiceAdapter) {
  return {
    async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
      const result = await adapter.getPreferences(userId);

      if (result.data) {
        return mapPreferences(result.data);
      }

      const created = assertResult(await adapter.insertPreferences(userId), "Unable to create notification preferences.");
      return mapPreferences(created);
    },

    async updateNotificationPreferences(
      userId: string,
      input: UpdateNotificationPreferencesInput,
    ): Promise<NotificationPreferences> {
      const parsed = updateNotificationPreferencesSchema.parse(input);
      await this.getNotificationPreferences(userId);
      const row = assertResult(
        await adapter.updatePreferences(userId, {
          ...(parsed.dailyReminderEnabled !== undefined
            ? { daily_reminder_enabled: parsed.dailyReminderEnabled }
            : {}),
          ...(parsed.monthlyReviewEnabled !== undefined
            ? { monthly_review_enabled: parsed.monthlyReviewEnabled }
            : {}),
          ...(parsed.recurringNotificationsEnabled !== undefined
            ? { unusual_spending_enabled: parsed.recurringNotificationsEnabled }
            : {}),
          ...(parsed.limitAlertsEnabled !== undefined
            ? { overspending_enabled: parsed.limitAlertsEnabled }
            : {}),
        }),
        "Unable to update notification preferences.",
      );

      return mapPreferences(row);
    },

    async registerPushSubscription(userId: string, input: RegisterPushSubscriptionInput): Promise<PushSubscriptionRow> {
      const parsed = registerPushSubscriptionSchema.parse(input);
      return assertResult(
        await adapter.upsertPushSubscription({
          user_id: userId,
          endpoint: parsed.endpoint,
          p256dh: parsed.p256dh,
          auth: parsed.auth,
          user_agent: parsed.userAgent ?? null,
          disabled_at: null,
        }),
        "Unable to register push subscription.",
      );
    },

    async disablePushSubscription(userId: string, endpoint: string): Promise<PushSubscriptionRow> {
      return assertResult(
        await adapter.disablePushSubscription(userId, endpoint, {
          disabled_at: new Date().toISOString(),
        }),
        "Unable to disable push subscription.",
      );
    },

    evaluateDailyReminderEligibility,
    evaluateMonthlyReviewEligibility,
  };
}

export async function createSupabaseNotificationService() {
  const supabase = await createSupabaseServerClient();

  const adapter: NotificationServiceAdapter = {
    async getPreferences(userId) {
      return supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
    },
    async insertPreferences(userId) {
      return supabase.from("notification_preferences").insert({ user_id: userId }).select("*").single();
    },
    async updatePreferences(userId, updates) {
      return supabase.from("notification_preferences").update(updates).eq("user_id", userId).select("*").single();
    },
    async upsertPushSubscription(row) {
      return supabase.from("push_subscriptions").upsert(row, { onConflict: "user_id,endpoint" }).select("*").single();
    },
    async disablePushSubscription(userId, endpoint, updates) {
      return supabase
        .from("push_subscriptions")
        .update(updates)
        .eq("user_id", userId)
        .eq("endpoint", endpoint)
        .select("*")
        .single();
    },
  };

  return createNotificationService(adapter);
}
