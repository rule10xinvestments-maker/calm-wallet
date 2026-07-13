"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, BookOpen, Check, ChevronLeft, ChevronRight, Coins, FileText, Globe2, Info, Settings, ShieldCheck } from "lucide-react";
import { SettingsSignOutRow } from "@/components/auth/sign-out-button";
import { CreditOptionsSheet, getCreditSettingsSubtitle, type CreditAccountSummary } from "@/components/credits/credit-options-sheet";
import { useLocale } from "@/components/i18n/locale-provider";
import { LegalSettingsPage } from "@/components/legal/legal-settings-section";
import { NotificationPreferencesCard } from "@/components/notifications/notification-preferences-card";
import { LanguageSelector } from "@/components/settings/language-selector";
import { HelpCenterCard } from "@/components/support/help-center-card";
import { SupportContactCard } from "@/components/support/support-contact-card";
import { currentLegalVersions } from "@/domain/legal/config";
import { t } from "@/lib/i18n";
import type { NotificationPreferences } from "@/domain/notifications/types";
import type { NotificationPreferencesActionState } from "@/lib/actions/notifications-state";
import type { UserPreferencesActionState } from "@/lib/actions/preferences-state";
import type { SupportTicketActionState } from "@/lib/actions/support-state";
import type { signOutAction } from "@/lib/auth/actions";

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
  signOut: typeof signOutAction;
  creditAccount?: CreditAccountSummary | null;
  isSupportAdmin?: boolean;
};

type SettingsPage = "main" | "language" | "notifications" | "support" | "legal" | "about";

type SettingsRowProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
};

function SettingsRow({ icon, title, subtitle, onClick }: SettingsRowProps) {
  return (
    <button
      className="grid w-full grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:bg-slate-50"
      onClick={onClick}
      type="button"
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900">{title}</span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-slate-500">{subtitle}</span>
      </span>
      <ChevronRight aria-hidden="true" className="size-4 text-slate-400" />
    </button>
  );
}

function SettingsSubpageHeader({ locale, title, onBack }: { locale: string; title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        aria-label={t("settings.back", locale)}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100"
        onClick={onBack}
        type="button"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </button>
      <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{title}</p>
    </div>
  );
}

function SettingsSaveConfirmation({ message }: { message: string }) {
  return (
    <div
      aria-live="polite"
      className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs font-medium text-emerald-800"
      role="status"
    >
      <Check aria-hidden="true" className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function AboutSettingsPage() {
  const { locale } = useLocale();
  const legalVersions = Array.from(new Set(Object.values(currentLegalVersions))).join(", ");
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";

  return (
    <section className="space-y-2">
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("settings.about.appVersion", locale)}</p>
        <p className="mt-1 text-sm font-medium text-slate-900">{appVersion}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("settings.about.legalVersion", locale)}</p>
        <p className="mt-1 text-sm font-medium text-slate-900">{legalVersions}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("settings.about.supportContact", locale)}</p>
        <p className="mt-1 text-sm leading-5 text-slate-700">{t("settings.about.supportContactHelper", locale)}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("settings.about.acknowledgements", locale)}</p>
        <p className="mt-1 text-sm leading-5 text-slate-700">{t("settings.about.acknowledgementsPlaceholder", locale)}</p>
      </div>
    </section>
  );
}

