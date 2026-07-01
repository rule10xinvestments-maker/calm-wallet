import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedSession = vi.fn();
const createOwedNote = vi.fn();
const addAmount = vi.fn();
const subtractAmount = vi.fn();
const updateNote = vi.fn();
const markSettled = vi.fn();
const createSupabaseOwedNotesService = vi.fn(async () => ({
  createOwedNote,
  addAmount,
  subtractAmount,
  updateNote,
  markSettled,
}));
const revalidatePath = vi.fn();

vi.mock("@/lib/auth/guards", () => ({
  requireAuthenticatedSession,
}));

vi.mock("@/domain/owed-notes/service", () => ({
  createSupabaseOwedNotesService,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

function makeOwedNote(overrides = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    userId: "user-1",
    direction: "owed_to_me",
    personName: "Mira",
    originalAmount: 25,
    currentAmount: 25,
    currency: "RON",
    note: null,
    status: "open",
    settledAt: null,
    dueDate: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("owed note actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedSession.mockResolvedValue({ user: { id: "user-1" } });
    createOwedNote.mockResolvedValue(makeOwedNote());
    addAmount.mockResolvedValue(makeOwedNote({ currentAmount: 30 }));
    subtractAmount.mockResolvedValue(makeOwedNote({ currentAmount: 20 }));
    updateNote.mockResolvedValue(makeOwedNote({ note: "Lunch" }));
    markSettled.mockResolvedValue(makeOwedNote({ status: "settled", currentAmount: 0 }));
  });

  it("creates owed-to-me and i-owe notes for the signed-in user", async () => {
    const { createOwedNoteAction } = await import("@/lib/actions/owed-notes");
    const formData = new FormData();
    formData.set("direction", "i_owe");
    formData.set("personName", "Ana");
    formData.set("amount", "42.5");
    formData.set("currency", "ron");
    formData.set("note", "Dinner");
    formData.set("dueDate", "");

    const result = await createOwedNoteAction({ status: "idle", message: null, note: null }, formData);

    expect(createOwedNote).toHaveBeenCalledWith("user-1", {
      direction: "i_owe",
      personName: "Ana",
      amount: 42.5,
      currency: "ron",
      note: "Dinner",
      dueDate: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/assistant");
    expect(revalidatePath).toHaveBeenCalledWith("/transactions");
    expect(result.status).toBe("success");
    expect(result.message).toBe("Money reminder saved.");
  });

  it("returns calm validation copy for missing person and amount", async () => {
    const { createOwedNoteAction } = await import("@/lib/actions/owed-notes");
    const formData = new FormData();
    formData.set("amount", "not a number");

    createOwedNote.mockRejectedValueOnce(new Error("Amount needs a number."));
    const result = await createOwedNoteAction({ status: "idle", message: null, note: null }, formData);

    expect(result.status).toBe("error");
    expect(result.message).toBe("Amount needs a number.");

    createOwedNote.mockRejectedValueOnce(new Error("Add a person name."));
    const missingPersonResult = await createOwedNoteAction({ status: "idle", message: null, note: null }, formData);

    expect(missingPersonResult.status).toBe("error");
    expect(missingPersonResult.message).toBe("Add a person name.");
  });

  it("returns calm generic copy when create insert fails", async () => {
    const { createOwedNoteAction } = await import("@/lib/actions/owed-notes");
    const formData = new FormData();
    formData.set("direction", "owed_to_me");
    formData.set("personName", "Danel");
    formData.set("amount", "100");
    formData.set("currency", "RON");
    createOwedNote.mockRejectedValueOnce(new Error("Could not find the table 'public.owed_notes' in the schema cache"));

    const result = await createOwedNoteAction({ status: "idle", message: null, note: null }, formData);

    expect(result.status).toBe("error");
    expect(result.message).toBe("Money reminder could not be saved.");
  });

  it("adds, subtracts, updates notes, and settles", async () => {
    const { adjustOwedNoteAmountAction, updateOwedNoteNoteAction, settleOwedNoteAction } = await import("@/lib/actions/owed-notes");
    const formData = new FormData();
    formData.set("owedNoteId", "11111111-1111-1111-1111-111111111111");
    formData.set("amount", "5");

    formData.set("operation", "add");
    await adjustOwedNoteAmountAction({ status: "idle", message: null, note: null }, formData);
    expect(addAmount).toHaveBeenCalledWith("user-1", { owedNoteId: "11111111-1111-1111-1111-111111111111", amount: 5 });

    formData.set("operation", "subtract");
    await adjustOwedNoteAmountAction({ status: "idle", message: null, note: null }, formData);
    expect(subtractAmount).toHaveBeenCalledWith("user-1", { owedNoteId: "11111111-1111-1111-1111-111111111111", amount: 5 });

    const noteFormData = new FormData();
    noteFormData.set("owedNoteId", "11111111-1111-1111-1111-111111111111");
    noteFormData.set("note", "Updated");
    await updateOwedNoteNoteAction({ status: "idle", message: null, note: null }, noteFormData);
    expect(updateNote).toHaveBeenCalledWith("user-1", { owedNoteId: "11111111-1111-1111-1111-111111111111", note: "Updated" });

    await settleOwedNoteAction({ status: "idle", message: null, note: null }, noteFormData);
    expect(markSettled).toHaveBeenCalledWith("user-1", { owedNoteId: "11111111-1111-1111-1111-111111111111" });
  });

  it("does not expose raw service errors", async () => {
    const { adjustOwedNoteAmountAction } = await import("@/lib/actions/owed-notes");
    const formData = new FormData();
    formData.set("owedNoteId", "11111111-1111-1111-1111-111111111111");
    formData.set("amount", "100");
    formData.set("operation", "subtract");
    subtractAmount.mockRejectedValueOnce(new Error("postgres policy violation"));

    const result = await adjustOwedNoteAmountAction({ status: "idle", message: null, note: null }, formData);

    expect(result.status).toBe("error");
    expect(result.message).toBe("That owed note could not be updated.");
  });
});
