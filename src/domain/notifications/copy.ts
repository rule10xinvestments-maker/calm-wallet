export const notificationCopyTemplates = {
  dailyReminder: {
    title: "A gentle tracking check-in",
    body: "If anything money-related happened today, you can jot it down when you have a moment.",
  },
  monthlyReview: {
    title: "Your monthly tracked review is ready",
    body: "A quick look at last month's tracked items can help you keep things tidy.",
  },
} as const;

const blockedTone = /\b(urgent|hurry|warning|shame|failed|bad|must|now!)\b/i;

export function assertCalmNotificationCopy(copy: { title: string; body: string }) {
  if (blockedTone.test(copy.title) || blockedTone.test(copy.body)) {
    throw new Error("Notification copy must stay calm and non-urgent.");
  }

  return copy;
}
