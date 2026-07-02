import { describe, expect, it } from "vitest";
import { APP_NAV_ITEMS, PROTECTED_PATHS, PUBLIC_PATHS } from "@/lib/constants/navigation";

describe("navigation constants", () => {
  it("keeps exactly three protected app destinations", () => {
    expect(PROTECTED_PATHS).toEqual(["/assistant", "/transactions", "/insights"]);
    expect(APP_NAV_ITEMS).toHaveLength(3);
    expect(APP_NAV_ITEMS.map((item) => item.labelKey)).toEqual(["nav.assistant", "nav.activity", "nav.insights"]);
  });

  it("keeps public auth routes separate", () => {
    expect(PUBLIC_PATHS).toEqual(["/sign-in", "/sign-up"]);
  });
});
