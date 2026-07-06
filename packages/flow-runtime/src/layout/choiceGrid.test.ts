import { describe, expect, it } from 'vitest';
import { choiceGridTileWidth } from './choiceGrid';

describe('choiceGridTileWidth', () => {
  it('subtracts inter-column gaps before dividing', () => {
    expect(choiceGridTileWidth(300, 2, 8)).toBe(146);
  });

  it('returns 0 for non-positive container width', () => {
    expect(choiceGridTileWidth(0, 2, 8)).toBe(0);
    expect(choiceGridTileWidth(-1, 2, 8)).toBe(0);
  });

  it('clamps columns to at least 1', () => {
    expect(choiceGridTileWidth(120, 0, 4)).toBe(120);
  });
});
