import { describe, expect, it } from 'vitest';
import {
  animationTimelineAuthoringEndMs,
  applyReducedMotion,
  applyStaggerIndicesFromTreeOrder,
  clipsByLayerId,
  effectiveDelayMs,
  sampleClipAt,
  sampleLayerAnimAt,
  sampleTrack,
  screenAnimationsDurationMs,
  lottieJsonDurationMs,
  screenLoaderTimelineExtentMs,
} from './animations';
import type { AnimationClip, KeyframeTrack } from '@getrheo/contracts/animations';
import type { LoaderLayer, TextLayer } from '@getrheo/contracts/layers';
import type { Screen } from '@getrheo/contracts/screens';

const fadeIn: AnimationClip = {
  id: 'clip_fade',
  targetLayerId: 'lyr_target',
  trigger: 'mount',
  durationMs: 400,
  tracks: [
    {
      property: 'opacity',
      keyframes: [
        { t: 0, value: 0 },
        { t: 1, value: 1 },
      ],
    },
  ],
};

const screenWith = (overrides: Partial<Screen>): Screen => ({
  id: 'scr_test',
  name: 'Test',
  next: { default: null },
  regions: { body: { id: 'lyr_body', kind: 'stack', direction: 'vertical', children: [] } },
  ...overrides,
});

const txt = (id: string): TextLayer => ({
  id,
  kind: 'text',
  text: { default: 'Hi' },
  styleBreakpoints: {},
});

const loaderLayer = (partial: Partial<LoaderLayer> & Pick<LoaderLayer, 'id'>): LoaderLayer =>
  ({
    kind: 'loader',
    ...partial,
  }) as LoaderLayer;

describe('sampleTrack', () => {
  it('linear interpolates between two keyframes', () => {
    const track: KeyframeTrack = {
      property: 'opacity',
      keyframes: [
        { t: 0, value: 0 },
        { t: 1, value: 1 },
      ],
    };
    expect(sampleTrack(track, 0)).toBe(0);
    expect(sampleTrack(track, 0.5)).toBeCloseTo(0.5);
    expect(sampleTrack(track, 1)).toBe(1);
  });

  it('clamps below first and above last keyframe', () => {
    const track: KeyframeTrack = {
      property: 'translateY',
      keyframes: [
        { t: 0, value: -10 },
        { t: 1, value: 0 },
      ],
    };
    expect(sampleTrack(track, -1)).toBe(-10);
    expect(sampleTrack(track, 2)).toBe(0);
  });

  it('respects per-segment easing', () => {
    const linear: KeyframeTrack = {
      property: 'opacity',
      keyframes: [
        { t: 0, value: 0, easing: 'linear' },
        { t: 1, value: 1 },
      ],
    };
    const easeIn: KeyframeTrack = {
      property: 'opacity',
      keyframes: [
        { t: 0, value: 0, easing: 'ease-in' },
        { t: 1, value: 1 },
      ],
    };
    // ease-in pushes the bulk of the change toward the end of the segment.
    expect(sampleTrack(easeIn, 0.5)).toBeLessThan(sampleTrack(linear, 0.5));
  });
});

describe('sampleClipAt', () => {
  it('respects clip delay', () => {
    const screen = screenWith({});
    const clip: AnimationClip = { ...fadeIn, delayMs: 100 };
    expect(sampleClipAt(clip, screen, 0).opacity).toBe(0);
    expect(sampleClipAt(clip, screen, 100).opacity).toBe(0);
    expect(sampleClipAt(clip, screen, 300).opacity).toBeCloseTo(0.5);
    expect(sampleClipAt(clip, screen, 500).opacity).toBe(1);
  });

  it('adds stagger delay from screen config', () => {
    const screen = screenWith({ stagger: { stepMs: 50 } });
    const clip: AnimationClip = { ...fadeIn, trigger: 'stagger', staggerIndex: 2 };
    expect(effectiveDelayMs(clip, screen)).toBe(100);
    expect(sampleClipAt(clip, screen, 100).opacity).toBe(0);
    expect(sampleClipAt(clip, screen, 300).opacity).toBeCloseTo(0.5);
  });
});

