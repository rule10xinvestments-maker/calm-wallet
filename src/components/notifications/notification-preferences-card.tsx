"use client";

import { Bell, BellOff, Send } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";
import type { NotificationPreferences } from "@/domain/notifications/types";
import { notificationCopyTemplates } from "@/domain/notifications/copy";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  initialNotificationPreferencesActionState,
  type NotificationPreferencesActionState,
} from "@/lib/actions/notifications-state";
import { t } from "@/lib/i18n";

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
  sendTestPushNotificationAction: (
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
  sendTestPushNotificationAction,
}: NotificationPreferencesCardProps) {
  const { locale } = useLocale();
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
      return t("notifications.unsupported", locale);
    }

    if (browserStatus === "denied") {
      return t("notifications.blocked", locale);
    }

    if (browserStatus === "granted") {
      return scheduledPushReady ? t("notifications.enabled", locale) : t("notifications.testEnabledScheduledNotReady", locale);
    }

    return t("notifications.permissionNeeded", locale);
  }, [browserStatus, locale, scheduledPushReady]);

  async function registerSubscriptionIfPossible() {
    if (!vapidPublicKey) {
      setBrowserMessage(t("notifications.testReadyScheduledNotReady", locale));
      return false;
    }

    try {
      const registration = await getReadyServiceWorkerRegistration();

      if (!registration || !("pushManager" in registration)) {
        setBrowserMessage(t("notifications.notReady", locale));
        return false;
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
      setBrowserMessage(result.status === "success" ? t("notifications.ready", locale) : t("notifications.notReady", locale));
      return result.status === "success";
    } catch {
      setBrowserMessage(t("notifications.notReady", locale));
      return false;
    }
  }

  function handleEnableNotifications() {
    startBrowserTransition(async () => {
      setBrowserMessage(null);

      if (!("Notification" in window)) {
        setBrowserStatus("unsupported");
        setBrowserMessage(t("notifications.unsupported", locale));
        return;
      }

      const permission = await Notification.requestPermission();
      setBrowserStatus(permission);

      if (permission === "denied") {
        setBrowserMessage(t("notifications.blocked", locale));
        return;
      }

      if (permission !== "granted") {
        setBrowserMessage(t("notifications.permissionNeeded", locale));
        return;
      }

      await registerSubscriptionIfPossible();
    });
  }

  async function sendLocalTestNotification() {
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
  }

  function handleTestNotification() {
    startBrowserTransition(async () => {
      setBrowserMessage(null);

      if (!("Notification" in window)) {
        setBrowserStatus("unsupported");
        setBrowserMessage(t("notifications.unsupported", locale));
        return;
      }

      if (Notification.permission !== "granted") {
        setBrowserStatus(Notification.permission);
        setBrowserMessage(t("notifications.permissionNeeded", locale));
        return;
      }

      try {
        if (vapidPublicKey) {
          await registerSubscriptionIfPossible();
          const serverResult = await sendTestPushNotificationAction(initialNotificationPreferencesActionState, new FormData());

          if (serverResult.status === "success") {
            setBrowserMessage(serverResult.message);
            return;
          }
        }

        await sendLocalTestNotification();
        setBrowserMessage(t("notifications.testSent", locale));
      } catch {
        setBrowserMessage(t("notifications.testCouldNotSend", locale));
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
              <p className="text-sm font-medium text-slate-900">{t("notifications.notifications", locale)}</p>
              <p className="text-xs leading-4 text-slate-500">{enableCopy}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-9 px-3 text-xs"
                disabled={!canUseNotifications || browserStatus === "denied" || isBrowserPending}
                onClick={handleEnableNotifications}
                type="button"
              >
                {browserStatus === "granted" ? t("notifications.enabledShort", locale) : t("notifications.enableNotifications", locale)}
              </Button>
              <Button
                className="h-9 bg-white px-3 text-xs text-slate-700 hover:bg-slate-100"
                disabled={!canSendTest || isBrowserPending}
                onClick={handleTestNotification}
                type="button"
              >
                <Send aria-hidden="true" className="mr-1.5 size-3.5" />
                {t("notifications.sendTest", locale)}
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
          description={t("notifications.dailyReminderHelper", locale)}
          name="dailyReminderEnabled"
          title={t("notifications.dailyReminder", locale)}
        />
        <ToggleCard
          defaultChecked={current.monthlyReviewEnabled}
          description={t("notifications.monthlyReportHelper", locale)}
          name="monthlyReviewEnabled"
          title={t("notifications.monthlyReport", locale)}
        />
        <ToggleCard
          defaultChecked={current.recurringNotificationsEnabled}
          description={t("notifications.recurringEntriesHelper", locale)}
          name="recurringNotificationsEnabled"
          title={t("notifications.recurringEntries", locale)}
        />
        <ToggleCard
          defaultChecked={current.limitAlertsEnabled}
          description={t("notifications.limitAlertsHelper", locale)}
          name="limitAlertsEnabled"
          title={t("notifications.limitAlerts", locale)}
        />
        <Button disabled={isPending} type="submit">
          {isPending ? t("common.saving", locale) : t("notifications.saveSettings", locale)}
        </Button>
      </form>
      {!scheduledPushReady ? (
        <p className="text-xs leading-4 text-slate-500">
          {t("notifications.deviceTestWorksScheduledNotReady", locale)}
        </p>
      ) : null}
    </div>
  );
}
