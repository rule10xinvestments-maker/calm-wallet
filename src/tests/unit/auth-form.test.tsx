import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/components/auth/auth-form";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { PwaInstallProvider } from "@/components/pwa-install-context";
import { initialAuthFormState, type AuthFormState } from "@/lib/auth/form-state";
import { signUpSchema } from "@/lib/auth/validation";

const capacitorMocks = vi.hoisted(() => ({
  browserOpen: vi.fn(),
  signInWithOAuth: vi.fn(),
  isNativePlatform: vi.fn(() => false),
  getPlatform: vi.fn(() => "web"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: capacitorMocks.getPlatform,
    isNativePlatform: capacitorMocks.isNativePlatform,
  },
}));

vi.mock("@capacitor/browser", () => ({
  Browser: {
    open: capacitorMocks.browserOpen,
  },
}));

vi.mock("@/lib/auth/browser-client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithOAuth: capacitorMocks.signInWithOAuth,
    },
  }),
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

function renderSignUp(
  action = vi.fn(async () => initialAuthFormState),
  googleAction?: (formData: FormData) => Promise<void>,
  emailPasswordAuthEnabled = true,
) {
  render(
    <PwaInstallProvider>
      <AuthForm
        action={action}
        alternateHref="/sign-in"
        alternateLabel="Already have an account?"
        description="Start with a simple spending home designed for calm daily check-ins."
        emailPasswordAuthEnabled={emailPasswordAuthEnabled}
        googleAction={googleAction}
        includeFullName
        submitLabel="Sign up"
        title="Create your notebook"
      />
    </PwaInstallProvider>,
  );

  return action;
}

function renderSignIn(
  action = vi.fn(async () => initialAuthFormState),
  googleAction?: (formData: FormData) => Promise<void>,
  emailPasswordAuthEnabled = true,
) {
  render(
    <PwaInstallProvider>
      <AuthForm
        action={action}
        alternateHref="/sign-up"
        alternateLabel="Create an account"
        description="Review your spending, ask quick budget questions, and keep your plan in view."
        emailPasswordAuthEnabled={emailPasswordAuthEnabled}
        googleAction={googleAction}
        submitLabel="Sign in"
        title="Welcome back"
      />
    </PwaInstallProvider>,
  );

  return action;
}

