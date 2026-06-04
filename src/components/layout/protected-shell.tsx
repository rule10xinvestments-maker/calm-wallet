import { BottomNav } from "@/components/layout/bottom-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PwaInstallHeaderIcon } from "@/components/pwa-install-button";
import type { signOutAction } from "@/lib/auth/actions";

type ProtectedShellProps = {
  children: React.ReactNode;
  accountHint: string;
  onSignOut: typeof signOutAction;
};

export function ProtectedShell({ children, accountHint, onSignOut }: ProtectedShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-sky-700">Calm Wallet</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Your money. One clear view.</h1>
          <p className="mt-2 text-xs leading-5 text-slate-500">Signed in as {accountHint}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PwaInstallHeaderIcon />
          <SignOutButton action={onSignOut} />
        </div>
      </div>
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
