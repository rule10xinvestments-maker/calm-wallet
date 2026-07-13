import { currentLegalVersions, legalDocumentIds } from "@/domain/legal/config";
import type { LegalAcceptance, LegalAcceptanceRow } from "@/domain/legal/types";
import { createSupabaseServerClient } from "@/lib/auth/server-client";

type QueryResult<T> = Promise<{ data: T | null; error: unknown }>;

type LegalAcceptanceAdapter = {
  getAcceptance(userId: string): QueryResult<LegalAcceptanceRow>;
  insertAcceptance(userId: string, acceptedAt: string): QueryResult<LegalAcceptanceRow>;
  updateAcceptance(userId: string, acceptedAt: string): QueryResult<LegalAcceptanceRow>;
};

function assertResult<T>(result: { data: T | null; error: unknown }, fallbackMessage: string) {
  if (result.error || !result.data) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

function mapAcceptance(row: LegalAcceptanceRow): LegalAcceptance {
  return {
    userId: row.id,
    acceptedAt: row.legal_accepted_at,
    acceptedVersions: {
      terms: row.accepted_terms_version,
      privacy: row.accepted_privacy_version,
      refund: row.accepted_refund_version,
      ai: row.accepted_ai_version,
    },
  };
}

export function getMissingLegalDocuments(acceptance: LegalAcceptance | null) {
  if (!acceptance) {
    return [...legalDocumentIds];
  }

  return legalDocumentIds.filter((documentId) => acceptance.acceptedVersions[documentId] !== currentLegalVersions[documentId]);
}

export function hasAcceptedCurrentLegalDocuments(acceptance: LegalAcceptance | null) {
  return getMissingLegalDocuments(acceptance).length === 0;
}

export function createLegalAcceptanceService(adapter: LegalAcceptanceAdapter) {
  return {
    async getLegalAcceptance(userId: string): Promise<LegalAcceptance | null> {
      const result = await adapter.getAcceptance(userId);

      if (result.error) {
        throw new Error("Unable to load legal acceptance.");
      }

      return result.data ? mapAcceptance(result.data) : null;
    },

    async acceptCurrentLegalDocuments(userId: string): Promise<LegalAcceptance> {
      const acceptedAt = new Date().toISOString();
      const current = await this.getLegalAcceptance(userId);
      const row = assertResult(
        current
          ? await adapter.updateAcceptance(userId, acceptedAt)
          : await adapter.insertAcceptance(userId, acceptedAt),
        "Unable to save legal acceptance.",
      );

      return mapAcceptance(row);
    },
  };
}

export async function createSupabaseLegalAcceptanceService() {
  const supabase = await createSupabaseServerClient();
  const columns =
    "id,accepted_terms_version,accepted_privacy_version,accepted_refund_version,accepted_ai_version,legal_accepted_at";

  return createLegalAcceptanceService({
    async getAcceptance(userId) {
      return supabase.from("profiles").select(columns).eq("id", userId).maybeSingle();
    },
    async insertAcceptance(userId, acceptedAt) {
      return supabase
        .from("profiles")
        .insert({
          id: userId,
          accepted_terms_version: currentLegalVersions.terms,
          accepted_privacy_version: currentLegalVersions.privacy,
          accepted_refund_version: currentLegalVersions.refund,
          accepted_ai_version: currentLegalVersions.ai,
          legal_accepted_at: acceptedAt,
        })
        .select(columns)
        .single();
    },
    async updateAcceptance(userId, acceptedAt) {
      return supabase
        .from("profiles")
        .update({
          accepted_terms_version: currentLegalVersions.terms,
          accepted_privacy_version: currentLegalVersions.privacy,
          accepted_refund_version: currentLegalVersions.refund,
          accepted_ai_version: currentLegalVersions.ai,
          legal_accepted_at: acceptedAt,
        })
        .eq("id", userId)
        .select(columns)
        .single();
    },
  });
}
