export type AccountDeletionActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export const initialAccountDeletionActionState: AccountDeletionActionState = {
  status: "idle",
  message: null,
};
