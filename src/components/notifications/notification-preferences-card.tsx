"use client";

import { Bell, BellOff, ChevronDown } from "lucide-react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import type { NotificationPreferences } from "@/domain/notifications/types";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  initialNotificationPreferencesActionState,
  type NotificationPreferencesActionState,
  type NotificationPreferencesMessageKey,
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
type NotificationMessageKey =
  | NotificationPreferencesMessageKey
  | "notifications.notReady"
  | "notifications.permissionNeeded"
  | "notifications.permissionRequired"
  | "notifications.ready"
  | "notifications.testReadyScheduledNotReady"
  | "notifications.unsupported"
  | "notifications.updateError";

function getActionMessageKey(state: NotificationPreferencesActionState): NotificationMessageKey | null {
  return state.messageKey ?? null;
}

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
  checked,
  description,
  disabled,
  name,
  onCheckedChange,
  title,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  name: string;
  onCheckedChange: (checked: boolean) => void;
  title: string;
}) {
  return (
    <label className={`flex items-start gap-3 rounded-2xl px-3 py-2.5 transition ${disabled ? "bg-slate-50/60 opacity-60" : "bg-slate-50"}`}>
      <input
        aria-label={title}
        checked={checked}
        className="mt-1"
        disabled={disabled}
        name={name}
        onChange={(event) => onCheckedChange(event.target.checked)}
        type="checkbox"
      />
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
  const [localPreferences, setLocalPreferences] = useState(current);
  const [browserStatus, setBrowserStatus] = useState<BrowserNotificationStatus>(() => getBrowserNotificationStatus());
  const [browserMessageKey, setBrowserMessageKey] = useState<NotificationMessageKey | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBrowserPending, startBrowserTransition] = useTransition();
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const canUseNotifications = browserStatus !== "unsupported";
  const scheduledPushReady = Boolean(vapidPublicKey);
  const notificationsEnabled =
    localPreferences.dailyReminderEnabled ||
    localPreferences.monthlyReviewEnabled ||
    localPreferences.recurringNotificationsEnabled ||
    localPreferences.limitAlertsEnabled;

  useEffect(() => {
    setLocalPreferences(current);
  }, [current]);

  const permissionCopy = useMemo(() => {
    if (browserStatus === "unsupported") {
      return t("notifications.unsupported", locale);
    }

    if (browserStatus === "denied") {
      return t("notifications.permissionRequired", locale);
    }

    if (browserStatus === "granted") {
      return scheduledPushReady ? t("notifications.enabled", locale) : t("notifications.testEnabledScheduledNotReady", locale);
    }

    return t("notifications.permissionNeeded", locale);
  }, [browserStatus, locale, scheduledPushReady]);

  const notificationStatusLabel = notificationsEnabled ? t("notifications.enabledShort", locale) : t("notifications.disabled", locale);
  const notificationStateCopy = notificationsEnabled ? t("notifications.enabled", locale) : t("notifications.disabledHelper", locale);
  const browserMessage = browserMessageKey ? t(browserMessageKey, locale) : null;
  const actionMessageKey = getActionMessageKey(state);
  const actionMessage = actionMessageKey ? t(actionMessageKey, locale) : null;

  function updateLocalPreference(name: keyof Pick<NotificationPreferences, "dailyReminderEnabled" | "monthlyReviewEnabled" | "recurringNotificationsEnabled" | "limitAlertsEnabled">, checked: boolean) {
    setLocalPreferences((value) => ({
      ...value,
      [name]: checked,
    }));
  }

  function toggleNotificationsEnabled() {
    setLocalPreferences((value) => {
      const isEnabled =
        value.dailyReminderEnabled ||
        value.monthlyReviewEnabled ||
        value.recurringNotificationsEnabled ||
        value.limitAlertsEnabled;

      return {
        ...value,
        dailyReminderEnabled: !isEnabled,
        monthlyReviewEnabled: !isEnabled,
        recurringNotificationsEnabled: !isEnabled,
        limitAlertsEnabled: !isEnabled,
      };
    });
  }

  async function registerSubscriptionIfPossible() {
    if (!vapidPublicKey) {
      setBrowserMessageKey("notifications.testReadyScheduledNotReady");
      return false;
    }

    try {
      const registration = await getReadyServiceWorkerRegistration();

      if (!registration || !("pushManager" in registration)) {
        setBrowserMessageKey("notifications.notReady");
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
      setBrowserMessageKey(result.status === "success" ? "notifications.ready" : "notifications.notReady");
      return result.status === "success";
    } catch {
      setBrowserMessageKey("notifications.notReady");
      return false;
    }
  }

  function handleEnableNotifications() {
    startBrowserTransition(async () => {
      setBrowserMessageKey(null);

      if (!("Notification" in window)) {
        setBrowserStatus("unsupported");
        setBrowserMessageKey("notifications.unsupported");
        return;
      }

      const permission = await Notification.requestPermission();
      setBrowserStatus(permission);

      if (permission === "denied") {
        setBrowserMessageKey("notifications.permissionRequired");
        return;
      }

      if (permission !== "granted") {
        setBrowserMessageKey("notifications.permissionNeeded");
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
          {!notificationsEnabled || browserStatus === "denied" || browserStatus === "unsupported" ? (
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{t("notifications.settings", locale)}</p>
                  <p className="mt-1 text-xs leading-4 text-slate-500">{notificationStateCopy}</p>
                </div>
                <button
                  aria-pressed={notificationsEnabled}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    notificationsEnabled ? "bg-sky-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                  onClick={toggleNotificationsEnabled}
                  type="button"
                >
                  {notificationStatusLabel}
                </button>
              </div>
              <p className="text-xs leading-4 text-slate-500">{t("notifications.calmHelper", locale)}</p>
              {browserStatus !== "granted" ? (
                <div className="space-y-2">
                  <p className="text-xs leading-4 text-slate-500">{permissionCopy}</p>
                  {browserStatus === "denied" ? (
                    <p className="text-xs leading-4 text-slate-500">{t("notifications.openBrowserSettings", locale)}</p>
                  ) : null}
                  <Button
                    className="h-9 px-3 text-xs"
                    disabled={!canUseNotifications || browserStatus === "denied" || isBrowserPending}
                    onClick={handleEnableNotifications}
                    type="button"
                  >
                    {t("notifications.enableNotifications", locale)}
                  </Button>
                </div>
              ) : null}
              {browserMessage ? <p className="text-xs leading-4 text-sky-700">{browserMessage}</p> : null}
            </div>
          </div>

          <form action={formAction} className="space-y-2.5">
            {actionMessage ? (
              <p className={`text-sm ${state.status === "error" ? "text-rose-600" : "text-sky-700"}`}>{actionMessage}</p>
            ) : null}
            <ToggleCard
              checked={localPreferences.dailyReminderEnabled}
              description={t("notifications.dailyReminderHelper", locale)}
              disabled={!notificationsEnabled}
              name="dailyReminderEnabled"
              onCheckedChange={(checked) => updateLocalPreference("dailyReminderEnabled", checked)}
              title={t("notifications.dailyReminder", locale)}
            />
            <ToggleCard
              checked={localPreferences.monthlyReviewEnabled}
              description={t("notifications.monthlyReportHelper", locale)}
              disabled={!notificationsEnabled}
              name="monthlyReviewEnabled"
              onCheckedChange={(checked) => updateLocalPreference("monthlyReviewEnabled", checked)}
              title={t("notifications.monthlyReport", locale)}
            />
            <ToggleCard
              checked={localPreferences.recurringNotificationsEnabled}
              description={t("notifications.recurringEntriesHelper", locale)}
              disabled={!notificationsEnabled}
              name="recurringNotificationsEnabled"
              onCheckedChange={(checked) => updateLocalPreference("recurringNotificationsEnabled", checked)}
              title={t("notifications.recurringEntries", locale)}
            />
            <ToggleCard
              checked={localPreferences.limitAlertsEnabled}
              description={t("notifications.limitAlertsHelper", locale)}
              disabled={!notificationsEnabled}
              name="limitAlertsEnabled"
              onCheckedChange={(checked) => updateLocalPreference("limitAlertsEnabled", checked)}
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
