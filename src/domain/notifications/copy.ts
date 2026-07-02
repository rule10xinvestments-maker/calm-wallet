export const notificationCopyTemplates = {
  test: {
    title: "Calm Wallet is ready",
    body: "Notifications are working.",
  },
  dailyReminder: [
    {
      title: "Anything to add today?",
      body: "A quick note now keeps your wallet clear.",
    },
    {
      title: "Quick money check-in",
      body: "Add anything you spent or earned today.",
    },
    {
      title: "Before you forget",
      body: "Log today's money notes in a few seconds.",
    },
  ],
  monthlyReport: [
    {
      title: "Your month is ready",
      body: "See what changed in your money this month.",
    },
    {
      title: "Monthly clarity is ready",
      body: "Review your income, spending, and trends.",
    },
    {
      title: "A new month, a clearer view",
      body: "Take a quick look at last month's money.",
    },
  ],
} as const;

const blockedTone = /\b(urgent|hurry|warning|shame|failed|bad|must|now!)\b/i;

export function assertCalmNotificationCopy(copy: { title: string; body: string }) {
  if (blockedTone.test(copy.title) || blockedTone.test(copy.body)) {
    throw new Error("Notification copy must stay calm and non-urgent.");
  }

  return copy;
}

function dayOfYear(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

export function getDailyReminderCopy(now: Date) {
  return notificationCopyTemplates.dailyReminder[dayOfYear(now) % notificationCopyTemplates.dailyReminder.length];
}

export function getMonthlyReportCopy(now: Date) {
  return notificationCopyTemplates.monthlyReport[now.getUTCMonth() % notificationCopyTemplates.monthlyReport.length];
}

export function getRecurringEntryAddedCopy(name?: string | null) {
  const title = "Recurring entry added";
  const trimmedName = name?.trim();

  return {
    title,
    body: trimmedName
      ? `Your usual ${trimmedName} transaction was automatically added to Activity.`
      : "A repeating transaction was automatically added to Activity.",
  };
}

export function getLimitAlertCopy(categoryName: string, threshold: "seventy_percent" | "exceeded") {
  return threshold === "exceeded"
    ? {
        title: "Limit passed",
        body: `${categoryName} is now over your planned limit.`,
      }
    : {
        title: "Limit check-in",
        body: `${categoryName} is getting close to your planned limit.`,
      };
}
