"use client";

import { LogOut } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";

type SignOutButtonProps = {
  action: () => Promise<void>;
};

export function SignOutButton({ action }: SignOutButtonProps) {
  const { locale } = useLocale();
  const label = t("settings.signOut", locale);

  return (
    <form action={action}>
      <button
        aria-label={label}
        className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-white hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        title={label}
        type="submit"
      >
        <LogOut aria-hidden="true" className="size-4" />
      </button>
    </form>
  );
}
