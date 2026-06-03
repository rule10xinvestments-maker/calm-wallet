import { ProtectedShell } from "@/components/layout/protected-shell";
import { signOutAction } from "@/lib/auth/actions";
import { getAccountHint } from "@/lib/auth/account-hint";
import { requireAuthenticatedSession } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const auth = await requireAuthenticatedSession();
  const accountHint = getAccountHint(auth.user);

  return (
    <ProtectedShell accountHint={accountHint} onSignOut={signOutAction}>
      {children}
    </ProtectedShell>
  );
}
