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

function renderSignUp(action = vi.fn(async () => initialAuthFormState)) {
  render(
    <AuthForm
      action={action}
      alternateHref="/sign-in"
      alternateLabel="Already have an account?"
      description="Start with a simple spending home designed for calm daily check-ins."
      includeFullName
      submitLabel="Sign up"
      title="Create your notebook"
    />,
  );

  return action;
}

function renderSignIn(action = vi.fn(async () => initialAuthFormState)) {
  render(
    <AuthForm
      action={action}
      alternateHref="/sign-up"
      alternateLabel="Create an account"
      description="Review your spending, ask quick budget questions, and keep your plan in view."
      submitLabel="Sign in"
      title="Welcome back"
    />,
  );

  return action;
}

describe("auth form", () => {
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
