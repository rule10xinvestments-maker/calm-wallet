import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedSession = vi.fn();
const assertSupportAdmin = vi.fn();
const grantAdminCredits = vi.fn();
const setAdminUnlimited = vi.fn();
const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
const rpc = vi.fn();
const createSupabaseServerClient = vi.fn(async () => ({ rpc }));

vi.mock("@/lib/auth/guards", () => ({
  requireAuthenticatedSession,
}));

vi.mock("@/domain/admin-support/service", () => ({
  adminCreditReasonCategories: ["giveaway", "promotion", "support_correction", "testing", "billing_correction", "other"],
  assertSupportAdmin,
  grantAdminCredits,
  setAdminUnlimited,
}));

vi.mock("@/lib/auth/server-client", () => ({
  createSupabaseServerClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

describe("admin support actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedSession.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    assertSupportAdmin.mockResolvedValue(undefined);
    grantAdminCredits.mockResolvedValue({ user_id: "user-1", credit_balance: 35 });
    setAdminUnlimited.mockResolvedValue(undefined);
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it("rejects non-admin credit grants safely", async () => {
    assertSupportAdmin.mockRejectedValueOnce(new Error("admin_forbidden"));
    const { grantCreditsAdminAction } = await import("@/lib/actions/admin-support");
    const formData = validGrantFormData();

    const result = await grantCreditsAdminAction({ status: "idle", message: null }, formData);

    expect(grantAdminCredits).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", message: "Credits could not be added." });
  });

  it("validates positive whole-number credit grants and stores admin metadata", async () => {
    const { grantCreditsAdminAction } = await import("@/lib/actions/admin-support");
    const formData = validGrantFormData();

    await expect(grantCreditsAdminAction({ status: "idle", message: null }, formData)).rejects.toThrow("redirect:/admin/support?tab=users&email=user%40example.com&updated=credits");

    expect(grantAdminCredits).toHaveBeenCalledWith({
      targetUserId: "11111111-1111-1111-1111-111111111111",
      actingAdminId: "admin-1",
      amount: 5,
      reasonCategory: "giveaway",
      internalNote: "Launch gift",
      operationKey: "admin-credit:grant-operation-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/support");
  });

  it("rejects decimal credit grants", async () => {
    const { grantCreditsAdminAction } = await import("@/lib/actions/admin-support");
    const formData = validGrantFormData();
    formData.set("amount", "1.5");

    const result = await grantCreditsAdminAction({ status: "idle", message: null }, formData);

    expect(grantAdminCredits).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
  });

  it("requires explicit confirmation before removing Unlimited", async () => {
    const { updateUnlimitedAdminAction } = await import("@/lib/actions/admin-support");
    const formData = validUnlimitedFormData();
    formData.set("mode", "remove");

    const result = await updateUnlimitedAdminAction({ status: "idle", message: null }, formData);

    expect(setAdminUnlimited).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", message: "Confirm removal before continuing." });
  });

  it("marks authenticated app activity through a best-effort RPC", async () => {
    const { markAuthenticatedAppActivityAction } = await import("@/lib/actions/admin-support");

    await markAuthenticatedAppActivityAction();

    expect(rpc).toHaveBeenCalledWith("mark_authenticated_app_activity");
  });
});

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
