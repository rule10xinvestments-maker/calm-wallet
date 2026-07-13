"use client";

import { useLayoutEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Coins, Gift, Sprout, Wallet, type LucideIcon } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  areCreditPacksEnabled,
  areRewardedCreditsEnabled,
  CREDIT_PACKS,
  getCreditPackSavingsMeta,
  isYearlyUnlimitedEnabled,
} from "@/lib/credits/config";
import { t } from "@/lib/i18n";

export type CreditAccountSummary = {
  creditBalance: number;
  recurringGraceDebt: number;
  unlimitedUntil: string | null;
  lowBalanceNotice10ShownAt: string | null;
  lowBalanceNotice3ShownAt: string | null;
};

type CreditOptionsSheetProps = {
  creditAccount?: CreditAccountSummary | null;
  creditBalance?: number | null;
  open: boolean;
  mode?: "default" | "insufficient";
  onClose: () => void;
};

type CreditOption = {
  id: string;
  Icon: LucideIcon;
  title: string;
  price: string | null;
  helper: string | null;
  secondary: string | null;
  badge: string | null;
  enabled: boolean;
};

function BodyPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

function getCreditBalanceDisplay(creditBalance: number | null, locale: string) {
  const count = creditBalance ?? 0;
  return t(count === 1 ? "credits.balance.one" : "credits.balance.many", locale, { count });
}

function isUnlimitedActive(unlimitedUntil: string | null | undefined) {
  if (!unlimitedUntil) {
    return false;
  }

  const expiresAt = new Date(unlimitedUntil);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > Date.now();
}

export function getCreditSettingsSubtitle(creditAccount: CreditAccountSummary | null | undefined, locale: string) {
  if (isUnlimitedActive(creditAccount?.unlimitedUntil)) {
    return t("settings.credits.unlimitedActive", locale);
  }

  return getCreditBalanceDisplay(creditAccount?.creditBalance ?? null, locale);
}

