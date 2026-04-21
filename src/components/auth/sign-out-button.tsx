type SignOutButtonProps = {
  action: () => Promise<void>;
};

export function SignOutButton({ action }: SignOutButtonProps) {
  return (
    <form action={action}>
      <button
        className="min-h-10 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white"
        type="submit"
      >
        Sign out
      </button>
    </form>
  );
}
