"use client";

import { Bell, BellOff, Send } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";
import type { NotificationPreferences } from "@/domain/notifications/types";
import { notificationCopyTemplates } from "@/domain/notifications/copy";
import { Button } from "@/components/ui/button";
import {
  initialNotificationPreferencesActionState,
  type NotificationPreferencesActionState,
} from "@/lib/actions/notifications-state";

type NotificationPreferencesCardProps = {
  preferences: NotificationPreferences;
  action: (
    state: NotificationPreferencesActionState,
    formData: FormData,
  ) => Promise<NotificationPreferencesActionState>;
  registerPushSubscriptionAction: (
    state: NotificationPreferencesActionState,
    formData: FormData,
  ) => Promise<NotificationPreferencesActionState>;
};

type BrowserNotificationStatus = "checking" | "unsupported" | "default" | "granted" | "denied";

function getBrowserNotificationStatus(): BrowserNotificationStatus {
  if (typeof window === "undefined") {
    return "checking";
  }

  if (!("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

async function getReadyServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  return navigator.serviceWorker.ready;
}

function ToggleCard({
  description,
  defaultChecked,
  name,
  title,
}: {
  description: string;
  defaultChecked: boolean;
  name: string;
  title: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
      <input className="mt-1" defaultChecked={defaultChecked} name={name} type="checkbox" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900">{title}</span>
        <span className="block text-xs leading-4 text-slate-500">{description}</span>
      </span>
    </label>
  );
}

export function NotificationPreferencesCard({
  preferences,
  action,
  registerPushSubscriptionAction,
}: NotificationPreferencesCardProps) {
  const [state, formAction, isPending] = useActionState(action, {
    ...initialNotificationPreferencesActionState,
    preferences,
  });
  const current = state.preferences ?? preferences;
  const [browserStatus, setBrowserStatus] = useState<BrowserNotificationStatus>(() => getBrowserNotificationStatus());
  const [browserMessage, setBrowserMessage] = useState<string | null>(null);
  const [isBrowserPending, startBrowserTransition] = useTransition();
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const canUseNotifications = browserStatus !== "unsupported";
  const canSendTest = browserStatus === "granted";
  const scheduledPushReady = Boolean(vapidPublicKey);

  const enableCopy = useMemo(() => {
    if (browserStatus === "unsupported") {
      return "Notifications are not supported here.";
    }

    if (browserStatus === "denied") {
      return "Notifications are blocked in this browser.";
    }

    if (browserStatus === "granted") {
      return scheduledPushReady ? "Notifications are enabled." : "Test notifications are enabled. Scheduled reminders are not ready yet.";
    }

    return "Notification permission is needed first.";
  }, [browserStatus, scheduledPushReady]);

  function registerSubscriptionIfPossible() {
    startBrowserTransition(async () => {
      if (!vapidPublicKey) {
        setBrowserMessage("Test notifications are ready. Scheduled reminders are not ready yet.");
        return;
      }

      try {
        const registration = await getReadyServiceWorkerRegistration();

        if (!registration || !("pushManager" in registration)) {
          setBrowserMessage("Notifications are not ready yet.");
          return;
        }

        const existingSubscription = await registration.pushManager.getSubscription();
        const subscription =
          existingSubscription ??
          (await registration.pushManager.subscribe({
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            userVisibleOnly: true,
          }));
        const subscriptionJson = subscription.toJSON();
        const formData = new FormData();
        formData.set("endpoint", subscription.endpoint);
        formData.set("p256dh", subscriptionJson.keys?.p256dh ?? "");
        formData.set("auth", subscriptionJson.keys?.auth ?? "");
        formData.set("userAgent", navigator.userAgent);
        const result = await registerPushSubscriptionAction(initialNotificationPreferencesActionState, formData);
        setBrowserMessage(result.status === "success" ? "Notifications are ready." : "Notifications are not ready yet.");
      } catch {
        setBrowserMessage("Notifications are not ready yet.");
      }
    });
  }

  function handleEnableNotifications() {
    startBrowserTransition(async () => {
      setBrowserMessage(null);

      if (!("Notification" in window)) {
        setBrowserStatus("unsupported");
        setBrowserMessage("Notifications are not supported here.");
        return;
      }

      const permission = await Notification.requestPermission();
      setBrowserStatus(permission);

      if (permission === "denied") {
        setBrowserMessage("Notifications are blocked in this browser.");
        return;
      }

      if (permission !== "granted") {
        setBrowserMessage("Notification permission is needed first.");
        return;
      }

      registerSubscriptionIfPossible();
    });
  }

  function handleTestNotification() {
    startBrowserTransition(async () => {
      setBrowserMessage(null);

      if (!("Notification" in window)) {
        setBrowserStatus("unsupported");
        setBrowserMessage("Notifications are not supported here.");
        return;
      }

      if (Notification.permission !== "granted") {
        setBrowserStatus(Notification.permission);
        setBrowserMessage("Notification permission is needed first.");
        return;
      }

      try {
        const registration = await getReadyServiceWorkerRegistration();
        const options: NotificationOptions = {
          body: notificationCopyTemplates.test.body,
          data: { url: "/assistant" },
          icon: "/icons/calm-wallet-icon-192.png",
          tag: "calm-wallet-test",
        };

        if (registration?.showNotification) {
          await registration.showNotification(notificationCopyTemplates.test.title, options);
        } else {
          new Notification(notificationCopyTemplates.test.title, options);
        }

        setBrowserMessage("Test notification sent.");
      } catch {
        setBrowserMessage("Test notification could not be sent.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-slate-50 px-3 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-full bg-white p-2 text-sky-700">
            {browserStatus === "denied" || browserStatus === "unsupported" ? (
              <BellOff aria-hidden="true" className="size-4" />
            ) : (
              <Bell aria-hidden="true" className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-sm font-medium text-slate-900">Notifications</p>
              <p className="text-xs leading-4 text-slate-500">{enableCopy}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-9 px-3 text-xs"
                disabled={!canUseNotifications || browserStatus === "denied" || isBrowserPending}
                onClick={handleEnableNotifications}
                type="button"
              >
                {browserStatus === "granted" ? "Enabled" : "Enable notifications"}
              </Button>
              <Button
                className="h-9 bg-white px-3 text-xs text-slate-700 hover:bg-slate-100"
                disabled={!canSendTest || isBrowserPending}
                onClick={handleTestNotification}
                type="button"
              >
                <Send aria-hidden="true" className="mr-1.5 size-3.5" />
                Send test
              </Button>
            </div>
            {browserMessage ? <p className="text-xs leading-4 text-sky-700">{browserMessage}</p> : null}
          </div>
        </div>
      </div>

      <form action={formAction} className="space-y-2.5">
        {state.message ? (
          <p className={`text-sm ${state.status === "error" ? "text-rose-600" : "text-sky-700"}`}>{state.message}</p>
        ) : null}
        <ToggleCard
          defaultChecked={current.dailyReminderEnabled}
          description="A gentle evening nudge around 8 PM."
          name="dailyReminderEnabled"
          title="Daily reminder"
        />
        <ToggleCard
          defaultChecked={current.monthlyReviewEnabled}
          description="A calm prompt when a new month starts."
          name="monthlyReviewEnabled"
          title="Monthly report"
        />
        <ToggleCard
          defaultChecked={current.recurringNotificationsEnabled}
          description="A note when a repeating entry is added."
          name="recurringNotificationsEnabled"
          title="Recurring entries"
        />
        <ToggleCard
          defaultChecked={current.limitAlertsEnabled}
          description="A calm check-in near or over a category limit."
          name="limitAlertsEnabled"
          title="Limit alerts"
        />
        <Button disabled={isPending} type="submit">
          {isPending ? "Saving..." : "Save notification settings"}
        </Button>
      </form>
      {!scheduledPushReady ? (
        <p className="text-xs leading-4 text-slate-500">
          Test notifications work on this device. Scheduled reminders are not ready yet.
        </p>
      ) : null}
    </div>
  );
}