export function CreditOptionsSheet({
  creditAccount = null,
  creditBalance = null,
  mode = "default",
  open,
  onClose,
}: CreditOptionsSheetProps) {
  const { locale } = useLocale();
  const effectiveBalance = creditBalance ?? creditAccount?.creditBalance ?? null;
  const currentCreditBalanceDisplay = getCreditBalanceDisplay(effectiveBalance, locale);
  const launchPricingLines = useMemo(() => {
    const helper = t("credits.options.launchPricing.helper", locale);
    const [firstSentence, ...remainingSentences] = helper.split(". ");

    if (!remainingSentences.length) {
      return [helper];
    }

    return [firstSentence.endsWith(".") ? firstSentence : `${firstSentence}.`, remainingSentences.join(". ")];
  }, [locale]);
  const rewardedCreditsEnabled = areRewardedCreditsEnabled();
  const creditPacksEnabled = areCreditPacksEnabled();
  const yearlyUnlimitedEnabled = isYearlyUnlimitedEnabled();
  const providerActionsImplemented = false;
  const creditPackSavingsMeta = getCreditPackSavingsMeta(CREDIT_PACKS);

  useLayoutEffect(() => {
    if (!open || typeof window === "undefined") {
      return;
    }

    const scrollY = window.scrollY;
    const { body, documentElement } = document;
    const previousBodyStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    const previousDocumentOverscroll = documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    documentElement.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousBodyStyles.overflow;
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.width = previousBodyStyles.width;
      documentElement.style.overscrollBehavior = previousDocumentOverscroll;
      if (scrollY > 0) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const sections: Array<{ id: string; label: string; options: CreditOption[] }> = [
    {
      id: "earn",
      label: t("credits.options.sections.earn", locale),
      options: [
        {
          id: "earn",
          Icon: Gift,
          title: t("credits.options.earn.title", locale),
          price: null,
          helper: t("credits.options.earn.helper", locale),
          secondary: null,
          badge: null,
          enabled: rewardedCreditsEnabled && providerActionsImplemented,
        },
      ],
    },
    {
      id: "buy",
      label: t("credits.options.sections.buy", locale),
      options: [
        {
          id: "small",
          Icon: Coins,
          title: t("credits.options.small.title", locale),
          price: t("credits.options.small.price", locale, { price: CREDIT_PACKS.small.priceUsd }),
          helper: null,
          secondary: t("credits.options.small.helper", locale),
          badge: null,
          enabled: creditPacksEnabled && providerActionsImplemented,
        },
        {
          id: "large",
          Icon: Coins,
          title: t("credits.options.large.title", locale),
          price: t("credits.options.large.price", locale, { price: CREDIT_PACKS.large.priceUsd }),
          helper: null,
          secondary: creditPackSavingsMeta.large?.savingsPercent
            ? t("credits.options.savings", locale, { percent: creditPackSavingsMeta.large.savingsPercent })
            : null,
          badge: creditPackSavingsMeta.large?.isBestValue ? t("credits.options.bestValue", locale) : null,
          enabled: creditPacksEnabled && providerActionsImplemented,
        },
      ],
    },
    {
      id: "unlimited",
      label: t("credits.options.sections.unlimited", locale),
      options: [
        {
          id: "unlimited",
          Icon: Wallet,
          title: t("credits.options.unlimited.title", locale),
          price: t("credits.options.unlimited.price", locale, { price: CREDIT_PACKS.unlimitedYearly.priceUsd }),
          helper: null,
          secondary: t("credits.options.unlimited.renewal", locale),
          badge: null,
          enabled: yearlyUnlimitedEnabled && providerActionsImplemented,
        },
      ],
    },
  ];

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[200] flex items-end justify-center overflow-hidden overscroll-none bg-slate-900/25 backdrop-blur-sm sm:items-center sm:px-3 sm:py-4"
        role="presentation"
      >
        <div
          aria-labelledby="credit-options-title"
          aria-modal="true"
          className="flex h-[92dvh] max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl rounded-b-none border border-slate-200 bg-white shadow-xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl"
          role="dialog"
        >
          <div className="shrink-0 border-b border-slate-100 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900" id="credit-options-title">
                  {mode === "insufficient" ? t("credits.insufficient.title", locale) : t("credits.options.heading", locale)}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {mode === "insufficient" ? t("credits.insufficient.helper", locale) : t("credits.options.body", locale)}
                </p>
              </div>
              <button
                className="shrink-0 rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                onClick={onClose}
                type="button"
              >
                {t("common.close", locale)}
              </button>
            </div>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 [-webkit-overflow-scrolling:touch]"
            data-testid="credit-options-scroll-area"
          >
            <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sky-700 ring-1 ring-sky-100">
                <Wallet aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t("credits.options.balanceLabel", locale)}</p>
                <p className="truncate text-sm font-semibold text-slate-900">{currentCreditBalanceDisplay}</p>
              </div>
            </div>
            <div className="mt-2 flex items-start gap-2.5 rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-2">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-sky-700 ring-1 ring-sky-100">
                <Sprout aria-hidden="true" className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{t("credits.options.launchPricing.label", locale)}</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-600">
                  {launchPricingLines.map((line) => (
                    <span className="block" key={line}>
                      {line}
                    </span>
                  ))}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              {sections.map((section) => (
                <section aria-labelledby={`credit-options-${section.id}-label`} key={section.id}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400" id={`credit-options-${section.id}-label`}>
                    {section.label}
                  </p>
                  <div className="grid gap-1.5">
                    {section.options.map((option) => {
                      const OptionIcon = option.Icon;

                      return (
                        <div
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left"
                          data-credit-option={option.id}
                          data-provider-enabled={option.enabled ? "true" : "false"}
                          key={option.id}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                              <OptionIcon aria-hidden="true" className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{option.title}</p>
                                {option.badge ? (
                                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
                                    {option.badge}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                                {option.price ? <p className="text-sm font-semibold text-sky-800">{option.price}</p> : null}
                                {option.secondary ? (
                                  <p className="text-xs font-medium text-slate-500">
                                    {option.price ? <span aria-hidden="true">· </span> : null}
                                    <span>{option.secondary}</span>
                                  </p>
                                ) : null}
                              </div>
                              {option.helper ? <p className="mt-0.5 truncate text-xs text-slate-600">{option.helper}</p> : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}
