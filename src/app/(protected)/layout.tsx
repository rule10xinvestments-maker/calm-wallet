import { ProtectedShell } from "@/components/layout/protected-shell";
import { signOutAction } from "@/lib/auth/actions";
import { requireAuthenticatedSession } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const auth = await requireAuthenticatedSession();
  const accountHint = auth.user?.email ?? `account ${auth.user?.id.slice(0, 8) ?? "unknown"}`;

  return (
    <ProtectedShell accountHint={accountHint} onSignOut={signOutAction}>
      {children}
    </ProtectedShell>
  );
}
