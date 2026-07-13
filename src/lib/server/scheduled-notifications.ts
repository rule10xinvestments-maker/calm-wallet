import { getDailyReminderCopy, getMonthlyReportCopy } from "@/domain/notifications/copy";
import type { PushSubscriptionRow } from "@/domain/notifications/types";
import type { NotificationEventStatus, NotificationEventType } from "@/lib/db/types";
import { createSupabaseAdminClientResult } from "@/lib/server/supabase-admin";
import { isWebPushConfigured, sendWebPushNotification, type WebPushSendResult } from "@/lib/server/web-push-sender";

type ScheduledNotificationKind = "daily" | "monthly";
type ClaimResult = "claimed" | "duplicate";
type SchedulerDiagnostic =
  | "admin_unconfigured"
  | "admin_invalid_config"
  | "database_unavailable"
  | "database_unavailable:notification_preferences"
  | "database_unavailable:profiles"
  | "database_unavailable:push_subscriptions"
  | "database_unavailable:notification_events"
  | "database_unavailable:transactions"
  | "schema_mismatch"
  | "schema_mismatch:notification_preferences"
  | "schema_mismatch:profiles"
  | "schema_mismatch:push_subscriptions"
  | "schema_mismatch:notification_events"
  | "schema_mismatch:notification_events_dedupe"
  | "schema_mismatch:transactions"
  | "web_push_unconfigured";
type SupabaseQueryError = { code?: string; message?: string };
type SupabaseQueryResult<T> = { data: T | null; error: SupabaseQueryError | null };
type PreferenceRecord = {
  user_id: string;
  daily_reminder_enabled: boolean;
  monthly_review_enabled: boolean;
};
type ProfileRecord = {
  id: string;
  timezone: string | null;
  ui_locale: string | null;
};
type SupabaseSelectQuery<T> = PromiseLike<SupabaseQueryResult<T>> & {
  or(filter: string): PromiseLike<SupabaseQueryResult<T>>;
  in(column: string, values: string[]): SupabaseSelectQuery<T>;
  eq(column: string, value: string): SupabaseSelectQuery<T>;
  gte(column: string, value: string): SupabaseSelectQuery<T>;
  lt(column: string, value: string): SupabaseSelectQuery<T>;
  is(column: string, value: null): SupabaseSelectQuery<T>;
  limit(count: number): PromiseLike<SupabaseQueryResult<T>>;
};
type SupabaseUpdateQuery = PromiseLike<SupabaseQueryResult<unknown>> & {
  eq(column: string, value: string): SupabaseUpdateQuery;
};
type SupabaseTableQuery = {
  select<T>(columns: string): SupabaseSelectQuery<T>;
  insert(row: Record<string, unknown>): PromiseLike<SupabaseQueryResult<unknown>>;
  update(row: Record<string, unknown>): SupabaseUpdateQuery;
};
type SupabaseAdminQueryClient = {
  from(table: string): SupabaseTableQuery;
};

export type ScheduledNotificationCandidate = {
  userId: string;
  timezone?: string | null;
  uiLocale?: string | null;
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
  hasTrackedActivityInRange(userId: string, startIso: string, endIso: string): Promise<boolean>;
};

export type ScheduledNotificationsSummary = {
  ok: boolean;
  reason?: SchedulerDiagnostic;
  diagnostics: SchedulerDiagnostic[];
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
  skippedActivityToday: number;
  activityCheckFailures: number;
  expiredSubscriptions: number;
  timezoneFallbacks: number;
};

const UTC_FALLBACK_TIMEZONE = "UTC";
export const DEFAULT_DAILY_REMINDER_HOUR = 19;
export const DEFAULT_MONTHLY_REVIEW_HOUR = 10;
const SCHEMA_ERROR_CODES = new Set(["42P01", "42703", "PGRST200", "PGRST201", "PGRST202", "PGRST204", "PGRST205"]);

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
    skippedActivityToday: 0,
    activityCheckFailures: 0,
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

function getTimeZoneOffsetMs(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hour = get("hour") === 24 ? 0 : get("hour");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));

  return asUtc - date.getTime();
}

function localDateTimeToUtcDate(year: number, month: number, day: number, timezone: string) {
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const firstPass = new Date(utcGuess - getTimeZoneOffsetMs(new Date(utcGuess), timezone));
  return new Date(utcGuess - getTimeZoneOffsetMs(firstPass, timezone));
}

