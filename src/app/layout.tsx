import type { Metadata, Viewport } from "next";
import { CapacitorShellRuntime } from "@/components/capacitor-shell-runtime";
import { PwaInstallProvider } from "@/components/pwa-install-context";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Calm Wallet",
  title: "Calm Wallet",
  description: "A calm AI notebook for tracking expenses and income.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Calm Wallet",
  },
  icons: {
    icon: [
      { url: "/icons/calm-wallet-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/calm-wallet-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2382b3",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="font-sans">
        <PwaInstallProvider>
          <CapacitorShellRuntime />
          {children}
        </PwaInstallProvider>
      </body>
    </html>
  );
}
