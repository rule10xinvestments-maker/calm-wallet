import { ProtectedShell } from "@/components/layout/protected-shell";
import { LegalAcceptanceScreen } from "@/components/legal/legal-acceptance-screen";
import { acceptLegalDocumentsAction } from "@/lib/actions/legal";
import { signOutAction } from "@/lib/auth/actions";
import {
  registerPushSubscriptionAction,
  sendTestPushNotificationAction,
  updateNotificationPreferencesAction,
} from "@/lib/actions/notifications";
import { updateUserPreferencesAction, updateUserTimezoneAction } from "@/lib/actions/preferences";
import { createSupportTicketAction } from "@/lib/actions/support";
import { getAccountHint } from "@/lib/auth/account-hint";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseNotificationService } from "@/domain/notifications/service";
import { createSupabaseUserPreferencesService } from "@/domain/preferences/service";
import { createSupabaseLegalAcceptanceService, hasAcceptedCurrentLegalDocuments } from "@/domain/legal/service";
import { createSupabaseSupportService } from "@/domain/support/service";
import { createSupabaseCreditsService } from "@/domain/credits/service";
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
  let timezone: string | null = null;
  let isSupportAdmin = false;
  let legalAccepted = false;
  let creditAccount: Awaited<ReturnType<Awaited<ReturnType<typeof createSupabaseCreditsService>>["getAccount"]>> | null = null;

  try {
    const [notificationService, preferencesService, legalService] = await Promise.all([
      createSupabaseNotificationService(),
      createSupabaseUserPreferencesService(),
      createSupabaseLegalAcceptanceService(),
    ]);
    const [loadedNotificationPreferences, loadedUserPreferences, loadedLegalAcceptance] = await Promise.all([
      notificationService.getNotificationPreferences(user.id),
      preferencesService.getUserPreferences(user.id),
      legalService.getLegalAcceptance(user.id),
    ]);

    notificationPreferences = loadedNotificationPreferences;
    uiLocale = loadedUserPreferences.uiLocale;
    timezone = loadedUserPreferences.timezone;
    legalAccepted = hasAcceptedCurrentLegalDocuments(loadedLegalAcceptance);

    try {
      const creditsService = await createSupabaseCreditsService();
      creditAccount = await creditsService.getAccount(user.id);
    } catch (error) {
      logProtectedRouteLoadFailure("assistant", error);
      creditAccount = null;
    }
  } catch (error) {
    logProtectedRouteLoadFailure("assistant", error);
  }

  if (!legalAccepted) {
    return <LegalAcceptanceScreen action={acceptLegalDocumentsAction} savedLocale={uiLocale} />;
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
      creditAccount={creditAccount}
      uiLocale={uiLocale}
      timezone={timezone}
      userPreferencesAction={updateUserPreferencesAction}
      updateTimezoneAction={updateUserTimezoneAction}
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
