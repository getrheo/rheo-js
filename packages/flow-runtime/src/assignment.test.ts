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

  it('walks caller order and does not sort by weight', () => {
    const ordered: ExperimentVariant[] = [
      { id: 'first', weight: 1 },
      { id: 'second', weight: 1 },
    ];
    const reversed = [...ordered].reverse();
    const fromOrdered = assignVariant('exp', 'order-user', ordered);
    const fromReversed = assignVariant('exp', 'order-user', reversed);
    expect(fromOrdered?.id).not.toBe(fromReversed?.id);
  });
});
