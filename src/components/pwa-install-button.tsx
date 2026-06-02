"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

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

export function PwaInstallButton() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      return;
    }

    setShowIosHelp(isIosSafari());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCanPrompt(true);
      setShowIosHelp(false);
    }

    function handleAppInstalled() {
      deferredPromptRef.current = null;
      setCanPrompt(false);
      setShowIosHelp(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    const promptEvent = deferredPromptRef.current;

    if (!promptEvent) {
      return;
    }

    setCanPrompt(false);
    await promptEvent.prompt();
    await promptEvent.userChoice;
    deferredPromptRef.current = null;
  }

  if (canPrompt) {
    return (
      <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
        <Button className="w-full" onClick={handleInstallClick}>
          Download app
        </Button>
        <p className="mt-2 text-center text-sm text-sky-800">Install Calm Ledger on your home screen.</p>
      </div>
    );
  }

  if (showIosHelp) {
    return (
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
        <p className="text-sm font-medium text-slate-700">Install Calm Ledger on your home screen.</p>
        <p className="mt-1 text-sm text-slate-500">Use Share → Add to Home Screen.</p>
      </div>
    );
  }

  return null;
}
