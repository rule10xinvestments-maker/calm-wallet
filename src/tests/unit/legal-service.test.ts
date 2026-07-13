import { describe, expect, it, vi } from "vitest";
import { currentLegalVersions } from "@/domain/legal/config";
import {
  createLegalAcceptanceService,
  getMissingLegalDocuments,
  hasAcceptedCurrentLegalDocuments,
} from "@/domain/legal/service";
import type { LegalAcceptanceRow } from "@/domain/legal/types";

function makeRow(overrides: Partial<LegalAcceptanceRow> = {}): LegalAcceptanceRow {
  return {
    id: "user-1",
    accepted_terms_version: currentLegalVersions.terms,
    accepted_privacy_version: currentLegalVersions.privacy,
    accepted_refund_version: currentLegalVersions.refund,
    accepted_ai_version: currentLegalVersions.ai,
    legal_accepted_at: "2026-07-13T12:00:00.000Z",
    ...overrides,
  };
}

function makeAdapter(overrides: Partial<Parameters<typeof createLegalAcceptanceService>[0]> = {}) {
  return {
    getAcceptance: vi.fn(async () => ({ data: makeRow(), error: null })),
    insertAcceptance: vi.fn(async (userId: string, acceptedAt: string) => ({
      data: makeRow({ id: userId, legal_accepted_at: acceptedAt }),
      error: null,
    })),
    updateAcceptance: vi.fn(async (userId: string, acceptedAt: string) => ({
      data: makeRow({ id: userId, legal_accepted_at: acceptedAt }),
      error: null,
    })),
    ...overrides,
  };
}

describe("legal acceptance service", () => {
  it("treats matching versions as accepted", async () => {
    const service = createLegalAcceptanceService(makeAdapter());
    const acceptance = await service.getLegalAcceptance("user-1");

    expect(hasAcceptedCurrentLegalDocuments(acceptance)).toBe(true);
    expect(getMissingLegalDocuments(acceptance)).toEqual([]);
  });

  it("requires acceptance again when one version changes", () => {
    const missing = getMissingLegalDocuments({
      userId: "user-1",
      acceptedAt: "2026-07-13T12:00:00.000Z",
      acceptedVersions: {
        ...currentLegalVersions,
        terms: "0.9",
      },
    });

    expect(missing).toEqual(["terms"]);
  });

  it("requires acceptance when no acceptance row exists", () => {
    expect(hasAcceptedCurrentLegalDocuments(null)).toBe(false);
    expect(getMissingLegalDocuments(null)).toEqual(["terms", "privacy", "refund", "ai"]);
  });

  it("persists current versions for first acceptance", async () => {
    const adapter = makeAdapter({
      getAcceptance: vi.fn(async () => ({ data: null, error: null })),
    });
    const service = createLegalAcceptanceService(adapter);

    await service.acceptCurrentLegalDocuments("user-1");

    expect(adapter.insertAcceptance).toHaveBeenCalledWith("user-1", expect.any(String));
    expect(adapter.updateAcceptance).not.toHaveBeenCalled();
  });

  it("updates existing acceptance without changing versions elsewhere", async () => {
    const adapter = makeAdapter();
    const service = createLegalAcceptanceService(adapter);

    await service.acceptCurrentLegalDocuments("user-1");

    expect(adapter.updateAcceptance).toHaveBeenCalledWith("user-1", expect.any(String));
    expect(adapter.insertAcceptance).not.toHaveBeenCalled();
  });
});
