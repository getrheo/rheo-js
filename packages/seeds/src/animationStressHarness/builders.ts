import type {
  AnimatableProperty,
  AnimationClip,
  AnimationTrigger,
  EasingToken,
} from '@getrheo/contracts/animations';
import { DEFAULT_THEMED_FOREGROUND, PRIMARY_FILLED_LABEL } from '@getrheo/contracts/layers';
import type { Screen } from '@getrheo/contracts/screens';
import type { RestingMotion, RestingMotionPreset } from '@getrheo/contracts/layers';

export const bodyStack = (
  id: string,
  children: Screen['regions']['body']['children'],
  extra?: Record<string, unknown>,
): Screen['regions']['body'] => ({
  id,
  kind: 'stack',
  direction: 'vertical',
  gap: 12,
  style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
  children,
  ...extra,
});

export const label = (
  id: string,
  copy: string,
  style?: Record<string, unknown>,
): NonNullable<Screen['regions']['body']['children'][number]> => ({
  id,
  kind: 'text',
  text: { default: copy },
  style: { color: DEFAULT_THEMED_FOREGROUND, ...(style ?? {}) },
});

export const continueBtn = (id: string, copy = 'Next'): NonNullable<Screen['regions']['body']['children'][number]> => ({
  id,
  kind: 'button',
  variant: 'primary',
  action: { kind: 'continue' },
  direction: 'horizontal',
  align: 'center',
  distribution: 'center',
  children: [{ id: `${id}_t`, kind: 'text', text: { default: copy }, style: { color: PRIMARY_FILLED_LABEL } }],
});

export const endBtn = (id: string): NonNullable<Screen['regions']['body']['children'][number]> => ({
  id,
  kind: 'button',
  variant: 'secondary',
  action: { kind: 'end_flow' },
  direction: 'horizontal',
  children: [{ id: `${id}_t`, kind: 'text', text: { default: 'End flow' }, style: { color: DEFAULT_THEMED_FOREGROUND } }],
});

export const mountClip = (
  id: string,
  layerId: string,
  property: AnimatableProperty,
  easing: EasingToken,
  from: number,
  to = 0,
  opts: { delayMs?: number; trigger?: AnimationTrigger; staggerIndex?: number } = {},
): AnimationClip => ({
  id,
  targetLayerId: layerId,
  trigger: opts.trigger ?? 'mount',
  durationMs: 360,
  ...(opts.delayMs !== undefined ? { delayMs: opts.delayMs } : {}),
  ...(opts.staggerIndex !== undefined ? { staggerIndex: opts.staggerIndex } : {}),
  tracks: [
    {
      property,
      keyframes: [
        { t: 0, value: from, easing },
        { t: 1, value: to },
      ],
    },
  ],
});

export const unmountClip = (
  id: string,
  layerId: string,
  tracks: AnimationClip['tracks'],
): AnimationClip => ({
  id,
  targetLayerId: layerId,
  trigger: 'unmount',
  durationMs: 280,
  tracks,
});

export const restingMotion = (
  preset: RestingMotionPreset,
  extra: Partial<RestingMotion> = {},
): RestingMotion => ({
  preset,
  loop: true,
  durationMs: 2400,
  intensity: 1,
  ...extra,
});