describe("auth form", () => {
  beforeEach(() => {
    capacitorMocks.browserOpen.mockReset();
    capacitorMocks.signInWithOAuth.mockReset();
    capacitorMocks.isNativePlatform.mockReset();
    capacitorMocks.getPlatform.mockReset();
    capacitorMocks.isNativePlatform.mockReturnValue(false);
    capacitorMocks.getPlatform.mockReturnValue("web");
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

  it("keeps Google sign-in visible and gates email/password auth by default", () => {
    renderSignIn(vi.fn(async () => initialAuthFormState), vi.fn(async () => undefined), false);

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(document.querySelector('span[style*="google-g.svg"]')).toBeInTheDocument();
    expect(screen.getByText("OR")).toBeInTheDocument();
    expect(screen.getByText("Calm Wallet account")).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.getByText(/Sign in coming soon\.\s+Continue with Google for now\./)).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument();
  });

  it("restores email/password sign-in when the feature flag is enabled", () => {
    renderSignIn(vi.fn(async () => initialAuthFormState), vi.fn(async () => undefined), true);

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByText("OR")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("hides registration fields while email/password auth is gated", () => {
    renderSignUp(vi.fn(async () => initialAuthFormState), vi.fn(async () => undefined), false);

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByText("Calm Wallet account")).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign up" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Already have an account?" })).not.toBeInTheDocument();
  });

  it("restores Google sign-up and registration fields when the feature flag is enabled", () => {
    renderSignUp(vi.fn(async () => initialAuthFormState), vi.fn(async () => undefined), true);

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
  });

  it("updates gated auth copy from the public language selector and persists it locally", async () => {
    const { unmount } = render(
      <LocaleProvider savedLocale={null}>
        <PwaInstallProvider>
          <AuthForm
            action={vi.fn(async () => initialAuthFormState)}
            alternateHref="/sign-up"
            alternateLabel="Create an account"
            copyKeyPrefix="signIn"
            description="Review your spending, ask quick budget questions, and keep your plan in view."
            emailPasswordAuthEnabled={false}
            googleAction={vi.fn(async () => undefined)}
            submitLabel="Sign in"
            title="Welcome back"
          />
        </PwaInstallProvider>
      </LocaleProvider>,
    );

    expect(screen.getByText("Personal budget notebook")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Language" }));
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fran\u00e7ais" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rom\u00e2n\u0103" }));

    expect(screen.getByText("Caiet personal de buget")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bine ai revenit" })).toBeInTheDocument();
    expect(screen.getByText("Urm\u0103re\u0219te cheltuielile, adaug\u0103 venituri \u0219i r\u0103m\u00e2i la zi cu bugetul t\u0103u.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continu\u0103 cu Google" })).toBeInTheDocument();
    expect(screen.getByText("Cont Calm Wallet")).toBeInTheDocument();
    expect(screen.getByText("\u00cen cur\u00e2nd")).toBeInTheDocument();
    expect(screen.getByText(/Autentificare \u00een cur\u00e2nd\.\s+Folose\u0219te Google momentan\./)).toBeInTheDocument();
    expect(window.localStorage.getItem("calm-wallet-locale")).toBe("ro");

    unmount();

    render(
      <LocaleProvider savedLocale={null}>
        <PwaInstallProvider>
          <AuthForm
            action={vi.fn(async () => initialAuthFormState)}
            alternateHref="/sign-up"
            alternateLabel="Create an account"
            copyKeyPrefix="signIn"
            description="Review your spending, ask quick budget questions, and keep your plan in view."
            emailPasswordAuthEnabled={false}
            googleAction={vi.fn(async () => undefined)}
            submitLabel="Sign in"
            title="Welcome back"
          />
        </PwaInstallProvider>
      </LocaleProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Bine ai revenit" })).toBeInTheDocument();
    expect(screen.getByText("Cont Calm Wallet")).toBeInTheDocument();
  });

  it("submits the Google form through the provided auth action", async () => {
    const googleAction = vi.fn(async () => undefined);
    const emailAction = renderSignIn(vi.fn(async () => initialAuthFormState), googleAction);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => expect(googleAction).toHaveBeenCalledOnce());
    expect(emailAction).not.toHaveBeenCalled();
  });

  it("starts Google OAuth from the native WebView and opens the provider URL with Capacitor Browser", async () => {
    capacitorMocks.isNativePlatform.mockReturnValue(true);
    capacitorMocks.getPlatform.mockReturnValue("android");
    capacitorMocks.signInWithOAuth.mockResolvedValueOnce({
      data: {
        url: "https://accounts.google.com/o/oauth2/v2/auth?redirect_to=com.calmwallet.app%3A%2F%2Fauth%2Fcallback",
      },
      error: null,
    });
    const googleAction = vi.fn(async () => undefined);
    renderSignIn(vi.fn(async () => initialAuthFormState), googleAction);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => expect(capacitorMocks.signInWithOAuth).toHaveBeenCalledOnce());
    expect(capacitorMocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "com.calmwallet.app://auth/callback",
        skipBrowserRedirect: true,
      },
    });
    expect(capacitorMocks.browserOpen).toHaveBeenCalledWith({
      url: "https://accounts.google.com/o/oauth2/v2/auth?redirect_to=com.calmwallet.app%3A%2F%2Fauth%2Fcallback",
    });
    expect(googleAction).not.toHaveBeenCalled();
  });

  it("rejects mismatched sign-up passwords before submit", async () => {
    const action = renderSignUp();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Jordan Lee" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jordan@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "password456" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("submits sign-up when password fields match", async () => {
    const action = renderSignUp(vi.fn(async (): Promise<AuthFormState> => initialAuthFormState));

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Jordan Lee" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jordan@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
  });

  it("toggles sign-in password visibility", () => {
    renderSignIn();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("toggles sign-up password and confirm password visibility independently", () => {
    renderSignUp();
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show confirm password" }));
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Hide confirm password" }));
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("type", "password");
  });

  it("keeps registration password values when visibility toggles are tapped", () => {
    const action = renderSignUp();
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText("Confirm password") as HTMLInputElement;

    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

    expect(passwordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    fireEvent.click(screen.getByRole("button", { name: "Show confirm password" }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Password")).toHaveValue("password123");
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Confirm password")).toHaveValue("password123");
    expect(action).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide confirm password" }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Password")).toHaveValue("password123");
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Confirm password")).toHaveValue("password123");
    expect(action).not.toHaveBeenCalled();
  });

  it("shows the PWA install button when the browser install prompt is available", async () => {
    const prompt = vi.fn(async () => undefined);
    const userChoice = Promise.resolve({ outcome: "accepted" as const, platform: "web" });
    const installEvent = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted"; platform: string }>;
    };
    installEvent.prompt = prompt;
    installEvent.userChoice = userChoice;

    renderSignIn();
    act(() => {
      window.dispatchEvent(installEvent);
    });

    fireEvent.click(await screen.findByRole("button", { name: "Download app" }));

    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    expect(screen.queryByRole("button", { name: "Download app" })).not.toBeInTheDocument();
  });

  it("shows concise iOS home-screen guidance when the native prompt is unavailable", async () => {
    setNavigatorValue(
      "userAgent",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );
    setNavigatorValue("platform", "iPhone");
    setNavigatorValue("maxTouchPoints", 5);

    renderSignIn();

    expect(await screen.findByText("Install Calm Wallet on your home screen.")).toBeInTheDocument();
    expect(screen.getByText("Use Share \u2192 Add to Home Screen.")).toBeInTheDocument();
  });

  it("shows Android Chrome install guidance when the native prompt is unavailable", async () => {
    setNavigatorValue(
      "userAgent",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
    );
    setNavigatorValue("platform", "Linux armv8l");
    setNavigatorValue("maxTouchPoints", 5);

    renderSignIn();

    expect(await screen.findByText("Install Calm Wallet on your home screen.")).toBeInTheDocument();
    expect(screen.getByText("Open Chrome menu \u2192 Add to Home screen.")).toBeInTheDocument();
    expect(screen.getByText("Choose Install app if you see it.")).toBeInTheDocument();
    expect(screen.queryByText("Chrome controls this prompt.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Use Share/)).not.toBeInTheDocument();
  });

  it("shows generic browser install guidance when the native prompt is unavailable on desktop", async () => {
    renderSignIn();

    expect(await screen.findByText("Install Calm Wallet on your home screen.")).toBeInTheDocument();
    expect(screen.getByText("Use your browser menu to install the app.")).toBeInTheDocument();
  });

  it("hides PWA install affordances when already running standalone", () => {
    setDisplayMode(true);

    renderSignIn();

    expect(screen.queryByRole("button", { name: "Download app" })).not.toBeInTheDocument();
    expect(screen.queryByText("Install Calm Wallet on your home screen.")).not.toBeInTheDocument();
  });

  it("hides PWA install affordances when running fullscreen", () => {
    setDisplayMode(false, true);

    renderSignIn();

    expect(screen.queryByRole("button", { name: "Download app" })).not.toBeInTheDocument();
    expect(screen.queryByText("Install Calm Wallet on your home screen.")).not.toBeInTheDocument();
  });
});

describe("auth validation", () => {
  it("keeps minimum password length validation for sign-up", () => {
    const parsed = signUpSchema.safeParse({
      fullName: "Jordan Lee",
      email: "jordan@example.com",
      password: "short",
      confirmPassword: "short",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("Password must be at least 8 characters.");
    }
  });
});
