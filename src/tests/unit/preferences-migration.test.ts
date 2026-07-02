import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("user preferences migration", () => {
  const migration = readFileSync(
    join(process.cwd(), "src/supabase/migrations/20260702203000_add_profiles_ui_locale.sql"),
    "utf8",
  );

  it("adds a constrained UI locale preference to profiles", () => {
    expect(migration).toContain("add column if not exists ui_locale text");
    expect(migration).toContain("profiles_ui_locale_check");
    expect(migration).toContain("ui_locale in ('en', 'ro', 'fr', 'es')");
  });

  it("keeps ownership on existing profiles RLS instead of adding broad access", () => {
    expect(migration).not.toContain("disable row level security");
    expect(migration).not.toContain("service_role");
  });
});
