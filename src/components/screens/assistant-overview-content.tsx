"use client";

import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { useLocale } from "@/components/i18n/locale-provider";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Budget } from "@/domain/budgets/types";
import type { OwedNote } from "@/domain/owed-notes/types";
import type { OwedNoteActionState } from "@/lib/actions/owed-notes-state";
import type { BudgetActionState } from "@/lib/actions/budgets-state";
import { t } from "@/lib/i18n";
import type { AssistantActionState } from "@/lib/server/assistant";
import type { ControlledCategoryOption } from "@/lib/server/transactions-read-model";

type AssistantActionHandler = (state: AssistantActionState, formData: FormData) => Promise<AssistantActionState>;
type BudgetActionHandler = (state: BudgetActionState, formData: FormData) => Promise<BudgetActionState>;
type OwedNoteActionHandler = (state: OwedNoteActionState, formData: FormData) => Promise<OwedNoteActionState>;

type AssistantOverviewContentProps = {
  action: AssistantActionHandler;
  initialState: AssistantActionState;
  recentItems: AssistantActionState["recentItems"];
  categoryOptions: ControlledCategoryOption[];
  categoryLimits: Budget[];
  owedNotes: OwedNote[];
  defaultCurrency: string;
  upsertLimitAction: BudgetActionHandler;
  pauseLimitAction: BudgetActionHandler;
  resumeLimitAction: BudgetActionHandler;
  deleteLimitAction: BudgetActionHandler;
  createOwedNoteAction: OwedNoteActionHandler;
  adjustOwedNoteAmountAction: OwedNoteActionHandler;
  updateOwedNoteNoteAction: OwedNoteActionHandler;
  settleOwedNoteAction: OwedNoteActionHandler;
  loadError: boolean;
};

export function AssistantOverviewContent({
  action,
  adjustOwedNoteAmountAction,
  categoryLimits,
  categoryOptions,
  createOwedNoteAction,
  deleteLimitAction,
  defaultCurrency,
  initialState,
  loadError,
  owedNotes,
  pauseLimitAction,
  recentItems,
  resumeLimitAction,
  settleOwedNoteAction,
  updateOwedNoteNoteAction,
  upsertLimitAction,
}: AssistantOverviewContentProps) {
  const { locale } = useLocale();

  return (
    <section className="space-y-4">
      <ScreenHeader
        eyebrow={t("assistant.pageLabel", locale)}
        title={t("assistant.mainTitle", locale)}
        description={t("assistant.mainHelper", locale)}
      />
      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("assistant.loadError.title", locale)}</CardTitle>
            <CardDescription>{t("assistant.loadError.helper", locale)}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{t("assistant.quickAdd.title", locale)}</CardTitle>
          <CardDescription>
            <span className="block">{t("assistant.quickAdd.helper", locale)}</span>
            <span className="block">{t("assistant.quickAdd.examples", locale)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssistantComposer
            action={action}
            adjustOwedNoteAmountAction={adjustOwedNoteAmountAction}
            categoryLimits={categoryLimits}
            categoryOptions={categoryOptions}
            createOwedNoteAction={createOwedNoteAction}
            deleteLimitAction={deleteLimitAction}
            defaultCurrency={defaultCurrency}
            initialState={initialState}
            owedNotes={owedNotes}
            pauseLimitAction={pauseLimitAction}
            recentItems={recentItems}
            resumeLimitAction={resumeLimitAction}
            settleOwedNoteAction={settleOwedNoteAction}
            updateOwedNoteNoteAction={updateOwedNoteNoteAction}
            upsertLimitAction={upsertLimitAction}
          />
        </CardContent>
      </Card>
    </section>
  );
}
