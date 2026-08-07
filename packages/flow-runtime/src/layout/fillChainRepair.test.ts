import { describe, expect, it } from 'vitest';
import type { Screen } from '@getrheo/contracts/screens';
import {
  collectFillChainBlockerIdsForLayer,
  collectFillChainWarningsForScreen,
  repairFillChainInScreen,
} from './index';

const verticalBody = (children: Screen['regions']['body']['children']): Screen => ({
  id: 'scr_test',
  name: 'Test',
  next: { default: null },
  regions: {
    body: {
      id: 'lyr_body',
      kind: 'stack',
      direction: 'vertical',
      style: { width: 'full', height: 'fill' },
      children,
    },
  },
});

describe('repairFillChainInScreen', () => {
  it('sets hug ancestors to fill and clears the warning', () => {
    const screen = verticalBody([
      {
        id: 'lyr_hug_mid',
        kind: 'stack',
        direction: 'vertical',
        style: { width: 'full', height: 'auto' },
        children: [
          {
            id: 'lyr_hug_inner',
            kind: 'stack',
            direction: 'vertical',
            style: { width: 'full', height: 'auto' },
            children: [
              {
                id: 'lyr_fill_child',
                kind: 'stack',
                direction: 'vertical',
                style: { width: 'full', height: 'fill' },
                children: [],
              },
            ],
          },
        ],
      },
    ]);

    expect(collectFillChainBlockerIdsForLayer(screen, 'lyr_fill_child', 'height')).toEqual([
      'lyr_hug_inner',
      'lyr_hug_mid',
    ]);
    expect(collectFillChainWarningsForScreen(screen)[0]?.blockerLayerId).toBe('lyr_hug_inner');

    const repaired = repairFillChainInScreen(screen, 'lyr_fill_child', 'height');
    expect(repaired?.repairedLayerIds).toEqual(['lyr_hug_inner', 'lyr_hug_mid']);
    expect(collectFillChainWarningsForScreen(repaired!.screen)).toEqual([]);
  });

  it('returns null when the chain is already valid', () => {
    const screen = verticalBody([
      {
        id: 'lyr_fill_child',
        kind: 'stack',
        direction: 'vertical',
        style: { width: 'full', height: 'fill' },
        children: [],
      },
    ]);
    expect(repairFillChainInScreen(screen, 'lyr_fill_child', 'height')).toBeNull();
  });
});
