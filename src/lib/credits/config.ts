export const STARTING_CREDITS = 30;
export const LOW_CREDIT_NOTICE_THRESHOLDS = [10, 3] as const;

export const CREDIT_PACKS = {
  small: { credits: 50, priceUsd: "1.49" },
  large: { credits: 500, priceUsd: "9.99" },
  unlimitedYearly: { priceUsd: "19.99" },
} as const;

export function isCreditEnforcementEnabled() {
  return process.env.CALM_WALLET_CREDITS_ENFORCEMENT_ENABLED === "true";
}

export function areRewardedCreditsEnabled() {
  return (
    process.env.NEXT_PUBLIC_CALM_WALLET_REWARDED_CREDITS_ENABLED === "true" ||
    process.env.CALM_WALLET_REWARDED_CREDITS_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_REWARDED_CREDITS_ENABLED === "true" ||
    process.env.REWARDED_CREDITS_ENABLED === "true"
  );
}

export function areCreditPacksEnabled() {
  return (
    process.env.NEXT_PUBLIC_CALM_WALLET_CREDIT_PACKS_ENABLED === "true" ||
    process.env.CALM_WALLET_CREDIT_PACKS_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_CREDIT_PACKS_ENABLED === "true" ||
    process.env.CREDIT_PACKS_ENABLED === "true"
  );
}

export function isYearlyUnlimitedEnabled() {
  return (
    process.env.NEXT_PUBLIC_CALM_WALLET_YEARLY_UNLIMITED_ENABLED === "true" ||
    process.env.CALM_WALLET_YEARLY_UNLIMITED_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_YEARLY_UNLIMITED_ENABLED === "true" ||
    process.env.YEARLY_UNLIMITED_ENABLED === "true"
  );
}