describe('sampleLayerAnimAt', () => {
  it('holds delayed mount clip start values until the delay elapses (no earlier clip animating)', () => {
    const screen = screenWith({
      animations: [{ ...fadeIn, id: 'a', delayMs: 1000 }],
    });
    expect(sampleLayerAnimAt(screen, 'lyr_target', 0).opacity).toBe(0);
    expect(sampleLayerAnimAt(screen, 'lyr_target', 500).opacity).toBe(0);
    expect(sampleLayerAnimAt(screen, 'lyr_target', 1000).opacity).toBe(0);
    expect(sampleLayerAnimAt(screen, 'lyr_target', 1200).opacity).toBeCloseTo(0.5);
  });

  it('chains sequential appear then hide then appear', () => {
    const fadeOut: AnimationClip = {
      id: 'clip_out',
      targetLayerId: 'lyr_target',
      trigger: 'unmount',
      durationMs: 200,
      delayMs: 500,
      tracks: [
        {
          property: 'opacity',
          keyframes: [
            { t: 0, value: 1 },
            { t: 1, value: 0 },
          ],
        },
      ],
    };
    const secondIn: AnimationClip = {
      id: 'clip_in2',
      targetLayerId: 'lyr_target',
      trigger: 'mount',
      durationMs: 200,
      delayMs: 1000,
      tracks: [
        {
          property: 'opacity',
          keyframes: [
            { t: 0, value: 0 },
            { t: 1, value: 1 },
          ],
        },
      ],
    };
    const screen = screenWith({
      animations: [fadeIn, fadeOut, secondIn],
    });
    expect(sampleLayerAnimAt(screen, 'lyr_target', 200).opacity).toBeCloseTo(0.5);
    expect(sampleLayerAnimAt(screen, 'lyr_target', 600).opacity).toBeCloseTo(0.5);
    expect(sampleLayerAnimAt(screen, 'lyr_target', 900).opacity).toBe(0);
    expect(sampleLayerAnimAt(screen, 'lyr_target', 1100).opacity).toBeCloseTo(0.5);
    expect(sampleLayerAnimAt(screen, 'lyr_target', 1300).opacity).toBe(1);
  });

  it('merges multiple clips by timeline order and keeps completed values', () => {
    const moveIn: AnimationClip = {
      id: 'clip_move',
      targetLayerId: 'lyr_target',
      trigger: 'mount',
      durationMs: 200,
      tracks: [
        {
          property: 'translateY',
          keyframes: [
            { t: 0, value: 16 },
            { t: 1, value: 0 },
          ],
        },
      ],
    };
    const fadeLate: AnimationClip = {
      id: 'clip_fade_late',
      targetLayerId: 'lyr_target',
      trigger: 'mount',
      delayMs: 100,
      durationMs: 200,
      tracks: [
        {
          property: 'opacity',
          keyframes: [
            { t: 0, value: 0 },
            { t: 1, value: 1 },
          ],
        },
      ],
    };
    const screen = screenWith({ animations: [fadeLate, moveIn] });

    expect(sampleLayerAnimAt(screen, 'lyr_target', 50)).toEqual({ translateY: 12 });
    expect(sampleLayerAnimAt(screen, 'lyr_target', 150)).toEqual({
      translateY: 4,
      opacity: 0.25,
    });
    expect(sampleLayerAnimAt(screen, 'lyr_target', 300)).toEqual({
      translateY: 0,
      opacity: 1,
    });
  });
});

describe('reducedMotion', () => {
  it('snap-to-end collapses duration', () => {
    const collapsed = applyReducedMotion(fadeIn, 'snap-to-end');
    expect(collapsed.durationMs).toBe(0);
    const screen = screenWith({});
    expect(sampleClipAt(collapsed, screen, 0).opacity).toBe(1);
  });

  it('play preserves the clip', () => {
    expect(applyReducedMotion(fadeIn, 'play')).toBe(fadeIn);
  });
});

describe('screen helpers', () => {
  it('clipsByLayerId groups clips per target', () => {
    const screen = screenWith({ animations: [fadeIn, { ...fadeIn, id: 'b', trigger: 'stagger', staggerIndex: 1 }] });
    expect(clipsByLayerId(screen).get('lyr_target')?.length).toBe(2);
  });

  it('screenAnimationsDurationMs picks the longest clip + delay', () => {
    const screen = screenWith({
      stagger: { stepMs: 100 },
      animations: [
        { ...fadeIn, id: 'a' },
        { ...fadeIn, id: 'b', trigger: 'stagger', staggerIndex: 3, durationMs: 200 },
      ],
    });
    expect(screenAnimationsDurationMs(screen)).toBe(500);
  });

  it('animationTimelineAuthoringEndMs reflects mount/unmount clip extent only', () => {
    const short = screenWith({ animations: [{ ...fadeIn, id: 'a' }] });
    expect(animationTimelineAuthoringEndMs(short)).toBe(400);

    const mid = screenWith({
      animations: [{ ...fadeIn, id: 'a', delayMs: 8_000, durationMs: 10_000 }],
    });
    expect(screenAnimationsDurationMs(mid)).toBe(18_000);
    expect(animationTimelineAuthoringEndMs(mid)).toBe(18_000);
  });

  it('screenLoaderTimelineExtentMs is the max of (fillDelay + duration) over loaders', () => {
    expect(screenLoaderTimelineExtentMs(screenWith({}))).toBe(0);

    const one = screenWith({
      regions: {
        body: {
          id: 'lyr_body',
          kind: 'stack',
          direction: 'vertical',
          children: [loaderLayer({ id: 'ld1' })],
        },
      },
    });
    expect(screenLoaderTimelineExtentMs(one)).toBe(2000);

    const mixed = screenWith({
      regions: {
        body: {
          id: 'lyr_body',
          kind: 'stack',
          direction: 'vertical',
          children: [
            loaderLayer({ id: 'a', fillDelayMs: 500, durationMs: 1000 }),
            loaderLayer({ id: 'b', fillDelayMs: 0, durationMs: 5_000 }),
          ],
        },
      },
    });
    expect(screenLoaderTimelineExtentMs(mixed)).toBe(5_000);
  });

  it('lottieJsonDurationMs reads op/ip/fr from JSON', () => {
    expect(lottieJsonDurationMs({ fr: 60, ip: 0, op: 120 })).toBe(2000);
  });
});

describe('applyStaggerIndicesFromTreeOrder', () => {
  it('reindexes stagger clips from stack child order', () => {
    const screen = screenWith({
      regions: {
        body: {
          id: 'lyr_body',
          kind: 'stack',
          direction: 'vertical',
          children: [txt('a'), txt('b')],
        },
      },
      animations: [
        { ...fadeIn, id: 'c1', targetLayerId: 'b', trigger: 'stagger', staggerIndex: 9 },
        { ...fadeIn, id: 'c2', targetLayerId: 'a', trigger: 'stagger', staggerIndex: 0 },
      ],
    });
    const next = applyStaggerIndicesFromTreeOrder(screen);
    const byTarget = new Map((next.animations ?? []).map((c) => [c.targetLayerId, c]));
    expect(byTarget.get('a')?.staggerIndex).toBe(0);
    expect(byTarget.get('b')?.staggerIndex).toBe(1);
  });
});
