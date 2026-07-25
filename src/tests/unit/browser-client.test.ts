import { beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClient = vi.fn(() => ({ auth: {} }));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient,
}));

describe("Supabase browser client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
  });

  it("creates the browser client with explicit public Supabase variables", async () => {
    const { createSupabaseBrowserClient } = await import("@/lib/auth/browser-client");

    createSupabaseBrowserClient();

    expect(createBrowserClient).toHaveBeenCalledWith("https://project.supabase.co", "public-anon-key");
  });

  it("throws an internal missing URL error without leaking secret values", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    const { createSupabaseBrowserClient } = await import("@/lib/auth/browser-client");

    expect(() => createSupabaseBrowserClient()).toThrow("Missing required public Supabase URL.");

    try {
      createSupabaseBrowserClient();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain("public-anon-key");
    }
  });

  it("throws an internal missing anon key error without leaking URL values", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    const { createSupabaseBrowserClient } = await import("@/lib/auth/browser-client");

    expect(() => createSupabaseBrowserClient()).toThrow("Missing required public Supabase anon key.");

    try {
      createSupabaseBrowserClient();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain("https://project.supabase.co");
    }
  });
});
