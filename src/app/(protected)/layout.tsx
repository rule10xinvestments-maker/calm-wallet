import { ProtectedShell } from "@/components/layout/protected-shell";
import { signOutAction } from "@/lib/auth/actions";
import { requireAuthenticatedSession } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  await requireAuthenticatedSession();

  return <ProtectedShell onSignOut={signOutAction}>{children}</ProtectedShell>;
}
