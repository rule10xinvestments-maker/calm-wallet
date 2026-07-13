import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedSession = vi.fn();
const acceptCurrentLegalDocuments = vi.fn();
const createSupabaseLegalAcceptanceService = vi.fn(async () => ({
  acceptCurrentLegalDocuments,
}));
const revalidatePath = vi.fn();

vi.mock("@/lib/auth/guards", () => ({
  requireAuthenticatedSession,
}));

vi.mock("@/domain/legal/service", () => ({
  createSupabaseLegalAcceptanceService,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

describe("legal acceptance action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedSession.mockResolvedValue({ user: { id: "user-1" } });
    acceptCurrentLegalDocuments.mockResolvedValue({
      userId: "user-1",
      acceptedAt: "2026-07-13T12:00:00.000Z",
    });
  });

  it("persists legal acceptance for the authenticated user", async () => {
    const { acceptLegalDocumentsAction } = await import("@/lib/actions/legal");
    const formData = new FormData();
    formData.set("accepted", "on");

    const result = await acceptLegalDocumentsAction({ status: "idle", message: null }, formData);

    expect(acceptCurrentLegalDocuments).toHaveBeenCalledWith("user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/assistant");
    expect(revalidatePath).toHaveBeenCalledWith("/transactions");
    expect(revalidatePath).toHaveBeenCalledWith("/insights");
    expect(result.status).toBe("success");
  });

  it("does not persist until the checkbox is selected", async () => {
    const { acceptLegalDocumentsAction } = await import("@/lib/actions/legal");

    const result = await acceptLegalDocumentsAction({ status: "idle", message: null }, new FormData());

    expect(acceptCurrentLegalDocuments).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
  });
});
