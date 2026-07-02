import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedSession = vi.fn();
const updateNotificationPreferences = vi.fn();
const registerPushSubscription = vi.fn();
const getNotificationPreferences = vi.fn();
const listActivePushSubscriptions = vi.fn();
const disablePushSubscription = vi.fn();
const createSupabaseNotificationService = vi.fn(async () => ({
  updateNotificationPreferences,
  registerPushSubscription,
  getNotificationPreferences,
  listActivePushSubscriptions,
  disablePushSubscription,
}));
const sendWebPushNotification = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/auth/guards", () => ({
  requireAuthenticatedSession,
}));

vi.mock("@/domain/notifications/service", () => ({
  createSupabaseNotificationService,
}));

vi.mock("@/lib/server/web-push-sender", () => ({
  sendWebPushNotification,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

function makePreferences() {
  return {
    userId: "user-1",
    dailyReminderEnabled: true,
    monthlyReviewEnabled: false,
    recurringNotificationsEnabled: true,
    limitAlertsEnabled: true,
    overspendingEnabled: true,
    unusualSpendingEnabled: true,
    savingsOpportunitiesEnabled: true,
    createdAt: "2026-05-03T00:00:00.000Z",
    updatedAt: "2026-05-03T00:00:00.000Z",
  };
}

describe("notification actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedSession.mockResolvedValue({ user: { id: "user-1" } });
    updateNotificationPreferences.mockResolvedValue(makePreferences());
    getNotificationPreferences.mockResolvedValue(makePreferences());
    listActivePushSubscriptions.mockResolvedValue([
      {
        id: "sub-1",
        user_id: "user-1",
        endpoint: "https://push.example.test/subscription",
        p256dh: "p256dh-key",
        auth: "auth-key",
        user_agent: "Vitest",
        disabled_at: null,
        created_at: "2026-05-03T00:00:00.000Z",
        updated_at: "2026-05-03T00:00:00.000Z",
      },
    ]);
    disablePushSubscription.mockResolvedValue({ id: "sub-1" });
    sendWebPushNotification.mockResolvedValue({ status: "sent" });
    registerPushSubscription.mockResolvedValue({
      id: "sub-1",
      user_id: "user-1",
      endpoint: "https://push.example.test/subscription",
      p256dh: "p256dh-key",
      auth: "auth-key",
      user_agent: "Vitest",
      disabled_at: null,
      created_at: "2026-05-03T00:00:00.000Z",
      updated_at: "2026-05-03T00:00:00.000Z",
    });
  });

  it("updates notification preferences for the authenticated user", async () => {
    const { updateNotificationPreferencesAction } = await import("@/lib/actions/notifications");
    const formData = new FormData();
    formData.set("dailyReminderEnabled", "on");
    formData.set("recurringNotificationsEnabled", "on");
    formData.set("limitAlertsEnabled", "on");

    const result = await updateNotificationPreferencesAction(
      { status: "idle", message: null, preferences: null },
      formData,
    );

    expect(updateNotificationPreferences).toHaveBeenCalledWith("user-1", {
      dailyReminderEnabled: true,
      monthlyReviewEnabled: false,
      recurringNotificationsEnabled: true,
      limitAlertsEnabled: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/assistant");
    expect(result.status).toBe("success");
    expect(result.preferences?.userId).toBe("user-1");
  });

  it("rejects preference updates without an authenticated user", async () => {
    requireAuthenticatedSession.mockResolvedValueOnce({ user: null });
    const { updateNotificationPreferencesAction } = await import("@/lib/actions/notifications");

    const result = await updateNotificationPreferencesAction(
      { status: "idle", message: null, preferences: null },
      new FormData(),
    );

    expect(updateNotificationPreferences).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
  });

  it("registers a push subscription as owned storage scaffolding only", async () => {
    const { registerPushSubscriptionAction } = await import("@/lib/actions/notifications");
    const formData = new FormData();
    formData.set("endpoint", "https://push.example.test/subscription");
    formData.set("p256dh", "p256dh-key");
    formData.set("auth", "auth-key");
    formData.set("userAgent", "Vitest");

    const result = await registerPushSubscriptionAction(
      { status: "idle", message: null, preferences: null },
      formData,
    );

    expect(registerPushSubscription).toHaveBeenCalledWith("user-1", {
      endpoint: "https://push.example.test/subscription",
      p256dh: "p256dh-key",
      auth: "auth-key",
      userAgent: "Vitest",
    });
    expect(getNotificationPreferences).toHaveBeenCalledWith("user-1");
    expect(result.status).toBe("success");
  });

  it("uses calm copy when subscription storage fails", async () => {
    registerPushSubscription.mockRejectedValueOnce(new Error("raw database failure"));
    const { registerPushSubscriptionAction } = await import("@/lib/actions/notifications");
    const formData = new FormData();
    formData.set("endpoint", "https://push.example.test/subscription");
    formData.set("p256dh", "p256dh-key");
    formData.set("auth", "auth-key");

    const result = await registerPushSubscriptionAction(
      { status: "idle", message: null, preferences: null },
      formData,
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Notifications are not ready yet.",
    });
  });

  it("sends a server test push to the authenticated user's saved subscription", async () => {
    const { sendTestPushNotificationAction } = await import("@/lib/actions/notifications");

    const result = await sendTestPushNotificationAction(
      { status: "idle", message: null, preferences: null },
      new FormData(),
    );

    expect(listActivePushSubscriptions).toHaveBeenCalledWith("user-1");
    expect(sendWebPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1" }),
      {
        title: "Calm Wallet is ready",
        body: "Notifications are working.",
        url: "/",
        notificationType: "test",
        tag: "calm-wallet-test",
      },
    );
    expect(result).toMatchObject({
      status: "success",
      message: "Test notification sent.",
    });
  });

  it("handles missing saved subscriptions calmly for server test push", async () => {
    listActivePushSubscriptions.mockResolvedValueOnce([]);
    const { sendTestPushNotificationAction } = await import("@/lib/actions/notifications");

    const result = await sendTestPushNotificationAction(
      { status: "idle", message: null, preferences: null },
      new FormData(),
    );

    expect(sendWebPushNotification).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "error",
      message: "Enable notifications first.",
    });
  });

  it("disables expired subscriptions after server test push failure", async () => {
    sendWebPushNotification.mockResolvedValueOnce({ status: "expired" });
    const { sendTestPushNotificationAction } = await import("@/lib/actions/notifications");

    const result = await sendTestPushNotificationAction(
      { status: "idle", message: null, preferences: null },
      new FormData(),
    );

    expect(disablePushSubscription).toHaveBeenCalledWith("user-1", "https://push.example.test/subscription");
    expect(result).toMatchObject({
      status: "error",
      message: "Test notification could not be sent.",
    });
  });
});
