import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CapacitorShellRuntime } from "@/components/capacitor-shell-runtime";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { PwaInstallProvider } from "@/components/pwa-install-context";
import { initialAccountDeletionActionState } from "@/lib/actions/account-deletion-state";
import { initialNotificationPreferencesActionState } from "@/lib/actions/notifications-state";
import { initialSupportTicketActionState } from "@/lib/actions/support-state";

const capacitorMocks = vi.hoisted(() => ({
  appAddListener: vi.fn(),
  browserOpen: vi.fn(),
  isNativePlatform: vi.fn(() => true),
  keyboardAddListener: vi.fn(),
  networkAddListener: vi.fn(),
  networkGetStatus: vi.fn(async () => ({ connected: true })),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: capacitorMocks.isNativePlatform,
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: capacitorMocks.appAddListener,
    exitApp: vi.fn(),
  },
}));

vi.mock("@capacitor/browser", () => ({
  Browser: {
    close: vi.fn(async () => undefined),
    open: capacitorMocks.browserOpen,
  },
}));

vi.mock("@capacitor/keyboard", () => ({
  Keyboard: {
    addListener: capacitorMocks.keyboardAddListener,
  },
}));

vi.mock("@capacitor/network", () => ({
  Network: {
    addListener: capacitorMocks.networkAddListener,
    getStatus: capacitorMocks.networkGetStatus,
  },
}));

const notificationPreferences = {
  createdAt: "2026-05-03T00:00:00.000Z",
  dailyReminderEnabled: false,
  limitAlertsEnabled: true,
  monthlyReviewEnabled: true,
  overspendingEnabled: true,
  recurringNotificationsEnabled: true,
  savingsOpportunitiesEnabled: true,
  unusualSpendingEnabled: true,
  updatedAt: "2026-05-03T00:00:00.000Z",
  userId: "user-1",
};

function renderShell() {
  return render(
    <PwaInstallProvider>
      <ProtectedShell
        accountHint="paul@example.com"
        notificationPreferences={notificationPreferences}
        uiLocale={null}
        timezone="Europe/Bucharest"
        userPreferencesAction={vi.fn()}
        updateTimezoneAction={vi.fn()}
        notificationPreferencesAction={vi.fn(async () => initialNotificationPreferencesActionState)}
        registerPushSubscriptionAction={vi.fn(async () => initialNotificationPreferencesActionState)}
        sendTestPushNotificationAction={vi.fn(async () => initialNotificationPreferencesActionState)}
        supportTicketAction={vi.fn(async () => initialSupportTicketActionState)}
        deleteAccountAction={vi.fn(async () => initialAccountDeletionActionState)}
        onSignOut={vi.fn()}
      >
        <div>Assistant content</div>
      </ProtectedShell>
    </PwaInstallProvider>,
  );
}

describe("native shell safe-area layout", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-capacitor-shell");
    document.documentElement.removeAttribute("data-capacitor-keyboard-open");
    document.documentElement.style.removeProperty("--capacitor-keyboard-height");
    vi.clearAllMocks();
  });

  it("applies safe-area shell classes without changing the three-link product navigation", () => {
    const view = renderShell();

    expect(view.container.querySelector(".calm-protected-shell")).toBeInTheDocument();
    const bottomNav = screen.getByRole("navigation", { name: "Primary" });
    expect(bottomNav).toHaveClass("calm-bottom-nav");
    expect(bottomNav.querySelectorAll("a")).toHaveLength(3);
  });

  it("keeps web safe-area fallbacks while allowing native Android insets to override them", () => {
    const globalsCss = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(globalsCss).toContain("--calm-safe-area-top: env(safe-area-inset-top)");
    expect(globalsCss).toContain("--calm-safe-area-bottom: env(safe-area-inset-bottom)");
    expect(globalsCss).toContain("padding-top: calc(1rem + var(--calm-safe-area-top))");
    expect(globalsCss).toContain("padding-bottom: calc(7rem + var(--calm-safe-area-bottom))");
    expect(globalsCss).toContain("padding-bottom: calc(1rem + var(--calm-safe-area-bottom))");
    expect(globalsCss).toContain("html[data-capacitor-keyboard-open=\"true\"] .calm-bottom-nav");
  });

  it("initializes native shell listeners once and marks keyboard state without double bottom padding", async () => {
    const listenerRemovers = Array.from({ length: 5 }, () => vi.fn());
    capacitorMocks.appAddListener.mockResolvedValueOnce({ remove: listenerRemovers[0] });
    capacitorMocks.appAddListener.mockResolvedValueOnce({ remove: listenerRemovers[1] });
    capacitorMocks.keyboardAddListener.mockResolvedValueOnce({ remove: listenerRemovers[2] });
    capacitorMocks.keyboardAddListener.mockResolvedValueOnce({ remove: listenerRemovers[3] });
    capacitorMocks.networkAddListener.mockResolvedValueOnce({ remove: listenerRemovers[4] });

    const view = render(<CapacitorShellRuntime />);
    view.rerender(<CapacitorShellRuntime />);

    await waitFor(() => {
      expect(capacitorMocks.appAddListener).toHaveBeenCalledTimes(2);
      expect(capacitorMocks.keyboardAddListener).toHaveBeenCalledTimes(2);
      expect(capacitorMocks.networkAddListener).toHaveBeenCalledTimes(1);
    });

    const keyboardShowHandler = capacitorMocks.keyboardAddListener.mock.calls.find(([eventName]) => eventName === "keyboardWillShow")?.[1];
    const keyboardHideHandler = capacitorMocks.keyboardAddListener.mock.calls.find(([eventName]) => eventName === "keyboardWillHide")?.[1];

    keyboardShowHandler?.({ keyboardHeight: 320 });
    expect(document.documentElement).toHaveAttribute("data-capacitor-keyboard-open", "true");
    expect(document.documentElement.style.getPropertyValue("--capacitor-keyboard-height")).toBe("320px");

    keyboardHideHandler?.();
    expect(document.documentElement).toHaveAttribute("data-capacitor-keyboard-open", "false");
    expect(document.documentElement.style.getPropertyValue("--capacitor-keyboard-height")).toBe("0px");
  });
});
