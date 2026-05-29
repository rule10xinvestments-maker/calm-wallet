"use client";

import { useActionState } from "react";
import type { NotificationPreferences } from "@/domain/notifications/types";
import { Button } from "@/components/ui/button";
import {
  initialNotificationPreferencesActionState,
  type NotificationPreferencesActionState,
} from "@/lib/actions/notifications-state";

type NotificationPreferencesCardProps = {
  preferences: NotificationPreferences;
  action: (
    state: NotificationPreferencesActionState,
    formData: FormData,
  ) => Promise<NotificationPreferencesActionState>;
};

export function NotificationPreferencesCard({ preferences, action }: NotificationPreferencesCardProps) {
  const [state, formAction, isPending] = useActionState(action, {
    ...initialNotificationPreferencesActionState,
    preferences,
  });
  const current = state.preferences ?? preferences;

  return (
    <form action={formAction} className="space-y-3">
      {state.message ? (
        <p className={`text-sm ${state.status === "error" ? "text-rose-600" : "text-sky-700"}`}>{state.message}</p>
      ) : null}
      <label className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
        <input
          className="mt-1"
          defaultChecked={current.dailyReminderEnabled}
          name="dailyReminderEnabled"
          type="checkbox"
        />
        <span>
          <span className="block text-sm font-medium text-slate-900">Daily logging reminder</span>
          <span className="block text-xs text-slate-500">A gentle evening nudge around 8 PM local time.</span>
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
        <input
          className="mt-1"
          defaultChecked={current.monthlyReviewEnabled}
          name="monthlyReviewEnabled"
          type="checkbox"
        />
        <span>
          <span className="block text-sm font-medium text-slate-900">Monthly tracked review</span>
          <span className="block text-xs text-slate-500">A calm prompt in the first few days of each month.</span>
        </span>
      </label>
      <Button disabled={isPending} type="submit">
        {isPending ? "Saving..." : "Save notification preferences"}
      </Button>
    </form>
  );
}
