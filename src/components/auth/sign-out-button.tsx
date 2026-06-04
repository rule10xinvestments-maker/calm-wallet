import { LogOut } from "lucide-react";

type SignOutButtonProps = {
  action: () => Promise<void>;
};

export function SignOutButton({ action }: SignOutButtonProps) {
  return (
    <form action={action}>
      <button
        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white"
        type="submit"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Sign out
      </button>
    </form>
  );
}
