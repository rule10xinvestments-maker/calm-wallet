"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { GuideIllustration, type GuideIllustrationKind } from "@/components/support/guide-illustration";
import { t } from "@/lib/i18n";

type HelpQuestion = {
  id: string;
  questionKey: string;
  answerKey: string;
};

type HelpSection = {
  id: string;
  titleKey: string;
  visual?: GuideIllustrationKind;
  questions: HelpQuestion[];
};

type HelpCenterCardProps = {
  onClose: () => void;
};

const helpSections: HelpSection[] = [
  section("started", 3),
  section("assistant", 4, "quickAdd"),
  section("credits", 1),
  section("unlimited", 1),
  section("manual", 2),
  section("review", 3, "needsReview"),
  section("activity", 5, "activity"),
  section("trash", 2),
  section("recurring", 3, "recurring"),
  section("insights", 5, "trackedBalance"),
  section("mix", 3, "mix"),
  section("bars", 3, "bars"),
  section("trend", 3, "trend"),
  section("planning", 4, "limits"),
  section("currencies", 2),
  section("habits", 4),
  section("privacy", 3),
  section("troubleshooting", 2),
];

function section(id: string, questionCount: number, visual?: GuideIllustrationKind): HelpSection {
  return {
    id,
    titleKey: `help.sections.${id}.title`,
    visual,
    questions: Array.from({ length: questionCount }, (_, index) => {
      const questionNumber = index + 1;
      return {
        id: `${id}-${questionNumber}`,
        questionKey: `help.sections.${id}.questions.${questionNumber}.question`,
        answerKey: `help.sections.${id}.questions.${questionNumber}.answer`,
      };
    }),
  };
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function HelpCenterCard({ onClose }: HelpCenterCardProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { locale } = useLocale();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const filteredSections = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query.trim());
    if (!normalizedQuery) return helpSections;

    return helpSections
      .map((helpSection) => {
        const localizedTitle = t(helpSection.titleKey, locale);
        const sectionMatches = normalizeSearchText(localizedTitle).includes(normalizedQuery);

        return {
          ...helpSection,
          questions: sectionMatches
            ? helpSection.questions
            : helpSection.questions.filter((item) => {
                const localizedQuestion = t(item.questionKey, locale);
                const localizedAnswer = t(item.answerKey, locale);
                return normalizeSearchText(`${localizedQuestion} ${localizedAnswer}`).includes(normalizedQuery);
              }),
        };
      })
      .filter((helpSection) => helpSection.questions.length > 0);
  }, [locale, query]);

  return (
    <div className="flex max-h-[inherit] min-h-0 flex-col overflow-hidden" data-testid="help-center-content">
      <div
        className="sticky top-0 z-10 space-y-3 border-b border-slate-200 bg-white/95 px-3 pb-3 pt-3 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur"
        data-testid="help-sticky-header"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-slate-900" id="header-help-title">
              {t("settings.help.title", locale)}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{t("settings.help.helper", locale)}</p>
          </div>
          <button
            ref={closeButtonRef}
            className="shrink-0 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            {t("common.close", locale)}
          </button>
        </div>

        <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus-within:border-sky-300 focus-within:bg-white">
          <Search aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
          <input
            aria-label={t("help.search", locale)}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("help.search", locale)}
            value={query}
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" data-testid="help-scroll-content">
        {filteredSections.length === 0 ? <p className="text-sm text-slate-500">{t("help.noResults", locale)}</p> : null}

        <div className="space-y-3">
          {filteredSections.map((helpSection) => (
            <section className="space-y-1" key={helpSection.id}>
              <h3 className="px-1 text-xs font-semibold uppercase text-slate-400">{t(helpSection.titleKey, locale)}</h3>
              <GuideIllustration kind={helpSection.visual} locale={locale} />
              {helpSection.questions.map((item) => {
                const isExpanded = expanded === item.id;

                return (
                  <div className="rounded-xl border border-slate-100 bg-slate-50" key={item.id}>
                    <button
                      aria-expanded={isExpanded}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-slate-800"
                      onClick={() => setExpanded(isExpanded ? null : item.id)}
                      type="button"
                    >
                      <span className="min-w-0 break-words">{t(item.questionKey, locale)}</span>
                      <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-slate-400 transition ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                    {isExpanded ? <p className="px-3 pb-3 text-sm leading-6 text-slate-600">{t(item.answerKey, locale)}</p> : null}
                  </div>
                );
              })}
            </section>
          ))}
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <p className="text-sm font-medium text-slate-900">{t("help.still", locale)}</p>
          <button
            className="mt-2 text-sm font-semibold text-sky-700"
            onClick={() => {
              onClose();
              window.dispatchEvent(new Event("calm-wallet:open-report-problem"));
            }}
            type="button"
          >
            {t("help.report", locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
