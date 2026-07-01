import { describe, expect, it, vi } from "vitest";
import { createOwedNotesService } from "@/domain/owed-notes/service";
import type { OwedNoteRow } from "@/domain/owed-notes/types";

function makeRow(overrides: Partial<OwedNoteRow> = {}): OwedNoteRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "user-1",
    direction: "owed_to_me",
    person_name: "Danel",
    original_amount: 100,
    current_amount: 100,
    currency: "RON",
    note: null,
    status: "open",
    settled_at: null,
    due_date: null,
    created_at: "2026-07-02T00:00:00.000Z",
    updated_at: "2026-07-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("owed notes service", () => {
  it("creates owed notes with owner, normalized currency, and original/current amounts", async () => {
    const insertOwedNote = vi.fn(async (row) => ({
      data: makeRow({
        user_id: row.user_id,
        direction: row.direction,
        person_name: row.person_name,
        original_amount: row.original_amount,
        current_amount: row.current_amount,
        currency: row.currency,
        note: row.note,
        due_date: row.due_date,
      }),
      error: null,
    }));
    const service = createOwedNotesService({
      insertOwedNote,
      getOwedNoteById: vi.fn(),
      updateOwedNote: vi.fn(),
      listOwedNotes: vi.fn(),
    });

    const note = await service.createOwedNote("user-1", {
      direction: "i_owe",
      personName: "Alex",
      amount: 50,
      currency: "ron",
      note: "",
      dueDate: null,
    });

    expect(insertOwedNote).toHaveBeenCalledWith({
      user_id: "user-1",
      direction: "i_owe",
      person_name: "Alex",
      original_amount: 50,
      current_amount: 50,
      currency: "RON",
      note: null,
      due_date: null,
      status: "open",
      settled_at: null,
    });
    expect(note.currency).toBe("RON");
    expect(note.originalAmount).toBe(50);
    expect(note.currentAmount).toBe(50);
  });

  it("rejects missing person and invalid amounts with calm validation", async () => {
    const service = createOwedNotesService({
      insertOwedNote: vi.fn(),
      getOwedNoteById: vi.fn(),
      updateOwedNote: vi.fn(),
      listOwedNotes: vi.fn(),
    });

    await expect(
      service.createOwedNote("user-1", {
        direction: "owed_to_me",
        personName: "",
        amount: 100,
        currency: "RON",
        dueDate: null,
      }),
    ).rejects.toThrow("Add a person name.");

    await expect(
      service.createOwedNote("user-1", {
        direction: "owed_to_me",
        personName: "Danel",
        amount: -1,
        currency: "RON",
        dueDate: null,
      }),
    ).rejects.toThrow("Amount needs a number.");
  });

  it("keeps ownership checks on read-before-update operations", async () => {
    const getOwedNoteById = vi.fn(async () => ({ data: makeRow({ current_amount: 75 }), error: null }));
    const updateOwedNote = vi.fn(async (_userId, _owedNoteId, updates) => ({
      data: makeRow({ current_amount: updates.current_amount ?? 75 }),
      error: null,
    }));
    const service = createOwedNotesService({
      insertOwedNote: vi.fn(),
      getOwedNoteById,
      updateOwedNote,
      listOwedNotes: vi.fn(),
    });

    await service.addAmount("user-1", {
      owedNoteId: "11111111-1111-1111-1111-111111111111",
      amount: 25,
    });

    expect(getOwedNoteById).toHaveBeenCalledWith("user-1", "11111111-1111-1111-1111-111111111111");
    expect(updateOwedNote).toHaveBeenCalledWith("user-1", "11111111-1111-1111-1111-111111111111", {
      current_amount: 100,
    });
  });
});
