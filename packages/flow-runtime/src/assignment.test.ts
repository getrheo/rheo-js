import { describe, expect, it } from 'vitest';
import { assignVariant, fnv1a, type ExperimentVariant } from './assignment';

const variants: ExperimentVariant[] = [
  { id: 'v1', weight: 50 },
  { id: 'v2', weight: 50 },
];

describe('assignVariant', () => {
  it('returns deterministic variant for same identity', () => {
    const a = assignVariant('e1', 'user-x', variants);
    const b = assignVariant('e1', 'user-x', variants);
    expect(a?.id).toBe(b?.id);
  });

  it('respects weights probabilistically', () => {
    const counts = { v1: 0, v2: 0 };
    for (let i = 0; i < 1000; i++) {
      const v = assignVariant('e1', `u${i}`, variants);
      if (v?.id === 'v1') counts.v1++;
      else if (v?.id === 'v2') counts.v2++;
    }
    expect(counts.v1).toBeGreaterThan(350);
    expect(counts.v2).toBeGreaterThan(350);
  });

  it('produces stable hash', () => {
    expect(fnv1a('e1:abc')).toBe(fnv1a('e1:abc'));
  });
});
