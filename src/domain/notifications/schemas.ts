import { z } from "zod";

export const updateNotificationPreferencesSchema = z.object({
  dailyReminderEnabled: z.boolean().optional(),
  monthlyReviewEnabled: z.boolean().optional(),
});

export const registerPushSubscriptionSchema = z.object({
  endpoint: z.string().trim().url().max(2048),
  p256dh: z.string().trim().min(8).max(512),
  auth: z.string().trim().min(8).max(512),
  userAgent: z.string().trim().max(240).nullable().optional(),
});
