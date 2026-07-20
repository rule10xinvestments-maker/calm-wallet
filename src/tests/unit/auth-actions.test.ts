import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
const revalidatePath = vi.fn();
const signInWithOAuth = vi.fn();
const signInWithPassword = vi.fn();
const signUp = vi.fn();
const signOut = vi.fn();
const createSupabaseServerClient = vi.fn(async () => ({
  auth: {
    signInWithOAuth,
    signInWithPassword,
    signUp,
    signOut,
  },
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/lib/auth/server-client", () => ({
  createSupabaseServerClient,
}));

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "https://calm-ledger.example";
  });

  it("starts Google OAuth with Supabase and redirects to the provider URL", async () => {
    signInWithOAuth.mockResolvedValueOnce({
      data: {
        url: "https://accounts.google.com/o/oauth2/v2/auth",
      },
      error: null,
    });
    const { signInWithGoogleAction } = await import("@/lib/auth/actions");

    await expect(signInWithGoogleAction(new FormData())).rejects.toThrow("redirect:https://accounts.google.com/o/oauth2/v2/auth");

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://calm-ledger.example/auth/callback",
      },
    });
    expect(redirect).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/v2/auth");
  });

  it("uses the native app callback URL for Google OAuth inside the Android shell", async () => {
    signInWithOAuth.mockResolvedValueOnce({
      data: {
        url: "https://accounts.google.com/o/oauth2/v2/auth",
      },
      error: null,
    });
    const formData = new FormData();
    formData.set("nativeShell", "true");
    formData.set("next", "/assistant");
    const { signInWithGoogleAction } = await import("@/lib/auth/actions");

    await expect(signInWithGoogleAction(formData)).rejects.toThrow("redirect:https://accounts.google.com/o/oauth2/v2/auth");

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "com.calmwallet.app://auth/callback?next=%2Fassistant",
      },
    });
  });

  it("keeps email/password sign-in using the password auth path", async () => {
    signInWithPassword.mockResolvedValueOnce({ error: null });
    const { signInAction } = await import("@/lib/auth/actions");
    const formData = new FormData();
    formData.set("email", "jordan@example.com");
    formData.set("password", "password123");

    await expect(signInAction({ error: null, success: null }, formData)).rejects.toThrow("redirect:/assistant");

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "jordan@example.com",
      password: "password123",
    });
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("uses a calm sign-in error redirect when Google OAuth cannot start", async () => {
    signInWithOAuth.mockResolvedValueOnce({
      data: {
        url: null,
      },
      error: new Error("Provider disabled"),
    });
    const { signInWithGoogleAction } = await import("@/lib/auth/actions");

    await expect(signInWithGoogleAction(new FormData())).rejects.toThrow(
      "redirect:/sign-in?next=%2Fassistant&error=We+couldn%27t+complete+your+sign-in.+Please+try+again.",
    );
  });
});
