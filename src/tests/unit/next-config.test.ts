import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

describe("Next config", () => {
  it("allows receipt-sized multipart payloads for Server Actions", () => {
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe("6mb");
  });
});
