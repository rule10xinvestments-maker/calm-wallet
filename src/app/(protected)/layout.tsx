import { ProtectedShell } from "@/components/layout/protected-shell";
import { signOutAction } from "@/lib/auth/actions";
import { registerPushSubscriptionAction, updateNotificationPreferencesAction } from "@/lib/actions/notifications";
import { getAccountHint } from "@/lib/auth/account-hint";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseNotificationService } from "@/domain/notifications/service";
import {
  getFallbackNotificationPreferences,
  logProtectedRouteLoadFailure,
} from "@/lib/server/protected-route-fallbacks";
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

  try {
    const notificationService = await createSupabaseNotificationService();
    notificationPreferences = await notificationService.getNotificationPreferences(user.id);
  } catch (error) {
    logProtectedRouteLoadFailure("assistant", error);
  }

  return (
    <ProtectedShell
      accountHint={accountHint}
      notificationPreferences={notificationPreferences}
      notificationPreferencesAction={updateNotificationPreferencesAction}
      registerPushSubscriptionAction={registerPushSubscriptionAction}
      onSignOut={signOutAction}
    >
      {children}
    </ProtectedShell>
  );
}
