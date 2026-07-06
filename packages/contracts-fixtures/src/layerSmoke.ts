import type { FlowManifest } from '@getrheo/contracts/manifest';
import { MANIFEST_SCHEMA_VERSION } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';
import type { StackLayer } from '@getrheo/contracts/layers';
import { DEFAULT_THEMED_FOREGROUND, PRIMARY_FILLED_LABEL } from '@getrheo/contracts/layers';

export const LAYER_SMOKE_FLOW_ID = '00000000-0000-0000-0000-00000000c0de';

const bodyStack = (
  id: string,
  children: Array<Record<string, unknown>>,
  extra?: Record<string, unknown>,
): Record<string, unknown> => ({
  id,
  kind: 'stack',
  direction: 'vertical',
  gap: 12,
  style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
  children,
  ...extra,
});

const tx = (id: string, copy: string, style?: Record<string, unknown>): Record<string, unknown> => ({
  id,
  kind: 'text',
  text: { default: copy },
  style: { color: DEFAULT_THEMED_FOREGROUND, ...(style ?? {}) },
});

const cta = (id: string, label = 'Continue'): Record<string, unknown> => ({
  id,
  kind: 'button',
  variant: 'primary',
  action: { kind: 'continue' },
  direction: 'horizontal',
  align: 'center',
  distribution: 'center',
  children: [
    { id: `${id}_t`, kind: 'text', text: { default: label }, style: { color: PRIMARY_FILLED_LABEL } },
  ],
});

/** Minimal manifest with one dedicated screen per layer kind used in adapter smokes. */
export const layerSmokeManifest = (): FlowManifest => ({
  flowId: LAYER_SMOKE_FLOW_ID,
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  version: 1,
  defaultLocale: 'en',
  locales: ['en'],
  entryScreenId: 'scr_sm_1',
  theme: {
    primary: '#6366f1',
    primaryForeground: '#ffffff',
    background: '#ffffff',
    foreground: '#0f172a',
    accent: '#f97316',
    borderRadius: 14,
    fontFamily: 'system-ui',
  },
  decisionNodes: [],
  externalSurfaceNodes: [],
  sdkAttributeKeys: [],
  screens: [
    {
      id: 'scr_sm_1',
      name: 'Smoke 1',
      regions: { body: bodyStack('lyr_sm_1_b', [tx('lyr_sm_1_t', 'Screen one')]) },
      next: { default: 'scr_sm_progress' },
    },
    {
      id: 'scr_sm_progress',
      name: 'Smoke · Progress',
      regions: {
        body: bodyStack('lyr_sm_prog_b', [
          { id: 'lyr_sm_prog', kind: 'progress', style: { height: 8 } },
          tx('lyr_sm_prog_l', 'Progress'),
        ]),
      },
      next: { default: 'scr_sm_loader_linear' },
    },
    {
      id: 'scr_sm_loader_linear',
      name: 'Smoke · Loader linear',
      regions: {
        body: bodyStack('lyr_sm_ld_lin_b', [
          { id: 'lyr_sm_ld_lin', kind: 'loader', variant: 'linear', durationMs: 2000 },
        ]),
      },
      next: { default: 'scr_sm_loader_circ' },
    },
    {
      id: 'scr_sm_loader_circ',
      name: 'Smoke · Loader circular',
      regions: {
        body: bodyStack('lyr_sm_ld_circ_b', [
          { id: 'lyr_sm_ld_circ', kind: 'loader', variant: 'circular', style: { width: 48, height: 48, strokeWidth: 4 } },
        ]),
      },
      next: { default: 'scr_sm_counter' },
    },
    {
      id: 'scr_sm_counter',
      name: 'Smoke · Counter',
      regions: {
        body: bodyStack('lyr_sm_ctr_b', [
          {
            id: 'lyr_sm_ctr',
            kind: 'counter',
            startValue: 0,
            endValue: 90,
            durationMs: 3000,
            displayKind: 'time',
            timeFormat: 'mm_ss',
            style: { fontSize: 20, fontWeight: 700 },
          },
        ]),
      },
      next: { default: 'scr_sm_media' },
    },
    {
      id: 'scr_sm_media',
      name: 'Smoke · Media',
      regions: {
        body: bodyStack('lyr_sm_media_b', [
          { id: 'lyr_sm_img', kind: 'image', alt: 'Hero', style: { width: 120, height: 80 } },
          { id: 'lyr_sm_icon_l', kind: 'icon', family: 'ionicons', iconName: 'star-outline', style: { width: 24, height: 24 } },
          { id: 'lyr_sm_icon_i', kind: 'icon', family: 'ionicons', iconName: 'star-outline', style: { width: 24, height: 24 } },
          { id: 'lyr_sm_lottie', kind: 'lottie', loop: true, style: { width: 80, height: 80 } },
          { id: 'lyr_sm_video', kind: 'video', loop: true, style: { width: 80, height: 80 } },
        ]),
      },
      next: { default: 'scr_sm_button' },
    },
    {
      id: 'scr_sm_button',
      name: 'Smoke · Buttons',
      regions: {
        body: bodyStack('lyr_sm_btn_b', [
          cta('lyr_sm_btn_primary', 'Continue'),
          {
            id: 'lyr_sm_btn_ghost',
            kind: 'button',
            variant: 'ghost',
            action: { kind: 'skip' },
            direction: 'horizontal',
            align: 'center',
            distribution: 'center',
            children: [
              { id: 'lyr_sm_btn_ghost_t', kind: 'text', text: { default: 'Skip' }, style: { color: DEFAULT_THEMED_FOREGROUND } },
            ],
          },
          {
            id: 'lyr_sm_back',
            kind: 'back_button',
            variant: 'secondary',
            fallbackScreenId: 'scr_sm_1',
            direction: 'horizontal',
            align: 'center',
            distribution: 'center',
            children: [
              { id: 'lyr_sm_back_i', kind: 'icon', family: 'ionicons', iconName: 'chevron-back-outline', style: { width: 18, height: 18 } },
              { id: 'lyr_sm_back_t', kind: 'text', text: { default: 'Back' }, style: { color: DEFAULT_THEMED_FOREGROUND } },
            ],
          },
        ]),
      },
      next: { default: 'scr_sm_oauth' },
    },
    {
      id: 'scr_sm_oauth',
      name: 'Smoke · OAuth',
      regions: {
        body: bodyStack('lyr_sm_oauth_b', [
          {
            id: 'lyr_sm_oauth',
            kind: 'oauth_login',
            gap: 8,
            children: [
              { id: 'lyr_sm_oauth_g', kind: 'oauth_provider', variant: 'preset', provider: 'google' },
              { id: 'lyr_sm_oauth_a', kind: 'oauth_provider', variant: 'preset', provider: 'apple' },
            ],
          },
        ]),
      },
      next: { default: 'scr_sm_email' },
    },
    {
      id: 'scr_sm_email',
      name: 'Smoke · Email auth',
      regions: {
        body: bodyStack('lyr_sm_email_b', [
          {
            id: 'lyr_sm_email',
            kind: 'email_password_auth',
            mode: 'sign_in',
            fieldKey: 'smoke_signin',
            gap: 8,
            children: [
              { id: 'lyr_sm_email_f', kind: 'email_password_field', slot: 'email', placeholder: { default: 'Email' } },
              { id: 'lyr_sm_email_p', kind: 'email_password_field', slot: 'password', placeholder: { default: 'Password' } },
              {
                id: 'lyr_sm_email_sub',
                kind: 'email_password_submit',
                buttonVariant: 'primary',
                children: [
                  { id: 'lyr_sm_email_st', kind: 'text', text: { default: 'Sign in' }, style: { color: PRIMARY_FILLED_LABEL } },
                ],
              },
            ],
          },
        ]),
      },
      next: { default: null },
    },
  ] as Screen[],
});

