import { describe, expect, it, vi } from "vitest";
import {
  getFallbackInsightsData,
  getFallbackNotificationPreferences,
  getFallbackTransactionsPageData,
  logProtectedRouteLoadFailure,
} from "@/lib/server/protected-route-fallbacks";

describe("protected route fallbacks", () => {
  it("builds empty route data without financial details", () => {
    expect(getFallbackTransactionsPageData({ view: "all" })).toMatchObject({
      view: "all",
      query: "",
      items: [],
      categories: [],
    });
    expect(getFallbackNotificationPreferences("user-1")).toMatchObject({
      userId: "user-1",
      dailyReminderEnabled: false,
      monthlyReviewEnabled: false,
    });
    expect(getFallbackInsightsData(new Date("2026-06-03T00:00:00.000Z"))).toMatchObject({
      trackedTransactionCount: 0,
      monthLabel: "June 2026",
      categoryBreakdown: [],
      largestRecentExpenses: [],
    });
  });

  it("logs route load failures without leaking error messages", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logProtectedRouteLoadFailure("assistant", new Error("database password leaked"));

    expect(errorSpy).toHaveBeenCalledWith("[protected-route-load-error]", {
      route: "assistant",
      errorName: "Error",
      hasMessage: true,
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("database password leaked");
    errorSpy.mockRestore();
  });
});
