export type LegalAcceptanceActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export const initialLegalAcceptanceActionState: LegalAcceptanceActionState = {
  status: "idle",
  message: null,
};
