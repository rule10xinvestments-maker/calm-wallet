import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Calm Ledger",
    short_name: "Calm Ledger",
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
  };
}
