import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { PwaInstallProvider } from "@/components/pwa-install-context";
import { initialNotificationPreferencesActionState } from "@/lib/actions/notifications-state";

const notificationPreferences = {
  userId: "user-1",
  dailyReminderEnabled: false,
  monthlyReviewEnabled: true,
  overspendingEnabled: true,
  unusualSpendingEnabled: true,
  savingsOpportunitiesEnabled: true,
  createdAt: "2026-05-03T00:00:00.000Z",
  updatedAt: "2026-05-03T00:00:00.000Z",
};

const updateNotificationPreferencesAction = vi.fn(async () => initialNotificationPreferencesActionState);

function setDisplayMode(standaloneMatches: boolean, fullscreenMatches = false) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches:
        (query === "(display-mode: standalone)" && standaloneMatches) ||
        (query === "(display-mode: fullscreen)" && fullscreenMatches),
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

function setNavigatorValue(name: "maxTouchPoints" | "platform" | "standalone" | "userAgent", value: boolean | number | string | undefined) {
  Object.defineProperty(window.navigator, name, {
    configurable: true,
    value,
  });
}

function renderProtectedShell() {
  return render(
    <PwaInstallProvider>
      <ProtectedShell
        accountHint="paul@example.com"
        notificationPreferences={notificationPreferences}
        notificationPreferencesAction={updateNotificationPreferencesAction}
        onSignOut={vi.fn(async () => undefined)}
      >
        <div>Assistant content</div>
      </ProtectedShell>
    </PwaInstallProvider>,
  );
}

describe("protected shell PWA install affordance", () => {
  beforeEach(() => {
    setDisplayMode(false);
    setNavigatorValue("standalone", false);
    setNavigatorValue("userAgent", "Mozilla/5.0");
    setNavigatorValue("platform", "Win32");
    setNavigatorValue("maxTouchPoints", 0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps sign out as an accessible icon-only header button beside settings", () => {
    renderProtectedShell();

    expect(screen.getByRole("button", { name: "Install Calm Wallet" })).toBeInTheDocument();
    const settingsButton = screen.getByRole("button", { name: "Settings" });
    const signOutButton = screen.getByRole("button", { name: "Sign out" });

    expect(settingsButton).toHaveAttribute("aria-expanded", "false");
    expect(signOutButton).toHaveAttribute("title", "Sign out");
    expect(signOutButton.querySelector("svg")).not.toBeNull();
    expect(signOutButton).toHaveTextContent("");

    fireEvent.click(settingsButton);

    const settingsOverlay = screen.getByTestId("header-settings-overlay");
    const settingsPanel = screen.getByTestId("header-settings-panel");
    expect(settingsOverlay).toHaveClass("fixed");
    expect(settingsOverlay).toHaveClass("inset-0");
    expect(settingsOverlay).toHaveClass("z-[120]");
    expect(settingsOverlay).toHaveClass("bg-slate-950/25");
    expect(settingsOverlay.className).toContain("env(safe-area-inset-top)");
    expect(settingsPanel).toHaveClass("max-h-[calc(100dvh-6.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))]");
    expect(settingsPanel).toHaveClass("overflow-y-auto");
    expect(settingsButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Light reminders are optional, calm, and user-controlled.")).toBeInTheDocument();
    expect(screen.getByText("Daily logging reminder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close settings overlay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save notification preferences" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(settingsButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Daily logging reminder")).not.toBeInTheDocument();
  });

  it("shows generic install guidance from the authenticated header icon in desktop browser mode", async () => {
    renderProtectedShell();

    fireEvent.click(screen.getByRole("button", { name: "Install Calm Wallet" }));

    expect(await screen.findByText("Use your browser menu to install the app.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("opens the native install prompt from the authenticated header icon on Android Chrome", async () => {
    setNavigatorValue(
      "userAgent",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
    );
    setNavigatorValue("platform", "Linux armv8l");
    setNavigatorValue("maxTouchPoints", 5);
    const prompt = vi.fn(async () => undefined);
    const installEvent = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted"; platform: string }>;
    };
    installEvent.prompt = prompt;
    installEvent.userChoice = Promise.resolve({ outcome: "accepted" as const, platform: "web" });

    renderProtectedShell();
    act(() => {
      window.dispatchEvent(installEvent);
    });

    fireEvent.click(await screen.findByRole("button", { name: "Install Calm Wallet" }));

    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    expect(screen.queryByText("Use Share \u2192 Add to Home Screen.")).not.toBeInTheDocument();
  });

  it("shows Android Chrome guidance without the native prompt", async () => {
    setNavigatorValue(
      "userAgent",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
    );
    setNavigatorValue("platform", "Linux armv8l");
    setNavigatorValue("maxTouchPoints", 5);

    renderProtectedShell();

    fireEvent.click(await screen.findByRole("button", { name: "Install Calm Wallet" }));

    expect(screen.getByText("Open Chrome menu \u2192 Add to Home screen.")).toBeInTheDocument();
    expect(screen.getByText("Choose Install app if you see it.")).toBeInTheDocument();
    expect(screen.queryByText("Chrome controls this prompt.")).not.toBeInTheDocument();
    expect(screen.queryByText("Use Share \u2192 Add to Home Screen.")).not.toBeInTheDocument();
  });

  it("shows iOS Share guidance without the native prompt", async () => {
    setNavigatorValue(
      "userAgent",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );
    setNavigatorValue("platform", "iPhone");
    setNavigatorValue("maxTouchPoints", 5);

    renderProtectedShell();

    fireEvent.click(await screen.findByRole("button", { name: "Install Calm Wallet" }));

    expect(screen.getByText("Use Share \u2192 Add to Home Screen.")).toBeInTheDocument();
  });

  it("hides the authenticated install icon in standalone mode while keeping app settings and sign out", () => {
    setDisplayMode(true);
    setNavigatorValue(
      "userAgent",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
    );
    setNavigatorValue("platform", "Linux armv8l");
    setNavigatorValue("maxTouchPoints", 5);

    renderProtectedShell();

    expect(screen.queryByRole("button", { name: "Install Calm Wallet" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("hides the authenticated install icon when iOS reports navigator standalone", () => {
    setNavigatorValue("standalone", true);
    setNavigatorValue(
      "userAgent",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );
    setNavigatorValue("platform", "iPhone");
    setNavigatorValue("maxTouchPoints", 5);

    renderProtectedShell();

    expect(screen.queryByRole("button", { name: "Install Calm Wallet" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("hides the authenticated install icon in fullscreen PWA display mode", () => {
    setDisplayMode(false, true);

    renderProtectedShell();

    expect(screen.queryByRole("button", { name: "Install Calm Wallet" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
