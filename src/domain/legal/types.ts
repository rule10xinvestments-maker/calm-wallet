import type { Database } from "@/lib/db/types";
import type { LegalDocumentId } from "@/domain/legal/config";

export type LegalAcceptanceRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "accepted_terms_version"
  | "accepted_privacy_version"
  | "accepted_refund_version"
  | "accepted_ai_version"
  | "legal_accepted_at"
>;

export type LegalAcceptance = {
  userId: string;
  acceptedVersions: Record<LegalDocumentId, string | null>;
  acceptedAt: string | null;
};
