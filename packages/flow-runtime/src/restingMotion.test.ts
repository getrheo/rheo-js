import { describe, expect, it } from 'vitest';
import type { AnimationClip } from '@getrheo/contracts/animations';
import type { Screen } from '@getrheo/contracts/screens';
import { RestingMotionSchema, type RestingMotion } from '@getrheo/contracts/layers';
import { effectiveDelayMs } from './animations';
import {
  bouncePhaseToTranslateY,
  layerMountClipsEndMs,
  layerRestingMotionStartMs,
  motionTimelineScrubClampMs,
  workbenchTimelineTotalMs,
  DEFAULT_WORKBENCH_TIMELINE_MS,
  restingMotionAllowedAtTime,
  RESTING_MOTION_DEFAULT_DURATION_MS,
  restingMotionMotionSpeedSliderMs,
  restingMotionNormalizeScaleNonLoopClip,
  restingMotionPhase01,
  restingMotionSampleStyle,
  restingMotionScaleAtPhase,
  restingMotionScaleDirection,
  restingMotionScalePatternDurationMs,
  restingMotionScalePeakMultiplier,
  restingMotionSyncScaleNonLoopClipAndPattern,
} from './restingMotion';

describe('RestingMotionSchema', () => {
  it('parses minimal preset', () => {
    const r = RestingMotionSchema.safeParse({ preset: 'pulse' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.preset).toBe('pulse');
  });

  it('rejects intensity out of range', () => {
    const r = RestingMotionSchema.safeParse({ preset: 'scale', intensity: 3 });
    expect(r.success).toBe(false);
  });

  it('parses delayMsAfterMountEnd', () => {
    const r = RestingMotionSchema.safeParse({ preset: 'pulse', delayMsAfterMountEnd: 1200 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.delayMsAfterMountEnd).toBe(1200);
  });

  it('parses timelineStartMs', () => {
    const r = RestingMotionSchema.safeParse({ preset: 'pulse', timelineStartMs: 400 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.timelineStartMs).toBe(400);
  });

  it('parses loop and cycleDurationMs', () => {
    const r = RestingMotionSchema.safeParse({
      preset: 'bounce',
      loop: true,
      cycleDurationMs: 900,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.loop).toBe(true);
      expect(r.data.cycleDurationMs).toBe(900);
    }
  });

  it('allows scalePercent up to 400 for 5× growth (400% above base)', () => {
    const r = RestingMotionSchema.safeParse({
      preset: 'scale',
      scalePercent: 400,
      scaleDirection: 'up',
    });
    expect(r.success).toBe(true);
  });

  it('allows scalePercent up to 90 for deep shrink', () => {
    const r = RestingMotionSchema.safeParse({
      preset: 'scale',
      scalePercent: 90,
      scaleDirection: 'down',
    });
    expect(r.success).toBe(true);
  });

  it('parses scale preset options', () => {
    const r = RestingMotionSchema.safeParse({
      preset: 'scale',
      scaleDirection: 'down',
      scalePercent: 12,
      scalePatternDurationMs: 1500,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.scaleDirection).toBe('down');
      expect(r.data.scalePercent).toBe(12);
      expect(r.data.scalePatternDurationMs).toBe(1500);
    }
  });

  it('parses bounceAmplitudePx', () => {
    const r = RestingMotionSchema.safeParse({ preset: 'bounce', bounceAmplitudePx: 24 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.bounceAmplitudePx).toBe(24);
  });
});

describe('layerMountClipsEndMs', () => {
  const screenBase: Screen = {
    id: 'scr_t',
    name: 'T',
    next: { default: 'scr_t' },
    regions: {
      body: {
        id: 'lyr_root',
        kind: 'stack',
        direction: 'vertical',
        children: [],
      },
    },
    containerStyleBreakpoints: {},
  };

  const mountClip = (targetLayerId: string, delayMs: number, durationMs: number): AnimationClip => ({
    id: 'clip_1',
    targetLayerId,
    trigger: 'mount',
    durationMs,
    delayMs,
    tracks: [
      {
        property: 'opacity',
        keyframes: [
          { t: 0, value: 0, easing: 'standard' },
          { t: 1, value: 1 },
        ],
      },
    ],
  });

  it('returns 0 when no clips', () => {
    const screen: Screen = { ...screenBase, animations: [] };
    expect(layerMountClipsEndMs(screen, 'lyr_x')).toBe(0);
  });

  it('returns max of mount end times', () => {
    const screen: Screen = {
      ...screenBase,
      animations: [
        mountClip('lyr_a', 100, 200),
        mountClip('lyr_a', 0, 500),
      ],
    };
    expect(layerMountClipsEndMs(screen, 'lyr_a')).toBe(500);
  });

  it('includes stagger delay', () => {
    const clip: AnimationClip = {
      ...mountClip('lyr_a', 0, 300),
      trigger: 'stagger',
      staggerIndex: 2,
    };
    const screen: Screen = {
      ...screenBase,
      stagger: { stepMs: 80 },
      animations: [clip],
    };
    const expected = effectiveDelayMs(clip, screen) + 300;
    expect(layerMountClipsEndMs(screen, 'lyr_a')).toBe(expected);
  });
});

describe('layerRestingMotionStartMs & restingMotionAllowedAtTime', () => {
  const screenBase: Screen = {
    id: 'scr_t',
    name: 'T',
    next: { default: null },
    regions: {
      body: {
        id: 'lyr_root',
        kind: 'stack',
        direction: 'vertical',
        children: [],
      },
    },
    containerStyleBreakpoints: {},
    animations: [
      {
        id: 'clip_m',
        targetLayerId: 'lyr_a',
        trigger: 'mount',
        durationMs: 100,
        delayMs: 400,
        tracks: [{ property: 'opacity', keyframes: [{ t: 0, value: 0 }, { t: 1, value: 1 }] }],
      },
    ],
  };

  const cfg = { preset: 'pulse' as const, delayMsAfterMountEnd: 250 };

  it('layerRestingMotionStartMs adds mount end and delay', () => {
    expect(layerMountClipsEndMs(screenBase, 'lyr_a')).toBe(500);
    expect(layerRestingMotionStartMs(screenBase, 'lyr_a', cfg)).toBe(750);
  });

  it('restingMotionAllowedAtTime crosses at start', () => {
    expect(restingMotionAllowedAtTime(screenBase, 'lyr_a', 749, cfg)).toBe(false);
    expect(restingMotionAllowedAtTime(screenBase, 'lyr_a', 750, cfg)).toBe(true);
  });

  it('restingMotionAllowedAtTime ends after segment', () => {
    const start = layerRestingMotionStartMs(screenBase, 'lyr_a', cfg);
    const dur = RESTING_MOTION_DEFAULT_DURATION_MS.pulse;
    expect(restingMotionAllowedAtTime(screenBase, 'lyr_a', start + dur - 1, cfg)).toBe(true);
    expect(restingMotionAllowedAtTime(screenBase, 'lyr_a', start + dur, cfg)).toBe(false);
  });

  it('timelineStartMs overrides mount end + delay', () => {
    const cfgWithTimeline = {
      preset: 'pulse' as const,
      timelineStartMs: 120,
      delayMsAfterMountEnd: 9_999,
    };
    expect(layerRestingMotionStartMs(screenBase, 'lyr_a', cfgWithTimeline)).toBe(120);
  });
});

describe('workbenchTimelineTotalMs', () => {
  it('uses 10s default when no motion is scheduled', () => {
    const screen: Screen = {
      id: 'scr_empty',
      name: 'Empty',
      next: { default: null },
      regions: {
        body: {
          id: 'lyr_root',
          kind: 'stack',
          direction: 'vertical',
          children: [{ id: 'lyr_t', kind: 'text', style: {}, text: { default: 'hi' } }],
        },
      },
      containerStyleBreakpoints: {},
    };
    expect(motionTimelineScrubClampMs(screen)).toBe(0);
    expect(workbenchTimelineTotalMs(screen)).toBe(DEFAULT_WORKBENCH_TIMELINE_MS);
  });

  it('grows with long loader fill segments', () => {
    const screen: Screen = {
      id: 'scr_ld',
      name: 'Loader',
      next: { default: null },
      regions: {
        body: {
          id: 'lyr_root',
          kind: 'stack',
          direction: 'vertical',
          children: [
            {
              id: 'lyr_ld',
              kind: 'loader',
              style: {},
              fillDelayMs: 0,
              durationMs: 60_000,
            },
          ],
        },
      },
      containerStyleBreakpoints: {},
    };
    expect(workbenchTimelineTotalMs(screen)).toBe(60_000);
  });
});

describe('motionTimelineScrubClampMs', () => {
  it('extends past mount clips when resting ends later', () => {
    const screen: Screen = {
      id: 'scr_t',
      name: 'T',
      next: { default: null },
      regions: {
        body: {
          id: 'lyr_root',
          kind: 'stack',
          direction: 'vertical',
          children: [
            {
              id: 'lyr_a',
              kind: 'text',
              style: {},
              text: { default: 'x' },
              restingMotion: { preset: 'pulse' },
            },
          ],
        },
      },
      containerStyleBreakpoints: {},
      animations: [
        {
          id: 'clip_m',
          targetLayerId: 'lyr_a',
          trigger: 'mount',
          durationMs: 100,
          delayMs: 0,
          tracks: [{ property: 'opacity', keyframes: [{ t: 0, value: 0 }, { t: 1, value: 1 }] }],
        },
      ],
    };
    const clipEnd = 100;
    const restingEnd =
      layerRestingMotionStartMs(screen, 'lyr_a', { preset: 'pulse' }) +
      RESTING_MOTION_DEFAULT_DURATION_MS.pulse;
    expect(motionTimelineScrubClampMs(screen)).toBe(Math.max(clipEnd, restingEnd));
    expect(motionTimelineScrubClampMs(screen)).toBeGreaterThan(clipEnd);
  });
});

describe('RESTING_MOTION_DEFAULT_DURATION_MS', () => {
  it('has entries for every preset', () => {
    const presets = ['translate', 'bounce', 'scale', 'pulse', 'rotate'] as const;
    for (const p of presets) {
      expect(RESTING_MOTION_DEFAULT_DURATION_MS[p]).toBeGreaterThan(0);
    }
  });
});

describe('scale resting motion', () => {
  const scaleBase = {
    preset: 'scale' as const,
    scalePercent: 10,
    scalePatternDurationMs: 1000,
  };

  it('restingMotionScaleAtPhase scale up: 400% → 5× at peak', () => {
    const cfg = { ...scaleBase, scaleDirection: 'up' as const, scalePercent: 400 };
    expect(restingMotionScaleAtPhase(cfg, 0.5)).toBeCloseTo(5, 5);
  });

  it('restingMotionScaleAtPhase goes 1 → peak → 1 for scale up', () => {
    const cfg = { ...scaleBase, scaleDirection: 'up' as const };
    expect(restingMotionScaleAtPhase(cfg, 0)).toBeCloseTo(1, 5);
    expect(restingMotionScaleAtPhase(cfg, 0.5)).toBeCloseTo(1.1, 5);
    expect(restingMotionScaleAtPhase(cfg, 1)).toBeCloseTo(1, 5);
  });

  it('restingMotionScaleAtPhase goes 1 → peak → 1 for scale down (90% → 10% size at peak)', () => {
    const cfg = { ...scaleBase, scaleDirection: 'down' as const, scalePercent: 90 };
    expect(restingMotionScaleAtPhase(cfg, 0.5)).toBeCloseTo(0.1, 5);
  });

  it('restingMotionScaleAtPhase goes 1 → peak → 1 for scale down', () => {
    const cfg = { ...scaleBase, scaleDirection: 'down' as const };
    expect(restingMotionScaleAtPhase(cfg, 0)).toBeCloseTo(1, 5);
    expect(restingMotionScaleAtPhase(cfg, 0.5)).toBeCloseTo(0.9, 5);
    expect(restingMotionScaleAtPhase(cfg, 1)).toBeCloseTo(1, 5);
  });

  it('restingMotionScaleAtPhase without spring back ramps to peak', () => {
    const cfg = { ...scaleBase, scaleDirection: 'up' as const, scaleSpringBack: false as const };
    expect(restingMotionScaleAtPhase(cfg, 0)).toBeCloseTo(1, 5);
    expect(restingMotionScaleAtPhase(cfg, 0.5)).toBeCloseTo(1.05, 5);
    expect(restingMotionScaleAtPhase(cfg, 1)).toBeCloseTo(1.1, 5);
  });

  it('restingMotionScalePeakMultiplier is peak scale when spring back is off', () => {
    const cfg = { ...scaleBase, scaleDirection: 'up' as const, scalePercent: 20, scaleSpringBack: false as const };
    expect(restingMotionScalePeakMultiplier(cfg)).toBeCloseTo(1.2, 5);
    expect(restingMotionScaleAtPhase(cfg, 0.5)).toBeCloseTo(1.1, 5);
  });

  it('scale without spring back: sample style ramps scale', () => {
    const cfg: RestingMotion = {
      preset: 'scale',
      scaleDirection: 'up',
      scalePercent: 10,
      scaleSpringBack: false,
      intensity: 1,
    };
    expect(restingMotionSampleStyle(cfg, 0).transform).toBe('scale(1)');
    expect(restingMotionSampleStyle(cfg, 0.5).transform).toBe('scale(1.05)');
    expect(restingMotionSampleStyle(cfg, 1).transform).toBe('scale(1.1)');
  });

  it('restingMotionPhase01 non-loop scale: timeline segment (durationMs) drives one cycle', () => {
    const cfg = {
      ...scaleBase,
      durationMs: 5000,
      scalePatternDurationMs: 1000,
      loop: false as const,
    };
    expect(restingMotionPhase01(cfg, 0)).toBe(0);
    expect(restingMotionPhase01(cfg, 2500)).toBeCloseTo(0.5, 5);
    expect(restingMotionPhase01(cfg, 5000)).toBe(1);
    expect(restingMotionPhase01(cfg, 6000)).toBe(1);
  });

  it('restingMotionPhase01 loops scale by pattern when loop is on', () => {
    const cfg = { ...scaleBase, loop: true as const, durationMs: 10_000 };
    expect(restingMotionPhase01(cfg, 0)).toBe(0);
    expect(restingMotionPhase01(cfg, 500)).toBeCloseTo(0.5, 5);
    expect(restingMotionPhase01(cfg, 1000)).toBe(0);
  });

  it('rotate with spring back: rests at 0° and peaks mid-phase', () => {
    const cfg: RestingMotion = { preset: 'rotate', rotateMaxDeg: 90, intensity: 1 };
    expect(restingMotionSampleStyle(cfg, 0).transform).toBe('rotate(0deg)');
    expect(restingMotionSampleStyle(cfg, 0.5).transform).toBe('rotate(90deg)');
    expect(restingMotionSampleStyle(cfg, 1).transform).toBe('rotate(0deg)');
  });

  it('rotate without spring back: ramps to peak at end of phase', () => {
    const cfg: RestingMotion = {
      preset: 'rotate',
      rotateMaxDeg: 90,
      intensity: 1,
      rotateSpringBack: false,
    };
    expect(restingMotionSampleStyle(cfg, 0).transform).toBe('rotate(0deg)');
    expect(restingMotionSampleStyle(cfg, 0.5).transform).toBe('rotate(45deg)');
    expect(restingMotionSampleStyle(cfg, 1).transform).toBe('rotate(90deg)');
  });

  it('rotate counterclockwise: negates sampled angle', () => {
    const cfg: RestingMotion = {
      preset: 'rotate',
      rotateMaxDeg: 90,
      intensity: 1,
      rotateDirection: 'counterclockwise',
    };
    expect(restingMotionSampleStyle(cfg, 0).transform).toBe('rotate(0deg)');
    expect(restingMotionSampleStyle(cfg, 0.5).transform).toBe('rotate(-90deg)');
    expect(restingMotionSampleStyle(cfg, 1).transform).toBe('rotate(0deg)');
  });

  it('translate with spring back: origin at ends, peak on X at mid phase', () => {
    const cfg: RestingMotion = {
      preset: 'translate',
      translatePeakXPercent: 10,
      translatePeakYPercent: 0,
      intensity: 1,
    };
    expect(restingMotionSampleStyle(cfg, 0).transform).toBe('translate(0%, 0%)');
    expect(restingMotionSampleStyle(cfg, 0.5).transform).toBe('translate(10%, 0%)');
    expect(restingMotionSampleStyle(cfg, 1).transform).toBe('translate(0%, 0%)');
  });

  it('translate without spring: ramps to peak offset', () => {
    const cfg: RestingMotion = {
      preset: 'translate',
      translatePeakXPercent: 8,
      translatePeakYPercent: 6,
      translateSpringBack: false,
      intensity: 1,
    };
    expect(restingMotionSampleStyle(cfg, 0).transform).toBe('translate(0%, 0%)');
    expect(restingMotionSampleStyle(cfg, 0.5).transform).toBe('translate(4%, 3%)');
    expect(restingMotionSampleStyle(cfg, 1).transform).toBe('translate(8%, 6%)');
  });

  it('translate default uses peak Y percent when no authoring fields', () => {
    const cfg: RestingMotion = { preset: 'translate', intensity: 1 };
    expect(restingMotionSampleStyle(cfg, 0.5).transform).toBe('translate(0%, 6%)');
  });

  it('legacy translateRangePx maps to Y-only peak', () => {
    const cfg: RestingMotion = { preset: 'translate', translateRangePx: 12, intensity: 1 };
    expect(restingMotionSampleStyle(cfg, 0).transform).toBe('translate(0px, 0px)');
    expect(restingMotionSampleStyle(cfg, 0.5).transform).toBe('translate(0px, 12px)');
    expect(restingMotionSampleStyle(cfg, 1).transform).toBe('translate(0px, 0px)');
  });

  it('restingMotionScaleDirection infers down from legacy scaleDownPercent only', () => {
    expect(
      restingMotionScaleDirection({
        preset: 'scale',
        scaleDownPercent: 5,
        scaleUpPercent: 0,
      }),
    ).toBe('down');
  });

  it('restingMotionScalePatternDurationMs non-loop prefers durationMs over mismatched pattern', () => {
    expect(
      restingMotionScalePatternDurationMs({
        preset: 'scale',
        loop: false,
        durationMs: 3000,
        scalePatternDurationMs: 1000,
      }),
    ).toBe(3000);
  });

  it('restingMotionScalePatternDurationMs falls back to cycle and default', () => {
    expect(
      restingMotionScalePatternDurationMs({
        preset: 'scale',
        cycleDurationMs: 777,
      }),
    ).toBe(777);
  });
  it('restingMotionSyncScaleNonLoopClipAndPattern aligns duration and pattern', () => {
    const next = restingMotionSyncScaleNonLoopClipAndPattern({ preset: 'scale', loop: false }, 3200);
    expect(next.durationMs).toBe(3200);
    expect(next.scalePatternDurationMs).toBe(3200);
  });

  it('restingMotionNormalizeScaleNonLoopClip aligns mismatched scale fields', () => {
    const n = restingMotionNormalizeScaleNonLoopClip({
      preset: 'scale',
      durationMs: 4000,
      scalePatternDurationMs: 900,
      loop: false,
    });
    expect(n.durationMs).toBe(4000);
    expect(n.scalePatternDurationMs).toBe(4000);
  });

  it('restingMotionNormalizeScaleNonLoopClip leaves looping scale unchanged', () => {
    const cfg = { preset: 'scale' as const, loop: true as const, durationMs: 8000, scalePatternDurationMs: 1200 };
    expect(restingMotionNormalizeScaleNonLoopClip(cfg)).toEqual(cfg);
  });
});

describe('restingMotionMotionSpeedSliderMs', () => {
  it('uses clip length when not looping', () => {
    expect(
      restingMotionMotionSpeedSliderMs({
        preset: 'bounce',
        loop: false,
        durationMs: 3100,
      }),
    ).toBe(3100);
  });

  it('uses cycle when looping', () => {
    expect(
      restingMotionMotionSpeedSliderMs({
        preset: 'translate',
        loop: true,
        durationMs: 10_000,
        cycleDurationMs: 1200,
      }),
    ).toBe(1200);
  });
});

describe('bouncePhaseToTranslateY', () => {
  it('is a single arc: rest → peak → rest', () => {
    expect(bouncePhaseToTranslateY(0, 10)).toBeCloseTo(0, 5);
    expect(bouncePhaseToTranslateY(1, 10)).toBeCloseTo(0, 5);
    expect(bouncePhaseToTranslateY(0.5, 10)).toBe(-10);
  });
});
