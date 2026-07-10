import { ProtectedShell } from "@/components/layout/protected-shell";
import { signOutAction } from "@/lib/auth/actions";
import {
  registerPushSubscriptionAction,
  sendTestPushNotificationAction,
  updateNotificationPreferencesAction,
} from "@/lib/actions/notifications";
import { updateUserPreferencesAction } from "@/lib/actions/preferences";
import { createSupportTicketAction } from "@/lib/actions/support";
import { getAccountHint } from "@/lib/auth/account-hint";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseNotificationService } from "@/domain/notifications/service";
import { createSupabaseUserPreferencesService } from "@/domain/preferences/service";
import { createSupabaseSupportService } from "@/domain/support/service";
import {
  getFallbackNotificationPreferences,
  logProtectedRouteLoadFailure,
} from "@/lib/server/protected-route-fallbacks";
import type { SupportedLocale } from "@/lib/i18n";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    redirect("/sign-in");
  }

  const accountHint = getAccountHint(user);
  let notificationPreferences = getFallbackNotificationPreferences(user.id);
  let uiLocale: SupportedLocale | null = null;
  let isSupportAdmin = false;

  try {
    const [notificationService, preferencesService] = await Promise.all([
      createSupabaseNotificationService(),
      createSupabaseUserPreferencesService(),
    ]);
    const [loadedNotificationPreferences, loadedUserPreferences] = await Promise.all([
      notificationService.getNotificationPreferences(user.id),
      preferencesService.getUserPreferences(user.id),
    ]);

    notificationPreferences = loadedNotificationPreferences;
    uiLocale = loadedUserPreferences.uiLocale;
  } catch (error) {
    logProtectedRouteLoadFailure("assistant", error);
  }

  try {
    const supportService = await createSupabaseSupportService();
    isSupportAdmin = await supportService.isAdmin(user.id);
  } catch (error) {
    logProtectedRouteLoadFailure("assistant", error);
    isSupportAdmin = false;
  }

  return (
    <ProtectedShell
      accountHint={accountHint}
      notificationPreferences={notificationPreferences}
      uiLocale={uiLocale}
      userPreferencesAction={updateUserPreferencesAction}
      notificationPreferencesAction={updateNotificationPreferencesAction}
      registerPushSubscriptionAction={registerPushSubscriptionAction}
      sendTestPushNotificationAction={sendTestPushNotificationAction}
      supportTicketAction={createSupportTicketAction}
      isSupportAdmin={isSupportAdmin}
      onSignOut={signOutAction}
    >
      {children}
    </ProtectedShell>
  );
}
