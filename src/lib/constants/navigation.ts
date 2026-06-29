import { ChartColumnBig, NotebookPen, ReceiptText } from "lucide-react";

export const PUBLIC_PATHS = ["/sign-in", "/sign-up"] as const;
export const PROTECTED_PATHS = ["/assistant", "/transactions", "/insights"] as const;

export const APP_NAV_ITEMS = [
  { href: "/assistant", label: "Assistant", icon: NotebookPen },
  { href: "/transactions", label: "Activity", icon: ReceiptText },
  { href: "/insights", label: "Insights", icon: ChartColumnBig },
] as const;
