import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "src/supabase/migrations/20260713090000_credits_phase1.sql"),
  "utf8",
);

describe("credits phase 1 migration", () => {
  it("uses a partial unique index for non-null ledger operation keys", () => {
    expect(migration).toContain("create unique index if not exists idx_credit_ledger_operation_key");
    expect(migration).toContain("on public.credit_ledger(operation_key)");
    expect(migration).toContain("where operation_key is not null");
    expect(migration).not.toContain("operation_key text not null");
  });

  it("matches operation-key ON CONFLICT targets to the partial unique index", () => {
    expect(migration).not.toMatch(/on conflict \(operation_key\) do nothing/i);
    expect(migration.match(/on conflict \(operation_key\) where operation_key is not null do nothing/g)).toHaveLength(2);
  });

  it("keeps welcome grants idempotent across provisioning and backfill retries", () => {
    expect(migration).toContain("'welcome_grant:' || p_user_id::text");
    expect(migration).toContain("'welcome_grant:' || users.id::text");
    expect(migration).toContain("insert into public.credit_accounts (user_id, credit_balance)");
    expect(migration).toContain("on conflict (user_id) do nothing");
  });

  it("can be rerun after a partial SQL Editor execution", () => {
    expect(migration).toContain("create table if not exists public.credit_accounts");
    expect(migration).toContain("create table if not exists public.credit_ledger");
    expect(migration).toContain("drop trigger if exists set_credit_accounts_updated_at on public.credit_accounts");
    expect(migration).toContain('drop policy if exists "credit_accounts_select_own" on public.credit_accounts');
    expect(migration).toContain('drop policy if exists "credit_ledger_select_own" on public.credit_ledger');
    expect(migration).toContain("create or replace function public.ensure_credit_account");
    expect(migration).toContain("create or replace function public.create_transaction_with_credit");
  });

  it("does not rely on client-side credit grants or broad ledger access", () => {
    expect(migration).toContain("alter table public.credit_ledger enable row level security");
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).not.toContain("disable row level security");
  });
});
