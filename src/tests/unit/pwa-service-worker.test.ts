import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const serviceWorkerSource = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

describe("PWA service worker", () => {
  it("only caches safe static app assets", () => {
    expect(serviceWorkerSource).toContain("/_next/static/");
    expect(serviceWorkerSource).toContain("/icons/calm-ledger-icon-192.png");
    expect(serviceWorkerSource).toContain("/icons/calm-ledger-maskable-512.png");
    expect(serviceWorkerSource).toContain("request.destination === \"script\" || request.destination === \"style\"");
  });

  it("does not intercept authenticated pages, API routes, or navigations", () => {
    expect(serviceWorkerSource).toContain("request.mode === \"navigate\"");
    expect(serviceWorkerSource).toContain("request.destination === \"document\"");
    expect(serviceWorkerSource).toContain("url.pathname.startsWith(\"/api/\")");
    expect(serviceWorkerSource).toContain("url.pathname.startsWith(\"/auth/\")");
    expect(serviceWorkerSource).toContain("url.pathname.startsWith(\"/assistant\")");
    expect(serviceWorkerSource).toContain("url.pathname.startsWith(\"/transactions\")");
    expect(serviceWorkerSource).toContain("url.pathname.startsWith(\"/insights\")");
  });
});
