import type { Database } from "@/lib/db/types";

export type OwedNoteDirection = "owed_to_me" | "i_owe";
export type OwedNoteStatus = "open" | "settled";
export type OwedNoteRow = Database["public"]["Tables"]["owed_notes"]["Row"];
export type OwedNoteInsertRow = Database["public"]["Tables"]["owed_notes"]["Insert"];
export type OwedNoteUpdateRow = Database["public"]["Tables"]["owed_notes"]["Update"];

export type OwedNote = {
  id: string;
  userId: string;
  direction: OwedNoteDirection;
  personName: string;
  originalAmount: number;
  currentAmount: number;
  currency: string;
  note: string | null;
  status: OwedNoteStatus;
  settledAt: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateOwedNoteInput = {
  direction: OwedNoteDirection;
  personName: string;
  amount: number;
  currency: string;
  note?: string | null;
  dueDate?: string | null;
};

export type ManageOwedNoteInput = {
  owedNoteId: string;
};

export type AdjustOwedNoteAmountInput = ManageOwedNoteInput & {
  amount: number;
};

export type UpdateOwedNoteNoteInput = ManageOwedNoteInput & {
  note: string | null;
};
