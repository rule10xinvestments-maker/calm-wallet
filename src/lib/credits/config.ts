export const STARTING_CREDITS = 30;
export const LOW_CREDIT_NOTICE_THRESHOLDS = [10, 3] as const;

export const CREDIT_PACKS = {
  small: { credits: 50, priceUsd: "1.49" },
  large: { credits: 500, priceUsd: "9.99" },
  unlimitedYearly: { priceUsd: "19.99" },
} as const;

type CreditPackForSavings = {
  credits: number;
  priceUsd: string;
};

function isCreditPackForSavings(pack: unknown): pack is CreditPackForSavings {
  if (!pack || typeof pack !== "object") {
    return false;
  }

  const candidate = pack as Partial<CreditPackForSavings>;
  return typeof candidate.credits === "number" && typeof candidate.priceUsd === "string";
}

export function calculateCreditPackSavingsPercent(
  referencePack: CreditPackForSavings,
  candidatePack: CreditPackForSavings,
) {
  const referencePrice = Number.parseFloat(referencePack.priceUsd);
  const candidatePrice = Number.parseFloat(candidatePack.priceUsd);

  if (
    !Number.isFinite(referencePrice) ||
    !Number.isFinite(candidatePrice) ||
    referencePrice <= 0 ||
    candidatePrice <= 0 ||
    referencePack.credits <= 0 ||
    candidatePack.credits <= 0
  ) {
    return null;
  }

  const referenceCostPerCredit = referencePrice / referencePack.credits;
  const candidateCostPerCredit = candidatePrice / candidatePack.credits;

  if (candidateCostPerCredit >= referenceCostPerCredit) {
    return null;
  }

  return Math.round((1 - candidateCostPerCredit / referenceCostPerCredit) * 100);
}

export function getCreditPackSavingsMeta<TPackId extends string>(
  packs: Record<TPackId, unknown>,
): Partial<Record<TPackId, { savingsPercent: number | null; isBestValue: boolean }>> {
  const creditPacks = Object.entries(packs)
    .filter((entry): entry is [TPackId, CreditPackForSavings] => isCreditPackForSavings(entry[1]))
    .sort(([, first], [, second]) => first.credits - second.credits);
  const referencePack = creditPacks[0]?.[1] ?? null;

  if (!referencePack) {
    return {};
  }

  const savingsMeta = creditPacks.reduce<Partial<Record<TPackId, { savingsPercent: number | null; isBestValue: boolean }>>>(
    (meta, [packId, pack]) => {
      const savingsPercent = pack.credits > referencePack.credits ? calculateCreditPackSavingsPercent(referencePack, pack) : null;
      meta[packId] = { savingsPercent, isBestValue: false };
      return meta;
    },
    {},
  );

  const bestValuePack = creditPacks
    .map(([packId]) => ({ packId, savingsPercent: savingsMeta[packId]?.savingsPercent ?? null }))
    .filter((entry): entry is { packId: TPackId; savingsPercent: number } => entry.savingsPercent !== null && entry.savingsPercent > 0)
    .sort((first, second) => second.savingsPercent - first.savingsPercent || first.packId.localeCompare(second.packId))[0];

  if (bestValuePack && savingsMeta[bestValuePack.packId]) {
    savingsMeta[bestValuePack.packId] = { ...savingsMeta[bestValuePack.packId], isBestValue: true };
  }

  return savingsMeta;
}

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
