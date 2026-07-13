import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("legal acceptance migration", () => {
  const migration = readFileSync(
    join(process.cwd(), "src/supabase/migrations/20260713170000_add_legal_acceptance_to_profiles.sql"),
    "utf8",
  );

  it("adds versioned legal acceptance fields to profiles", () => {
    expect(migration).toContain("accepted_terms_version text");
    expect(migration).toContain("accepted_privacy_version text");
    expect(migration).toContain("accepted_refund_version text");
    expect(migration).toContain("accepted_ai_version text");
    expect(migration).toContain("legal_accepted_at timestamptz");
  });

  it("keeps the migration idempotent and does not weaken RLS", () => {
    expect(migration).toContain("add column if not exists");
    expect(migration).toContain("create index if not exists");
    expect(migration).not.toContain("disable row level security");
    expect(migration).not.toContain("service_role");
  });
});