export function HeaderHelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { locale } = useLocale();

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label={t("settings.help.title", locale)}
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-white"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <BookOpen aria-hidden="true" className="size-4" />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[120] bg-slate-950/25 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]"
          data-testid="header-help-overlay"
        >
          <button aria-label={t("settings.help.closeOverlay", locale)} className="absolute inset-0 h-full w-full cursor-default" onClick={() => setIsOpen(false)} type="button" />
          <div className="relative z-10 mx-auto w-full max-w-md">
            <div
              aria-labelledby="header-help-title"
              className="ml-auto flex max-h-[calc(100dvh-6.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-80"
              data-testid="header-help-panel"
              role="dialog"
            >
              <HelpCenterCard onClose={() => setIsOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function HeaderSettingsButton({
  notificationPreferences,
  userPreferencesAction,
  notificationPreferencesAction,
  registerPushSubscriptionAction,
  supportTicketAction,
  signOut,
  creditAccount = null,
  isSupportAdmin = false,
}: HeaderSettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePage, setActivePage] = useState<SettingsPage>("main");
  const [isCreditOptionsOpen, setIsCreditOptionsOpen] = useState(false);
  const [reportOpenToken, setReportOpenToken] = useState(0);
  const [saveMessageKey, setSaveMessageKey] = useState<string | null>(null);
  const { locale } = useLocale();
  const notificationsEnabled =
    notificationPreferences.dailyReminderEnabled ||
    notificationPreferences.monthlyReviewEnabled ||
    notificationPreferences.recurringNotificationsEnabled ||
    notificationPreferences.limitAlertsEnabled;

  const showSavedMessage = useCallback((messageKey: string) => {
    setActivePage("main");
    setSaveMessageKey(messageKey);
  }, []);

  const handleLanguageSaved = useCallback(() => {
    showSavedMessage("settings.languageSaved");
  }, [showSavedMessage]);

  const handleNotificationsSaved = useCallback(() => {
    showSavedMessage("settings.notificationsSaved");
  }, [showSavedMessage]);

  useEffect(() => {
    const openReport = () => {
      setIsOpen(true);
      setActivePage("support");
      setReportOpenToken((value) => value + 1);
    };

    window.addEventListener("calm-wallet:open-report-problem", openReport);
    return () => window.removeEventListener("calm-wallet:open-report-problem", openReport);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setActivePage("main");
      setIsCreditOptionsOpen(false);
      setSaveMessageKey(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!saveMessageKey) {
      return;
    }

    const timeout = window.setTimeout(() => setSaveMessageKey(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [saveMessageKey]);

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
              {activePage === "main" ? (
                <>
                  {saveMessageKey ? <SettingsSaveConfirmation message={t(saveMessageKey, locale)} /> : null}
                  <SettingsRow
                    icon={<Globe2 aria-hidden="true" className="size-4" />}
                    onClick={() => setActivePage("language")}
                    subtitle={t("settings.languageHelper", locale)}
                    title={t("settings.language", locale)}
                  />
                  <SettingsRow
                    icon={<Bell aria-hidden="true" className="size-4" />}
                    onClick={() => setActivePage("notifications")}
                    subtitle={notificationsEnabled ? t("notifications.enabledShort", locale) : t("notifications.disabled", locale)}
                    title={t("notifications.notifications", locale)}
                  />
                  <SettingsRow
                    icon={<Coins aria-hidden="true" className="size-4" />}
                    onClick={() => setIsCreditOptionsOpen(true)}
                    subtitle={getCreditSettingsSubtitle(creditAccount, locale)}
                    title={t("settings.credits.title", locale)}
                  />
                  <SettingsRow
                    icon={<FileText aria-hidden="true" className="size-4" />}
                    onClick={() => {
                      setActivePage("support");
                      setReportOpenToken((value) => value + 1);
                    }}
                    subtitle={t("settings.support.helper", locale)}
                    title={t("settings.support.title", locale)}
                  />
                  <SettingsRow
                    icon={<FileText aria-hidden="true" className="size-4" />}
                    onClick={() => setActivePage("legal")}
                    subtitle={t("settings.legal.subtitle", locale)}
                    title={t("legal.settingsTitle", locale)}
                  />
                  <SettingsRow
                    icon={<Info aria-hidden="true" className="size-4" />}
                    onClick={() => setActivePage("about")}
                    subtitle={t("settings.about.subtitle", locale)}
                    title={t("settings.about.title", locale)}
                  />
                </>
              ) : null}
              {activePage === "language" ? (
                <>
                  <SettingsSubpageHeader locale={locale} title={t("settings.language", locale)} onBack={() => setActivePage("main")} />
                  <LanguageSelector action={userPreferencesAction} onSaved={handleLanguageSaved} variant="focused" />
                </>
              ) : null}
              {activePage === "notifications" ? (
                <>
                  <SettingsSubpageHeader locale={locale} title={t("notifications.notifications", locale)} onBack={() => setActivePage("main")} />
                  <NotificationPreferencesCard
                    action={notificationPreferencesAction}
                    onSaved={handleNotificationsSaved}
                    preferences={notificationPreferences}
                    registerPushSubscriptionAction={registerPushSubscriptionAction}
                    variant="focused"
                  />
                </>
              ) : null}
              {activePage === "support" ? (
                <>
                  <SettingsSubpageHeader locale={locale} title={t("settings.support.title", locale)} onBack={() => setActivePage("main")} />
                  <SupportContactCard action={supportTicketAction} openToken={reportOpenToken} />
                </>
              ) : null}
              {activePage === "legal" ? (
                <>
                  <SettingsSubpageHeader locale={locale} title={t("legal.settingsTitle", locale)} onBack={() => setActivePage("main")} />
                  <LegalSettingsPage />
                </>
              ) : null}
              {activePage === "about" ? (
                <>
                  <SettingsSubpageHeader locale={locale} title={t("settings.about.title", locale)} onBack={() => setActivePage("main")} />
                  <AboutSettingsPage />
                </>
              ) : null}
              {activePage === "main" && isSupportAdmin ? (
                <Link
                  className="grid w-full grid-cols-[2.25rem_1fr_auto] items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-3 py-3 text-left transition hover:bg-sky-100"
                  href="/admin/support"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700">
                    <ShieldCheck aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">Admin Support</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">Review and manage user reports.</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-sky-700">
                    Admin
                  </span>
                </Link>
              ) : null}
              {activePage === "main" ? <SettingsSignOutRow action={signOut} /> : null}
            </div>
          </div>
          <CreditOptionsSheet creditAccount={creditAccount} onClose={() => setIsCreditOptionsOpen(false)} open={isCreditOptionsOpen} />
        </div>
      ) : null}
    </div>
  );
}
