"use client";

import { Bell, BellOff, ChevronDown } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";
import type { NotificationPreferences } from "@/domain/notifications/types";
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
  const { locale } = useLocale();
  const [state, formAction, isPending] = useActionState(action, {
    ...initialNotificationPreferencesActionState,
    preferences,
  });
  const current = state.preferences ?? preferences;
  const [browserStatus, setBrowserStatus] = useState<BrowserNotificationStatus>(() => getBrowserNotificationStatus());
  const [browserMessage, setBrowserMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBrowserPending, startBrowserTransition] = useTransition();
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const canUseNotifications = browserStatus !== "unsupported";
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

  const notificationStatusLabel = browserStatus === "granted" ? t("notifications.enabledShort", locale) : t("notifications.disabled", locale);

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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        aria-expanded={isExpanded}
        className="grid w-full grid-cols-[2rem_1fr_auto] items-center gap-3 px-3 py-3 text-left"
        onClick={() => setIsExpanded((value) => !value)}
        type="button"
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700">
          {browserStatus === "denied" || browserStatus === "unsupported" ? (
            <BellOff aria-hidden="true" className="size-4" />
          ) : (
            <Bell aria-hidden="true" className="size-4" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-900">{t("notifications.notifications", locale)}</span>
          <span className="block truncate text-xs leading-5 text-slate-500">{notificationStatusLabel}</span>
        </span>
        <ChevronDown aria-hidden="true" className={`size-4 text-slate-400 transition ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {isExpanded ? (
        <div className="space-y-3 border-t border-slate-100 px-3 pb-3 pt-2">
          <div className="rounded-2xl bg-slate-50 px-3 py-3">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-slate-900">{t("notifications.settings", locale)}</p>
                <p className="text-xs leading-4 text-slate-500">{enableCopy}</p>
              </div>
              <Button
                className="h-9 px-3 text-xs"
                disabled={!canUseNotifications || browserStatus === "denied" || isBrowserPending}
                onClick={handleEnableNotifications}
                type="button"
              >
                {browserStatus === "granted" ? t("notifications.enabledShort", locale) : t("notifications.enableNotifications", locale)}
              </Button>
              {browserMessage ? <p className="text-xs leading-4 text-sky-700">{browserMessage}</p> : null}
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
      ) : null}
    </div>
  );
}
