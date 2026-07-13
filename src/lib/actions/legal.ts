"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseLegalAcceptanceService } from "@/domain/legal/service";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import {
  initialLegalAcceptanceActionState,
  type LegalAcceptanceActionState,
} from "@/lib/actions/legal-state";

export async function acceptLegalDocumentsAction(
  _prevState: LegalAcceptanceActionState,
  formData: FormData,
): Promise<LegalAcceptanceActionState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      ...initialLegalAcceptanceActionState,
      status: "error",
      message: "Sign in is required.",
    };
  }

  if (formData.get("accepted") !== "on") {
    return {
      ...initialLegalAcceptanceActionState,
      status: "error",
      message: "Legal documents must be accepted.",
    };
  }

  try {
    const service = await createSupabaseLegalAcceptanceService();
    await service.acceptCurrentLegalDocuments(user.id);

    revalidatePath("/assistant");
    revalidatePath("/transactions");
    revalidatePath("/insights");

    return {
      status: "success",
      message: "Legal documents accepted.",
    };
  } catch {
    return {
      ...initialLegalAcceptanceActionState,
      status: "error",
      message: "Legal documents could not be accepted.",
    };
  }
}
