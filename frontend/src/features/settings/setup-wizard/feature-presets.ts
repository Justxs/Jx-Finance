import type { FeatureFlags } from "@/api/generated/model";
import type { FeatureKey } from "@/lib/settings";

export const presetNames = ["track", "household", "everything"] as const;

export type PresetName = (typeof presetNames)[number];

const optIn: ReadonlySet<FeatureKey> = new Set(["apiTokens", "locations", "learnedCategories"]);

const track: readonly FeatureKey[] = [
  "import",
  "categorizationRules",
  "payeeNames",
  "attachments",
  "unusualAmounts",
  "reports",
];

const household: readonly FeatureKey[] = [
  ...track,
  "budgets",
  "goals",
  "recurringBills",
  "cashFlowForecast",
  "monthClose",
  "households",
  "people",
];

const presetFeatures: Record<PresetName, ReadonlySet<FeatureKey>> = {
  track: new Set(track),
  household: new Set(household),
  everything: new Set([...household, "netWorth", "investments", "multiCurrency", "receiptReading"]),
};

function isFeatureKey(key: string, flags: FeatureFlags): key is FeatureKey {
  return key in flags;
}

export function applyPreset(current: FeatureFlags, preset: PresetName): FeatureFlags {
  const applied = { ...current };
  for (const key of Object.keys(current)) {
    if (isFeatureKey(key, current) && !optIn.has(key)) {
      applied[key] = presetFeatures[preset].has(key);
    }
  }
  return applied;
}

export function matchingPreset(current: FeatureFlags): PresetName | undefined {
  return presetNames.find((preset) => {
    const applied = applyPreset(current, preset);
    return Object.keys(current).every(
      (key) => !isFeatureKey(key, current) || applied[key] === current[key],
    );
  });
}
