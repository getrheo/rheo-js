import type { AnimationClip } from '@getrheo/contracts/animations';
import { DEFAULT_THEMED_FOREGROUND, PRIMARY_FILLED_LABEL } from '@getrheo/contracts/layers';

export const bodyStack = (
  id: string,
  children: Array<Record<string, unknown>>,
  extra?: Record<string, unknown>,
): Record<string, unknown> => ({
  id,
  kind: 'stack',
  direction: 'vertical',
  gap: 12,
  style: {
    width: 'full',
    height: 'fill',
    padding: { t: 16, r: 16, b: 16, l: 16 },
  },
  children,
  ...extra,
});

export const tx = (id: string, copy: string, style?: Record<string, unknown>): Record<string, unknown> => ({
  id,
  kind: 'text',
  text: { default: copy },
  style: { width: 'auto', height: 'auto', color: DEFAULT_THEMED_FOREGROUND, ...(style ?? {}) },
});

export const cta = (id: string, label = 'Continue'): Record<string, unknown> => ({
  id,
  kind: 'button',
  variant: 'primary',
  action: { kind: 'continue' },
  direction: 'horizontal',
  align: 'center',
  distribution: 'center',
  children: [{ id: `${id}_t`, kind: 'text', text: { default: label }, style: { color: PRIMARY_FILLED_LABEL } }],
});

export const clipFade = (
  id: string,
  layerId: string,
  trigger: AnimationClip['trigger'],
  opts: { staggerIndex?: number; delayMs?: number } = {},
): AnimationClip => ({
  id,
  targetLayerId: layerId,
  trigger,
  durationMs: 380,
  ...opts,
  tracks: [
    {
      property: 'opacity',
      keyframes: [
        { t: 0, value: 0, easing: 'emphasized' },
        { t: 1, value: 1 },
      ],
    },
  ],
});

export const OAUTH_CUSTOM_ROW = '33333333-3333-4333-8333-333333333333';
