import { describe, expect, it } from 'vitest';
import { sampleClipAt } from '@getrheo/flow-runtime/animations';
import type { AnimationClip } from '@getrheo/contracts/animations';
import type { Screen } from '@getrheo/contracts/screens';
import { motionStyleFromSample } from './motionPlayback';

const screen = (overrides: Partial<Screen>): Screen => ({
  id: 'scr_golden',
  name: 'Golden',
  next: { default: null },
  regions: { body: { id: 'lyr_body', kind: 'stack', direction: 'vertical', children: [] } },
  ...overrides,
});

const FADE_IN: AnimationClip = {
  id: 'clip_fade',
  targetLayerId: 'lyr_a',
  trigger: 'mount',
  durationMs: 400,
  tracks: [
    {
      property: 'opacity',
      keyframes: [
        { t: 0, value: 0, easing: 'standard' },
        { t: 1, value: 1 },
      ],
    },
  ],
};

const SLIDE_UP: AnimationClip = {
  id: 'clip_slide_up',
  targetLayerId: 'lyr_b',
  trigger: 'stagger',
  staggerIndex: 1,
  durationMs: 320,
  tracks: [
    {
      property: 'opacity',
      keyframes: [
        { t: 0, value: 0, easing: 'standard' },
        { t: 1, value: 1 },
      ],
    },
    {
      property: 'translateY',
      keyframes: [
        { t: 0, value: 16, easing: 'standard' },
        { t: 1, value: 0 },
      ],
    },
  ],
};

const SCALE_IN: AnimationClip = {
  id: 'clip_scale_in',
  targetLayerId: 'lyr_c',
  trigger: 'mount',
  delayMs: 80,
  durationMs: 240,
  tracks: [
    {
      property: 'opacity',
      keyframes: [
        { t: 0, value: 0, easing: 'emphasized' },
        { t: 1, value: 1 },
      ],
    },
    {
      property: 'scale',
      keyframes: [
        { t: 0, value: 0.96, easing: 'emphasized' },
        { t: 1, value: 1 },
      ],
    },
  ],
};

describe('motionPlayback parity', () => {
  const goldenScreen = screen({
    stagger: { stepMs: 60 },
    animations: [FADE_IN, SLIDE_UP, SCALE_IN],
  });

  it('maps flow-runtime samples to CSS transform and opacity', () => {
    const samples = goldenScreen.animations!.flatMap((clip) => {
      const total =
        (clip.delayMs ?? 0) +
        (clip.trigger === 'stagger'
          ? (clip.staggerIndex ?? 0) * (goldenScreen.stagger?.stepMs ?? 0)
          : 0) +
        clip.durationMs;
      return [0, Math.round(total / 2), total].map((t) => ({
        clipId: clip.id,
        t,
        css: motionStyleFromSample(sampleClipAt(clip, goldenScreen, t)),
      }));
    });
    expect(samples).toMatchSnapshot();
  });
});
