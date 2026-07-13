"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, ImagePlus, XCircle, Bug } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { initialSupportTicketActionState, type SupportTicketActionState } from "@/lib/actions/support-state";
import { t } from "@/lib/i18n";

type SupportContactCardProps = {
  action: (state: SupportTicketActionState, formData: FormData) => Promise<SupportTicketActionState>;
  openToken?: number;
};

const supportCategoryKeys = ["app_bug", "account_issue", "data_issue", "notification_issue", "other_problem"] as const;
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxScreenshots = 3;
const maxScreenshotBytes = 5 * 1024 * 1024;

type ScreenshotItem = {
  id: string;
  file: File;
  previewUrl: string;
};

export function SupportContactCard({ action, openToken = 0 }: SupportContactCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<(typeof supportCategoryKeys)[number]>("app_bug");
  const [state, formAction, isPending] = useActionState(action, initialSupportTicketActionState);
  const [userAgent, setUserAgent] = useState("");
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const pathname = usePathname();
  const { locale } = useLocale();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setUserAgent(navigator.userAgent);
    const openReport = () => setIsOpen(true);
    window.addEventListener("calm-wallet:open-report-problem", openReport);
    return () => window.removeEventListener("calm-wallet:open-report-problem", openReport);
  }, []);

  useEffect(() => {
    if (openToken > 0) {
      setIsOpen(true);
    }
  }, [openToken]);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setSelectedCategory("app_bug");
      setIsCategoryOpen(false);
      clearScreenshots();
    }
  }, [state.status]);

  useEffect(() => () => clearScreenshots(), []);

  function clearScreenshots() {
    setScreenshots((items) => {
      items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setLocalError(null);
  }

  async function handleFileChange(files: FileList | null) {
    setLocalError(null);
    if (!files) return;

    const nextFiles = Array.from(files);
    if (screenshots.length + nextFiles.length > maxScreenshots) {
      setLocalError("tooMany");
      return;
    }

    const prepared: ScreenshotItem[] = [];

    for (const file of nextFiles) {
      if (!acceptedImageTypes.has(file.type)) {
        setLocalError("invalidImage");
        continue;
      }
      if (file.size > maxScreenshotBytes) {
        setLocalError("tooLarge");
        continue;
      }

      const resizedFile = await resizeScreenshot(file);
      prepared.push({
        id: crypto.randomUUID(),
        file: resizedFile,
        previewUrl: URL.createObjectURL(resizedFile),
      });
    }

    setScreenshots((items) => [...items, ...prepared].slice(0, maxScreenshots));
  }

  function removeScreenshot(id: string) {
    setScreenshots((items) => {
      const removed = items.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return items.filter((item) => item.id !== id);
    });
  }

  async function submitReport(formData: FormData) {
    formData.delete("screenshots");
    screenshots.forEach((item) => formData.append("screenshots", item.file, item.file.name));
    appendSupportDiagnostics(formData);
    formAction(formData);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-slate-50"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <Bug aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-900">{t("settings.support.title", locale)}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{t("settings.support.helper", locale)}</span>
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-slate-100 px-3 py-3">
          {state.status === "success" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
              <p className="font-semibold">{t("settings.support.successTitle", locale)}</p>
              <p className="mt-1 leading-5">{t("settings.support.successBody", locale)}</p>
              {state.message === "Report saved but one screenshot could not be uploaded." ? (
                <p className="mt-2 leading-5">{t("settings.support.errors.uploadFailed", locale)}</p>
              ) : null}
            </div>
          ) : null}

          <form ref={formRef} action={submitReport} className="mt-3 space-y-3">
            <input name="locale" type="hidden" value={locale} />
            <input name="sourceRoute" type="hidden" value={pathname ?? ""} />
            <input name="userAgent" type="hidden" value={userAgent} />

            <div className="space-y-1.5">
              <input name="category" type="hidden" value={selectedCategory} />
              <span className="block text-xs font-medium text-slate-700" id="support-category-label">
                {t("settings.support.category", locale)}
              </span>
              <button
                aria-expanded={isCategoryOpen}
                aria-labelledby="support-category-label support-category-value"
                className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-900 outline-none transition hover:bg-white focus:border-sky-300 focus:bg-white"
                onClick={() => setIsCategoryOpen((value) => !value)}
                type="button"
              >
                <span className="min-w-0 truncate" id="support-category-value">
                  {t(`settings.support.categories.${selectedCategory}`, locale)}
                </span>
                <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-slate-400 transition ${isCategoryOpen ? "rotate-180" : ""}`} />
              </button>
              {isCategoryOpen ? (
                <div className="grid gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                  {supportCategoryKeys.map((category) => {
                    const isSelected = category === selectedCategory;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`flex min-h-9 items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                          isSelected ? "bg-sky-50 text-sky-800" : "text-slate-700 hover:bg-slate-50"
                        }`}
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setIsCategoryOpen(false);
                        }}
                        type="button"
                      >
                        <span>{t(`settings.support.categories.${category}`, locale)}</span>
                        {isSelected ? <Check aria-hidden="true" className="size-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">{t("settings.support.subject", locale)}</span>
              <input
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
                maxLength={120}
                name="subject"
                placeholder={t("settings.support.subjectPlaceholder", locale)}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">{t("settings.support.message", locale)}</span>
              <textarea
                className="min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
                maxLength={2000}
                name="message"
                placeholder={t("settings.support.messagePlaceholder", locale)}
                required
              />
              <span className="block text-xs leading-5 text-slate-500">{t("settings.support.messageHelper", locale)}</span>
            </label>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-700">{t("settings.support.attachments", locale)}</span>
              <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition hover:bg-white">
                <ImagePlus aria-hidden="true" className="size-4" />
                {t("settings.support.addScreenshot", locale)}
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={isPending || screenshots.length >= maxScreenshots}
                  multiple
                  onChange={(event) => {
                    void handleFileChange(event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                  type="file"
                />
              </label>
              {screenshots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {screenshots.map((item) => (
                    <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50" key={item.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt="" className="h-full w-full object-cover" src={item.previewUrl} />
                      <button
                        aria-label={t("settings.support.removeScreenshot", locale)}
                        className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm"
                        disabled={isPending}
                        onClick={() => removeScreenshot(item.id)}
                        type="button"
                      >
                        <XCircle aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              {localError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {t(`settings.support.errors.${localError}`, locale)}
                </p>
              ) : null}
            </div>

            {state.status === "error" && state.message ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {translateSupportActionMessage(state.message, locale)}
              </p>
            ) : null}

            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? t("settings.support.sending", locale) : t("settings.support.send", locale)}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

async function resizeScreenshot(file: File) {
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    if (longestEdge <= 1800) {
      bitmap.close();
      return file;
    }

    const scale = 1800 / longestEdge;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, 0.82));
    if (!blob) return file;
    return new File([blob], file.name, { type: file.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}

function translateSupportActionMessage(message: string, locale: string) {
  const keys: Record<string, string> = {
    "Support message could not be sent. Please try again.": "settings.support.errors.generic",
    "Please wait a moment before sending another message.": "settings.support.errors.rateLimited",
    "Sign in is required.": "settings.support.errors.signInRequired",
  };
  const key = keys[message];
  return key ? t(key, locale as never) : t("settings.support.errors.generic", locale as never);
}

function appendSupportDiagnostics(formData: FormData) {
  if (typeof window === "undefined") {
    return;
  }

  const standaloneQuery = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean; userAgentData?: { platform?: string; mobile?: boolean } };
  const platform = navigatorWithStandalone.userAgentData?.platform || navigator.platform || "unknown";
  const mobile = navigatorWithStandalone.userAgentData?.mobile;
  const platformSummary = `${platform}${typeof mobile === "boolean" ? mobile ? " mobile" : " desktop" : ""}`;

  formData.set("viewportWidth", String(window.innerWidth));
  formData.set("viewportHeight", String(window.innerHeight));
  formData.set("platformSummary", platformSummary);
  formData.set("pwaDisplayMode", standaloneQuery || navigatorWithStandalone.standalone ? "standalone" : "browser");
  formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "");
  formData.set("onlineState", navigator.onLine ? "online" : "offline");
}
