import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "src/supabase/migrations/20260714090000_admin_support_users_credits.sql"), "utf8");

describe("admin support users and credits migration", () => {
  it("adds a lightweight daily activity marker indexed for dashboard counts", () => {
    expect(migration).toContain("add column if not exists last_active_on date");
    expect(migration).toContain("idx_profiles_last_active_on");
    expect(migration).toContain("create or replace function public.mark_authenticated_app_activity()");
    expect(migration).toContain("last_active_on is null or last_active_on < current_date");
  });

  it("adds privacy-safe optional support diagnostics without blocking reports", () => {
    expect(migration).toContain("add column if not exists viewport_width integer");
    expect(migration).toContain("add column if not exists platform_summary text");
    expect(migration).toContain("add column if not exists pwa_display_mode text");
    expect(migration).toContain("add column if not exists online_state text");
  });

  it("creates an admin credit action audit table protected by support admin access", () => {
    expect(migration).toContain("create table if not exists public.admin_credit_actions");
    expect(migration).toContain("operation_key text not null unique");
    expect(migration).toContain("alter table public.admin_credit_actions enable row level security");
    expect(migration).toContain("public.is_support_admin(auth.uid())");
  });
});
