import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/components/auth/auth-form";
import { initialAuthFormState, type AuthFormState } from "@/lib/auth/form-state";
import { signUpSchema } from "@/lib/auth/validation";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

function setDisplayMode(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
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
) {
  render(
    <AuthForm
      action={action}
      alternateHref="/sign-in"
      alternateLabel="Already have an account?"
      description="Start with a simple spending home designed for calm daily check-ins."
      googleAction={googleAction}
      includeFullName
      submitLabel="Sign up"
      title="Create your notebook"
    />,
  );

  return action;
}

function renderSignIn(
  action = vi.fn(async () => initialAuthFormState),
  googleAction?: (formData: FormData) => Promise<void>,
) {
  render(
    <AuthForm
      action={action}
      alternateHref="/sign-up"
      alternateLabel="Create an account"
      description="Review your spending, ask quick budget questions, and keep your plan in view."
      googleAction={googleAction}
      submitLabel="Sign in"
      title="Welcome back"
    />,
  );

  return action;
}

describe("auth form", () => {
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

  it("renders Google sign-in without removing email and password auth", () => {
    renderSignIn(vi.fn(async () => initialAuthFormState), vi.fn(async () => undefined));

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByText("or")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("renders Google sign-up as an option", () => {
    renderSignUp(vi.fn(async () => initialAuthFormState), vi.fn(async () => undefined));

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
  });

  it("submits the Google form through the provided auth action", async () => {
    const googleAction = vi.fn(async () => undefined);
    const emailAction = renderSignIn(vi.fn(async () => initialAuthFormState), googleAction);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => expect(googleAction).toHaveBeenCalledOnce());
    expect(emailAction).not.toHaveBeenCalled();
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

    expect(await screen.findByText("Install Calm Ledger on your home screen.")).toBeInTheDocument();
    expect(screen.getByText("Use Share → Add to Home Screen.")).toBeInTheDocument();
  });

  it("hides PWA install affordances when already running standalone", () => {
    setDisplayMode(true);

    renderSignIn();

    expect(screen.queryByRole("button", { name: "Download app" })).not.toBeInTheDocument();
    expect(screen.queryByText("Install Calm Ledger on your home screen.")).not.toBeInTheDocument();
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
