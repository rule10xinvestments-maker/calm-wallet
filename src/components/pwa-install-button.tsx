"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInstallGuidanceText, usePwaInstallState } from "@/components/pwa-install-context";
import { cn } from "@/lib/utils";

export function PwaInstallButton() {
  const { canPrompt, guidance, isStandalone, promptInstall } = usePwaInstallState();
  const guidanceText = getInstallGuidanceText(guidance);

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

  if (guidanceText) {
    return (
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
        <p className="text-sm font-medium text-slate-700">Install Calm Wallet on your home screen.</p>
        <p className="mt-1 text-sm text-slate-500">{guidanceText}</p>
      </div>
    );
  }

  return null;
}

export function PwaInstallHeaderIcon({ className }: { className?: string }) {
  const { canPrompt, guidance, isStandalone, promptInstall } = usePwaInstallState();
  const [helperOpen, setHelperOpen] = useState(false);
  const guidanceText = getInstallGuidanceText(guidance);
  const shouldShow = !isStandalone && (canPrompt || Boolean(guidanceText));

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
      {helperOpen && guidanceText ? (
        <div className="absolute right-0 top-12 z-20 w-48 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600 shadow-calm">
          {guidanceText}
        </div>
      ) : null}
    </div>
  );
}
