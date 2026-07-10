"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, Search } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { t, type SupportedLocale } from "@/lib/i18n";

type HelpQuestion = {
  question: Record<SupportedLocale, string>;
  answer: Record<SupportedLocale, string>;
};

type HelpSection = {
  title: Record<SupportedLocale, string>;
  questions: HelpQuestion[];
};

const copy = {
  en: {
    search: "Search Help",
    noResults: "No matching answers.",
    still: "Still having a problem?",
    report: "Report a problem",
  },
  ro: {
    search: "Cauta in Ajutor",
    noResults: "Nu exista raspunsuri potrivite.",
    still: "Inca ai o problema?",
    report: "Raporteaza o problema",
  },
  fr: {
    search: "Rechercher dans l'aide",
    noResults: "Aucune reponse correspondante.",
    still: "Vous avez toujours un probleme ?",
    report: "Signaler un probleme",
  },
  es: {
    search: "Buscar en Ayuda",
    noResults: "No hay respuestas coincidentes.",
    still: "Sigues teniendo un problema?",
    report: "Informar de un problema",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

const sectionNames = {
  started: { en: "Getting started", ro: "Primii pasi", fr: "Premiers pas", es: "Primeros pasos" },
  assistant: { en: "Assistant", ro: "Asistent", fr: "Assistant", es: "Asistente" },
  activity: { en: "Activity", ro: "Activitate", fr: "Activite", es: "Actividad" },
  insights: { en: "Insights", ro: "Perspective", fr: "Analyses", es: "Insights" },
  limits: { en: "Limits and reminders", ro: "Limite si mementouri", fr: "Limites et rappels", es: "Limites y recordatorios" },
  privacy: { en: "Account and privacy", ro: "Cont si confidentialitate", fr: "Compte et confidentialite", es: "Cuenta y privacidad" },
} satisfies Record<string, Record<SupportedLocale, string>>;

function q(en: string, answer: string): HelpQuestion {
  return {
    question: { en, ro: en, fr: en, es: en },
    answer: { en: answer, ro: answer, fr: answer, es: answer },
  };
}

const helpSections: HelpSection[] = [
  {
    title: sectionNames.started,
    questions: [
      q("What is Calm Wallet?", "Calm Wallet helps you track money in and money out in one quiet place."),
      q("How do I add spending?", "Use Assistant Quick Add or Manual Add, then review the entry in Activity."),
      q("How do I add income?", "Choose an income category in Manual Add or describe it to the Assistant."),
      q("What does tracked balance mean?", "It is the money Calm Wallet can see from entries you have added."),
      q("What does period net mean?", "It shows money in minus money out for the selected period."),
    ],
  },
  {
    title: sectionNames.assistant,
    questions: [
      q("How does Quick Add work?", "Type a short note like coffee 12 and Calm Wallet drafts the entry."),
      q("How does Manual Add work?", "Manual Add lets you choose the amount, date, category, and note yourself."),
      q("Why might an entry need review?", "Calm Wallet asks for review when a detail looks uncertain or incomplete."),
      q("Which languages are supported?", "The app supports English, Romanian, French, and Spanish surfaces."),
    ],
  },
  {
    title: sectionNames.activity,
    questions: [
      q("How do I edit an entry?", "Open Activity, tap the entry, then update the details."),
      q("How do I change a category?", "Open the entry and choose a different category from the picker."),
      q("How do I add a note?", "Open the entry and add a short note in its details."),
      q("How do Bin and Restore work?", "Bin hides an entry from normal views. Restore brings it back."),
      q("How do recurring entries work?", "Recurring entries repeat on the schedule you set."),
    ],
  },
  {
    title: sectionNames.insights,
    questions: [
      q("What does Mix show?", "Mix shows how your spending is split across categories."),
      q("What does Bars show?", "Bars compares category totals for the selected period."),
      q("What does Trend show?", "Trend shows how totals change over time."),
      q("Why do converted totals use approx?", "Converted totals use recent rates, so they are helpful estimates."),
      q("Why is Calm Wallet not a bank statement?", "Calm Wallet shows your tracked entries, not official bank records."),
    ],
  },
  {
    title: sectionNames.limits,
    questions: [
      q("How do category limits work?", "Limits compare your tracked category spending with the amount you set."),
      q("How do owed reminders work?", "Owed reminders help you remember money to collect or repay."),
      q("Why do owed reminders not affect Insights?", "They are reminders, not income or spending entries."),
    ],
  },
  {
    title: sectionNames.privacy,
    questions: [
      q("How does Google sign-in work?", "Google confirms your identity, then Calm Wallet opens your account."),
      q("How is my data separated from other users?", "You only see entries connected to your signed-in account."),
      q("How do I sign out?", "Use the sign-out button in the top bar."),
      q("How do I report a problem?", "Open Settings, choose Report a problem, and describe what is not working."),
    ],
  },
];

export function HelpCenterCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { locale } = useLocale();
  const helpCopy = copy[locale];

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return helpSections;

    return helpSections
      .map((section) => ({
        ...section,
        questions: section.questions.filter((item) =>
          `${item.question[locale]} ${item.answer[locale]}`.toLowerCase().includes(normalizedQuery),
        ),
      }))
      .filter((section) => section.questions.length > 0);
  }, [locale, query]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-slate-50"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <BookOpen aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-900">{t("settings.help.title", locale)}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{t("settings.help.helper", locale)}</span>
        </span>
      </button>

      {isOpen ? (
        <div className="space-y-3 border-t border-slate-100 px-3 py-3">
          <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus-within:border-sky-300 focus-within:bg-white">
            <Search aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
            <input
              aria-label={helpCopy.search}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={helpCopy.search}
              value={query}
            />
          </label>

          {filteredSections.length === 0 ? <p className="text-sm text-slate-500">{helpCopy.noResults}</p> : null}

          <div className="space-y-3">
            {filteredSections.map((section) => (
              <section className="space-y-1" key={section.title.en}>
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{section.title[locale]}</h3>
                {section.questions.map((item) => {
                  const id = `${section.title.en}:${item.question.en}`;
                  const isExpanded = expanded === id;

                  return (
                    <div className="rounded-xl border border-slate-100 bg-slate-50" key={id}>
                      <button
                        aria-expanded={isExpanded}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-slate-800"
                        onClick={() => setExpanded(isExpanded ? null : id)}
                        type="button"
                      >
                        <span>{item.question[locale]}</span>
                        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-slate-400 transition ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      {isExpanded ? <p className="px-3 pb-3 text-sm leading-6 text-slate-600">{item.answer[locale]}</p> : null}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-sm font-medium text-slate-900">{helpCopy.still}</p>
            <button
              className="mt-2 text-sm font-semibold text-sky-700"
              onClick={() => window.dispatchEvent(new Event("calm-wallet:open-report-problem"))}
              type="button"
            >
              {helpCopy.report}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
