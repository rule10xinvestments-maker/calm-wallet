"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { initialSupportTicketActionState, type SupportTicketActionState } from "@/lib/actions/support-state";
import { t } from "@/lib/i18n";

type SupportContactCardProps = {
  action: (state: SupportTicketActionState, formData: FormData) => Promise<SupportTicketActionState>;
};

const supportCategoryKeys = ["help", "bug", "feedback", "account", "other"] as const;

export function SupportContactCard({ action }: SupportContactCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(action, initialSupportTicketActionState);
  const [userAgent, setUserAgent] = useState("");
  const pathname = usePathname();
  const { locale } = useLocale();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setUserAgent(navigator.userAgent);
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-slate-50"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <MessageCircle aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-900">{t("settings.support.title", locale)}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{t("settings.support.helper", locale)}</span>
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-slate-100 px-3 py-3">
          {state.status === "success" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
              <p className="font-semibold">{t("settings.support.successTitle", locale)}</p>
              <p className="mt-1 leading-5">{t("settings.support.successBody", locale)}</p>
            </div>
          ) : null}

          <form ref={formRef} action={formAction} className="mt-3 space-y-3">
            <input name="locale" type="hidden" value={locale} />
            <input name="sourceRoute" type="hidden" value={pathname ?? ""} />
            <input name="userAgent" type="hidden" value={userAgent} />

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">{t("settings.support.category", locale)}</span>
              <select
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                name="category"
              >
                {supportCategoryKeys.map((category) => (
                  <option key={category} value={category}>
                    {t(`settings.support.categories.${category}`, locale)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">{t("settings.support.subject", locale)}</span>
              <input
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
                maxLength={120}
                name="subject"
                placeholder={t("settings.support.subjectPlaceholder", locale)}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">{t("settings.support.message", locale)}</span>
              <textarea
                className="min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
                maxLength={2000}
                name="message"
                placeholder={t("settings.support.messagePlaceholder", locale)}
                required
              />
            </label>

            {state.status === "error" && state.message ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {translateSupportActionMessage(state.message, locale)}
              </p>
            ) : null}

            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? t("settings.support.sending", locale) : t("settings.support.send", locale)}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function translateSupportActionMessage(message: string, locale: string) {
  const keys: Record<string, string> = {
    "Support message could not be sent. Please try again.": "settings.support.errors.generic",
    "Please wait a moment before sending another message.": "settings.support.errors.rateLimited",
    "Sign in is required.": "settings.support.errors.signInRequired",
  };
  const key = keys[message];
  return key ? t(key, locale as never) : t("settings.support.errors.generic", locale as never);
}
