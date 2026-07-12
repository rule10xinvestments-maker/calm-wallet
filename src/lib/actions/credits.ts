"use server";

import { createSupabaseCreditsService } from "@/domain/credits/service";
import { requireAuthenticatedSession } from "@/lib/auth/guards";

export async function markCreditNoticeShownAction(formData: FormData) {
  const threshold = Number(formData.get("threshold"));

  if (threshold !== 10 && threshold !== 3) {
    return;
  }

  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return;
  }

  const creditsService = await createSupabaseCreditsService();
  await creditsService.markLowBalanceNoticeShown(user.id, threshold);
}
