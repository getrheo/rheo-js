import { DEFAULT_THEMED_FOREGROUND, PRIMARY_FILLED_LABEL } from '@getrheo/contracts/layers';
import { FlowManifestSchema, MANIFEST_SCHEMA_VERSION, type FlowManifest } from '@getrheo/contracts/manifest';

/** Same row id pattern as the stress harness custom OAuth row (stable clipboard / builder refs). */
const OAUTH_CUSTOM_ROW = '44444444-4444-4444-8444-444444444444';

const bodyStack = (
  id: string,
  children: Array<Record<string, unknown>>,
): Record<string, unknown> => ({
  id,
  kind: 'stack',
  direction: 'vertical',
  gap: 12,
  style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
  children,
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
  children: [{ id: `${id}_t`, kind: 'text', text: { default: label }, style: { color: PRIMARY_FILLED_LABEL } }],
});

/**
 * Short linear flow for exercising OAuth + email/password auth in the builder canvas
 * and native SDK (`OAuthLoginProvider` / `EmailPasswordAuthProvider`).
 */
export const buildAuthCanvasManifest = (flowId: string): FlowManifest =>
  FlowManifestSchema.parse({
    flowId,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    version: 1,
    defaultLocale: 'en',
    locales: ['en'],
    entryScreenId: 'scr_auth_intro',
    theme: {
      primary: '#6366f1',
      primaryForeground: '#ffffff',
      background: '#fafafa',
      foreground: '#0f172a',
      accent: '#f97316',
      borderRadius: 14,
      fontFamily: 'system-ui',
    },
    builderMeta: {
      layout: {
        nodes: [
          { id: 'scr_auth_intro', kind: 'screen', x: 80, y: 80 },
          { id: 'scr_auth_oauth', kind: 'screen', x: 420, y: 80 },
          { id: 'scr_auth_signin', kind: 'screen', x: 760, y: 80 },
          { id: 'scr_auth_signup', kind: 'screen', x: 420, y: 520 },
          { id: 'scr_auth_done', kind: 'screen', x: 760, y: 520 },
        ],
        canvas: { zoom: 0.72, x: 24, y: 20 },
      },
    },
    screens: [
      {
        id: 'scr_auth_intro',
        name: 'Auth canvas · Intro',
        regions: {
          body: bodyStack('lyr_ac_in_b', [
            tx('lyr_ac_in_h', 'Auth layer harness', { fontSize: 22, fontWeight: 700 }),
            tx(
              'lyr_ac_in_p',
              'OAuth rails, sign-in, and sign-up stacks for canvas + SDK smoke tests.',
              { fontSize: 14 },
            ),
            cta('lyr_ac_in_go'),
          ]),
        },
        next: { default: 'scr_auth_oauth' },
      },
      {
        id: 'scr_auth_oauth',
        name: 'Auth canvas · OAuth',
        regions: {
          body: bodyStack('lyr_ac_oa_b', [
            tx('lyr_ac_oa_h', 'OAuth login stack', { fontSize: 18, fontWeight: 600 }),
            {
              id: 'lyr_ac_oa',
              kind: 'oauth_login',
              gap: 8,
              children: [
                { id: 'lyr_ac_oa_gh', kind: 'oauth_provider', variant: 'preset', provider: 'github' },
                { id: 'lyr_ac_oa_goog', kind: 'oauth_provider', variant: 'preset', provider: 'google' },
                { id: 'lyr_ac_oa_ap', kind: 'oauth_provider', variant: 'preset', provider: 'apple' },
                {
                  id: 'lyr_ac_oa_cu',
                  kind: 'oauth_provider',
                  variant: 'custom',
                  rowId: OAUTH_CUSTOM_ROW,
                  buttonVariant: 'secondary',
                  children: [
                    {
                      id: 'lyr_ac_oa_ico',
                      kind: 'icon',
                      family: 'ionicons',
                      iconName: 'shield-outline',
                      style: { width: 22, height: 22, color: DEFAULT_THEMED_FOREGROUND },
                    },
                    {
                      id: 'lyr_ac_oa_txt',
                      kind: 'text',
                      text: { default: 'Enterprise SSO' },
                      style: { color: DEFAULT_THEMED_FOREGROUND },
                    },
                  ],
                },
              ],
            },
            cta('lyr_ac_oa_skip', 'Skip with Continue'),
          ]),
        },
        next: { default: 'scr_auth_signin' },
      },
      {
        id: 'scr_auth_signin',
        name: 'Auth canvas · Email sign-in',
        regions: {
          body: bodyStack('lyr_ac_si_b', [
            {
              id: 'lyr_ac_si',
              kind: 'email_password_auth',
              mode: 'sign_in',
              fieldKey: 'auth_canvas_signin',
              gap: 8,
              style: { width: 'full', height: 'fill' },
              children: [
                {
                  id: 'lyr_ac_si_em',
                  kind: 'email_password_field',
                  slot: 'email',
                  placeholder: { default: 'Work email' },
                },
                {
                  id: 'lyr_ac_si_pw',
                  kind: 'email_password_field',
                  slot: 'password',
                  placeholder: { default: 'Password' },
                },
                {
                  id: 'lyr_ac_si_sub',
                  kind: 'email_password_submit',
                  buttonVariant: 'primary',
                  direction: 'horizontal',
                  align: 'center',
                  distribution: 'center',
                  style: { width: 'full', height: 'auto' },
                  children: [
                    {
                      id: 'lyr_ac_si_st',
                      kind: 'text',
                      text: { default: 'Sign in' },
                      style: { color: PRIMARY_FILLED_LABEL },
                    },
                  ],
                },
              ],
            },
            cta('lyr_ac_si_go', 'Continue without submit'),
          ]),
        },
        next: { default: 'scr_auth_signup' },
      },
      {
        id: 'scr_auth_signup',
        name: 'Auth canvas · Email sign-up',
        regions: {
          body: bodyStack('lyr_ac_su_b', [
            {
              id: 'lyr_ac_su',
              kind: 'email_password_auth',
              mode: 'sign_up',
              fieldKey: 'auth_canvas_signup',
              gap: 8,
              style: { width: 'full', height: 'fill' },
              children: [
                {
                  id: 'lyr_ac_su_em',
                  kind: 'email_password_field',
                  slot: 'email',
                  placeholder: { default: 'Email' },
                },
                {
                  id: 'lyr_ac_su_pw',
                  kind: 'email_password_field',
                  slot: 'password',
                  placeholder: { default: 'Password' },
                },
                {
                  id: 'lyr_ac_su_cf',
                  kind: 'email_password_field',
                  slot: 'confirm',
                  placeholder: { default: 'Confirm password' },
                },
                {
                  id: 'lyr_ac_su_sub',
                  kind: 'email_password_submit',
                  buttonVariant: 'primary',
                  direction: 'horizontal',
                  align: 'center',
                  distribution: 'center',
                  style: { width: 'full', height: 'auto' },
                  children: [
                    {
                      id: 'lyr_ac_su_st',
                      kind: 'text',
                      text: { default: 'Create account' },
                      style: { color: PRIMARY_FILLED_LABEL },
                    },
                  ],
                },
              ],
            },
            cta('lyr_ac_su_go', 'Continue'),
          ]),
        },
        next: { default: 'scr_auth_done' },
      },
      {
        id: 'scr_auth_done',
        name: 'Auth canvas · Done',
        regions: {
          body: bodyStack('lyr_ac_dn_b', [
            tx('lyr_ac_dn_h', 'Auth surfaces complete', { fontSize: 20, fontWeight: 600 }),
            tx('lyr_ac_dn_p', 'Use the primary button to finish the flow.', { fontSize: 14 }),
            cta('lyr_ac_dn_go', 'Done'),
          ]),
        },
        next: { default: null },
      },
    ],
  });
