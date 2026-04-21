import { BottomNav } from "@/components/layout/bottom-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { signOutAction } from "@/lib/auth/actions";

type ProtectedShellProps = {
  children: React.ReactNode;
  onSignOut: typeof signOutAction;
};

export function ProtectedShell({ children, onSignOut }: ProtectedShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-sky-700">Calm Ledger</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Your money, one clear view.</h1>
        </div>
        <SignOutButton action={onSignOut} />
      </div>
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
