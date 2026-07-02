import { describe, expect, it, vi } from "vitest";
import { checkProductionSchema, REQUIRED_SCHEMA } from "../../../scripts/check-production-schema";

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

function makeFetch(statuses: boolean[]) {
  const fetchImpl = vi.fn(async () => {
    const ok = statuses.shift() ?? true;
    return {
      ok,
      status: ok ? 200 : 404,
    };
  });

  return fetchImpl;
}

describe("production schema drift guard", () => {
  it("passes when all required schema exists", async () => {
    const fetchImpl = makeFetch(REQUIRED_SCHEMA.map(() => true));

    const result = await checkProductionSchema({ env, fetchImpl, required: true });

    expect(result.status).toBe("passed");
    expect(fetchImpl).toHaveBeenCalledTimes(REQUIRED_SCHEMA.length);
    expect(result.message).toBe(`Production schema check passed for ${REQUIRED_SCHEMA.length} required objects.`);
  });

  it("reports a missing table with clear copy", async () => {
    const fetchImpl = makeFetch([false, true, true, true, true, true]);

    const result = await checkProductionSchema({ env, fetchImpl, required: true });

    expect(result.status).toBe("failed");
    expect(result.message).toContain("Production schema drift detected.");
    expect(result.message).toContain("- public.recurring_rules");
    expect(result.message).toContain("Apply pending Supabase migrations before deploying app code.");
  });

  it("reports a missing column with clear copy", async () => {
    const fetchImpl = makeFetch([true, false, true, true, true, true]);

    const result = await checkProductionSchema({ env, fetchImpl, required: true });

    expect(result.status).toBe("failed");
    expect(result.message).toContain("- public.transactions.recurring_rule_id");
    expect(result.message).not.toContain("- public.budgets.period");
    expect(result.message).not.toContain("service-role-key");
  });

  it("reports missing repeating limit columns with clear copy", async () => {
    const fetchImpl = makeFetch([true, true, true, false, true, false]);

    const result = await checkProductionSchema({ env, fetchImpl, required: true });

    expect(result.status).toBe("failed");
    expect(result.message).toContain("- public.budgets.period");
    expect(result.message).toContain("- public.budgets.is_active");
    expect(result.message).toContain("Apply pending Supabase migrations before deploying app code.");
  });

  it("skips calmly when env vars are missing for the optional command", async () => {
    const fetchImpl = makeFetch([true]);

    const result = await checkProductionSchema({ env: {}, fetchImpl, required: false });

    expect(result.status).toBe("skipped");
    expect(result.message).toContain("Production schema check skipped");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails clearly when env vars are missing for the required command", async () => {
    const fetchImpl = makeFetch([true]);

    const result = await checkProductionSchema({ env: {}, fetchImpl, required: true });

    expect(result.status).toBe("failed");
    expect(result.message).toContain("Production schema check failed");
    expect(result.message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(result.message).toContain("SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
