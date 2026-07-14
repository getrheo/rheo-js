import type { FlowManifest } from '@getrheo/contracts/manifest';
import { describe, expect, it } from 'vitest';
import {
  applyLayoutDefaultsToLayerInPlace,
  defaultLayoutStyleForKind,
  mergeLayoutDefaultsIntoStyle,
  normalizeManifestLayoutInPlace,
} from './index';

describe('defaultLayoutStyleForKind', () => {
  it('stack fills its region', () => {
    expect(defaultLayoutStyleForKind('stack')).toEqual({ width: 'full', height: 'fill' });
  });

  it('text and counter hug content', () => {
    expect(defaultLayoutStyleForKind('text')).toEqual({ width: 'auto', height: 'auto' });
    expect(defaultLayoutStyleForKind('counter')).toEqual({ width: 'auto', height: 'auto' });
  });

  it('media kinds use a fixed default height', () => {
    expect(defaultLayoutStyleForKind('image')).toEqual({ width: 'full', height: 160 });
  });

  it('icon defaults to a 24×24 box', () => {
    expect(defaultLayoutStyleForKind('icon')).toEqual({ width: 24, height: 24 });
  });

  it('carousel has no layout default', () => {
    expect(defaultLayoutStyleForKind('carousel')).toBeNull();
  });
});

describe('mergeLayoutDefaultsIntoStyle', () => {
  it('fills missing axes from the kind default', () => {
    expect(mergeLayoutDefaultsIntoStyle('text', undefined)).toEqual({ width: 'auto', height: 'auto' });
  });

  it('keeps author-provided axes over defaults', () => {
    expect(mergeLayoutDefaultsIntoStyle('text', { width: 'full' })).toEqual({
      width: 'full',
      height: 'auto',
    });
  });

  it('returns the style unchanged for kinds without defaults', () => {
    expect(mergeLayoutDefaultsIntoStyle('carousel', { opacity: 1 })).toEqual({ opacity: 1 });
  });
});

describe('applyLayoutDefaultsToLayerInPlace', () => {
  it('backfills a sparse text layer to explicit auto/auto', () => {
    const layer: { kind: string; style?: Record<string, unknown> } = { kind: 'text' };
    applyLayoutDefaultsToLayerInPlace(layer);
    expect(layer.style).toEqual({ width: 'auto', height: 'auto' });
  });

  it('is a no-op for carousel (no outer style added)', () => {
    const layer: { kind: string; style?: Record<string, unknown> } = { kind: 'carousel' };
    applyLayoutDefaultsToLayerInPlace(layer);
    expect(layer.style).toBeUndefined();
  });

  it('backfills the per-kind gap default when omitted', () => {
    const layer: { kind: string; gap?: number; style?: Record<string, unknown> } = { kind: 'stack' };
    applyLayoutDefaultsToLayerInPlace(layer);
    expect(layer.gap).toBe(12);
  });

  it('keeps an authored gap over the default', () => {
    const layer: { kind: string; gap?: number; style?: Record<string, unknown> } = {
      kind: 'single_choice',
      gap: 20,
    };
    applyLayoutDefaultsToLayerInPlace(layer);
    expect(layer.gap).toBe(20);
  });

  it('does not add a gap to preset oauth provider rows', () => {
    const layer: { kind: string; variant: string; gap?: number } = {
      kind: 'oauth_provider',
      variant: 'preset',
    };
    applyLayoutDefaultsToLayerInPlace(layer);
    expect(layer.gap).toBeUndefined();
  });

  it('sizes a sparse circular loader as a square ring', () => {
    const layer: { kind: string; variant: string; style?: Record<string, unknown> } = {
      kind: 'loader',
      variant: 'circular',
    };
    applyLayoutDefaultsToLayerInPlace(layer);
    expect(layer.style).toEqual({ width: 48, height: 48, strokeWidth: 4 });
  });

  it('gives a sparse progress bar a fixed px height', () => {
    const layer: { kind: string; style?: Record<string, unknown> } = { kind: 'progress' };
    applyLayoutDefaultsToLayerInPlace(layer);
    expect(layer.style).toEqual({ width: 'full', height: 6 });
  });
});

describe('normalizeManifestLayoutInPlace', () => {
  it('backfills nested children (button label) to explicit sizing', () => {
    const manifest = {
      screens: [
        {
          id: 'scr_a',
          regions: {
            body: {
              id: 'lyr_stack',
              kind: 'stack',
              children: [
                {
                  id: 'lyr_btn',
                  kind: 'button',
                  children: [{ id: 'lyr_btn_text', kind: 'text' }],
                },
              ],
            },
          },
        },
      ],
    } as unknown as FlowManifest;

    normalizeManifestLayoutInPlace(manifest);

    const body = manifest.screens[0]!.regions.body as unknown as {
      style?: Record<string, unknown>;
      children: { style?: Record<string, unknown>; children: { style?: Record<string, unknown> }[] }[];
    };
    expect(body.style).toEqual({ width: 'full', height: 'fill' });
    expect(body.children[0]!.style).toEqual({ width: 'full', height: 'auto' });
    expect(body.children[0]!.children[0]!.style).toEqual({ width: 'auto', height: 'auto' });
  });
});
