export type SupportTicketActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export const initialSupportTicketActionState: SupportTicketActionState = {
  status: "idle",
  message: null,
};

export type AdminSupportTicketActionState = SupportTicketActionState;

export const initialAdminSupportTicketActionState: AdminSupportTicketActionState = {
  status: "idle",
  message: null,
};
