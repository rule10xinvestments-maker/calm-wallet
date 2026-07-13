import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedSession = vi.fn();
const assertSupportAdmin = vi.fn();
const findAdminUserByExactEmail = vi.fn();
const grantAdminCredits = vi.fn();
const setAdminUnlimited = vi.fn();
const rpc = vi.fn();
const createSupabaseServerClient = vi.fn(async () => ({ rpc }));

vi.mock("@/lib/auth/guards", () => ({
  requireAuthenticatedSession,
}));

vi.mock("@/domain/admin-support/service", () => ({
  adminCreditReasonCategories: ["giveaway", "promotion", "support_correction", "testing", "billing_correction", "other"],
  assertSupportAdmin,
  findAdminUserByExactEmail,
  grantAdminCredits,
  setAdminUnlimited,
}));

vi.mock("@/lib/auth/server-client", () => ({
  createSupabaseServerClient,
}));

describe("admin support actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedSession.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    assertSupportAdmin.mockResolvedValue(undefined);
    findAdminUserByExactEmail.mockResolvedValue(makeLookup());
    grantAdminCredits.mockResolvedValue({ user_id: "user-1", credit_balance: 35 });
    setAdminUnlimited.mockResolvedValue(undefined);
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it("rejects non-admin credit grants safely", async () => {
    assertSupportAdmin.mockRejectedValueOnce(new Error("admin_forbidden"));
    const { grantCreditsAdminAction } = await import("@/lib/actions/admin-support");
    const formData = validGrantFormData();

    const result = await grantCreditsAdminAction(initialActionState(), formData);

    expect(grantAdminCredits).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", message: "Credits could not be added.", user: null, email: "user@example.com" });
  });

  it("validates positive whole-number credit grants, stores admin metadata, and returns updated user state", async () => {
    const { grantCreditsAdminAction } = await import("@/lib/actions/admin-support");
    const formData = validGrantFormData();

    const result = await grantCreditsAdminAction(initialActionState(), formData);

    expect(grantAdminCredits).toHaveBeenCalledWith({
      targetUserId: "11111111-1111-1111-1111-111111111111",
      actingAdminId: "admin-1",
      amount: 5,
      reasonCategory: "giveaway",
      internalNote: "Launch gift",
      operationKey: "admin-credit:grant-operation-1",
    });
    expect(findAdminUserByExactEmail).toHaveBeenCalledWith("user@example.com");
    expect(result).toEqual({ status: "success", message: "5 credits added.", user: makeLookup(), email: "user@example.com" });
  });

  it("rejects decimal credit grants", async () => {
    const { grantCreditsAdminAction } = await import("@/lib/actions/admin-support");
    const formData = validGrantFormData();
    formData.set("amount", "1.5");

    const result = await grantCreditsAdminAction(initialActionState(), formData);

    expect(grantAdminCredits).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
  });

  it("requires explicit confirmation before removing Unlimited", async () => {
    const { updateUnlimitedAdminAction } = await import("@/lib/actions/admin-support");
    const formData = validUnlimitedFormData();
    formData.set("mode", "remove");

    const result = await updateUnlimitedAdminAction(initialActionState(), formData);

    expect(setAdminUnlimited).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", message: "Confirm removal before continuing.", user: null, email: "user@example.com" });
  });

  it("grants Unlimited and returns refreshed account state without redirecting", async () => {
    const { updateUnlimitedAdminAction } = await import("@/lib/actions/admin-support");
    const formData = validUnlimitedFormData();

    const result = await updateUnlimitedAdminAction(initialActionState(), formData);

    expect(setAdminUnlimited).toHaveBeenCalledWith({
      targetUserId: "11111111-1111-1111-1111-111111111111",
      actingAdminId: "admin-1",
      reasonCategory: "testing",
      internalNote: "QA",
      operationKey: "admin-unlimited:unlimited-operation-1",
      mode: "grant_one_year",
    });
    expect(result.status).toBe("success");
    expect(result.message).toBe("Unlimited granted.");
  });

  it("marks authenticated app activity through a best-effort RPC", async () => {
    const { markAuthenticatedAppActivityAction } = await import("@/lib/actions/admin-support");

    await markAuthenticatedAppActivityAction();

    expect(rpc).toHaveBeenCalledWith("mark_authenticated_app_activity");
  });
});

function initialActionState() {
  return { status: "idle" as const, message: null, user: null, email: "" };
}

function makeLookup() {
  return {
    userId: "11111111-1111-1111-1111-111111111111",
    email: "user@example.com",
    creditBalance: 35,
    recurringGraceDebt: 0,
    unlimitedUntil: "2027-07-14T00:00:00.000Z",
    unlimitedActive: true,
    recentLedgerEvents: [],
  };
}

function validGrantFormData() {
  const formData = new FormData();
  formData.set("targetUserId", "11111111-1111-1111-1111-111111111111");
  formData.set("email", " User@Example.com ");
  formData.set("amount", "5");
  formData.set("reasonCategory", "giveaway");
  formData.set("internalNote", "Launch gift");
  formData.set("operationKey", "grant-operation-1");
  return formData;
}

function validUnlimitedFormData() {
  const formData = new FormData();
  formData.set("targetUserId", "11111111-1111-1111-1111-111111111111");
  formData.set("email", "user@example.com");
  formData.set("reasonCategory", "testing");
  formData.set("internalNote", "QA");
  formData.set("operationKey", "unlimited-operation-1");
  formData.set("mode", "grant_one_year");
  return formData;
}
