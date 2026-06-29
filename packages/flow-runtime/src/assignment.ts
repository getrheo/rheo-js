export type ExperimentVariant = {
  id: string;
  weight: number;
};

/** Stable string hash (FNV-1a 32-bit). Suitable for non-cryptographic bucketing. */
export const fnv1a = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

export const assignVariant = (
  experimentId: string,
  appUserId: string,
  variants: ExperimentVariant[],
): ExperimentVariant | null => {
  if (variants.length === 0) return null;
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight <= 0) return variants[0] ?? null;
  const bucket = fnv1a(`${experimentId}:${appUserId}`) % totalWeight;
  let acc = 0;
  for (const v of variants) {
    acc += v.weight;
    if (bucket < acc) return v;
  }
  return variants[variants.length - 1] ?? null;
};
