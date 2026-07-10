import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminSupportConsole } from "@/components/support/admin-support-console";
import { initialAdminSupportTicketActionState } from "@/lib/actions/support-state";
import type { SupportTicket } from "@/domain/support/types";

const tickets: SupportTicket[] = [
  {
    id: "ticket-1",
    userId: "user-1",
    userEmail: "user@example.com",
    category: "app_bug",
    subject: "Mobile issue",
    message: "The support console needs a calmer mobile flow.",
    status: "new",
    locale: "en",
    sourceRoute: "/assistant",
    userAgent: "Android Chrome",
    appVersion: "test",
    adminNote: "Existing note",
    assignedAdminId: null,
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-07-10T10:00:00.000Z",
    resolvedAt: null,
    closedAt: null,
    archivedAt: null,
    attachments: [],
  },
  {
    id: "ticket-2",
    userId: "user-2",
    userEmail: "other@example.com",
    category: "other_problem",
    subject: null,
    message: "A second ticket.",
    status: "in_progress",
    locale: "en",
    sourceRoute: "/insights",
    userAgent: "Desktop",
    appVersion: "test",
    adminNote: null,
    assignedAdminId: null,
    createdAt: "2026-07-10T11:00:00.000Z",
    updatedAt: "2026-07-10T11:00:00.000Z",
    resolvedAt: null,
    closedAt: null,
    archivedAt: null,
    attachments: [
      {
        id: "attachment-1",
        ticketId: "ticket-2",
        userId: "user-2",
        storagePath: "user-2/ticket-2/attachment-1.png",
        originalFilename: "screen.png",
        contentType: "image/png",
        byteSize: 123,
        width: 100,
        height: 100,
        createdAt: "2026-07-10T11:00:00.000Z",
      },
    ],
  },
];

function renderConsole(props: Partial<ComponentProps<typeof AdminSupportConsole>> = {}) {
  const action = vi.fn<ComponentProps<typeof AdminSupportConsole>["action"]>(async () => ({
    ...initialAdminSupportTicketActionState,
    status: "success" as const,
    message: "Support ticket updated.",
  }));

  render(
    <AdminSupportConsole
      action={action}
      activeStatus="active"
      selectedTicket={null}
      tickets={tickets}
      {...props}
    />,
  );

  return { action };
}

describe("AdminSupportConsole", () => {
  it("starts in list mode with no selected ticket", () => {
    renderConsole();

    expect(screen.getByTestId("admin-support-ticket-list")).not.toHaveClass("hidden");
    expect(screen.getByTestId("admin-support-ticket-detail")).toHaveClass("hidden");
    expect(screen.getByRole("link", { name: /Mobile issue/ })).toHaveAttribute("href", "/admin/support?ticket=ticket-1");
    expect(screen.queryByText("Ticket detail")).not.toBeInTheDocument();
  });

  it("opens detail mode from the ticket URL and hides the list on mobile", () => {
    renderConsole({ selectedTicket: tickets[0] });

    expect(screen.getByTestId("admin-support-ticket-list")).toHaveClass("hidden");
    expect(screen.getByTestId("admin-support-ticket-detail")).not.toHaveClass("hidden");
    expect(screen.getByRole("link", { name: "Back to tickets" })).toHaveAttribute("href", "/admin/support");
    expect(screen.getByText("Ticket detail")).toBeInTheDocument();
  });

  it("preserves the active filter when closing detail", () => {
    renderConsole({ activeStatus: "resolved", selectedTicket: tickets[0] });

    expect(screen.getByRole("link", { name: "Back to tickets" })).toHaveAttribute("href", "/admin/support?status=resolved");
  });

  it("uses an app-controlled status picker and submits the canonical status value", async () => {
    const { action } = renderConsole({ selectedTicket: tickets[0] });

    expect(document.querySelector('select[name="status"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Status New" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Status New" }));
    expect(screen.getByRole("button", { name: "In progress" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "In progress" }));
    expect(screen.getByRole("button", { name: "Status In progress" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Internal note"), { target: { value: "Checking this now." } });
    fireEvent.click(screen.getByRole("button", { name: "Save support update" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const submittedForm = action.mock.calls[0][1] as FormData;
    expect(submittedForm.get("ticketId")).toBe("ticket-1");
    expect(submittedForm.get("status")).toBe("in_progress");
    expect(submittedForm.get("adminNote")).toBe("Checking this now.");
  });
});
