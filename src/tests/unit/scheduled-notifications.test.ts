import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PushSubscriptionRow } from "@/domain/notifications/types";
import type { NotificationEventStatus, NotificationEventType } from "@/lib/db/types";
import type { ScheduledNotificationCandidate, ScheduledNotificationsAdapter } from "@/lib/server/scheduled-notifications";
import { createSupabaseAdminClientResult } from "@/lib/server/supabase-admin";

const sendWebPushNotification = vi.fn();
const isWebPushConfigured = vi.fn(() => true);
const runSupabaseScheduledNotifications = vi.fn();

vi.mock("@/lib/server/web-push-sender", () => ({
  isWebPushConfigured,
  sendWebPushNotification,
}));

vi.mock("@/lib/server/scheduled-notifications", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/scheduled-notifications")>();

  return {
    ...actual,
    runSupabaseScheduledNotifications,
  };
});

const now = new Date("2026-05-01T17:05:00.000Z");
const monthlyNow = new Date("2026-05-01T07:05:00.000Z");

function makeSubscription(overrides: Partial<PushSubscriptionRow> = {}): PushSubscriptionRow {
  return {
    id: "sub-1",
    user_id: "user-1",
    endpoint: "https://push.example.test/subscription",
    p256dh: "p256dh-key",
    auth: "auth-key",
    user_agent: "Vitest",
    disabled_at: null,
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<ScheduledNotificationCandidate> = {}): ScheduledNotificationCandidate {
  return {
    userId: "user-1",
    timezone: "Europe/Bucharest",
    dailyReminderEnabled: true,
    monthlyReviewEnabled: true,
    subscriptions: [makeSubscription()],
    ...overrides,
  };
}

function makeAdapter(candidates: ScheduledNotificationCandidate[], claimed = new Set<string>()) {
  const marked: Array<{
    userId: string;
    notificationType: NotificationEventType;
    dedupeKey: string;
    status: Exclude<NotificationEventStatus, "claimed">;
    errorCode?: string | null;
  }> = [];

  const adapter: ScheduledNotificationsAdapter = {
    listCandidates: vi.fn(async () => candidates),
    claimEvent: vi.fn(async (userId, notificationType, dedupeKey) => {
      const key = `${userId}:${notificationType}:${dedupeKey}`;

      if (claimed.has(key)) {
        return "duplicate";
      }

      claimed.add(key);
      return "claimed";
    }),
    markEvent: vi.fn(async (userId, notificationType, dedupeKey, status, errorCode = null) => {
      marked.push({ userId, notificationType, dedupeKey, status, errorCode });
    }),
    disablePushSubscription: vi.fn(async () => undefined),
  };

  return { adapter, claimed, marked };
}

describe("scheduled notification runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isWebPushConfigured.mockReturnValue(true);
    sendWebPushNotification.mockResolvedValue({ status: "sent" });
    runSupabaseScheduledNotifications.mockResolvedValue({
      ok: true,
      now: now.toISOString(),
      diagnostics: [],
      serverTimezoneFallback: "UTC",
      daily: {},
      monthly: {},
    });
  });

  it("rotates daily and monthly copy deterministically in scheduled payloads", async () => {
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const { adapter } = makeAdapter([
      makeCandidate(),
      makeCandidate({
        userId: "user-2",
        timezone: "America/Los_Angeles",
        dailyReminderEnabled: false,
        subscriptions: [makeSubscription({ id: "sub-2", user_id: "user-2", endpoint: "https://push.example.test/subscription-2" })],
      }),
    ]);

    await runScheduledNotifications(adapter, { now });

    expect(sendWebPushNotification).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        title: "Quick money check-in",
        body: "Add anything you spent or earned today.",
        url: "/assistant",
        notificationType: "daily_reminder",
      }),
    );
    expect(sendWebPushNotification).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        title: "Monthly clarity is ready",
        body: "Review your income, spending, and trends.",
        url: "/insights",
        notificationType: "monthly_report",
      }),
    );
  });

  it("sends daily reminders only when enabled", async () => {
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const { adapter } = makeAdapter([makeCandidate({ timezone: "America/Los_Angeles", dailyReminderEnabled: false })]);

    const summary = await runScheduledNotifications(adapter, { now });

    expect(summary.daily.skippedDisabled).toBe(1);
    expect(summary.daily.sent).toBe(0);
    expect(sendWebPushNotification).toHaveBeenCalledTimes(1);
    expect(sendWebPushNotification).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ notificationType: "monthly_report" }),
    );
  });

  it("returns a 200-safe summary when no users are eligible", async () => {
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const { adapter } = makeAdapter([]);

    const summary = await runScheduledNotifications(adapter, { now });

    expect(summary).toMatchObject({
      ok: true,
      diagnostics: [],
      daily: { considered: 0, sent: 0 },
      monthly: { considered: 0, sent: 0 },
    });
    expect(sendWebPushNotification).not.toHaveBeenCalled();
  });

  it("returns a 200-safe summary when enabled users have no subscriptions", async () => {
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const { adapter } = makeAdapter([makeCandidate({ subscriptions: [], monthlyReviewEnabled: false })]);

    const summary = await runScheduledNotifications(adapter, { now });

    expect(summary).toMatchObject({
      ok: true,
      daily: { skippedNoSubscriptions: 1, sent: 0 },
    });
    expect(sendWebPushNotification).not.toHaveBeenCalled();
  });

  it("sends monthly reports only when enabled", async () => {
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const { adapter } = makeAdapter([makeCandidate({ monthlyReviewEnabled: false })]);

    const summary = await runScheduledNotifications(adapter, { now });

    expect(summary.monthly.skippedDisabled).toBe(1);
    expect(summary.monthly.sent).toBe(0);
    expect(sendWebPushNotification).toHaveBeenCalledTimes(1);
    expect(sendWebPushNotification).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ notificationType: "daily_reminder" }),
    );
  });

  it("dedupes daily reminders per local day", async () => {
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const claimed = new Set(["user-1:daily_reminder:2026-05-01"]);
    const { adapter } = makeAdapter([makeCandidate()], claimed);

    const summary = await runScheduledNotifications(adapter, { now });

    expect(summary.daily.deduped).toBe(1);
    expect(sendWebPushNotification).not.toHaveBeenCalled();
  });

  it("dedupes monthly reports per local month", async () => {
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const claimed = new Set(["user-1:monthly_report:2026-05"]);
    const { adapter } = makeAdapter([makeCandidate()], claimed);

    const summary = await runScheduledNotifications(adapter, { now: monthlyNow });

    expect(summary.monthly.deduped).toBe(1);
    expect(sendWebPushNotification).not.toHaveBeenCalled();
  });

  it("disables expired subscriptions and records a safe failure", async () => {
    sendWebPushNotification.mockResolvedValue({ status: "expired" });
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const { adapter, marked } = makeAdapter([makeCandidate({ monthlyReviewEnabled: false })]);

    const summary = await runScheduledNotifications(adapter, { now });

    expect(adapter.disablePushSubscription).toHaveBeenCalledWith("user-1", "https://push.example.test/subscription");
    expect(summary.daily.expiredSubscriptions).toBe(1);
    expect(summary.daily.failed).toBe(1);
    expect(marked[0]).toMatchObject({
      notificationType: "daily_reminder",
      status: "failed",
      errorCode: "no_active_subscription",
    });
  });

  it("does not include sensitive financial details in scheduled payloads", async () => {
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const { adapter } = makeAdapter([makeCandidate()]);

    await runScheduledNotifications(adapter, { now });

    for (const call of sendWebPushNotification.mock.calls) {
      const payloadText = JSON.stringify(call[1]);
      expect(payloadText).not.toMatch(/\$|\u20ac|\u00a3|\b\d+[,.]\d{2}\b|merchant|balance|account|transaction name/i);
    }
  });

  it("handles missing VAPID configuration calmly without claiming events", async () => {
    isWebPushConfigured.mockReturnValue(false);
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const { adapter } = makeAdapter([makeCandidate()]);

    const summary = await runScheduledNotifications(adapter, { now });

    expect(summary).toMatchObject({ ok: false, reason: "web_push_unconfigured" });
    expect(adapter.listCandidates).not.toHaveBeenCalled();
    expect(sendWebPushNotification).not.toHaveBeenCalled();
  });

  it("uses UTC as a clear fallback when timezone is missing", async () => {
    const utcNow = new Date("2026-05-01T20:05:00.000Z");
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const { adapter } = makeAdapter([makeCandidate({ timezone: null, monthlyReviewEnabled: false })]);

    const summary = await runScheduledNotifications(adapter, { now: utcNow });

    expect(summary.serverTimezoneFallback).toBe("UTC");
    expect(summary.daily.timezoneFallbacks).toBe(1);
    expect(summary.daily.sent).toBe(1);
  });

  it("does not crash when optional notification data is absent", async () => {
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const { adapter } = makeAdapter([
      makeCandidate({
        timezone: undefined,
        subscriptions: [],
        dailyReminderEnabled: true,
        monthlyReviewEnabled: false,
      }),
    ]);

    const summary = await runScheduledNotifications(adapter, { now: new Date("2026-05-01T20:05:00.000Z") });

    expect(summary).toMatchObject({
      ok: true,
      daily: {
        timezoneFallbacks: 1,
        skippedNoSubscriptions: 1,
      },
    });
  });

  it("returns controlled diagnostics for schema mismatches while loading candidates", async () => {
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const adapter: ScheduledNotificationsAdapter = {
      ...makeAdapter([]).adapter,
      listCandidates: vi.fn(async () => {
        throw { code: "42P01" };
      }),
    };

    const summary = await runScheduledNotifications(adapter, { now });

    expect(summary).toMatchObject({
      ok: false,
      reason: "schema_mismatch",
      diagnostics: ["schema_mismatch"],
    });
    expect(sendWebPushNotification).not.toHaveBeenCalled();
  });

  it("returns controlled diagnostics for dedupe schema mismatches", async () => {
    const { runScheduledNotifications } = await import("@/lib/server/scheduled-notifications");
    const adapter: ScheduledNotificationsAdapter = {
      ...makeAdapter([makeCandidate({ monthlyReviewEnabled: false })]).adapter,
      claimEvent: vi.fn(async () => {
        throw { code: "42703" };
      }),
    };

    const summary = await runScheduledNotifications(adapter, { now });

    expect(summary).toMatchObject({
      ok: false,
      reason: "schema_mismatch",
      diagnostics: ["schema_mismatch"],
    });
  });
});

