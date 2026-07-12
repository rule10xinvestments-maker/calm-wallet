import type { AssistantActionState } from "@/lib/server/assistant";

export const initialAssistantActionState: AssistantActionState = {
  status: "idle",
  message: null,
  reviewState: null,
  latestTransaction: null,
  creditStatus: "ok",
  creditBalance: null,
  lowCreditThreshold: null,
  recentItems: [],
};
