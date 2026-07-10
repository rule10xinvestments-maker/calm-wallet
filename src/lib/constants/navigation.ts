import { ChartColumnBig, NotebookPen, ReceiptText } from "lucide-react";

export const PUBLIC_PATHS = ["/sign-in", "/sign-up"] as const;
export const PROTECTED_PATHS = ["/assistant", "/transactions", "/insights", "/admin"] as const;

export const APP_NAV_ITEMS = [
  { href: "/assistant", labelKey: "nav.assistant", icon: NotebookPen },
  { href: "/transactions", labelKey: "nav.activity", icon: ReceiptText },
  { href: "/insights", labelKey: "nav.insights", icon: ChartColumnBig },
] as const;
