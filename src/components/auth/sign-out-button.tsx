"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
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
    <SignOutConfirmation
      action={action}
      trigger={(openDialog) => (
        <button
          aria-label={label}
          className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-white hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={openDialog}
          title={label}
          type="button"
        >
          <LogOut aria-hidden="true" className="size-4" />
        </button>
      )}
    />
  );
}

export function SettingsSignOutRow({ action }: SignOutButtonProps) {
  const { locale } = useLocale();

  return (
    <SignOutConfirmation
      action={action}
      trigger={(openDialog) => (
        <button
          className="mt-2 grid w-full grid-cols-[2.25rem_1fr] items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-3 text-left text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
          data-testid="settings-sign-out-row"
          onClick={openDialog}
          type="button"
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600">
            <LogOut aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{t("settings.signOut", locale)}</span>
            <span className="mt-1 block text-xs leading-5 text-rose-600">{t("settings.signOutHelper", locale)}</span>
          </span>
        </button>
      )}
    />
  );
}

function SignOutConfirmation({
  action,
  trigger,
}: SignOutButtonProps & {
  trigger: (openDialog: () => void) => ReactNode;
}) {
  const { locale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      window.setTimeout(() => cancelRef.current?.focus(), 0);
    }
  }, [isOpen]);

  function closeDialog() {
    if (!isPending) {
      setIsOpen(false);
    }
  }

  function confirmSignOut() {
    if (isPending) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch {
        setError(t("settings.signOutConfirm.error", locale));
      }
    });
  }

  return (
    <>
      {trigger(() => setIsOpen(true))}
      {isOpen ? (
        <div
          aria-labelledby="sign-out-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-[160] flex items-end bg-slate-950/35 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:justify-center sm:pb-4"
          data-testid="sign-out-confirmation"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeDialog();
            }
          }}
          role="dialog"
        >
          <button
            aria-hidden="true"
            className="absolute inset-0 h-full w-full cursor-default"
            disabled={isPending}
            onClick={closeDialog}
            tabIndex={-1}
            type="button"
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900" id="sign-out-dialog-title">
                {t("settings.signOutConfirm.title", locale)}
              </h2>
              <p className="text-sm leading-6 text-slate-500">{t("settings.signOutConfirm.body", locale)}</p>
            </div>

            {error ? (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                disabled={isPending}
                onClick={closeDialog}
                ref={cancelRef}
                type="button"
              >
                {t("settings.signOutConfirm.cancel", locale)}
              </button>
              <button
                className="min-h-11 rounded-2xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                disabled={isPending}
                onClick={confirmSignOut}
                type="button"
              >
                {isPending ? t("settings.signOutConfirm.signingOut", locale) : t("settings.signOutConfirm.confirm", locale)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
