"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, MessageCircle } from "lucide-react";
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
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<(typeof supportCategoryKeys)[number]>("help");
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
      setSelectedCategory("help");
      setIsCategoryOpen(false);
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

            <div className="space-y-1.5">
              <input name="category" type="hidden" value={selectedCategory} />
              <span className="block text-xs font-medium text-slate-700" id="support-category-label">
                {t("settings.support.category", locale)}
              </span>
              <button
                aria-expanded={isCategoryOpen}
                aria-labelledby="support-category-label support-category-value"
                className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-900 outline-none transition hover:bg-white focus:border-sky-300 focus:bg-white"
                onClick={() => setIsCategoryOpen((value) => !value)}
                type="button"
              >
                <span className="min-w-0 truncate" id="support-category-value">
                  {t(`settings.support.categories.${selectedCategory}`, locale)}
                </span>
                <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-slate-400 transition ${isCategoryOpen ? "rotate-180" : ""}`} />
              </button>
              {isCategoryOpen ? (
                <div className="grid gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                  {supportCategoryKeys.map((category) => {
                    const isSelected = category === selectedCategory;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`flex min-h-9 items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                          isSelected ? "bg-sky-50 text-sky-800" : "text-slate-700 hover:bg-slate-50"
                        }`}
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setIsCategoryOpen(false);
                        }}
                        type="button"
                      >
                        <span>{t(`settings.support.categories.${category}`, locale)}</span>
                        {isSelected ? <Check aria-hidden="true" className="size-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

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
