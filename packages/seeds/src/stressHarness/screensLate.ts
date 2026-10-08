import { bodyStack, tx, cta, OAUTH_CUSTOM_ROW } from './builders.js';
import { DEFAULT_THEMED_FOREGROUND, PRIMARY_FILLED_LABEL } from '@getrheo/contracts/layers';

export const stressHarnessScreensLate = [
      {
        id: 'scr_sh_oauth',
        name: 'Stress · OAuth',
        regions: {
          body: bodyStack('lyr_sh_oa_b', [
            tx('lyr_sh_oa_h', 'OAuth rails'),
            {
              id: 'lyr_sh_oa',
              kind: 'oauth_login',
              gap: 8,
              style: { width: 'full', height: 'fill' },
              children: [
                { id: 'lyr_sh_oa_gh', kind: 'oauth_provider', variant: 'preset', provider: 'github' },
                { id: 'lyr_sh_oa_goog', kind: 'oauth_provider', variant: 'preset', provider: 'google' },
                { id: 'lyr_sh_oa_ap', kind: 'oauth_provider', variant: 'preset', provider: 'apple' },
                {
                  id: 'lyr_sh_oa_cu',
                  kind: 'oauth_provider',
                  variant: 'custom',
                  rowId: OAUTH_CUSTOM_ROW,
                  buttonVariant: 'secondary',
                  direction: 'horizontal',
                  align: 'center',
                  distribution: 'center',
                  style: { width: 'full', height: 'auto' },
                  children: [
                    { id: 'lyr_sh_oa_ico', kind: 'icon', family: 'ionicons', iconName: 'shield-outline', style: { width: 22, height: 22, color: DEFAULT_THEMED_FOREGROUND } },
                    { id: 'lyr_sh_oa_txt', kind: 'text', text: { default: 'Custom SSO' }, style: { color: DEFAULT_THEMED_FOREGROUND } },
                  ],
                },
              ],
            },
            cta('lyr_sh_oa_go', 'Skip OAuth UI'),
          ]),
        },
        next: { default: 'scr_sh_ep_in' },
      },
      {
        id: 'scr_sh_ep_in',
        name: 'Stress · Email sign-in',
        regions: {
          body: bodyStack('lyr_sh_ei_b', [
            {
              id: 'lyr_sh_ei',
              kind: 'email_password_auth',
              mode: 'sign_in',
              fieldKey: 'sh_cred_in',
              gap: 8,
              style: { width: 'full', height: 'fill' },
              children: [
                {
                  id: 'lyr_sh_ei_em',
                  kind: 'email_password_field',
                  slot: 'email',
                  placeholder: { default: 'Email' },
                },
                {
                  id: 'lyr_sh_ei_pw',
                  kind: 'email_password_field',
                  slot: 'password',
                  placeholder: { default: 'Password' },
                },
                {
                  id: 'lyr_sh_ei_sub',
                  kind: 'email_password_submit',
                  buttonVariant: 'primary',
                  direction: 'horizontal',
                  align: 'center',
                  distribution: 'center',
                  style: { width: 'full', height: 'auto' },
                  children: [{ id: 'lyr_sh_ei_st', kind: 'text', text: { default: 'Sign in' }, style: { color: PRIMARY_FILLED_LABEL } }],
                },
              ],
            },
            cta('lyr_sh_ei_go', 'Next'),
          ]),
        },
        next: { default: 'scr_sh_ep_up' },
      },
      {
        id: 'scr_sh_ep_up',
        name: 'Stress · Email sign-up',
        regions: {
          body: bodyStack('lyr_sh_eu_b', [
            {
              id: 'lyr_sh_eu',
              kind: 'email_password_auth',
              mode: 'sign_up',
              fieldKey: 'sh_cred_up',
              gap: 8,
              style: { width: 'full', height: 'fill' },
              children: [
                {
                  id: 'lyr_sh_eu_em',
                  kind: 'email_password_field',
                  slot: 'email',
                  placeholder: { default: 'Email' },
                },
                {
                  id: 'lyr_sh_eu_pw',
                  kind: 'email_password_field',
                  slot: 'password',
                  placeholder: { default: 'Password' },
                },
                {
                  id: 'lyr_sh_eu_cf',
                  kind: 'email_password_field',
                  slot: 'confirm',
                  placeholder: { default: 'Confirm password' },
                },
                {
                  id: 'lyr_sh_eu_sub',
                  kind: 'email_password_submit',
                  buttonVariant: 'primary',
                  direction: 'horizontal',
                  align: 'center',
                  distribution: 'center',
                  style: { width: 'full', height: 'auto' },
                  children: [{ id: 'lyr_sh_eu_st', kind: 'text', text: { default: 'Create account' }, style: { color: PRIMARY_FILLED_LABEL } }],
                },
              ],
            },
            cta('lyr_sh_eu_go', 'Next'),
          ]),
        },
        next: { default: 'scr_sh_pre_locale' },
      },
      {
        id: 'scr_sh_pre_locale',
        name: 'Stress · Locale gate intro',
        regions: {
          body: bodyStack('lyr_sh_ploc_b', [
            {
              id: 'lyr_sh_ploc_t',
              kind: 'text',
              text: { default: 'Locale gate', translations: { es: 'Puerta de idioma' } },
              style: { fontSize: 18, fontWeight: 700, color: DEFAULT_THEMED_FOREGROUND },
            },
            cta('lyr_sh_ploc_go'),
          ]),
        },
        next: { default: 'dec_sh_locale' },
      },
      {
        id: 'scr_sh_loc_es',
        name: 'Stress · ES branch',
        regions: {
          body: bodyStack('lyr_sh_les_b', [
            tx('lyr_sh_les_t', 'Locale looks like Spanish · hola'),
            cta('lyr_sh_les_go'),
          ]),
        },
        next: { default: 'scr_sh_tier' },
      },
      {
        id: 'scr_sh_loc_en',
        name: 'Stress · EN branch',
        regions: {
          body: bodyStack('lyr_sh_len_b', [tx('lyr_sh_len_t', 'Non-ES locale path'), cta('lyr_sh_len_go')]),
        },
        next: { default: 'scr_sh_tier' },
      },
      {
        id: 'scr_sh_tier',
        name: 'Stress · Tier pick',
        regions: {
          body: bodyStack('lyr_sh_tr_b', [
            {
              id: 'lyr_sh_tr',
              kind: 'single_choice',
              fieldKey: 'sh_tier',
              direction: 'horizontal',
              gap: 8,
              children: [
                bodyStack('lyr_sh_tr_p', [tx('lyr_sh_tr_px', 'Premium')]),
                bodyStack('lyr_sh_tr_s', [tx('lyr_sh_tr_sx', 'Standard')]),
              ],
              optionBindings: [
                { optionId: 'premium', rootLayerId: 'lyr_sh_tr_p' },
                { optionId: 'standard', rootLayerId: 'lyr_sh_tr_s' },
              ],
              branching: { enabled: false, conditions: [] },
            },
            cta('lyr_sh_tr_go'),
          ]),
        },
        next: { default: 'dec_sh_tier' },
      },
      {
        id: 'scr_sh_tier_p',
        name: 'Stress · Premium',
        regions: {
          body: bodyStack('lyr_sh_tp_b', [tx('lyr_sh_tp_t', 'Premium tier'), cta('lyr_sh_tp_go')]),
        },
        next: { default: 'scr_sh_pre_sdk' },
      },
      {
        id: 'scr_sh_tier_s',
        name: 'Stress · Standard',
        regions: {
          body: bodyStack('lyr_sh_ts_b', [tx('lyr_sh_ts_t', 'Standard tier'), cta('lyr_sh_ts_go')]),
        },
        next: { default: 'scr_sh_pre_sdk' },
      },
      {
        id: 'scr_sh_pre_sdk',
        name: 'Stress · SDK attribute fork',
        regions: {
          body: bodyStack('lyr_sh_sdk_b', [
            tx('lyr_sh_sdk_t', 'plan attribute (inject via SDK context)'),
            cta('lyr_sh_sdk_go'),
          ]),
        },
        next: { default: 'dec_sh_plan' },
      },
      {
        id: 'scr_sh_plan_ent',
        name: 'Stress · Enterprise plan',
        regions: {
          body: bodyStack('lyr_sh_pe_b', [tx('lyr_sh_pe_t', 'plan=enterprise'), cta('lyr_sh_pe_go')]),
        },
        next: { default: 'scr_sh_done' },
      },
      {
        id: 'scr_sh_plan_basic',
        name: 'Stress · Other plan',
        regions: {
          body: bodyStack('lyr_sh_pb_b', [tx('lyr_sh_pb_t', 'plan≠enterprise'), cta('lyr_sh_pb_go')]),
        },
        next: { default: 'scr_sh_done' },
      },
      {
        id: 'scr_sh_done',
        name: 'Stress · Terminal',
        regions: {
          body: bodyStack('lyr_sh_dn_b', [
            tx('lyr_sh_dn_t', 'Harness complete', { fontSize: 22, fontWeight: 800 }),
            {
              id: 'lyr_sh_dn_end',
              kind: 'button',
              variant: 'destructive',
              action: { kind: 'end_flow' },
              children: [{ id: 'lyr_sh_dn_et', kind: 'text', text: { default: 'End' }, style: { color: PRIMARY_FILLED_LABEL } }],
            },
          ]),
        },
        next: { default: null },
      },
];
