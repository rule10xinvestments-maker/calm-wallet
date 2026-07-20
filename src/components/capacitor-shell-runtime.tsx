"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { Network } from "@capacitor/network";

const HOSTED_APP_HOST = "calm-wallet.vercel.app";
const ROOT_APP_PATHS = new Set(["/assistant", "/transactions", "/insights"]);

export type CapacitorNavigationIntent = "internal" | "external-http" | "system";

function isNativeShell() {
  return Capacitor.isNativePlatform();
}

function isPrimaryAppPath(pathname: string) {
  return ROOT_APP_PATHS.has(pathname) || pathname.startsWith("/settings");
}

export function getCapacitorNavigationIntent(href: string, currentHref: string): CapacitorNavigationIntent {
  const url = new URL(href, currentHref);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "system";
  }

  const currentUrl = new URL(currentHref);

  if (url.hostname === HOSTED_APP_HOST || url.origin === currentUrl.origin) {
    return "internal";
  }

  return "external-http";
}

export function CapacitorShellRuntime() {
  useEffect(() => {
    if (!isNativeShell()) {
      return;
    }

    document.documentElement.dataset.capacitorShell = "true";
    document.documentElement.style.setProperty("--capacitor-keyboard-height", "0px");

    const backButtonListener = App.addListener("backButton", async ({ canGoBack }) => {
      const { pathname } = window.location;

      if (canGoBack && !isPrimaryAppPath(pathname)) {
        window.history.back();
        return;
      }

      if (pathname !== "/assistant") {
        window.location.assign("/assistant");
        return;
      }

      await App.exitApp();
    });

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>("a[href]");

      if (!link || event.defaultPrevented || link.hasAttribute("download")) {
        return;
      }

      const navigationIntent = getCapacitorNavigationIntent(link.href, window.location.href);

      if (navigationIntent !== "external-http") {
        return;
      }

      const url = new URL(link.href, window.location.href);

      event.preventDefault();
      void Browser.open({ url: url.href });
    }

    document.addEventListener("click", handleDocumentClick, true);

    const keyboardWillShowListener = Keyboard.addListener("keyboardWillShow", (event) => {
      document.documentElement.style.setProperty("--capacitor-keyboard-height", `${event.keyboardHeight}px`);
    });
    const keyboardWillHideListener = Keyboard.addListener("keyboardWillHide", () => {
      document.documentElement.style.setProperty("--capacitor-keyboard-height", "0px");
    });
    const networkStatusListener = Network.addListener("networkStatusChange", (status) => {
      document.documentElement.dataset.connection = status.connected ? "online" : "offline";
    });

    void Network.getStatus().then((status) => {
      document.documentElement.dataset.connection = status.connected ? "online" : "offline";
    });

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      document.documentElement.removeAttribute("data-capacitor-shell");
      document.documentElement.removeAttribute("data-connection");
      document.documentElement.style.removeProperty("--capacitor-keyboard-height");
      void backButtonListener.then((listener) => listener.remove());
      void keyboardWillShowListener.then((listener) => listener.remove());
      void keyboardWillHideListener.then((listener) => listener.remove());
      void networkStatusListener.then((listener) => listener.remove());
    };
  }, []);

  return null;
}
