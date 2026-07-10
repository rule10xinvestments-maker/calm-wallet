import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedSession = vi.fn();
const createTicket = vi.fn();
const isAdmin = vi.fn();
const updateTicket = vi.fn();
const createSupabaseSupportService = vi.fn(async () => ({
  createTicket,
  isAdmin,
  updateTicket,
}));
const revalidatePath = vi.fn();
const headers = vi.fn(async () => ({
  get: (name: string) => (name.toLowerCase() === "user-agent" ? "server-agent" : null),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireAuthenticatedSession,
}));

vi.mock("@/domain/support/service", () => ({
  createSupabaseSupportService,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("next/headers", () => ({
  headers,
}));

describe("support actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedSession.mockResolvedValue({ user: { id: "user-1", email: "user@example.com" } });
    createTicket.mockResolvedValue({ id: "ticket-1" });
    isAdmin.mockResolvedValue(true);
    updateTicket.mockResolvedValue({ id: "ticket-1", status: "resolved" });
  });

  it("creates support tickets for the authenticated user with safe metadata", async () => {
    const { createSupportTicketAction } = await import("@/lib/actions/support");
    const formData = new FormData();
    formData.set("category", "bug");
    formData.set("subject", "Small bug");
    formData.set("message", "The support form works.");
    formData.set("locale", "ro");
    formData.set("sourceRoute", "/assistant");
    formData.set("userAgent", "client-agent");

    const result = await createSupportTicketAction({ status: "idle", message: null }, formData);

    expect(createTicket).toHaveBeenCalledWith(
      { id: "user-1", email: "user@example.com" },
      expect.objectContaining({
        category: "bug",
        subject: "Small bug",
        message: "The support form works.",
        locale: "ro",
        sourceRoute: "/assistant",
        userAgent: "client-agent",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin/support");
    expect(result).toEqual({ status: "success", message: "Message sent" });
  });

  it("returns calm error copy when support submission fails", async () => {
    createTicket.mockRejectedValueOnce(new Error("raw supabase stack"));
    const { createSupportTicketAction } = await import("@/lib/actions/support");
    const formData = new FormData();
    formData.set("category", "help");
    formData.set("message", "Help");

    const result = await createSupportTicketAction({ status: "idle", message: null }, formData);

    expect(result.status).toBe("error");
    expect(result.message).toBe("Support message could not be sent. Please try again.");
  });

  it("maps duplicate submission cooldown to calm copy", async () => {
    createTicket.mockRejectedValueOnce(new Error("support_rate_limited"));
    const { createSupportTicketAction } = await import("@/lib/actions/support");
    const formData = new FormData();
    formData.set("category", "help");
    formData.set("message", "Help");

    const result = await createSupportTicketAction({ status: "idle", message: null }, formData);

    expect(result.status).toBe("error");
    expect(result.message).toBe("Please wait a moment before sending another message.");
  });

  it("prevents non-admins from updating support tickets", async () => {
    isAdmin.mockResolvedValueOnce(false);
    const { updateSupportTicketAdminAction } = await import("@/lib/actions/support");
    const formData = new FormData();
    formData.set("ticketId", "11111111-1111-1111-1111-111111111111");
    formData.set("status", "resolved");
    formData.set("adminNote", "Done");

    const result = await updateSupportTicketAdminAction({ status: "idle", message: null }, formData);

    expect(updateTicket).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("Support ticket could not be updated.");
  });

  it("lets admins update status and internal note", async () => {
    const { updateSupportTicketAdminAction } = await import("@/lib/actions/support");
    const formData = new FormData();
    formData.set("ticketId", "11111111-1111-1111-1111-111111111111");
    formData.set("status", "resolved");
    formData.set("adminNote", "Handled");

    const result = await updateSupportTicketAdminAction({ status: "idle", message: null }, formData);

    expect(updateTicket).toHaveBeenCalledWith("user-1", {
      ticketId: "11111111-1111-1111-1111-111111111111",
      status: "resolved",
      adminNote: "Handled",
    });
    expect(result.status).toBe("success");
  });
});
