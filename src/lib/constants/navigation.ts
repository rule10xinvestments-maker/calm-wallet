import { ChartColumnBig, ReceiptText, Sparkles } from "lucide-react";

export const PUBLIC_PATHS = ["/sign-in", "/sign-up"] as const;
export const PROTECTED_PATHS = ["/assistant", "/transactions", "/insights"] as const;

export const APP_NAV_ITEMS = [
  { href: "/assistant", label: "Assistant", icon: Sparkles },
  { href: "/transactions", label: "Activity", icon: ReceiptText },
  { href: "/insights", label: "Insights", icon: ChartColumnBig },
] as const;
