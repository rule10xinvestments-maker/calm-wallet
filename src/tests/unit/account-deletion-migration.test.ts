import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "src/supabase/migrations/20260714110000_account_deletion_requests.sql"),
  "utf8",
);

describe("account deletion migration", () => {
  it("creates an audited deletion request model with RLS", () => {
    expect(migration).toContain("create table if not exists public.account_deletion_requests");
    expect(migration).toContain("status in ('requested', 'verified', 'processing', 'completed', 'failed')");
    expect(migration).toContain("alter table public.account_deletion_requests enable row level security");
    expect(migration).toContain("account_deletion_requests_select_own");
    expect(migration).toContain("account_deletion_requests_select_admin");
  });

  it("anonymizes retained support, credit, and admin audit records before auth deletion", () => {
    expect(migration).toContain("alter column user_id drop not null");
    expect(migration).toContain("references auth.users(id)\n    on delete set null");
    expect(migration).toContain("message = '[account deleted]'");
    expect(migration).toContain("metadata = jsonb_build_object('account_deleted', true");
    expect(migration).toContain("set target_user_id = null");
    expect(migration).toContain("set acting_admin_id = null");
  });

  it("keeps account cleanup behind a service-role-only RPC", () => {
    expect(migration).toContain("create or replace function public.cleanup_account_for_deletion");
    expect(migration).toContain("security definer");
    expect(migration).toContain("revoke all on function public.cleanup_account_for_deletion(uuid, uuid) from authenticated");
    expect(migration).toContain("grant execute on function public.cleanup_account_for_deletion(uuid, uuid) to service_role");
  });
});
