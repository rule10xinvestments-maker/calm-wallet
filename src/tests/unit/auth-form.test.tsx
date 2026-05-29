import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/components/auth/auth-form";
import { initialAuthFormState, type AuthFormState } from "@/lib/auth/form-state";
import { signUpSchema } from "@/lib/auth/validation";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

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
