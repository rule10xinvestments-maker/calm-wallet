import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialImportReviewProgressActionState } from "@/lib/actions/imports-state";

const loadStagedImportReviewProgress = vi.fn();

vi.mock("@/lib/server/imports-review-progress", () => ({
  loadStagedImportReviewProgress,
}));

function makeFormData(importRecordId = "11111111-1111-1111-1111-111111111111") {
  const formData = new FormData();
  formData.set("importRecordId", importRecordId);
  return formData;
}

describe("imports review progress action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("supports owned review-progress action success", async () => {
    loadStagedImportReviewProgress.mockResolvedValueOnce({
      importRecordId: "11111111-1111-1111-1111-111111111111",
      totalCandidateCount: 3,
      acceptedCount: 1,
      rejectedCount: 1,
      pendingCount: 1,
    });

    const { loadImportReviewProgressAction } = await import("@/lib/actions/imports");
    const result = await loadImportReviewProgressAction(initialImportReviewProgressActionState, makeFormData());

    expect(loadStagedImportReviewProgress).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      undefined,
    );
    expect(result).toEqual({
      status: "success",
      message: null,
      progress: {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        totalCandidateCount: 3,
        acceptedCount: 1,
        rejectedCount: 1,
        pendingCount: 1,
      },
    });
  });

  it("fails closed for unauthenticated access", async () => {
    loadStagedImportReviewProgress.mockResolvedValueOnce(null);

    const { loadImportReviewProgressAction } = await import("@/lib/actions/imports");
    const result = await loadImportReviewProgressAction(initialImportReviewProgressActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Import review progress could not be loaded.",
      progress: null,
    });
  });

  it("fails closed for non-owned or missing import records", async () => {
    loadStagedImportReviewProgress.mockResolvedValueOnce(null);

    const { loadImportReviewProgressAction } = await import("@/lib/actions/imports");
    const result = await loadImportReviewProgressAction(
      initialImportReviewProgressActionState,
      makeFormData("22222222-2222-2222-2222-222222222222"),
    );

    expect(result).toEqual({
      status: "error",
      message: "Import review progress could not be loaded.",
      progress: null,
    });
  });

  it("handles the empty candidate set cleanly", async () => {
    loadStagedImportReviewProgress.mockResolvedValueOnce({
      importRecordId: "11111111-1111-1111-1111-111111111111",
      totalCandidateCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      pendingCount: 0,
    });

    const { loadImportReviewProgressAction } = await import("@/lib/actions/imports");
    const result = await loadImportReviewProgressAction(initialImportReviewProgressActionState, makeFormData());

    expect(result).toEqual({
      status: "success",
      message: null,
      progress: {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        totalCandidateCount: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        pendingCount: 0,
      },
    });
  });

  it("returns the expected action result shape", async () => {
    loadStagedImportReviewProgress.mockResolvedValueOnce({
      importRecordId: "11111111-1111-1111-1111-111111111111",
      totalCandidateCount: 4,
      acceptedCount: 2,
      rejectedCount: 1,
      pendingCount: 1,
    });

    const { loadImportReviewProgressAction } = await import("@/lib/actions/imports");
    const result = await loadImportReviewProgressAction(initialImportReviewProgressActionState, makeFormData());

    expect(result).toEqual({
      status: "success",
      message: null,
      progress: {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        totalCandidateCount: 4,
        acceptedCount: 2,
        rejectedCount: 1,
        pendingCount: 1,
      },
    });
  });
});
