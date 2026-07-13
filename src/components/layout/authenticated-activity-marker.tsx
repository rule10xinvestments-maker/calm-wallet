"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type AuthenticatedActivityMarkerProps = {
  action: () => Promise<void>;
};

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function AuthenticatedActivityMarker({ action }: AuthenticatedActivityMarkerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) {
      return;
    }

    const storageKey = "calm-wallet:last-active-marker";
    const todayKey = getTodayKey();

    try {
      if (window.sessionStorage.getItem(storageKey) === todayKey) {
        return;
      }
      window.sessionStorage.setItem(storageKey, todayKey);
    } catch {
      // If storage is unavailable, the server-side marker still deduplicates by day.
    }

    void action();
  }, [action, pathname]);

  return null;
}
