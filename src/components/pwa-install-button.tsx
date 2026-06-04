"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false;
  }

  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  const standaloneMedia = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;

  return standaloneMedia || standaloneNavigator.standalone === true;
}

function isIosSafari() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);

  return isIos && isSafari;
}

function isMobileLikeBrowser() {
  if (typeof window === "undefined") {
    return false;
  }

  const coarsePointer = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;

  return coarsePointer || navigator.maxTouchPoints > 0;
}

function usePwaInstallState() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuidance, setShowIosGuidance] = useState(false);
  const [showMobileGuidance, setShowMobileGuidance] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setIsStandalone(true);
      return;
    }

    setShowIosGuidance(isIosSafari());
    setShowMobileGuidance(isMobileLikeBrowser());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCanPrompt(true);
      setShowIosGuidance(false);
      setShowMobileGuidance(false);
    }

    function handleAppInstalled() {
      deferredPromptRef.current = null;
      setCanPrompt(false);
      setIsStandalone(true);
      setShowIosGuidance(false);
      setShowMobileGuidance(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function promptInstall() {
    const promptEvent = deferredPromptRef.current;

    if (!promptEvent) {
      return false;
    }

    setCanPrompt(false);
    await promptEvent.prompt();
    await promptEvent.userChoice;
    deferredPromptRef.current = null;
    return true;
  }

  return {
    canPrompt,
    isStandalone,
    promptInstall,
    showGuidance: showIosGuidance || showMobileGuidance,
    showIosGuidance,
  };
}

export function PwaInstallButton() {
  const { canPrompt, isStandalone, promptInstall, showIosGuidance } = usePwaInstallState();

  async function handleInstallClick() {
    await promptInstall();
  }

  if (isStandalone) {
    return null;
  }

  if (canPrompt) {
    return (
      <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
        <Button className="w-full" onClick={handleInstallClick}>
          Download app
        </Button>
        <p className="mt-2 text-center text-sm text-sky-800">Install Calm Wallet on your home screen.</p>
      </div>
    );
  }

  if (showIosGuidance) {
    return (
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
        <p className="text-sm font-medium text-slate-700">Install Calm Wallet on your home screen.</p>
        <p className="mt-1 text-sm text-slate-500">{"Use Share \u2192 Add to Home Screen."}</p>
      </div>
    );
  }

  return null;
}

export function PwaInstallHeaderIcon({ className }: { className?: string }) {
  const { canPrompt, isStandalone, promptInstall, showGuidance } = usePwaInstallState();
  const [helperOpen, setHelperOpen] = useState(false);
  const shouldShow = !isStandalone && (canPrompt || showGuidance);

  async function handleClick() {
    if (canPrompt) {
      setHelperOpen(false);
      await promptInstall();
      return;
    }

    setHelperOpen((current) => !current);
  }

  if (!shouldShow) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <button
        aria-expanded={helperOpen}
        aria-label="Install Calm Wallet"
        className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 transition hover:bg-white hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={handleClick}
        type="button"
      >
        <Download className="size-4" aria-hidden="true" />
      </button>
      {helperOpen ? (
        <div className="absolute right-0 top-12 z-20 w-48 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600 shadow-calm">
          {"Use Share \u2192 Add to Home Screen."}
        </div>
      ) : null}
    </div>
  );
}
