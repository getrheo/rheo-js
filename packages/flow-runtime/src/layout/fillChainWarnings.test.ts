import { describe, expect, it } from 'vitest';
import type { FlowManifest } from '@getrheo/contracts';
import type { Screen } from '@getrheo/contracts/screens';
import { validFlow } from '@rheo/contracts-fixtures/validFlow';
import {
  collectFillChainWarnings,
  collectFillChainWarningsForScreen,
  fillChainWarningForLayer,
} from './fillChainWarnings';

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

describe('collectFillChainWarnings', () => {
  it('returns no warnings when fill chain is complete', () => {
    const screen = verticalBody([
      {
        id: 'lyr_fill_child',
        kind: 'stack',
        direction: 'vertical',
        style: { width: 'full', height: 'fill' },
        children: [],
      },
    ]);
    expect(collectFillChainWarningsForScreen(screen)).toEqual([]);
  });

  it('warns when height fill has a hug ancestor', () => {
    const screen = verticalBody([
      {
        id: 'lyr_hug_parent',
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
    ]);
    const warnings = collectFillChainWarningsForScreen(screen);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.layerId).toBe('lyr_fill_child');
    expect(warnings[0]?.axis).toBe('height');
    expect(warnings[0]?.message).toContain('Hug');
  });

  it('does not warn for height fill under body root even when body uses hug', () => {
    const screen: Screen = {
      id: 'scr_body_hug',
      name: 'Body hug',
      next: { default: null },
      regions: {
        body: {
          id: 'lyr_body',
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
      },
    };
    expect(collectFillChainWarningsForScreen(screen)).toEqual([]);
  });

  it('warns when width fill has a hug ancestor in a horizontal stack', () => {
    const screen = verticalBody([
      {
        id: 'lyr_row_hug',
        kind: 'stack',
        direction: 'horizontal',
        style: { width: 'auto', height: 'fill' },
        children: [
          {
            id: 'lyr_fill_width',
            kind: 'stack',
            direction: 'vertical',
            style: { width: 'full', height: 'auto' },
            children: [],
          },
        ],
      },
    ]);
    const warnings = collectFillChainWarningsForScreen(screen);
    expect(warnings.some((w) => w.layerId === 'lyr_fill_width' && w.axis === 'width')).toBe(true);
  });

  it('does not warn for fraction or fixed sizing on the child', () => {
    const screen = verticalBody([
      {
        id: 'lyr_hug_parent',
        kind: 'stack',
        direction: 'vertical',
        style: { width: 'full', height: 'auto' },
        children: [
          {
            id: 'lyr_half_child',
            kind: 'stack',
            direction: 'vertical',
            style: { width: 'full', height: '1/2' },
            children: [],
          },
        ],
      },
    ]);
    expect(collectFillChainWarningsForScreen(screen)).toEqual([]);
  });

  it('allows fill when ancestor uses fixed px on the axis', () => {
    const screen = verticalBody([
      {
        id: 'lyr_fixed_parent',
        kind: 'stack',
        direction: 'vertical',
        style: { width: 'full', height: 240 },
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
    ]);
    expect(collectFillChainWarningsForScreen(screen)).toEqual([]);
  });

  it('collectFillChainWarnings walks every screen', () => {
    const manifest: FlowManifest = {
      ...validFlow(),
      screens: [verticalBody([])],
    };
    expect(collectFillChainWarnings(manifest)).toEqual([]);
  });

  it('fillChainWarningForLayer finds a warning by axis', () => {
    const screen = verticalBody([
      {
        id: 'lyr_hug_parent',
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
    ]);
    const warnings = collectFillChainWarningsForScreen(screen);
    expect(fillChainWarningForLayer(warnings, 'scr_test', 'lyr_fill_child', 'height')?.message).toContain(
      'Height Fill',
    );
    expect(fillChainWarningForLayer(warnings, 'scr_test', 'lyr_fill_child', 'width')).toBeUndefined();
  });
});
