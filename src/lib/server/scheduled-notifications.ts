import { getDailyReminderCopy, getMonthlyReportCopy } from "@/domain/notifications/copy";
import type { PushSubscriptionRow } from "@/domain/notifications/types";
import type { NotificationEventStatus, NotificationEventType } from "@/lib/db/types";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { isWebPushConfigured, sendWebPushNotification, type WebPushSendResult } from "@/lib/server/web-push-sender";

type ScheduledNotificationKind = "daily" | "monthly";
type ClaimResult = "claimed" | "duplicate";

export type ScheduledNotificationCandidate = {
  userId: string;
  timezone?: string | null;
  dailyReminderEnabled: boolean;
  monthlyReviewEnabled: boolean;
  subscriptions: PushSubscriptionRow[];
};

export type ScheduledNotificationsAdapter = {
  listCandidates(): Promise<ScheduledNotificationCandidate[]>;
  claimEvent(userId: string, notificationType: NotificationEventType, dedupeKey: string): Promise<ClaimResult>;
  markEvent(
    userId: string,
    notificationType: NotificationEventType,
    dedupeKey: string,
    status: Exclude<NotificationEventStatus, "claimed">,
    errorCode?: string | null,
  ): Promise<void>;
  disablePushSubscription(userId: string, endpoint: string): Promise<void>;
};

export type ScheduledNotificationsSummary = {
  ok: boolean;
  reason?: "admin_unconfigured" | "web_push_unconfigured";
  now: string;
  serverTimezoneFallback: "UTC";
  daily: NotificationRunCounts;
  monthly: NotificationRunCounts;
};

export type NotificationRunCounts = {
  considered: number;
  eligible: number;
  sent: number;
  deduped: number;
  skippedDisabled: number;
  skippedOutsideWindow: number;
  skippedNoSubscriptions: number;
  failed: number;
  expiredSubscriptions: number;
  timezoneFallbacks: number;
};

const UTC_FALLBACK_TIMEZONE = "UTC";

function emptyCounts(): NotificationRunCounts {
  return {
    considered: 0,
    eligible: 0,
    sent: 0,
    deduped: 0,
    skippedDisabled: 0,
    skippedOutsideWindow: 0,
    skippedNoSubscriptions: 0,
    failed: 0,
    expiredSubscriptions: 0,
    timezoneFallbacks: 0,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getLocalParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === 24 ? 0 : get("hour"),
  };
}

export function resolveNotificationTimezone(timezone?: string | null) {
  const trimmed = timezone?.trim();

  if (!trimmed) {
    return { timezone: UTC_FALLBACK_TIMEZONE, usedFallback: true };
  }

  try {
    getLocalParts(new Date("2026-01-01T00:00:00.000Z"), trimmed);
    return { timezone: trimmed, usedFallback: false };
  } catch {
    return { timezone: UTC_FALLBACK_TIMEZONE, usedFallback: true };
  }
}

export function getNotificationSchedule(now: Date, timezone?: string | null) {
  const resolved = resolveNotificationTimezone(timezone);
  const local = getLocalParts(now, resolved.timezone);
  const dayKey = `${local.year}-${pad(local.month)}-${pad(local.day)}`;
  const monthKey = `${local.year}-${pad(local.month)}`;

  return {
    ...resolved,
    local,
    dayKey,
    monthKey,
    dailyDue: local.hour === 20,
    monthlyDue: local.day === 1 && local.hour === 10,
  };
}

function isDuplicateError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

async function sendToSubscriptions(
  candidate: ScheduledNotificationCandidate,
  send: (subscription: PushSubscriptionRow) => Promise<WebPushSendResult>,
  adapter: ScheduledNotificationsAdapter,
) {
  let sent = false;
  let failed = false;
  let expiredSubscriptions = 0;

  for (const subscription of candidate.subscriptions) {
    const result = await send(subscription);

    if (result.status === "sent") {
      sent = true;
      continue;
    }

    if (result.status === "expired") {
      expiredSubscriptions += 1;
      await adapter.disablePushSubscription(candidate.userId, subscription.endpoint);
      continue;
    }

    failed = true;
  }

  return { sent, failed, expiredSubscriptions };
}

async function runKind(
  kind: ScheduledNotificationKind,
  candidates: ScheduledNotificationCandidate[],
  adapter: ScheduledNotificationsAdapter,
  now: Date,
) {
  const counts = emptyCounts();
  const notificationType: NotificationEventType = kind === "daily" ? "daily_reminder" : "monthly_report";

  for (const candidate of candidates) {
    counts.considered += 1;
    const schedule = getNotificationSchedule(now, candidate.timezone);

    if (schedule.usedFallback) {
      counts.timezoneFallbacks += 1;
    }

    const enabled = kind === "daily" ? candidate.dailyReminderEnabled : candidate.monthlyReviewEnabled;
    if (!enabled) {
      counts.skippedDisabled += 1;
      continue;
    }

    const due = kind === "daily" ? schedule.dailyDue : schedule.monthlyDue;
    if (!due) {
      counts.skippedOutsideWindow += 1;
      continue;
    }

    if (candidate.subscriptions.length === 0) {
      counts.skippedNoSubscriptions += 1;
      continue;
    }

    counts.eligible += 1;
    const dedupeKey = kind === "daily" ? schedule.dayKey : schedule.monthKey;
    const claim = await adapter.claimEvent(candidate.userId, notificationType, dedupeKey);

    if (claim === "duplicate") {
      counts.deduped += 1;
      continue;
    }

    const copy = kind === "daily" ? getDailyReminderCopy(now) : getMonthlyReportCopy(now);
    const sendResult = await sendToSubscriptions(
      candidate,
      (subscription) =>
        sendWebPushNotification(subscription, {
          title: copy.title,
          body: copy.body,
          url: kind === "daily" ? "/assistant" : "/insights",
          notificationType,
          tag: `calm-wallet-${notificationType}-${dedupeKey}`,
        }),
      adapter,
    );

    counts.expiredSubscriptions += sendResult.expiredSubscriptions;

    if (sendResult.sent) {
      counts.sent += 1;
      await adapter.markEvent(candidate.userId, notificationType, dedupeKey, "sent");
      continue;
    }

    counts.failed += 1;
    await adapter.markEvent(candidate.userId, notificationType, dedupeKey, "failed", sendResult.failed ? "push_failed" : "no_active_subscription");
  }

  return counts;
}

