"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { NotificationPreferencesCard } from "@/components/notifications/notification-preferences-card";
import type { NotificationPreferences } from "@/domain/notifications/types";
import type { NotificationPreferencesActionState } from "@/lib/actions/notifications-state";

type HeaderSettingsButtonProps = {
  notificationPreferences: NotificationPreferences;
  notificationPreferencesAction: (
    state: NotificationPreferencesActionState,
    formData: FormData,
  ) => Promise<NotificationPreferencesActionState>;
};

export function HeaderSettingsButton({
  notificationPreferences,
  notificationPreferencesAction,
}: HeaderSettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label="Settings"
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-white"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <Settings aria-hidden="true" className="size-4" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-20 w-72 max-w-[calc(100vw-2rem)] space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">Settings</p>
              <p className="text-xs leading-5 text-slate-500">Light reminders are optional, calm, and user-controlled.</p>
            </div>
            <button
              className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Close
            </button>
          </div>
          <NotificationPreferencesCard
            action={notificationPreferencesAction}
            preferences={notificationPreferences}
          />
        </div>
      ) : null}
    </div>
  );
}
