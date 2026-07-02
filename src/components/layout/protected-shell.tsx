import { BottomNav } from "@/components/layout/bottom-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { HeaderSettingsButton } from "@/components/layout/header-settings-button";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { PwaInstallHeaderIcon } from "@/components/pwa-install-button";
import type { signOutAction } from "@/lib/auth/actions";
import type { NotificationPreferences } from "@/domain/notifications/types";
import type { NotificationPreferencesActionState } from "@/lib/actions/notifications-state";
import type { UserPreferencesActionState } from "@/lib/actions/preferences-state";
import type { SupportedLocale } from "@/lib/i18n";

type ProtectedShellProps = {
  children: React.ReactNode;
  accountHint: string;
  onSignOut: typeof signOutAction;
  notificationPreferences: NotificationPreferences;
  uiLocale: SupportedLocale | null;
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
};

export function ProtectedShell({
  children,
  accountHint,
  onSignOut,
  notificationPreferences,
  uiLocale,
  userPreferencesAction,
  notificationPreferencesAction,
  registerPushSubscriptionAction,
  sendTestPushNotificationAction,
}: ProtectedShellProps) {
  return (
    <LocaleProvider savedLocale={uiLocale}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-4 sm:pt-6">
        <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6 sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-sky-700 sm:text-sm">Calm Wallet</p>
            <h1 className="mt-1 text-[1.05rem] font-semibold leading-6 tracking-tight text-slate-900 sm:mt-2 sm:text-2xl sm:leading-tight">
              Your money. One clear view.
            </h1>
            <p className="mt-1 break-words text-xs leading-4 text-slate-500 sm:mt-2 sm:leading-5">Signed in as {accountHint}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PwaInstallHeaderIcon />
            <HeaderSettingsButton
              notificationPreferences={notificationPreferences}
              userPreferencesAction={userPreferencesAction}
              notificationPreferencesAction={notificationPreferencesAction}
              registerPushSubscriptionAction={registerPushSubscriptionAction}
              sendTestPushNotificationAction={sendTestPushNotificationAction}
            />
            <SignOutButton action={onSignOut} />
          </div>
        </div>
        <main className="flex-1">{children}</main>
        <BottomNav />
      </div>
    </LocaleProvider>
  );
}
