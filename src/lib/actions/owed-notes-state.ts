import type { OwedNote } from "@/domain/owed-notes/types";

export type OwedNoteActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  note: OwedNote | null;
};

export const initialOwedNoteActionState: OwedNoteActionState = {
  status: "idle",
  message: null,
  note: null,
};
