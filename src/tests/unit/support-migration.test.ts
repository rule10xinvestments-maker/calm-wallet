import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("src/supabase/migrations/20260710170000_support_tickets.sql", "utf8");

describe("support migration", () => {
  it("uses a dedicated admin_users table keyed by auth user id", () => {
    expect(migration).toContain("create table if not exists public.admin_users");
    expect(migration).toContain("user_id uuid primary key references auth.users(id)");
    expect(migration).toContain("create or replace function public.is_support_admin(check_user_id uuid)");
    expect(migration).not.toMatch(/gmail\.com/i);
  });

  it("enables support ticket RLS for own inserts and admin updates", () => {
    expect(migration).toContain("alter table public.support_tickets enable row level security");
    expect(migration).toContain('create policy "support_tickets_insert_own"');
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).toContain("status = 'new'");
    expect(migration).toContain("admin_note is null");
    expect(migration).toContain('create policy "support_tickets_update_admin"');
    expect(migration).toContain("public.is_support_admin(auth.uid())");
  });

  it("bootstraps only the confirmed stable admin uuid without guessing email", () => {
    expect(migration).toContain("where users.id = '0fed2138-b066-4697-8b8d-e6b79ee8a7f1'");
    expect(migration).toContain("on conflict (user_id) do nothing");
  });
});
