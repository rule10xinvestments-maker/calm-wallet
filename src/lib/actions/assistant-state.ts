import type { AssistantActionState } from "@/lib/server/assistant";

export const initialAssistantActionState: AssistantActionState = {
  status: "idle",
  message: null,
  reviewState: null,
  latestTransaction: null,
  recentItems: [],
};
