import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const serviceWorkerSource = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
const safeCachePaths = Array.from(serviceWorkerSource.matchAll(/"([^"]+)"/g))
  .map((match) => match[1])
  .filter((value) => value?.startsWith("/favicon") || value?.startsWith("/manifest") || value?.startsWith("/icons/"));

describe("PWA service worker", () => {
  it("only caches safe static app assets without runtime bundles", () => {
    expect(serviceWorkerSource).toContain("calm-wallet-static-v2");
    expect(serviceWorkerSource).toContain("/icons/calm-wallet-icon-192.png");
    expect(serviceWorkerSource).toContain("/icons/calm-wallet-maskable-512.png");
    expect(serviceWorkerSource).not.toContain("/_next/static/");
    expect(serviceWorkerSource).not.toContain("request.destination === \"script\" || request.destination === \"style\"");
  });

  it("populates the install cache without failing the service worker install for one missing asset", () => {
    expect(serviceWorkerSource).toContain("SAFE_CACHE_PATHS.map");
    expect(serviceWorkerSource).toContain("return { cached: false");
    expect(serviceWorkerSource).not.toContain("cache.addAll(SAFE_CACHE_PATHS)");
    expect(serviceWorkerSource).toContain("install cache population");
  });

  it("only pre-caches files that exist in public", () => {
    expect(safeCachePaths).toEqual([
      "/favicon.svg",
      "/manifest.webmanifest",
      "/icons/apple-touch-icon.png",
      "/icons/calm-wallet-icon-192.png",
      "/icons/calm-wallet-icon-512.png",
      "/icons/calm-wallet-maskable-512.png",
    ]);

    for (const path of safeCachePaths) {
      const publicPath = path === "/manifest.webmanifest" ? join(process.cwd(), "src", "app", "manifest.ts") : join(process.cwd(), "public", path);

      expect(existsSync(publicPath)).toBe(true);
    }
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