/** Nested stack sizing: hug vs fill chain for cross-SDK layout parity smokes. */
export const layerSmokeStackSizingScreen = (): Screen => ({
  id: 'scr_sm_stack_sizing',
  name: 'Smoke · Stack sizing',
  next: { default: null },
  regions: {
    body: {
      id: 'lyr_sm_ss_body',
      kind: 'stack',
      direction: 'vertical',
      gap: 12,
      style: { width: 'full', height: 'fill', padding: { t: 16, r: 16, b: 16, l: 16 } },
      children: [
        {
          id: 'lyr_sm_ss_hug',
          kind: 'stack',
          direction: 'vertical',
          gap: 8,
          style: { width: 'full', height: 'auto', background: { light: '#f4f4f5', dark: '#27272a' } },
          children: [tx('lyr_sm_ss_hug_t', 'Hug card')],
        },
        {
          id: 'lyr_sm_ss_fill',
          kind: 'stack',
          direction: 'vertical',
          gap: 8,
          style: { width: 'full', height: 'fill' },
          children: [tx('lyr_sm_ss_fill_t', 'Fill region')],
        },
      ],
    } as StackLayer,
  },
});

export const layerSmokeScreen = (screenId: string): Screen => {
  const screen = layerSmokeManifest().screens.find((s) => s.id === screenId);
  if (!screen) throw new Error(`layerSmoke screen not found: ${screenId}`);
  return screen;
};

/** Screen with mount animation for motion shell smokes. */
export const layerSmokeMotionScreen = (): Screen => ({
  id: 'scr_sm_motion',
  name: 'Smoke · Motion',
  next: { default: null },
  stagger: { stepMs: 50 },
  animations: [
    {
      id: 'clip_sm_fade',
      targetLayerId: 'lyr_sm_motion_target',
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
        {
          property: 'translateY',
          keyframes: [
            { t: 0, value: 12, easing: 'standard' },
            { t: 1, value: 0 },
          ],
        },
      ],
    },
  ],
  regions: {
    body: bodyStack('lyr_sm_motion_body', [
      {
        id: 'lyr_sm_motion_target',
        kind: 'text',
        text: { default: 'Animated' },
        style: { color: DEFAULT_THEMED_FOREGROUND },
        restingMotion: [
          {
            id: 'rest_sm_pulse',
            preset: 'opacity',
            durationMs: 800,
            timelineStartMs: 500,
          },
        ],
      },
    ]) as StackLayer,
  },
});
