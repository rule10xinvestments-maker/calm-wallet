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

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [guidance, setGuidance] = useState<InstallGuidance>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setIsStandalone(true);
      return;
    }

    setGuidance(getInstallGuidance());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCanPrompt(true);
      setGuidance(null);
    }

    function handleAppInstalled() {
      deferredPromptRef.current = null;
      setCanPrompt(false);
      setGuidance(null);
      setIsStandalone(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
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
    return "Open Chrome menu \u22ee \u2192 Install app.";
  }

  if (guidance === "ios-safari") {
    return "Use Share \u2192 Add to Home Screen.";
  }

  if (guidance === "mobile-browser") {
    return "Open your browser menu to install the app.";
  }

  return null;
}
