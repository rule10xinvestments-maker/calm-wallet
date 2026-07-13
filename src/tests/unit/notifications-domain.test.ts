import { describe, expect, it, vi } from "vitest";
import {
  assertCalmNotificationCopy,
  dailyReminderNotificationRegistry,
  getDailyReminderCopy,
  getLimitAlertCopy,
  getMonthlyReportCopy,
  getRecurringEntryAddedCopy,
  notificationCopyTemplates,
} from "@/domain/notifications/copy";
import {
  createNotificationService,
  evaluateDailyReminderEligibility,
  evaluateMonthlyReviewEligibility,
  type NotificationServiceAdapter,
} from "@/domain/notifications/service";
import type { NotificationPreferencesRow } from "@/domain/notifications/types";

const now = "2026-05-03T12:00:00.000Z";

function makePreferencesRow(overrides: Partial<NotificationPreferencesRow> = {}): NotificationPreferencesRow {
  return {
    user_id: "user-1",
    daily_reminder_enabled: false,
    monthly_review_enabled: true,
    overspending_enabled: true,
    unusual_spending_enabled: true,
    savings_opportunities_enabled: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeAdapter(overrides: Partial<NotificationServiceAdapter> = {}): NotificationServiceAdapter {
  return {
    getPreferences: vi.fn(async () => ({ data: makePreferencesRow(), error: null })),
    insertPreferences: vi.fn(async (userId) => ({ data: makePreferencesRow({ user_id: userId }), error: null })),
    updatePreferences: vi.fn(async (userId, updates) => ({
      data: makePreferencesRow({
        user_id: userId,
        daily_reminder_enabled: Boolean(updates.daily_reminder_enabled),
        monthly_review_enabled: Boolean(updates.monthly_review_enabled),
        overspending_enabled: Boolean(updates.overspending_enabled),
        unusual_spending_enabled: Boolean(updates.unusual_spending_enabled),
      }),
      error: null,
    })),
    upsertPushSubscription: vi.fn(async (row) => ({
      data: {
        id: "sub-1",
        user_id: row.user_id,
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
        user_agent: row.user_agent ?? null,
        disabled_at: row.disabled_at ?? null,
        created_at: now,
        updated_at: now,
      },
      error: null,
    })),
    listActivePushSubscriptions: vi.fn(async () => ({ data: [], error: null })),
    disablePushSubscription: vi.fn(async (userId, endpoint, updates) => ({
      data: {
        id: "sub-1",
        user_id: userId,
        endpoint,
        p256dh: "p256dh-key",
        auth: "auth-key",
        user_agent: null,
        disabled_at: updates.disabled_at ?? null,
        created_at: now,
        updated_at: now,
      },
      error: null,
    })),
    ...overrides,
  };
}

describe("notification domain", () => {
  it("creates default preferences when an authenticated user has no row yet", async () => {
    const adapter = makeAdapter({
      getPreferences: vi.fn(async () => ({ data: null, error: null })),
    });
    const service = createNotificationService(adapter);

    const result = await service.getNotificationPreferences("user-1");

    expect(adapter.getPreferences).toHaveBeenCalledWith("user-1");
    expect(adapter.insertPreferences).toHaveBeenCalledWith("user-1");
    expect(result.userId).toBe("user-1");
    expect(result.dailyReminderEnabled).toBe(false);
    expect(result.monthlyReviewEnabled).toBe(true);
  });

  it("updates only owned preference fields after ensuring a row exists", async () => {
    const adapter = makeAdapter();
    const service = createNotificationService(adapter);

    const result = await service.updateNotificationPreferences("user-1", {
      dailyReminderEnabled: true,
      monthlyReviewEnabled: false,
      recurringNotificationsEnabled: false,
      limitAlertsEnabled: true,
    });

    expect(adapter.getPreferences).toHaveBeenCalledWith("user-1");
    expect(adapter.updatePreferences).toHaveBeenCalledWith("user-1", {
      daily_reminder_enabled: true,
      monthly_review_enabled: false,
      overspending_enabled: true,
      unusual_spending_enabled: false,
    });
    expect(result.dailyReminderEnabled).toBe(true);
    expect(result.monthlyReviewEnabled).toBe(false);
    expect(result.limitAlertsEnabled).toBe(true);
    expect(result.recurringNotificationsEnabled).toBe(false);
  });

  it("registers and disables push subscriptions through user-owned rows", async () => {
    const adapter = makeAdapter();
    const service = createNotificationService(adapter);

    await service.registerPushSubscription("user-1", {
      endpoint: "https://push.example.test/subscription",
      p256dh: "p256dh-key",
      auth: "auth-key",
      userAgent: "Vitest",
    });
    await service.disablePushSubscription("user-1", "https://push.example.test/subscription");

    expect(adapter.upsertPushSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        endpoint: "https://push.example.test/subscription",
        disabled_at: null,
      }),
    );
    expect(adapter.disablePushSubscription).toHaveBeenCalledWith(
      "user-1",
      "https://push.example.test/subscription",
      expect.objectContaining({ disabled_at: expect.any(String) }),
    );
  });

  it("evaluates daily reminder eligibility and suppression states", () => {
    const preferences = { dailyReminderEnabled: true, monthlyReviewEnabled: true };
    const eligible = evaluateDailyReminderEligibility({
      preferences,
      now: new Date("2026-05-03T16:30:00.000Z"),
      timezone: "Europe/Bucharest",
    });

    expect(eligible).toEqual({ eligible: true, reason: "eligible" });
    expect(
      evaluateDailyReminderEligibility({
        preferences: { ...preferences, dailyReminderEnabled: false },
        now: new Date("2026-05-03T16:30:00.000Z"),
        timezone: "Europe/Bucharest",
      }),
    ).toEqual({ eligible: false, reason: "disabled" });
    expect(
      evaluateDailyReminderEligibility({
        preferences,
        now: new Date("2026-05-03T16:30:00.000Z"),
        timezone: "Europe/Bucharest",
        lastSentAt: "2026-05-03T16:00:00.000Z",
      }),
    ).toEqual({ eligible: false, reason: "already_sent" });
    expect(
      evaluateDailyReminderEligibility({
        preferences,
        now: new Date("2026-05-03T16:30:00.000Z"),
        timezone: "Europe/Bucharest",
        hasActivityToday: true,
      }),
    ).toEqual({ eligible: false, reason: "already_active" });
  });

  it("evaluates monthly review eligibility in the first few local days only", () => {
    const preferences = { dailyReminderEnabled: true, monthlyReviewEnabled: true };

    expect(
      evaluateMonthlyReviewEligibility({
        preferences,
        now: new Date("2026-05-03T10:00:00.000Z"),
        timezone: "Europe/Bucharest",
      }),
    ).toEqual({ eligible: true, reason: "eligible" });
    expect(
      evaluateMonthlyReviewEligibility({
        preferences,
        now: new Date("2026-05-08T10:00:00.000Z"),
        timezone: "Europe/Bucharest",
      }),
    ).toEqual({ eligible: false, reason: "outside_window" });
    expect(
      evaluateMonthlyReviewEligibility({
        preferences,
        now: new Date("2026-05-03T10:00:00.000Z"),
        timezone: "Europe/Bucharest",
        lastSentAt: "2026-05-01T10:00:00.000Z",
      }),
    ).toEqual({ eligible: false, reason: "already_sent" });
  });

  it("keeps notification copy calm and non-judgmental", () => {
    for (const copy of [
      notificationCopyTemplates.test,
      ...Object.values(dailyReminderNotificationRegistry).flat(),
      ...notificationCopyTemplates.monthlyReport,
      getRecurringEntryAddedCopy("Rent"),
      getRecurringEntryAddedCopy(null),
      getLimitAlertCopy("Housing", "seventy_percent"),
      getLimitAlertCopy("Housing", "exceeded"),
    ]) {
      expect(() => assertCalmNotificationCopy(copy)).not.toThrow();
    }

    const copy = `${Object.values(dailyReminderNotificationRegistry).flat().map((item) => `${item.title} ${item.body}`).join(" ")} ${notificationCopyTemplates.monthlyReport.map((item) => `${item.title} ${item.body}`).join(" ")}`;
    expect(copy).not.toMatch(/urgent|hurry|warning|shame|failed|bad|must|now!|come back|we miss you|log now|stay on track|you haven't/i);
  });

  it("keeps daily reminder translations available in every supported locale", () => {
    const englishCount = dailyReminderNotificationRegistry.en.length;

    expect(englishCount).toBe(24);
    expect(dailyReminderNotificationRegistry.ro).toHaveLength(englishCount);
    expect(dailyReminderNotificationRegistry.fr).toHaveLength(englishCount);
    expect(dailyReminderNotificationRegistry.es).toHaveLength(englishCount);

    for (const variants of Object.values(dailyReminderNotificationRegistry)) {
      const uniqueVariants = new Set(variants.map((item) => `${item.title}|${item.body}`));

      expect(uniqueVariants.size).toBe(englishCount);
      variants.forEach((item) => {
        expect(item.title.trim()).toBeTruthy();
        expect(item.body.trim()).toBeTruthy();
      });
    }
  });

  it("selects daily reminders by locale with English fallback", () => {
    const date = new Date("2026-01-01T12:00:00.000Z");

    expect(dailyReminderNotificationRegistry.ro).toContainEqual(
      getDailyReminderCopy(date, { locale: "ro", userId: "user-1", dayKey: "2026-01-01" }),
    );
    expect(dailyReminderNotificationRegistry.fr).toContainEqual(
      getDailyReminderCopy(date, { locale: "fr", userId: "user-1", dayKey: "2026-01-01" }),
    );
    expect(dailyReminderNotificationRegistry.es).toContainEqual(
      getDailyReminderCopy(date, { locale: "es", userId: "user-1", dayKey: "2026-01-01" }),
    );
    expect(getDailyReminderCopy(date, { locale: "de", userId: "user-1", dayKey: "2026-01-01" })).toEqual(
      getDailyReminderCopy(date, { locale: "en", userId: "user-1", dayKey: "2026-01-01" }),
    );
  });

  it("rotates daily reminders deterministically by user and day while keeping monthly reports deterministic", () => {
    const date = new Date("2026-01-01T12:00:00.000Z");
    const first = getDailyReminderCopy(date, { locale: "en", userId: "user-1", dayKey: "2026-01-01" });
    const repeated = getDailyReminderCopy(date, { locale: "en", userId: "user-1", dayKey: "2026-01-01" });
    const nextDay = getDailyReminderCopy(date, { locale: "en", userId: "user-1", dayKey: "2026-01-02" });

    expect(repeated).toEqual(first);
    expect(nextDay).not.toEqual(first);
    expect(getMonthlyReportCopy(new Date("2026-01-01T12:00:00.000Z"))).toEqual(notificationCopyTemplates.monthlyReport[0]);
    expect(getMonthlyReportCopy(new Date("2026-02-01T12:00:00.000Z"))).toEqual(notificationCopyTemplates.monthlyReport[1]);
  });

  it("keeps recurring and limit notification bodies private", () => {
    expect(getRecurringEntryAddedCopy("Rent")).toEqual({
      title: "Recurring entry added",
      body: "Your usual Rent transaction was automatically added to Activity.",
    });
    expect(getLimitAlertCopy("Housing", "exceeded")).toEqual({
      title: "Limit passed",
      body: "Housing is now over your planned limit.",
    });
    expect(getLimitAlertCopy("Housing", "seventy_percent").body).not.toMatch(/\d/);
  });
});
