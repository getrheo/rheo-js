import {
  BUTTON_LAYER_VARIANTS,
  DEFAULT_THEMED_FOREGROUND,
  LAYER_KINDS,
  PRIMARY_FILLED_LABEL,
  manifestScreenLayerKinds,
  type LayerKind,
} from '@getrheo/contracts/layers';
import type { Screen } from '@getrheo/contracts/screens';
import { bodyStack, tx, cta, OAUTH_CUSTOM_ROW } from './builders.js';

const asBody = (stack: Record<string, unknown>): Screen['regions']['body'] =>
  stack as Screen['regions']['body'];

const kindSlug = (kind: LayerKind): string => kind;

const layerDemoForKind = (kind: LayerKind, prefix: string): Record<string, unknown> => {
  switch (kind) {
    case 'stack':
      return {
        id: `${prefix}_stack`,
        kind: 'stack',
        direction: 'vertical',
        gap: 8,
        children: [tx(`${prefix}_stack_t`, 'Nested stack child')],
      };
    case 'text':
      return tx(`${prefix}_text`, 'Text layer · styled', {
        fontSize: 18,
        fontWeight: 600,
        textAlign: 'center',
      });
    case 'image':
      return {
        id: `${prefix}_img`,
        kind: 'image',
        alt: 'Stress placeholder',
        style: { width: 120, height: 80, radius: 10, objectFit: 'cover' },
      };
    case 'lottie':
      return { id: `${prefix}_lot`, kind: 'lottie', loop: true, style: { width: 96, height: 96 } };
    case 'video':
      return { id: `${prefix}_vid`, kind: 'video', loop: true, muted: true, style: { width: 160, height: 90, radius: 8 } };
    case 'icon':
      return {
        id: `${prefix}_icon`,
        kind: 'icon',
        family: 'ionicons',
        iconName: 'sparkles-outline',
        style: { width: 32, height: 32, color: '#6366f1' },
      };
    case 'button':
      return {
        id: `${prefix}_btn`,
        kind: 'button',
        variant: 'primary',
        action: { kind: 'continue' },
        direction: 'horizontal',
        children: [{ id: `${prefix}_btn_t`, kind: 'text', text: { default: 'Button' }, style: { color: PRIMARY_FILLED_LABEL } }],
      };
    case 'back_button':
      return {
        id: `${prefix}_back`,
        kind: 'back_button',
        variant: 'ghost',
        children: [
          {
            id: `${prefix}_back_i`,
            kind: 'icon',
            family: 'ionicons',
            iconName: 'arrow-back-outline',
            style: { color: DEFAULT_THEMED_FOREGROUND },
          },
        ],
      };
    case 'progress':
      return {
        id: `${prefix}_prog`,
        kind: 'progress',
        trackColor: { light: '#e4e4e7', dark: '#3f3f46' },
        fillColor: '#6366f1',
        style: { width: 'full', height: 8 },
      };
    case 'loader':
      return { id: `${prefix}_load`, kind: 'loader', variant: 'linear', durationMs: 2400 };
    case 'counter':
      return {
        id: `${prefix}_ctr`,
        kind: 'counter',
        startValue: 0,
        endValue: 99,
        durationMs: 2200,
        displayKind: 'number',
        style: { fontSize: 28, fontWeight: 800 },
      };
    case 'single_choice':
      return {
        id: `${prefix}_sc`,
        kind: 'single_choice',
        fieldKey: `${prefix}_pick`,
        direction: 'vertical',
        gap: 8,
        children: [
          bodyStack(`${prefix}_sc_a`, [tx(`${prefix}_sc_at`, 'Option A')]),
          bodyStack(`${prefix}_sc_b`, [tx(`${prefix}_sc_bt`, 'Option B')]),
        ],
        optionBindings: [
          { optionId: 'a', rootLayerId: `${prefix}_sc_a` },
          { optionId: 'b', rootLayerId: `${prefix}_sc_b` },
        ],
        branching: { enabled: false, conditions: [] },
      };
    case 'multiple_choice':
      return {
        id: `${prefix}_mc`,
        kind: 'multiple_choice',
        fieldKey: `${prefix}_tags`,
        children: [
          bodyStack(`${prefix}_mc_a`, [tx(`${prefix}_mc_at`, 'Tag 1')]),
          bodyStack(`${prefix}_mc_b`, [tx(`${prefix}_mc_bt`, 'Tag 2')]),
        ],
        optionBindings: [
          { optionId: 't1', rootLayerId: `${prefix}_mc_a` },
          { optionId: 't2', rootLayerId: `${prefix}_mc_b` },
        ],
        branching: { enabled: false, conditions: [] },
      };
    case 'text_input':
      return {
        id: `${prefix}_ti`,
        kind: 'text_input',
        name: 'Field',
        fieldKey: `${prefix}_field`,
        classification: 'safe',
        placeholder: { default: 'Type here…' },
      };
    case 'scale_input':
      return {
        id: `${prefix}_scale`,
        kind: 'scale_input',
        fieldKey: `${prefix}_level`,
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 5,
        minLabel: { default: 'Low' },
        maxLabel: { default: 'High' },
      };
    case 'oauth_login':
      return {
        id: `${prefix}_oauth`,
        kind: 'oauth_login',
        gap: 8,
        style: { width: 'full', height: 'fill' },
        children: [
          { id: `${prefix}_oauth_gh`, kind: 'oauth_provider', variant: 'preset', provider: 'github' },
          { id: `${prefix}_oauth_go`, kind: 'oauth_provider', variant: 'preset', provider: 'google' },
        ],
      };
    case 'email_password_auth':
      return {
        id: `${prefix}_epa`,
        kind: 'email_password_auth',
        mode: 'sign_in',
        fieldKey: `${prefix}_cred`,
        gap: 8,
        style: { width: 'full', height: 'fill' },
        children: [
          { id: `${prefix}_epf_e`, kind: 'email_password_field', slot: 'email', placeholder: { default: 'Email' } },
          { id: `${prefix}_epf_p`, kind: 'email_password_field', slot: 'password', placeholder: { default: 'Password' } },
          {
            id: `${prefix}_eps`,
            kind: 'email_password_submit',
            buttonVariant: 'primary',
            direction: 'horizontal',
            align: 'center',
            distribution: 'center',
            style: { width: 'full', height: 'auto' },
            children: [{ id: `${prefix}_eps_t`, kind: 'text', text: { default: 'Sign in' }, style: { color: PRIMARY_FILLED_LABEL } }],
          },
        ],
      };
    case 'carousel':
      return {
        id: `${prefix}_car`,
        kind: 'carousel',
        loop: true,
        pagePeek: 10,
        slides: [
          bodyStack(`${prefix}_s1`, [tx(`${prefix}_s1t`, 'Slide 1')]),
          bodyStack(`${prefix}_s2`, [tx(`${prefix}_s2t`, 'Slide 2')]),
        ],
      };
    case 'hyperlink':
      return {
        id: `${prefix}_link`,
        kind: 'hyperlink',
        href: 'https://getrheo.io',
        children: [tx(`${prefix}_link_t`, 'Hyperlink layer', { textDecoration: 'underline' })],
      };
    case 'checkbox':
      return { id: `${prefix}_chk`, kind: 'checkbox', fieldKey: `${prefix}_agree` };
    default:
      return tx(`${prefix}_fallback`, `Unsupported kind: ${kind}`);
  }
};