export function getNotificationLocalDayRange(now: Date, timezone?: string | null) {
  const resolved = resolveNotificationTimezone(timezone);
  const local = getLocalParts(now, resolved.timezone);
  const start = localDateTimeToUtcDate(local.year, local.month, local.day, resolved.timezone);
  const end = localDateTimeToUtcDate(local.year, local.month, local.day + 1, resolved.timezone);

  return {
    ...resolved,
    dayKey: `${local.year}-${pad(local.month)}-${pad(local.day)}`,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
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
    dailyDue: local.hour === DEFAULT_DAILY_REMINDER_HOUR,
    monthlyDue: local.day === 1 && local.hour === DEFAULT_MONTHLY_REVIEW_HOUR,
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

function getErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: string }).code ?? "")
    : "";
}

function getErrorDiagnostic(error: unknown): SchedulerDiagnostic | null {
  return typeof error === "object" && error !== null && "diagnostic" in error
    ? ((error as { diagnostic?: SchedulerDiagnostic }).diagnostic ?? null)
    : null;
}

function classifyDatabaseError(error: unknown): "database_unavailable" | "schema_mismatch" {
  const code = getErrorCode(error);
  return SCHEMA_ERROR_CODES.has(code) ? "schema_mismatch" : "database_unavailable";
}

function getQueryDiagnostic(error: unknown, scope: Exclude<SchedulerDiagnostic, "admin_unconfigured" | "admin_invalid_config" | "database_unavailable" | "schema_mismatch" | "web_push_unconfigured">): SchedulerDiagnostic {
  const classification = classifyDatabaseError(error);
  const [, table] = scope.split(":");
  return `${classification}:${table}` as SchedulerDiagnostic;
}

function logSchedulerDiagnostic(reason: SchedulerDiagnostic, detail?: string) {
  console.info("[notifications:cron]", {
    ok: false,
    reason,
    detail,
  });
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

    const dedupeKey = kind === "daily" ? schedule.dayKey : schedule.monthKey;
    if (kind === "daily") {
      const dayRange = getNotificationLocalDayRange(now, candidate.timezone);

      try {
        const hasActivityToday = await adapter.hasTrackedActivityInRange(candidate.userId, dayRange.startIso, dayRange.endIso);

        if (hasActivityToday) {
          counts.skippedActivityToday += 1;
          continue;
        }
      } catch (error) {
        counts.activityCheckFailures += 1;
        logSchedulerDiagnostic(getErrorDiagnostic(error) ?? getQueryDiagnostic(error, "schema_mismatch:transactions"), "activity_check_failed");
        continue;
      }
    }

    counts.eligible += 1;
    const claim = await adapter.claimEvent(candidate.userId, notificationType, dedupeKey);

    if (claim === "duplicate") {
      counts.deduped += 1;
      continue;
    }

    const copy =
      kind === "daily"
        ? getDailyReminderCopy(now, { locale: candidate.uiLocale, userId: candidate.userId, dayKey: schedule.dayKey })
        : getMonthlyReportCopy(now);
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
    diagnostics: [],
    serverTimezoneFallback: UTC_FALLBACK_TIMEZONE,
    daily: emptyCounts(),
    monthly: emptyCounts(),
  };

  if (!isWebPushConfigured()) {
    return {
      ...summary,
      ok: false,
      reason: "web_push_unconfigured",
      diagnostics: ["web_push_unconfigured"],
    };
  }

  let candidates: ScheduledNotificationCandidate[];

  try {
    candidates = await adapter.listCandidates();
  } catch (error) {
    const diagnostic = getErrorDiagnostic(error) ?? classifyDatabaseError(error);
    logSchedulerDiagnostic(diagnostic, getErrorCode(error) || "candidate_load_failed");
    return {
      ...summary,
      ok: false,
      reason: diagnostic,
      diagnostics: [diagnostic],
    };
  }

  try {
    return {
      ...summary,
      daily: await runKind("daily", candidates, adapter, now),
      monthly: await runKind("monthly", candidates, adapter, now),
    };
  } catch (error) {
    const diagnostic = getErrorDiagnostic(error) ?? classifyDatabaseError(error);
    logSchedulerDiagnostic(diagnostic, getErrorCode(error) || "delivery_run_failed");
    return {
      ...summary,
      ok: false,
      reason: diagnostic,
      diagnostics: [diagnostic],
    };
  }
}

