import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PushSubscriptionRow } from "@/domain/notifications/types";

const sendNotification = vi.fn();
const setVapidDetails = vi.fn();

vi.mock("web-push", () => ({
  default: {
    sendNotification,
    setVapidDetails,
  },
}));

const subscription: PushSubscriptionRow = {
  id: "sub-1",
  user_id: "user-1",
  endpoint: "https://push.example.test/subscription",
  p256dh: "p256dh-key",
  auth: "auth-key",
  user_agent: "Vitest",
  disabled_at: null,
  created_at: "2026-05-03T00:00:00.000Z",
  updated_at: "2026-05-03T00:00:00.000Z",
};

describe("web push sender", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
    process.env.VAPID_SUBJECT = "mailto:support@example.test";
    sendNotification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  it("reports unavailable state when VAPID env is missing", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    const { sendWebPushNotification } = await import("@/lib/server/web-push-sender");

    await expect(
      sendWebPushNotification(subscription, {
        title: "Calm Wallet is ready",
        body: "Notifications are working.",
      }),
    ).resolves.toEqual({ status: "unconfigured" });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("sends the expected safe test payload", async () => {
    const { sendWebPushNotification } = await import("@/lib/server/web-push-sender");

    await expect(
      sendWebPushNotification(subscription, {
        title: "Calm Wallet is ready",
        body: "Notifications are working.",
        url: "/",
        notificationType: "test",
      }),
    ).resolves.toEqual({ status: "sent" });

    expect(setVapidDetails).toHaveBeenCalledWith("mailto:support@example.test", "public-key", "private-key");
    expect(sendNotification).toHaveBeenCalledWith(
      {
        endpoint: "https://push.example.test/subscription",
        keys: {
          auth: "auth-key",
          p256dh: "p256dh-key",
        },
      },
      JSON.stringify({
        title: "Calm Wallet is ready",
        body: "Notifications are working.",
        url: "/",
        notificationType: "test",
      }),
    );
  });

  it("classifies gone subscriptions as expired", async () => {
    sendNotification.mockRejectedValueOnce({ statusCode: 410 });
    const { sendWebPushNotification } = await import("@/lib/server/web-push-sender");

    await expect(
      sendWebPushNotification(subscription, {
        title: "Calm Wallet is ready",
        body: "Notifications are working.",
      }),
    ).resolves.toEqual({ status: "expired" });
  });
});
