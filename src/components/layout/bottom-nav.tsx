"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV_ITEMS } from "@/lib/constants/navigation";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const [optimisticPathname, setOptimisticPathname] = useState<string | null>(null);
  const activePathname = optimisticPathname ?? pathname;

  useEffect(() => {
    setOptimisticPathname(null);
  }, [pathname]);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md border-t border-white/70 bg-white/90 px-3 pb-6 pt-3 backdrop-blur"
    >
      <div className="grid grid-cols-3 gap-2">
        {APP_NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
          const isActive = activePathname === href;
          const label = t(labelKey);

          return (
            <Link
              key={href}
              aria-current={pathname === href ? "page" : undefined}
              href={href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center rounded-2xl text-xs font-medium transition",
                isActive ? "bg-sky-50 text-sky-700 shadow-calm" : "text-slate-500 hover:bg-slate-50",
              )}
              onClick={() => setOptimisticPathname(href)}
            >
              <Icon className="mb-1 size-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
