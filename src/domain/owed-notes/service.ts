import { createSupabaseServerClient } from "@/lib/auth/server-client";
import {
  adjustOwedNoteAmountSchema,
  createOwedNoteSchema,
  manageOwedNoteSchema,
  updateOwedNoteNoteSchema,
} from "@/domain/owed-notes/schemas";
import type {
  AdjustOwedNoteAmountInput,
  CreateOwedNoteInput,
  ManageOwedNoteInput,
  OwedNote,
  OwedNoteInsertRow,
  OwedNoteRow,
  OwedNoteUpdateRow,
  UpdateOwedNoteNoteInput,
} from "@/domain/owed-notes/types";

type QueryError = { message: string };
type QueryResult<T> = Promise<{ data: T | null; error: QueryError | null }>;

export type OwedNotesServiceAdapter = {
  insertOwedNote(row: OwedNoteInsertRow): QueryResult<OwedNoteRow>;
  getOwedNoteById(userId: string, owedNoteId: string): QueryResult<OwedNoteRow>;
  updateOwedNote(userId: string, owedNoteId: string, updates: OwedNoteUpdateRow): QueryResult<OwedNoteRow>;
  listOwedNotes(userId: string, status?: "open" | "settled"): QueryResult<OwedNoteRow[]>;
};

function assertResult<T>(result: { data: T | null; error: QueryError | null }, fallbackMessage: string) {
  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.data === null) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

export function mapOwedNoteRowToDomain(row: OwedNoteRow): OwedNote {
  return {
    id: row.id,
    userId: row.user_id,
    direction: row.direction,
    personName: row.person_name,
    originalAmount: Number(row.original_amount),
    currentAmount: Number(row.current_amount),
    currency: row.currency,
    note: row.note,
    status: row.status,
    settledAt: row.settled_at,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createOwedNotesService(adapter: OwedNotesServiceAdapter) {
  return {
    async createOwedNote(userId: string, input: CreateOwedNoteInput): Promise<OwedNote> {
      const parsed = createOwedNoteSchema.parse(input);
      const row = assertResult(
        await adapter.insertOwedNote({
          user_id: userId,
          direction: parsed.direction,
          person_name: parsed.personName,
          original_amount: parsed.amount,
          current_amount: parsed.amount,
          currency: parsed.currency,
          note: parsed.note?.trim() || null,
          due_date: parsed.dueDate || null,
          status: "open",
          settled_at: null,
        }),
        "Unable to create money reminder.",
      );

      return mapOwedNoteRowToDomain(row);
    },

    async listOpenOwedNotes(userId: string): Promise<OwedNote[]> {
      return assertResult(await adapter.listOwedNotes(userId, "open"), "Unable to load money reminders.").map(mapOwedNoteRowToDomain);
    },

    async addAmount(userId: string, input: AdjustOwedNoteAmountInput): Promise<OwedNote> {
      const parsed = adjustOwedNoteAmountSchema.parse(input);
      const existing = mapOwedNoteRowToDomain(assertResult(await adapter.getOwedNoteById(userId, parsed.owedNoteId), "Money reminder not found."));

      if (existing.status !== "open") {
        throw new Error("That money reminder is already settled.");
      }

      return mapOwedNoteRowToDomain(
        assertResult(
          await adapter.updateOwedNote(userId, parsed.owedNoteId, {
            current_amount: existing.currentAmount + parsed.amount,
          }),
          "That owed note could not be updated.",
        ),
      );
    },

    async subtractAmount(userId: string, input: AdjustOwedNoteAmountInput): Promise<OwedNote> {
      const parsed = adjustOwedNoteAmountSchema.parse(input);
      const existing = mapOwedNoteRowToDomain(assertResult(await adapter.getOwedNoteById(userId, parsed.owedNoteId), "Money reminder not found."));

      if (existing.status !== "open") {
        throw new Error("That money reminder is already settled.");
      }

      if (parsed.amount > existing.currentAmount) {
        throw new Error("You can't subtract more than the remaining amount.");
      }

      return mapOwedNoteRowToDomain(
        assertResult(
          await adapter.updateOwedNote(userId, parsed.owedNoteId, {
            current_amount: existing.currentAmount - parsed.amount,
          }),
          "That owed note could not be updated.",
        ),
      );
    },

    async updateNote(userId: string, input: UpdateOwedNoteNoteInput): Promise<OwedNote> {
      const parsed = updateOwedNoteNoteSchema.parse(input);
      assertResult(await adapter.getOwedNoteById(userId, parsed.owedNoteId), "Money reminder not found.");

      return mapOwedNoteRowToDomain(
        assertResult(
          await adapter.updateOwedNote(userId, parsed.owedNoteId, {
            note: parsed.note?.trim() || null,
          }),
          "That owed note could not be updated.",
        ),
      );
    },

    async markSettled(userId: string, input: ManageOwedNoteInput): Promise<OwedNote> {
      const parsed = manageOwedNoteSchema.parse(input);
      assertResult(await adapter.getOwedNoteById(userId, parsed.owedNoteId), "Money reminder not found.");

      return mapOwedNoteRowToDomain(
        assertResult(
          await adapter.updateOwedNote(userId, parsed.owedNoteId, {
            status: "settled",
            current_amount: 0,
            settled_at: new Date().toISOString(),
          }),
          "That owed note could not be updated.",
        ),
      );
    },
  };
}

export async function createSupabaseOwedNotesService() {
  const supabase = await createSupabaseServerClient();

  return createOwedNotesService({
    async insertOwedNote(row) {
      return supabase.from("owed_notes").insert(row).select("*").single();
    },
    async getOwedNoteById(userId, owedNoteId) {
      return supabase.from("owed_notes").select("*").eq("user_id", userId).eq("id", owedNoteId).single();
    },
    async updateOwedNote(userId, owedNoteId, updates) {
      return supabase.from("owed_notes").update(updates).eq("user_id", userId).eq("id", owedNoteId).select("*").single();
    },
    async listOwedNotes(userId, status) {
      let query = supabase.from("owed_notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      return await query;
    },
  });
}
