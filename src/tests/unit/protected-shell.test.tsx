import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { PwaInstallProvider } from "@/components/pwa-install-context";
import { initialNotificationPreferencesActionState } from "@/lib/actions/notifications-state";
import { initialSupportTicketActionState } from "@/lib/actions/support-state";
import type { UserPreferencesActionState } from "@/lib/actions/preferences-state";

const notificationPreferences = {
  userId: "user-1",
  dailyReminderEnabled: false,
  monthlyReviewEnabled: true,
  recurringNotificationsEnabled: true,
  limitAlertsEnabled: true,
  overspendingEnabled: true,
  unusualSpendingEnabled: true,
  savingsOpportunitiesEnabled: true,
  createdAt: "2026-05-03T00:00:00.000Z",
  updatedAt: "2026-05-03T00:00:00.000Z",
};

const updateNotificationPreferencesAction = vi.fn(async () => initialNotificationPreferencesActionState);
const registerPushSubscriptionAction = vi.fn(async () => initialNotificationPreferencesActionState);
const sendTestPushNotificationAction = vi.fn(async () => initialNotificationPreferencesActionState);
const supportTicketAction = vi.fn(async () => initialSupportTicketActionState);
const updateUserPreferencesAction = vi.fn(async (_state: UserPreferencesActionState, formData: FormData) => ({
  status: "success" as const,
  message: "Language saved.",
  uiLocale: formData.get("uiLocale") as "en" | "ro" | "fr" | "es",
}));

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

function renderProtectedShell(options: { onSignOut?: () => Promise<void> } = {}) {
  return render(
    <PwaInstallProvider>
      <ProtectedShell
        accountHint="paul@example.com"
        notificationPreferences={notificationPreferences}
        uiLocale={null}
        userPreferencesAction={updateUserPreferencesAction}
        notificationPreferencesAction={updateNotificationPreferencesAction}
        registerPushSubscriptionAction={registerPushSubscriptionAction}
        sendTestPushNotificationAction={sendTestPushNotificationAction}
        supportTicketAction={supportTicketAction}
        onSignOut={options.onSignOut ?? vi.fn(async () => undefined)}
      >
        <div>Assistant content</div>
      </ProtectedShell>
    </PwaInstallProvider>,
  );
}

function renderProtectedShellWithLocale(uiLocale: string | null, options: { onSignOut?: () => Promise<void> } = {}) {
  return render(
    <PwaInstallProvider>
      <ProtectedShell
        accountHint="paul@example.com"
        notificationPreferences={notificationPreferences}
        uiLocale={uiLocale as never}
        userPreferencesAction={updateUserPreferencesAction}
        notificationPreferencesAction={updateNotificationPreferencesAction}
        registerPushSubscriptionAction={registerPushSubscriptionAction}
        sendTestPushNotificationAction={sendTestPushNotificationAction}
        supportTicketAction={supportTicketAction}
        onSignOut={options.onSignOut ?? vi.fn(async () => undefined)}
      >
        <div>Assistant content</div>
      </ProtectedShell>
    </PwaInstallProvider>,
  );
}

function renderAdminProtectedShell(options: { onSignOut?: () => Promise<void> } = {}) {
  return render(
    <PwaInstallProvider>
      <ProtectedShell
        accountHint="admin@example.com"
        notificationPreferences={notificationPreferences}
        uiLocale={null}
        userPreferencesAction={updateUserPreferencesAction}
        notificationPreferencesAction={updateNotificationPreferencesAction}
        registerPushSubscriptionAction={registerPushSubscriptionAction}
        sendTestPushNotificationAction={sendTestPushNotificationAction}
        supportTicketAction={supportTicketAction}
        isSupportAdmin
        onSignOut={options.onSignOut ?? vi.fn(async () => undefined)}
      >
        <div>Assistant content</div>
      </ProtectedShell>
    </PwaInstallProvider>,
  );
}