export function createSupabaseScheduledNotificationsAdapter(): ScheduledNotificationsAdapter | null {
  const result = createSupabaseAdminClientResult();

  if (!result.ok) {
    return null;
  }

  const supabase = result.client as SupabaseAdminQueryClient;

  return {
    async listCandidates() {
      const { data: preferences, error: preferencesError } = await supabase
        .from("notification_preferences")
        .select<PreferenceRecord[]>("user_id,daily_reminder_enabled,monthly_review_enabled")
        .or("daily_reminder_enabled.eq.true,monthly_review_enabled.eq.true");

      if (preferencesError) {
        const diagnostic = getQueryDiagnostic(preferencesError, "schema_mismatch:notification_preferences");
        throw { ...preferencesError, diagnostic };
      }

      const userIds = [...new Set((preferences ?? []).map((preference) => preference.user_id))];

      if (userIds.length === 0) {
        return [];
      }

      const [{ data: profiles, error: profilesError }, { data: subscriptions, error: subscriptionsError }] =
        await Promise.all([
          supabase.from("profiles").select<ProfileRecord[]>("id,timezone,ui_locale").in("id", userIds),
          supabase.from("push_subscriptions").select<PushSubscriptionRow[]>("*").in("user_id", userIds).is("disabled_at", null),
        ]);

      if (profilesError) {
        const diagnostic = getQueryDiagnostic(profilesError, "schema_mismatch:profiles");
        throw { ...profilesError, diagnostic };
      }

      if (subscriptionsError) {
        const diagnostic = getQueryDiagnostic(subscriptionsError, "schema_mismatch:push_subscriptions");
        throw { ...subscriptionsError, diagnostic };
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
        uiLocale: profileByUserId.get(preference.user_id)?.ui_locale ?? null,
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

      const diagnostic = getQueryDiagnostic(error, "schema_mismatch:notification_events_dedupe");
      throw { ...error, diagnostic };
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
        const diagnostic = getQueryDiagnostic(error, "schema_mismatch:notification_events");
        throw { ...error, diagnostic };
      }
    },

    async disablePushSubscription(userId, endpoint) {
      const { error } = await supabase
        .from("push_subscriptions")
        .update({ disabled_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("endpoint", endpoint);

      if (error) {
        const diagnostic = getQueryDiagnostic(error, "schema_mismatch:push_subscriptions");
        throw { ...error, diagnostic };
      }
    },

    async hasTrackedActivityInRange(userId, startIso, endIso) {
      const { data, error } = await supabase
        .from("transactions")
        .select<Array<{ id: string }>>("id")
        .eq("user_id", userId)
        .in("transaction_type", ["expense", "income"])
        .gte("occurred_at", startIso)
        .lt("occurred_at", endIso)
        .is("deleted_at", null)
        .is("deleted_forever_at", null)
        .limit(1);

      if (error) {
        const diagnostic = getQueryDiagnostic(error, "schema_mismatch:transactions");
        throw { ...error, diagnostic };
      }

      return Boolean(data?.length);
    },
  };
}

export async function runSupabaseScheduledNotifications(options: { now?: Date } = {}) {
  const adminClient = createSupabaseAdminClientResult();
  const now = options.now ?? new Date();

  if (!adminClient.ok) {
    logSchedulerDiagnostic(adminClient.reason);
    return {
      ok: false,
      reason: adminClient.reason,
      now: now.toISOString(),
      diagnostics: [adminClient.reason],
      serverTimezoneFallback: UTC_FALLBACK_TIMEZONE,
      daily: emptyCounts(),
      monthly: emptyCounts(),
    };
  }

  const adapter = createSupabaseScheduledNotificationsAdapter();

  if (!adapter) {
    logSchedulerDiagnostic("admin_invalid_config");
    return {
      ok: false,
      reason: "admin_invalid_config" as const,
      now: now.toISOString(),
      diagnostics: ["admin_invalid_config"],
      serverTimezoneFallback: UTC_FALLBACK_TIMEZONE,
      daily: emptyCounts(),
      monthly: emptyCounts(),
    };
  }

  return runScheduledNotifications(adapter, { now });
}
