import webPush from "web-push";
import type { PushSubscriptionRow } from "@/domain/notifications/types";

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
  notificationType?: string;
  tag?: string;
};

export type WebPushSendResult =
  | { status: "sent" }
  | { status: "unconfigured" }
  | { status: "expired" }
  | { status: "failed" };

type WebPushConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

function getWebPushConfig(): WebPushConfig | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) {
    console.info("[notifications:web-push]", {
      configured: false,
      hasPublicKey: Boolean(publicKey),
      hasPrivateKey: Boolean(privateKey),
      hasSubject: Boolean(subject),
    });
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function isWebPushConfigured() {
  return getWebPushConfig() !== null;
}

function configureWebPush(config: WebPushConfig) {
  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
}

function isExpiredPushError(error: unknown) {
  const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : null;
  return statusCode === 404 || statusCode === 410;
}

export async function sendWebPushNotification(subscription: PushSubscriptionRow, payload: WebPushPayload): Promise<WebPushSendResult> {
  const config = getWebPushConfig();

  if (!config) {
    return { status: "unconfigured" };
  }

  try {
    configureWebPush(config);
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          auth: subscription.auth,
          p256dh: subscription.p256dh,
        },
      },
      JSON.stringify(payload),
    );

    return { status: "sent" };
  } catch (error) {
    if (isExpiredPushError(error)) {
      return { status: "expired" };
    }

    console.info("[notifications:web-push]", {
      configured: true,
      sent: false,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { status: "failed" };
  }
}
