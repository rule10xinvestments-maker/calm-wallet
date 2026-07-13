import { describe, expect, it, vi } from "vitest";
import { createSupportService } from "@/domain/support/service";
import type { SupportTicketRow } from "@/domain/support/types";

function makeTicket(overrides: Partial<SupportTicketRow> = {}): SupportTicketRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "user-1",
    user_email: "user@example.com",
    category: "app_bug",
    subject: null,
    message: "Something is not working.",
    status: "new",
    locale: "en",
    source_route: "/assistant",
    user_agent: "test-agent",
    app_version: null,
    viewport_width: null,
    viewport_height: null,
    platform_summary: null,
    pwa_display_mode: null,
    timezone: null,
    online_state: null,
    admin_note: null,
    assigned_admin_id: null,
    created_at: "2026-07-10T10:00:00.000Z",
    updated_at: "2026-07-10T10:00:00.000Z",
    resolved_at: null,
    closed_at: null,
    archived_at: null,
    support_ticket_attachments: [],
    ...overrides,
  };
}

function makeAdapter(overrides = {}) {
  return {
    isAdmin: vi.fn(async (userId: string) => ({ data: userId === "admin-1" ? { user_id: userId } : null, error: null })),
    getLatestTicket: vi.fn(async () => ({ data: null, error: null })),
    createTicket: vi.fn(async (row) => ({ data: makeTicket(row), error: null })),
    listTickets: vi.fn(async () => ({ data: [makeTicket()], error: null })),
    getTicket: vi.fn(async () => ({ data: makeTicket(), error: null })),
    updateTicket: vi.fn(async (_ticketId, row) => ({ data: makeTicket(row), error: null })),
    createAttachment: vi.fn(async (row) => ({ data: { created_at: "2026-07-10T10:00:00.000Z", ...row }, error: null })),
    getAttachment: vi.fn(async () => ({
      data: {
        id: "22222222-2222-2222-2222-222222222222",
        ticket_id: "11111111-1111-1111-1111-111111111111",
        user_id: "user-1",
        storage_path: "user-1/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.png",
        original_filename: "screen.png",
        content_type: "image/png",
        byte_size: 123,
        width: 100,
        height: 100,
        created_at: "2026-07-10T10:00:00.000Z",
      },
      error: null,
    })),
    ...overrides,
  };
}

describe("support service", () => {
  it("forces ticket ownership and ignores client-submitted admin fields", async () => {
    const adapter = makeAdapter();
    const service = createSupportService(adapter);

    await service.createTicket(
      { id: "user-1", email: "user@example.com" },
      {
        category: "app_bug",
        subject: "Bug",
        message: "The form is stuck.",
        status: "closed",
        adminNote: "pretend admin",
        assignedAdminId: "admin-1",
        locale: "ro",
        sourceRoute: "/assistant",
        userAgent: "UA",
      },
    );

    expect(adapter.createTicket).toHaveBeenCalledWith({
      user_id: "user-1",
      user_email: "user@example.com",
      category: "app_bug",
      subject: "Bug",
      message: "The form is stuck.",
      locale: "ro",
      source_route: "/assistant",
      user_agent: "UA",
      app_version: null,
      viewport_width: null,
      viewport_height: null,
      platform_summary: null,
      pwa_display_mode: null,
      timezone: null,
      online_state: null,
    });
  });

  it("rejects empty messages before insert", async () => {
    const adapter = makeAdapter();
    const service = createSupportService(adapter);

    await expect(service.createTicket({ id: "user-1", email: "user@example.com" }, { category: "other_problem", message: "" })).rejects.toThrow();
    expect(adapter.createTicket).not.toHaveBeenCalled();
  });

  it("stores optional privacy-safe report diagnostics when provided", async () => {
    const adapter = makeAdapter();
    const service = createSupportService(adapter);

    await service.createTicket(
      { id: "user-1", email: "user@example.com" },
      {
        category: "app_bug",
        message: "The sheet is stuck.",
        viewportWidth: 390,
        viewportHeight: 780,
        platformSummary: "Android mobile",
        pwaDisplayMode: "browser",
        timezone: "Europe/Bucharest",
        onlineState: "online",
      },
    );

    expect(adapter.createTicket).toHaveBeenCalledWith(expect.objectContaining({
      viewport_width: 390,
      viewport_height: 780,
      platform_summary: "Android mobile",
      pwa_display_mode: "browser",
      timezone: "Europe/Bucharest",
      online_state: "online",
    }));
  });

  it("rate limits duplicate support submissions", async () => {
    const adapter = makeAdapter({
      getLatestTicket: vi.fn(async () => ({ data: { created_at: "2026-07-10T10:00:00.000Z" }, error: null })),
    });
    const service = createSupportService(adapter);

    await expect(
      service.createTicket(
        { id: "user-1", email: "user@example.com" },
        { category: "other_problem", message: "Hello" },
        { now: new Date("2026-07-10T10:00:10.000Z") },
      ),
    ).rejects.toThrow("support_rate_limited");
    expect(adapter.createTicket).not.toHaveBeenCalled();
  });

  it("checks admin access by stable user id and updates status/internal note as admin", async () => {
    const adapter = makeAdapter();
    const service = createSupportService(adapter);

    await expect(service.isAdmin("admin-1")).resolves.toBe(true);
    await expect(service.isAdmin("user-1")).resolves.toBe(false);

    await service.updateTicket("admin-1", {
      ticketId: "11111111-1111-1111-1111-111111111111",
      status: "resolved",
      adminNote: "Handled.",
    });

    expect(adapter.updateTicket).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111", {
      status: "resolved",
      admin_note: "Handled.",
      assigned_admin_id: "admin-1",
    });
  });
});