export async function runScheduledNotifications(
  adapter: ScheduledNotificationsAdapter,
  options: { now?: Date } = {},
): Promise<ScheduledNotificationsSummary> {
  const now = options.now ?? new Date();
  const summary: ScheduledNotificationsSummary = {
    ok: true,
    now: now.toISOString(),
    serverTimezoneFallback: UTC_FALLBACK_TIMEZONE,
    daily: emptyCounts(),
    monthly: emptyCounts(),
  };

  if (!isWebPushConfigured()) {
    return {
      ...summary,
      ok: false,
      reason: "web_push_unconfigured",
    };
  }

  const candidates = await adapter.listCandidates();

  return {
    ...summary,
    daily: await runKind("daily", candidates, adapter, now),
    monthly: await runKind("monthly", candidates, adapter, now),
  };
}

export function createSupabaseScheduledNotificationsAdapter(): ScheduledNotificationsAdapter | null {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  return {
    async listCandidates() {
      const { data: preferences, error: preferencesError } = await supabase
        .from("notification_preferences")
        .select("user_id,daily_reminder_enabled,monthly_review_enabled")
        .or("daily_reminder_enabled.eq.true,monthly_review_enabled.eq.true");

      if (preferencesError) {
        throw new Error("Unable to load notification preferences.");
      }

      const userIds = [...new Set((preferences ?? []).map((preference) => preference.user_id))];

      if (userIds.length === 0) {
        return [];
      }

      const [{ data: profiles, error: profilesError }, { data: subscriptions, error: subscriptionsError }] =
        await Promise.all([
          supabase.from("profiles").select("id,timezone").in("id", userIds),
          supabase.from("push_subscriptions").select("*").in("user_id", userIds).is("disabled_at", null),
        ]);

      if (profilesError || subscriptionsError) {
        throw new Error("Unable to load notification delivery records.");
      }

      const profileByUserId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      const subscriptionsByUserId = new Map<string, PushSubscriptionRow[]>();

      for (const subscription of subscriptions ?? []) {
        const current = subscriptionsByUserId.get(subscription.user_id) ?? [];
        current.push(subscription);
        subscriptionsByUserId.set(subscription.user_id, current);
      }

      return (preferences ?? []).map((preference) => ({
        userId: preference.user_id,
        timezone: profileByUserId.get(preference.user_id)?.timezone ?? null,
        dailyReminderEnabled: preference.daily_reminder_enabled,
        monthlyReviewEnabled: preference.monthly_review_enabled,
        subscriptions: subscriptionsByUserId.get(preference.user_id) ?? [],
      }));
    },

    async claimEvent(userId, notificationType, dedupeKey) {
      const { error } = await supabase.from("notification_events").insert({
        user_id: userId,
        notification_type: notificationType,
        dedupe_key: dedupeKey,
        status: "claimed",
      });

      if (!error) {
        return "claimed";
      }

      if (isDuplicateError(error)) {
        return "duplicate";
      }

      throw new Error("Unable to claim notification event.");
    },

    async markEvent(userId, notificationType, dedupeKey, status, errorCode = null) {
      const { error } = await supabase
        .from("notification_events")
        .update({
          status,
          error_code: errorCode,
          sent_at: status === "sent" ? new Date().toISOString() : null,
        })
        .eq("user_id", userId)
        .eq("notification_type", notificationType)
        .eq("dedupe_key", dedupeKey);

      if (error) {
        throw new Error("Unable to update notification event.");
      }
    },

    async disablePushSubscription(userId, endpoint) {
      const { error } = await supabase
        .from("push_subscriptions")
        .update({ disabled_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("endpoint", endpoint);

      if (error) {
        throw new Error("Unable to disable push subscription.");
      }
    },
  };
}

export async function runSupabaseScheduledNotifications(options: { now?: Date } = {}) {
  const adapter = createSupabaseScheduledNotificationsAdapter();
  const now = options.now ?? new Date();

  if (!adapter) {
    return {
      ok: false,
      reason: "admin_unconfigured" as const,
      now: now.toISOString(),
      serverTimezoneFallback: UTC_FALLBACK_TIMEZONE,
      daily: emptyCounts(),
      monthly: emptyCounts(),
    };
  }

  return runScheduledNotifications(adapter, { now });
}