describe("protected shell PWA install affordance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    setDisplayMode(false);
    setNavigatorValue("standalone", false);
    setNavigatorValue("userAgent", "Mozilla/5.0");
    setNavigatorValue("platform", "Win32");
    setNavigatorValue("maxTouchPoints", 0);
  });

  afterEach(() => {
    window.localStorage.clear();
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
    const languageButton = screen.getByRole("button", { name: /Language/ });
    const notificationsButton = screen.getByRole("button", { name: /Notifications/ });
    expect(languageButton.compareDocumentPosition(notificationsButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(languageButton).toHaveAttribute("aria-expanded", "false");
    expect(notificationsButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("App language")).not.toBeInTheDocument();
    expect(screen.queryByText("Light reminders are optional, calm, and user-controlled.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "🇷🇴 Română" })).not.toBeInTheDocument();
    expect(screen.queryByText("Daily reminder")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send test/i })).not.toBeInTheDocument();

    fireEvent.click(languageButton);

    expect(screen.getByText("App language")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "🇬🇧 English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "🇷🇴 Română" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "🇫🇷 Français" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "🇪🇸 Español" })).toBeInTheDocument();

    fireEvent.click(notificationsButton);

    expect(screen.getByText("Light reminders are optional, calm, and user-controlled.")).toBeInTheDocument();
    expect(screen.getByText("Notifications are enabled.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enabled" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Daily reminder")).toBeInTheDocument();
    expect(screen.getByText("Monthly report")).toBeInTheDocument();
    expect(screen.getByText("Recurring entries")).toBeInTheDocument();
    expect(screen.getByText("Limit alerts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enable notifications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close settings overlay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save notification settings" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(settingsButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Daily reminder")).not.toBeInTheDocument();
  });

  it("adds Help and Report a problem inside Settings and keeps admin support outside normal navigation", () => {
    renderProtectedShell();

    expect(screen.queryByRole("link", { name: "Admin Support" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary" }).querySelectorAll("a")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("button", { name: /Help Find answers/ })).toBeInTheDocument();
    const reportButton = screen.getByRole("button", { name: /Report a problem/ });
    expect(reportButton).toBeInTheDocument();

    fireEvent.click(reportButton);

    expect(screen.getByText("Tell us when something is not working correctly.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Problem type App problem" })).toBeInTheDocument();
    expect(document.querySelector('select[name="category"]')).toBeNull();
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("What is not working correctly?")).toBeRequired();
    expect(screen.getByRole("button", { name: "Send report" })).toBeInTheDocument();
  });

  it("renders Sign out as the final destructive Settings row and confirms before calling the action", async () => {
    const signOut = vi.fn(async () => undefined);
    const confirmSpy = vi.spyOn(window, "confirm");
    renderProtectedShell({ onSignOut: signOut });

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    const settingsPanel = screen.getByTestId("header-settings-panel");
    const buttons = settingsPanel.querySelectorAll("button");
    const signOutRow = screen.getByTestId("settings-sign-out-row");

    expect(buttons[buttons.length - 1]).toBe(signOutRow);
    expect(signOutRow).toHaveClass("border-rose-100");
    expect(signOutRow).toHaveClass("bg-rose-50");

    fireEvent.click(signOutRow);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Sign out?" })).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to sign out?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Sign out?" })).not.toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();

    fireEvent.click(signOutRow);
    fireEvent.click(within(screen.getByRole("dialog", { name: "Sign out?" })).getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
  });

  it("prevents duplicate sign-out requests while confirmation is running", async () => {
    let resolveSignOut: (() => void) | null = null;
    const signOut = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        }),
    );
    renderProtectedShell({ onSignOut: signOut });

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByTestId("settings-sign-out-row"));
    const confirmButton = within(screen.getByRole("dialog", { name: "Sign out?" })).getByRole("button", { name: "Sign out" });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(screen.getByRole("button", { name: "Signing out..." })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Signing out..." }));

    expect(signOut).toHaveBeenCalledOnce();
    await act(async () => {
      resolveSignOut?.();
    });
  });

  it("shows safe local copy when sign-out fails", async () => {
    const signOut = vi.fn(async () => {
      throw new Error("raw auth failure");
    });
    renderProtectedShell({ onSignOut: signOut });

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByTestId("settings-sign-out-row"));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Sign out?" })).getByRole("button", { name: "Sign out" }));

    expect(await screen.findByText("We could not sign you out. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText("raw auth failure")).not.toBeInTheDocument();
  });

  it("opens the same confirmation flow from the header sign-out icon", async () => {
    const signOut = vi.fn(async () => undefined);
    renderProtectedShell({ onSignOut: signOut });

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.getByRole("dialog", { name: "Sign out?" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog", { name: "Sign out?" })).getByRole("button", { name: "Cancel" }));
    expect(signOut).not.toHaveBeenCalled();
  });

  it("renders localized sign-out confirmation copy", () => {
    const romanianView = renderProtectedShellWithLocale("ro");
    fireEvent.click(screen.getByRole("button", { name: "Setări" }));
    fireEvent.click(screen.getByTestId("settings-sign-out-row"));
    expect(screen.getByRole("dialog", { name: "Te deconectezi?" })).toBeInTheDocument();
    expect(screen.getByText("Sigur vrei să te deconectezi?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deconectează-te" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anulează" })).toBeInTheDocument();
    romanianView.unmount();

    const frenchView = renderProtectedShellWithLocale("fr");
    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByTestId("settings-sign-out-row"));
    expect(screen.getByRole("dialog", { name: "Se déconnecter ?" })).toBeInTheDocument();
    expect(screen.getByText("Voulez-vous vraiment vous déconnecter ?")).toBeInTheDocument();
    frenchView.unmount();

    const spanishView = renderProtectedShellWithLocale("es");
    fireEvent.click(screen.getByRole("button", { name: "Ajustes" }));
    fireEvent.click(screen.getByTestId("settings-sign-out-row"));
    expect(screen.getByRole("dialog", { name: "¿Cerrar sesión?" })).toBeInTheDocument();
    expect(screen.getByText("¿Seguro que quieres cerrar sesión?")).toBeInTheDocument();
    spanishView.unmount();
  });

  it("shows the admin Support header entry only for admins while bottom nav stays three items", () => {
    renderAdminProtectedShell();

    expect(screen.getByRole("link", { name: "Admin Support" })).toHaveAttribute("href", "/admin/support");
    expect(screen.getByRole("navigation", { name: "Primary" }).querySelectorAll("a")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByRole("link", { name: /Admin Support Review and manage user reports. Admin/ })).toHaveAttribute("href", "/admin/support");
    const panel = screen.getByTestId("header-settings-panel");
    expect(
      screen
        .getByRole("link", { name: /Admin Support Review and manage user reports. Admin/ })
        .compareDocumentPosition(screen.getByTestId("settings-sign-out-row")) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(panel.querySelectorAll("button")[panel.querySelectorAll("button").length - 1]).toBe(screen.getByTestId("settings-sign-out-row"));
  });

  it("updates migrated labels when a language is selected", async () => {
    renderProtectedShell();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: /Language/ }));
    fireEvent.click(screen.getByRole("button", { name: "🇷🇴 Română" }));

    await waitFor(() => expect(updateUserPreferencesAction).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("link", { name: "Asistent" })).toBeInTheDocument());

    expect(screen.getByRole("link", { name: "Activitate" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Perspective" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Notificări/ }));
    expect(screen.getByText("Reminder-ele ușoare sunt opționale, calme și controlate de tine.")).toBeInTheDocument();
    expect(screen.getByText("Notificările sunt activate.")).toBeInTheDocument();
    const enabledButton = screen.getByRole("button", { name: "Activat" });
    expect(enabledButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(enabledButton);

    expect(screen.getByRole("button", { name: "Dezactivat" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Notificările sunt dezactivate.")).toBeInTheDocument();
    expect(screen.getByLabelText("Reminder zilnic")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Notificări Dezactivat/ })).toBeInTheDocument();
    expect(screen.getByText("Reminder zilnic")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activează notificările" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvează setările notificărilor" })).toBeInTheDocument();
  });

  it("loads safely with saved Romanian locale and invalid saved locale values", () => {
    const romanianView = renderProtectedShellWithLocale("ro");
    expect(screen.getByRole("link", { name: "Asistent" })).toBeInTheDocument();
    romanianView.unmount();

    const fallbackView = renderProtectedShellWithLocale("not-real");
    expect(screen.getByRole("link", { name: "Assistant" })).toBeInTheDocument();
    fallbackView.unmount();
  });

  it("renders the protected header as a compact shared mobile headline", () => {
    renderProtectedShell();

    const heading = screen.getByRole("heading", { name: "Your money. One clear view." });

    expect(screen.getByText("Calm Wallet")).toBeInTheDocument();
    expect(screen.getByText("Signed in as paul@example.com")).toBeInTheDocument();
    expect(heading).toHaveClass("text-[1.05rem]");
    expect(heading).toHaveClass("leading-6");
    expect(heading.querySelectorAll("span")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
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
