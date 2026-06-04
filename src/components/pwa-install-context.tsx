"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallGuidance = "android-chrome" | "ios-safari" | "mobile-browser" | null;

type PwaInstallContextValue = {
  canPrompt: boolean;
  guidance: InstallGuidance;
  isStandalone: boolean;
  promptInstall: () => Promise<boolean>;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);
const isDevelopment = process.env.NODE_ENV === "development";

function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false;
  }

  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  const standaloneMedia = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;

  return standaloneMedia || standaloneNavigator.standalone === true;
}

function getInstallGuidance(): InstallGuidance {
  if (typeof window === "undefined") {
    return null;
  }

  const userAgent = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isChrome = /Chrome|CriOS/.test(userAgent) && !/Edg|EdgiOS|OPR|SamsungBrowser/.test(userAgent);
  const coarsePointer = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;

  if (isIos && isSafari) {
    return "ios-safari";
  }

  if (isAndroid && isChrome) {
    return "android-chrome";
  }

  if (coarsePointer || navigator.maxTouchPoints > 0) {
    return "mobile-browser";
  }

  return null;
}

function getPlatformCategory() {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const userAgent = window.navigator.userAgent;

  if (/Android/.test(userAgent) && /Chrome/.test(userAgent) && !/Edg|OPR|SamsungBrowser/.test(userAgent)) {
    return "android-chrome";
  }

  if (/iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }

  if (/Android/.test(userAgent)) {
    return "android-other";
  }

  return "desktop-or-other";
}

function logInstallDiagnostics(snapshot: Record<string, unknown>) {
  if (!isDevelopment) {
    return;
  }

  console.info("[pwa-install-diagnostics]", snapshot);
}

async function loadManifestDiagnostics() {
  try {
    const response = await fetch("/manifest.webmanifest", { cache: "no-store" });

    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
    };
  } catch (error) {
    return {
      errorName: error instanceof Error ? error.name : "UnknownError",
    };
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    return {
      registered: false,
      reason: "unsupported-or-insecure-context",
    };
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    return {
      registered: true,
      scope: registration.scope,
    };
  } catch (error) {
    return {
      registered: false,
      errorName: error instanceof Error ? error.name : "UnknownError",
    };
  }
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [guidance, setGuidance] = useState<InstallGuidance>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    let beforeInstallPromptFired = false;
    let appInstalledFired = false;
    let isMounted = true;
    let serviceWorkerRegistrationStatus: Record<string, unknown> | null = null;

    async function writeDiagnostics(reason: string) {
      if (!isDevelopment || !isMounted) {
        return;
      }

      logInstallDiagnostics({
        reason,
        serviceWorkerPresent: "serviceWorker" in navigator,
        serviceWorkerRegistration: serviceWorkerRegistrationStatus,
        manifest: await loadManifestDiagnostics(),
        displayModeStandalone: typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches,
        beforeinstallpromptFired: beforeInstallPromptFired,
        appinstalledFired: appInstalledFired,
        userAgent: window.navigator.userAgent,
        platform: window.navigator.platform,
        platformCategory: getPlatformCategory(),
        standaloneDetected: isStandaloneDisplay(),
      });
    }

    void registerServiceWorker().then((status) => {
      serviceWorkerRegistrationStatus = status;
      void writeDiagnostics("service-worker-registration");
    });

    if (isStandaloneDisplay()) {
      setIsStandalone(true);
      void writeDiagnostics("standalone-detected");
      return;
    }

    setGuidance(getInstallGuidance());
    void writeDiagnostics("mounted");

    function handleBeforeInstallPrompt(event: Event) {
      beforeInstallPromptFired = true;
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCanPrompt(true);
      setGuidance(null);
      void writeDiagnostics("beforeinstallprompt");
    }

    function handleAppInstalled() {
      appInstalledFired = true;
      deferredPromptRef.current = null;
      setCanPrompt(false);
      setGuidance(null);
      setIsStandalone(true);
      void writeDiagnostics("appinstalled");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      isMounted = false;
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      canPrompt,
      guidance,
      isStandalone,
      async promptInstall() {
        const promptEvent = deferredPromptRef.current;

        if (!promptEvent) {
          return false;
        }

        setCanPrompt(false);
        await promptEvent.prompt();
        await promptEvent.userChoice;
        deferredPromptRef.current = null;
        setGuidance(getInstallGuidance());
        return true;
      },
    }),
    [canPrompt, guidance, isStandalone],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstallState() {
  const context = useContext(PwaInstallContext);

  if (!context) {
    throw new Error("usePwaInstallState must be used within PwaInstallProvider.");
  }

  return context;
}

export function getInstallGuidanceText(guidance: InstallGuidance) {
  if (guidance === "android-chrome") {
    return {
      detail: "Choose Install app if you see it.",
      title: "Open Chrome menu \u2192 Add to Home screen.",
    };
  }

  if (guidance === "ios-safari") {
    return {
      detail: null,
      title: "Use Share \u2192 Add to Home Screen.",
    };
  }

  if (guidance === "mobile-browser") {
    return {
      detail: null,
      title: "Open your browser menu to install the app.",
    };
  }

  return null;
}
