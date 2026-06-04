import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("PWA manifest", () => {
  it("keeps the install manifest modern and web-only", () => {
    const result = manifest();

    expect(result).toEqual({
      id: "/",
      name: "Calm Wallet",
      short_name: "Calm Wallet",
      description: "A calm AI notebook for tracking expenses and income.",
      start_url: "/assistant",
      scope: "/",
      display: "standalone",
      background_color: "#f8fafc",
      theme_color: "#2382b3",
      orientation: "portrait-primary",
      icons: [
        {
          src: "/icons/calm-ledger-icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/calm-ledger-icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/calm-ledger-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    });

    expect(result).not.toHaveProperty("related_applications");
    expect(result).not.toHaveProperty("prefer_related_applications");
  });
});
