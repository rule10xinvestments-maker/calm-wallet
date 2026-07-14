import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialAccountDeletionActionState } from "@/lib/actions/account-deletion-state";

const authSession = vi.hoisted(() => ({ current: { user: null as { id: string; email?: string | null } | null } }));
const executeAccountDeletion = vi.hoisted(() => vi.fn());
const requestPublicDeletionVerification = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  getAuthSession: async () => authSession.current,
}));

vi.mock("@/domain/account-deletion/service", async () => {
  const actual = await vi.importActual<typeof import("@/domain/account-deletion/service")>("@/domain/account-deletion/service");
  return {
    ...actual,
    executeAccountDeletion,
    requestPublicDeletionVerification,
  };
});

vi.mock("@/lib/auth/server-client", () => ({
  createSupabaseServerClient: async () => ({ auth: { signOut } }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => (name === "x-forwarded-for" ? "127.0.0.1" : null),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

function deletionForm(overrides: Record<string, string | boolean> = {}) {
  const formData = new FormData();
  formData.set("locale", String(overrides.locale ?? "en"));
  formData.set("source", String(overrides.source ?? "in_app"));
  formData.set("confirmationText", String(overrides.confirmationText ?? "DELETE"));
  if (overrides.confirmed ?? true) {
    formData.set("confirmed", "on");
  }
  return formData;
}

describe("account deletion actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSession.current = { user: null };
  });

  it("rejects unauthorized direct deletion action calls", async () => {
    const { deleteSignedInAccountAction } = await import("@/lib/actions/account-deletion");

    const result = await deleteSignedInAccountAction(initialAccountDeletionActionState, deletionForm());

    expect(result.status).toBe("error");
    expect(executeAccountDeletion).not.toHaveBeenCalled();
  });

  it("requires the checkbox and localized typed confirmation", async () => {
    authSession.current = { user: { id: "user-1", email: "user@example.com" } };
    const { deleteSignedInAccountAction } = await import("@/lib/actions/account-deletion");

    const missingCheckbox = await deleteSignedInAccountAction(
      initialAccountDeletionActionState,
      deletionForm({ confirmed: false }),
    );
    const wrongText = await deleteSignedInAccountAction(
      initialAccountDeletionActionState,
      deletionForm({ locale: "ro", confirmationText: "DELETE" }),
    );

    expect(missingCheckbox.status).toBe("error");
    expect(wrongText.status).toBe("error");
    expect(executeAccountDeletion).not.toHaveBeenCalled();
  });

  it("executes signed-in deletion, signs out, and redirects to completion", async () => {
    authSession.current = { user: { id: "user-1", email: "user@example.com" } };
    executeAccountDeletion.mockResolvedValueOnce({ requestId: "request-1", status: "completed" });
    const { deleteSignedInAccountAction } = await import("@/lib/actions/account-deletion");

    await expect(deleteSignedInAccountAction(initialAccountDeletionActionState, deletionForm())).rejects.toThrow(
      "NEXT_REDIRECT:/account-deleted",
    );

    expect(executeAccountDeletion).toHaveBeenCalledWith({
      userId: "user-1",
      email: "user@example.com",
      source: "in_app",
    });
    expect(signOut).toHaveBeenCalled();
  });

  it("keeps public deletion request responses non-enumerating", async () => {
    requestPublicDeletionVerification.mockRejectedValueOnce(new Error("raw failure"));
    const { requestPublicAccountDeletionAction } = await import("@/lib/actions/account-deletion");
    const formData = new FormData();
    formData.set("email", "unknown@example.com");

    const result = await requestPublicAccountDeletionAction(initialAccountDeletionActionState, formData);

    expect(result.status).toBe("success");
    expect(result.message).toContain("If the email is linked");
  });
});