const layerKindScreen = (kind: LayerKind, index: number): Screen => {
  const prefix = `lyr_lk_${kindSlug(kind)}`;
  const screenId = `scr_lk_${kindSlug(kind)}`;
  const demo = layerDemoForKind(kind, prefix);
  return {
    id: screenId,
    name: `LSH · ${kind}`,
    regions: {
      body: asBody(bodyStack(`${prefix}_body`, [
        tx(`${prefix}_h`, `Layer kind: ${kind}`, { fontSize: 16, fontWeight: 700 }),
        demo as Screen['regions']['body']['children'][number],
        cta(`${prefix}_go`),
      ])),
    },
    next: { default: null },
  };
};

const layerKindIndexScreen = (): Screen => ({
  id: 'scr_lk_index',
  name: 'LSH · Layer index',
  regions: {
    body: asBody(bodyStack('lyr_lk_index_b', [
      tx('lyr_lk_index_h', 'Layer stress harness', { fontSize: 22, fontWeight: 800 }),
      tx('lyr_lk_index_p', `Covers all ${LAYER_KINDS.length} layer kinds, styling combos, decisions, and integrations.`),
      cta('lyr_lk_index_go'),
    ])),
  },
  next: { default: null },
});

export const layerKindGalleryScreens = (): Screen[] => {
  const kinds = manifestScreenLayerKinds();
  const screens = [layerKindIndexScreen(), ...kinds.map((kind, index) => layerKindScreen(kind, index))];
  return screens.map((screen, index) => ({
    ...screen,
    next: { default: index < screens.length - 1 ? screens[index + 1]!.id : 'scr_lk_btn_variants' },
  }));
};

