"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, ShieldCheck } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { NotificationPreferencesCard } from "@/components/notifications/notification-preferences-card";
import { LanguageSelector } from "@/components/settings/language-selector";
import { SupportContactCard } from "@/components/support/support-contact-card";
import { t } from "@/lib/i18n";
import type { NotificationPreferences } from "@/domain/notifications/types";
import type { NotificationPreferencesActionState } from "@/lib/actions/notifications-state";
import type { UserPreferencesActionState } from "@/lib/actions/preferences-state";
import type { SupportTicketActionState } from "@/lib/actions/support-state";

type HeaderSettingsButtonProps = {
  notificationPreferences: NotificationPreferences;
  userPreferencesAction: (
    state: UserPreferencesActionState,
    formData: FormData,
  ) => Promise<UserPreferencesActionState>;
  notificationPreferencesAction: (
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
  supportTicketAction: (
    state: SupportTicketActionState,
    formData: FormData,
  ) => Promise<SupportTicketActionState>;
  isSupportAdmin?: boolean;
};

export function HeaderSettingsButton({
  notificationPreferences,
  userPreferencesAction,
  notificationPreferencesAction,
  registerPushSubscriptionAction,
  supportTicketAction,
  isSupportAdmin = false,
}: HeaderSettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { locale } = useLocale();

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label={t("settings.title", locale)}
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-white"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <Settings aria-hidden="true" className="size-4" />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[120] bg-slate-950/25 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]"
          data-testid="header-settings-overlay"
        >
          <button aria-label={t("settings.closeOverlay", locale)} className="absolute inset-0 h-full w-full cursor-default" onClick={() => setIsOpen(false)} type="button" />
          <div className="relative z-10 mx-auto w-full max-w-md">
            <div
              className="ml-auto max-h-[calc(100dvh-6.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:w-80"
              data-testid="header-settings-panel"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900">{t("settings.title", locale)}</p>
                </div>
                <button
                  className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  {t("common.close", locale)}
                </button>
              </div>
              <LanguageSelector action={userPreferencesAction} />
              {isSupportAdmin ? (
                <Link
                  className="grid w-full grid-cols-[2.25rem_1fr_auto] items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-3 py-3 text-left transition hover:bg-sky-100"
                  href="/admin/support"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700">
                    <ShieldCheck aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">{t("admin.support.nav", locale)}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">{t("admin.support.helper", locale)}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-sky-700">
                    {t("admin.support.eyebrow", locale)}
                  </span>
                </Link>
              ) : null}
              <SupportContactCard action={supportTicketAction} />
              <NotificationPreferencesCard
                action={notificationPreferencesAction}
                preferences={notificationPreferences}
                registerPushSubscriptionAction={registerPushSubscriptionAction}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
