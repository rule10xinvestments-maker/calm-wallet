import { BottomNav } from "@/components/layout/bottom-nav";
import { ProtectedHeader } from "@/components/layout/protected-header";
import { AuthenticatedActivityMarker } from "@/components/layout/authenticated-activity-marker";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { DeviceTimezoneSync } from "@/components/notifications/device-timezone-sync";
import type { CreditAccountSummary } from "@/components/credits/credit-options-sheet";
import type { signOutAction } from "@/lib/auth/actions";
import type { NotificationPreferences } from "@/domain/notifications/types";
import type { NotificationPreferencesActionState } from "@/lib/actions/notifications-state";
import type { UserPreferencesActionState } from "@/lib/actions/preferences-state";
import type { SupportTicketActionState } from "@/lib/actions/support-state";
import type { SupportedLocale } from "@/lib/i18n";

type ProtectedShellProps = {
  children: React.ReactNode;
  accountHint: string;
  onSignOut: typeof signOutAction;
  notificationPreferences: NotificationPreferences;
  creditAccount?: CreditAccountSummary | null;
  uiLocale: SupportedLocale | null;
  timezone: string | null;
  userPreferencesAction: (
    state: UserPreferencesActionState,
    formData: FormData,
  ) => Promise<UserPreferencesActionState>;
  updateTimezoneAction: (timezone: string) => Promise<void>;
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
  activityMarkerAction?: () => Promise<void>;
  isSupportAdmin?: boolean;
};

export function ProtectedShell({
  children,
  accountHint,
  onSignOut,
  notificationPreferences,
  creditAccount = null,
  uiLocale,
  timezone,
  userPreferencesAction,
  updateTimezoneAction,
  notificationPreferencesAction,
  registerPushSubscriptionAction,
  sendTestPushNotificationAction,
  supportTicketAction,
  activityMarkerAction,
  isSupportAdmin = false,
}: ProtectedShellProps) {
  return (
    <LocaleProvider savedLocale={uiLocale}>
      {activityMarkerAction ? <AuthenticatedActivityMarker action={activityMarkerAction} /> : null}
      <DeviceTimezoneSync savedTimezone={timezone} updateTimezoneAction={updateTimezoneAction} />
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-4 sm:pt-6">
        <ProtectedHeader
          accountHint={accountHint}
          notificationPreferences={notificationPreferences}
          creditAccount={creditAccount}
          userPreferencesAction={userPreferencesAction}
          notificationPreferencesAction={notificationPreferencesAction}
          registerPushSubscriptionAction={registerPushSubscriptionAction}
          sendTestPushNotificationAction={sendTestPushNotificationAction}
          supportTicketAction={supportTicketAction}
          isSupportAdmin={isSupportAdmin}
          onSignOut={onSignOut}
        />
        <main className="flex-1">{children}</main>
        <BottomNav />
      </div>
    </LocaleProvider>
  );
}