describe("scheduled notification cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    runSupabaseScheduledNotifications.mockResolvedValue({
      ok: true,
      now: now.toISOString(),
      diagnostics: [],
      serverTimezoneFallback: "UTC",
      daily: { sent: 1 },
      monthly: { sent: 0 },
    });
  });

  it("rejects unauthorized requests", async () => {
    const { GET } = await import("@/app/api/cron/notifications/route");

    const response = await GET(new NextRequest("https://calm-wallet.example/api/cron/notifications"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ ok: false, error: "Unauthorized." });
    expect(runSupabaseScheduledNotifications).not.toHaveBeenCalled();
  });

  it("accepts Vercel cron bearer auth and returns safe summary counts", async () => {
    const { GET } = await import("@/app/api/cron/notifications/route");

    const response = await GET(
      new NextRequest("https://calm-wallet.example/api/cron/notifications", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, daily: { sent: 1 }, monthly: { sent: 0 } });
    expect(JSON.stringify(body)).not.toContain("user-1");
  });

  it("returns controlled scheduler diagnostics with a 200 after auth succeeds", async () => {
    runSupabaseScheduledNotifications.mockResolvedValueOnce({
      ok: false,
      reason: "schema_mismatch",
      diagnostics: ["schema_mismatch"],
      now: now.toISOString(),
      serverTimezoneFallback: "UTC",
      daily: { sent: 0 },
      monthly: { sent: 0 },
    });
    const { GET } = await import("@/app/api/cron/notifications/route");

    const response = await GET(
      new NextRequest("https://calm-wallet.example/api/cron/notifications", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: false, reason: "schema_mismatch" });
  });

  it("does not expose raw backend errors", async () => {
    runSupabaseScheduledNotifications.mockRejectedValueOnce(new Error("raw backend failure"));
    const { GET } = await import("@/app/api/cron/notifications/route");

    const response = await GET(
      new NextRequest("https://calm-wallet.example/api/cron/notifications", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ ok: false, error: "Scheduled notifications could not be processed." });
  });
});

describe("scheduled notification admin client", () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  });

  it("handles missing service-role env safely", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    expect(createSupabaseAdminClientResult()).toEqual({ ok: false, reason: "admin_unconfigured" });
  });

  it("handles invalid Supabase URL env safely", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not a url";

    expect(createSupabaseAdminClientResult()).toEqual({ ok: false, reason: "admin_invalid_config" });
  });
});
