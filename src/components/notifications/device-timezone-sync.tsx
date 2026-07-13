"use client";

import { useEffect, useRef } from "react";

type DeviceTimezoneSyncProps = {
  savedTimezone: string | null;
  updateTimezoneAction: (timezone: string) => Promise<void>;
};

function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date("2026-01-01T00:00:00.000Z"));
    return true;
  } catch {
    return false;
  }
}

export function DeviceTimezoneSync({ savedTimezone, updateTimezoneAction }: DeviceTimezoneSyncProps) {
  const lastAttemptedTimezone = useRef<string | null>(null);

  useEffect(() => {
    const deviceTimezone = getDeviceTimezone();

    if (!deviceTimezone || !isValidTimezone(deviceTimezone)) {
      return;
    }

    if (deviceTimezone === savedTimezone || deviceTimezone === lastAttemptedTimezone.current) {
      return;
    }

    lastAttemptedTimezone.current = deviceTimezone;
    void updateTimezoneAction(deviceTimezone);
  }, [savedTimezone, updateTimezoneAction]);

  return null;
}
