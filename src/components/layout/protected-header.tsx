"use client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { useLocale } from "@/components/i18n/locale-provider";
import { HeaderSettingsButton } from "@/components/layout/header-settings-button";
import { PwaInstallHeaderIcon } from "@/components/pwa-install-button";
import Link from "next/link";
import type { NotificationPreferences } from "@/domain/notifications/types";
import type { NotificationPreferencesActionState } from "@/lib/actions/notifications-state";
import type { UserPreferencesActionState } from "@/lib/actions/preferences-state";
import type { SupportTicketActionState } from "@/lib/actions/support-state";
import type { signOutAction } from "@/lib/auth/actions";
import { t } from "@/lib/i18n";

type ProtectedHeaderProps = {
  accountHint: string;
  onSignOut: typeof signOutAction;
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

export function ProtectedHeader({
  accountHint,
  onSignOut,
  notificationPreferences,
  userPreferencesAction,
  notificationPreferencesAction,
  registerPushSubscriptionAction,
  sendTestPushNotificationAction,
  supportTicketAction,
  isSupportAdmin = false,
}: ProtectedHeaderProps) {
  const { locale } = useLocale();

  return (
    <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6 sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-sky-700 sm:text-sm">{t("assistant.brand", locale)}</p>
        <h1 className="mt-1 text-[1.05rem] font-semibold leading-6 tracking-tight text-slate-900 sm:mt-2 sm:text-2xl sm:leading-tight">
          {t("assistant.heroTitle", locale)}
        </h1>
        <p className="mt-1 break-words text-xs leading-4 text-slate-500 sm:mt-2 sm:leading-5">
          {t("assistant.signedInAs", locale)} {accountHint}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isSupportAdmin ? (
          <Link
            className="hidden min-h-10 items-center rounded-full border border-sky-100 bg-sky-50 px-3 text-xs font-semibold text-sky-700 sm:inline-flex"
            href="/admin/support"
          >
            Admin Support
          </Link>
        ) : null}
        <PwaInstallHeaderIcon />
        <HeaderSettingsButton
          notificationPreferences={notificationPreferences}
          userPreferencesAction={userPreferencesAction}
          notificationPreferencesAction={notificationPreferencesAction}
          registerPushSubscriptionAction={registerPushSubscriptionAction}
          sendTestPushNotificationAction={sendTestPushNotificationAction}
          supportTicketAction={supportTicketAction}
          isSupportAdmin={isSupportAdmin}
        />
        <SignOutButton action={onSignOut} />
      </div>
    </div>
  );
}