export const layerStyleComboScreens = (): Screen[] => [
  {
    id: 'scr_lk_btn_variants',
    name: 'LSH · Button variants',
    regions: {
      body: asBody(bodyStack('lyr_lk_btn_b', [
        tx('lyr_lk_btn_h', 'All button variants', { fontWeight: 700 }),
        ...BUTTON_LAYER_VARIANTS.map((variant) => ({
          id: `lyr_lk_btn_${variant}`,
          kind: 'button' as const,
          variant,
          action: { kind: 'continue' as const },
          direction: 'horizontal' as const,
          children: [
            {
              id: `lyr_lk_btn_${variant}_t`,
              kind: 'text' as const,
              text: { default: variant },
              style: { color: variant === 'primary' || variant === 'destructive' ? PRIMARY_FILLED_LABEL : DEFAULT_THEMED_FOREGROUND },
            },
          ],
        })),
        cta('lyr_lk_btn_go'),
      ])),
    },
    next: { default: 'scr_lk_loaders' },
  },
  {
    id: 'scr_lk_loaders',
    name: 'LSH · Loader variants',
    regions: {
      body: asBody(bodyStack('lyr_lk_ld_b', [
        { id: 'lyr_lk_ld_lin', kind: 'loader', variant: 'linear', durationMs: 2000 },
        {
          id: 'lyr_lk_ld_circ',
          kind: 'loader',
          variant: 'circular',
          style: { width: 48, height: 48, strokeWidth: 4 },
        },
        cta('lyr_lk_ld_go'),
      ])),
    },
    next: { default: 'scr_lk_counters' },
  },
  {
    id: 'scr_lk_counters',
    name: 'LSH · Counter displays',
    regions: {
      body: asBody(bodyStack('lyr_lk_ct_b', [
        {
          id: 'lyr_lk_ct_num',
          kind: 'counter',
          startValue: 0,
          endValue: 120,
          durationMs: 2000,
          displayKind: 'number',
        },
        {
          id: 'lyr_lk_ct_time',
          kind: 'counter',
          startValue: 0,
          endValue: 90,
          durationMs: 2000,
          displayKind: 'time',
          timeFormat: 'mm_ss',
        },
        cta('lyr_lk_ct_go'),
      ])),
    },
    next: { default: 'scr_lk_choice_horiz' },
  },
  {
    id: 'scr_lk_choice_horiz',
    name: 'LSH · Choice horizontal',
    regions: {
      body: asBody(bodyStack('lyr_lk_ch_h_b', [
        tx('lyr_lk_ch_h_title', 'single_choice · horizontal', { fontWeight: 700 }),
        {
          id: 'lyr_lk_ch_horiz',
          kind: 'single_choice',
          fieldKey: 'lk_dir_horiz',
          direction: 'horizontal',
          gap: 8,
          children: [
            bodyStack('lyr_lk_ch_h_opt_a', [tx('lyr_lk_ch_h_at', 'H-A')]),
            bodyStack('lyr_lk_ch_h_opt_b', [tx('lyr_lk_ch_h_bt', 'H-B')]),
          ],
          optionBindings: [
            { optionId: 'a', rootLayerId: 'lyr_lk_ch_h_opt_a' },
            { optionId: 'b', rootLayerId: 'lyr_lk_ch_h_opt_b' },
          ],
          branching: { enabled: false, conditions: [] },
        },
        cta('lyr_lk_ch_h_go'),
      ])),
    },
    next: { default: 'scr_lk_choice_grid' },
  },
  {
    id: 'scr_lk_choice_grid',
    name: 'LSH · Choice grid',
    regions: {
      body: asBody(bodyStack('lyr_lk_ch_g_b', [
        tx('lyr_lk_ch_g_title', 'single_choice · grid', { fontWeight: 700 }),
        {
          id: 'lyr_lk_ch_grid',
          kind: 'single_choice',
          fieldKey: 'lk_dir_grid',
          direction: 'grid',
          columns: 2,
          gap: 8,
          children: [
            bodyStack('lyr_lk_ch_g_opt_a', [tx('lyr_lk_ch_g_at', 'G-A')]),
            bodyStack('lyr_lk_ch_g_opt_b', [tx('lyr_lk_ch_g_bt', 'G-B')]),
            bodyStack('lyr_lk_ch_g_opt_c', [tx('lyr_lk_ch_g_ct', 'G-C')]),
            bodyStack('lyr_lk_ch_g_opt_d', [tx('lyr_lk_ch_g_dt', 'G-D')]),
          ],
          optionBindings: [
            { optionId: 'a', rootLayerId: 'lyr_lk_ch_g_opt_a' },
            { optionId: 'b', rootLayerId: 'lyr_lk_ch_g_opt_b' },
            { optionId: 'c', rootLayerId: 'lyr_lk_ch_g_opt_c' },
            { optionId: 'd', rootLayerId: 'lyr_lk_ch_g_opt_d' },
          ],
          branching: { enabled: false, conditions: [] },
        },
        cta('lyr_lk_ch_g_go'),
      ])),
    },
    next: { default: 'scr_lk_stack_layout' },
  },
  {
    id: 'scr_lk_stack_layout',
    name: 'LSH · Stack + positioning',
    regions: {
      body: asBody(bodyStack('lyr_lk_st_b', [
        {
          id: 'lyr_lk_st_wrap',
          kind: 'stack',
          direction: 'horizontal',
          gap: 8,
          wrap: true,
          align: 'center',
          distribution: 'start',
          children: Array.from({ length: 6 }, (_, i) =>
            tx(`lyr_lk_st_w_${i}`, `Chip ${i + 1}`, { fontSize: 12 }),
          ),
        },
        {
          id: 'lyr_lk_st_abs',
          kind: 'stack',
          direction: 'vertical',
          style: {
            position: 'absolute',
            inset: { t: 8, r: 12 },
            zIndex: 2,
            padding: { t: 8, r: 10, b: 8, l: 10 },
            radius: 8,
            background: { light: '#fef3c7', dark: '#422006' },
            shadow: { offsetY: 3, blur: 8, opacity: 0.12 },
          },
          children: [tx('lyr_lk_st_abs_t', 'Absolute stack overlay')],
        },
        cta('lyr_lk_st_go'),
      ], { style: { minHeight: 140 } })),
    },
    next: { default: 'scr_lk_oauth_custom' },
  },
  {
    id: 'scr_lk_oauth_custom',
    name: 'LSH · OAuth custom row',
    regions: {
      body: asBody(bodyStack('lyr_lk_oa_b', [
        {
          id: 'lyr_lk_oa',
          kind: 'oauth_login',
          gap: 8,
          style: { width: 'full', height: 'fill' },
          children: [
            { id: 'lyr_lk_oa_ap', kind: 'oauth_provider', variant: 'preset', provider: 'apple' },
            {
              id: 'lyr_lk_oa_cu',
              kind: 'oauth_provider',
              variant: 'custom',
              rowId: OAUTH_CUSTOM_ROW,
              buttonVariant: 'secondary',
              direction: 'horizontal',
              align: 'center',
              distribution: 'center',
              style: { width: 'full', height: 'auto' },
              children: [
                { id: 'lyr_lk_oa_ico', kind: 'icon', family: 'ionicons', iconName: 'key-outline', style: { width: 20, height: 20, color: DEFAULT_THEMED_FOREGROUND } },
                { id: 'lyr_lk_oa_txt', kind: 'text', text: { default: 'Custom provider' }, style: { color: DEFAULT_THEMED_FOREGROUND } },
              ],
            },
          ],
        },
        cta('lyr_lk_oa_go'),
      ])),
    },
    next: { default: 'scr_sh_regions' },
  },
];
