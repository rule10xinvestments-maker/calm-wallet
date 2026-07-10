import { beforeEach, describe, expect, it, vi } from "vitest";

const queryLog: Array<{ table: string; kind: string; payload?: unknown; filters: Array<[string, string, unknown]> }> = [];
const createSupabaseAdminClient = vi.fn();

vi.mock("@/lib/server/supabase-admin", () => ({
  createSupabaseAdminClient,
}));

function makeQuery(table: string) {
  const entry = { table, kind: "", payload: undefined as unknown, filters: [] as Array<[string, string, unknown]> };
  queryLog.push(entry);

  return {
    select() {
      entry.kind = "select";
      return this;
    },
    update(payload: unknown) {
      entry.kind = "update";
      entry.payload = payload;
      return this;
    },
    eq(column: string, value: unknown) {
      entry.filters.push(["eq", column, value]);
      return this;
    },
    lte(column: string, value: unknown) {
      entry.filters.push(["lte", column, value]);
      return Promise.resolve({ count: entry.kind === "select" ? 2 : 1, error: null });
    },
  };
}

describe("support maintenance", () => {
  beforeEach(() => {
    queryLog.length = 0;
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => makeQuery(table)),
    });
  });

  it("closes old resolved tickets and archives old closed tickets with safe counts", async () => {
    const { runSupabaseSupportMaintenance } = await import("@/lib/server/support-maintenance");

    const summary = await runSupabaseSupportMaintenance(new Date("2026-07-10T00:00:00.000Z"));

    expect(summary).toEqual({
      scanned_resolved: 2,
      closed: 1,
      scanned_closed: 2,
      archived: 1,
      errors: 0,
    });
    expect(queryLog).toHaveLength(4);
    expect(queryLog[1]).toMatchObject({
      table: "support_tickets",
      kind: "update",
      payload: expect.objectContaining({ status: "closed" }),
    });
    expect(queryLog[3]).toMatchObject({
      table: "support_tickets",
      kind: "update",
      payload: expect.objectContaining({ status: "archived" }),
    });
  });

  it("returns an error count when service-role access is unavailable", async () => {
    createSupabaseAdminClient.mockReturnValueOnce(null);
    const { runSupabaseSupportMaintenance } = await import("@/lib/server/support-maintenance");

    await expect(runSupabaseSupportMaintenance()).resolves.toMatchObject({ errors: 1 });
  });
});
