"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { createSupabaseOwedNotesService } from "@/domain/owed-notes/service";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { initialOwedNoteActionState, type OwedNoteActionState } from "@/lib/actions/owed-notes-state";
import type { OwedNoteDirection } from "@/domain/owed-notes/types";

function parseAmount(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "").trim().replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : NaN;
}

function calmOwedError(error: unknown, fallback = "That owed note could not be updated.") {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (error instanceof Error) {
    const message = error.message;

    if (
      message === "Add a person name." ||
      message === "Amount needs a number." ||
      message === "Choose a supported currency." ||
      message === "You can't subtract more than the remaining amount." ||
      message === "That money reminder is already settled."
    ) {
      return message;
    }
  }

  return fallback;
}

async function getUserId() {
  const auth = await requireAuthenticatedSession();
  return auth.user?.id ?? null;
}

function revalidateOwedSurfaces() {
  revalidatePath("/assistant");
  revalidatePath("/transactions");
}

export async function createOwedNoteAction(_prevState: OwedNoteActionState, formData: FormData): Promise<OwedNoteActionState> {
  const userId = await getUserId();

  if (!userId) {
    return { ...initialOwedNoteActionState, status: "error", message: "Please sign in again." };
  }

  try {
    const service = await createSupabaseOwedNotesService();
    const note = await service.createOwedNote(userId, {
      direction: String(formData.get("direction") ?? "owed_to_me") as OwedNoteDirection,
      personName: String(formData.get("personName") ?? ""),
      amount: parseAmount(formData.get("amount")),
      currency: String(formData.get("currency") ?? "USD"),
      note: String(formData.get("note") ?? "").trim() || null,
      dueDate: String(formData.get("dueDate") ?? "").trim() || null,
    });

    revalidateOwedSurfaces();
    return { status: "success", message: "Money reminder saved.", note };
  } catch (error) {
    return { ...initialOwedNoteActionState, status: "error", message: calmOwedError(error, "Money reminder could not be saved.") };
  }
}

export async function adjustOwedNoteAmountAction(
  _prevState: OwedNoteActionState,
  formData: FormData,
): Promise<OwedNoteActionState> {
  const userId = await getUserId();

  if (!userId) {
    return { ...initialOwedNoteActionState, status: "error", message: "Please sign in again." };
  }

  try {
    const service = await createSupabaseOwedNotesService();
    const input = {
      owedNoteId: String(formData.get("owedNoteId") ?? ""),
      amount: parseAmount(formData.get("amount")),
    };
    const operation = String(formData.get("operation") ?? "add");
    const note = operation === "subtract" ? await service.subtractAmount(userId, input) : await service.addAmount(userId, input);

    revalidateOwedSurfaces();
    return { status: "success", message: operation === "subtract" ? "Amount subtracted." : "Amount added.", note };
  } catch (error) {
    return { ...initialOwedNoteActionState, status: "error", message: calmOwedError(error) };
  }
}

export async function updateOwedNoteNoteAction(
  _prevState: OwedNoteActionState,
  formData: FormData,
): Promise<OwedNoteActionState> {
  const userId = await getUserId();

  if (!userId) {
    return { ...initialOwedNoteActionState, status: "error", message: "Please sign in again." };
  }

  try {
    const service = await createSupabaseOwedNotesService();
    const note = await service.updateNote(userId, {
      owedNoteId: String(formData.get("owedNoteId") ?? ""),
      note: String(formData.get("note") ?? "").trim() || null,
    });

    revalidateOwedSurfaces();
    return { status: "success", message: "Note updated.", note };
  } catch (error) {
    return { ...initialOwedNoteActionState, status: "error", message: calmOwedError(error) };
  }
}

export async function settleOwedNoteAction(_prevState: OwedNoteActionState, formData: FormData): Promise<OwedNoteActionState> {
  const userId = await getUserId();

  if (!userId) {
    return { ...initialOwedNoteActionState, status: "error", message: "Please sign in again." };
  }

  try {
    const service = await createSupabaseOwedNotesService();
    const note = await service.markSettled(userId, {
      owedNoteId: String(formData.get("owedNoteId") ?? ""),
    });

    revalidateOwedSurfaces();
    return { status: "success", message: "Marked settled.", note };
  } catch (error) {
    return { ...initialOwedNoteActionState, status: "error", message: calmOwedError(error) };
  }
}
