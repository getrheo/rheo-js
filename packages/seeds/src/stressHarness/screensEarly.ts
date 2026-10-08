import { bodyStack, tx, cta, clipFade } from './builders.js';
import {
  DEFAULT_THEMED_FOREGROUND,
} from '@getrheo/contracts/layers';

export const stressHarnessScreensEarly = [
      {
        id: 'scr_sh_entry',
        name: 'Stress · Start',
        regions: {
          body: bodyStack('lyr_sh_en_b', [
            tx('lyr_sh_en_h', 'Layer stress harness', { fontSize: 24, fontWeight: 700 }),
            tx('lyr_sh_en_p', 'All layer kinds, styling combos, decisions, and integrations.'),
            cta('lyr_sh_en_go'),
          ]),
        },
        next: { default: 'scr_lk_index' },
      },
      {
        id: 'scr_sh_regions',
        name: 'Stress · Header / body / footer',
        regions: {
          header: bodyStack('lyr_sh_rg_hdr', [
            {
              id: 'lyr_sh_rg_prog',
              kind: 'progress',
              trackColor: { light: '#e4e4e7', dark: '#3f3f46' },
              fillColor: '#6366f1',
              style: { width: 'full', height: 6 },
            },
            tx('lyr_sh_rg_ht', 'Header region · progress', { fontSize: 12, fontWeight: 600 }),
          ]),
          body: bodyStack(
            'lyr_sh_rg_body',
            [
              {
                id: 'lyr_sh_rg_row',
                kind: 'stack',
                direction: 'horizontal',
                gap: 16,
                align: 'center',
                stackLayoutBreakpoints: { md: { gap: 24 } },
                children: [
                  { id: 'lyr_sh_ic_l', kind: 'icon', family: 'ionicons', iconName: 'star-outline', style: { width: 28, height: 28, color: DEFAULT_THEMED_FOREGROUND } },
                  {
                    id: 'lyr_sh_ic_i',
                    kind: 'icon',
                    family: 'ionicons',
                    iconName: 'rocket-outline',
                    style: { width: 28, height: 28, color: '#6366f1' },
                  },
                  { id: 'lyr_sh_ic_s', kind: 'icon', family: 'ionicons', iconName: 'star-outline', style: { width: 26, height: 26, color: DEFAULT_THEMED_FOREGROUND } },
                ],
              },
              {
                id: 'lyr_sh_rg_mid',
                kind: 'stack',
                direction: 'horizontal',
                gap: 12,
                children: [
                  { id: 'lyr_sh_img', kind: 'image', alt: 'placeholder', style: { width: 96, height: 64, radius: 8 } },
                  { id: 'lyr_sh_lot', kind: 'lottie', loop: true, style: { width: 96, height: 64 } },
                  {
                    id: 'lyr_sh_ctr',
                    kind: 'counter',
                    startValue: 0,
                    endValue: 60,
                    durationMs: 1800,
                    displayKind: 'time',
                    timeFormat: 'mm_ss',
                    style: { fontSize: 18, fontWeight: 700 },
                  },
                ],
              },
              tx('lyr_sh_rg_body_txt', 'Body: icons, image, lottie, counter.'),
              cta('lyr_sh_rg_go'),
            ],
            { styleBreakpoints: { sm: { gap: 8 } } },
          ),
          footer: bodyStack('lyr_sh_rg_ftr', [
            tx('lyr_sh_rg_ft', 'Footer region', { fontSize: 11, color: '#71717a' }),
          ]),
        },
        animations: [clipFade('an_rg_t', 'lyr_sh_rg_body_txt', 'mount')],
        next: { default: 'scr_sh_overlap' },
      },
      {
        id: 'scr_sh_overlap',
        name: 'Stress · Absolute overlap',
        regions: {
          body: bodyStack('lyr_sh_ov_b', [
            {
              id: 'lyr_sh_ov_base',
              kind: 'stack',
              direction: 'vertical',
              gap: 8,
              style: {
                padding: { t: 48, r: 12, b: 12, l: 12 },
                background: { light: '#f4f4f5' },
                radius: 12,
              },
              children: [
                tx('lyr_sh_ov_base_t', 'Base layer (scrolls under card)'),
                tx('lyr_sh_ov_sub', 'Secondary line', { fontSize: 13 }),
              ],
            },
            {
              id: 'lyr_sh_ov_card',
              kind: 'stack',
              direction: 'vertical',
              gap: 6,
              style: {
                position: 'absolute',
                inset: { t: 8, r: 12 },
                zIndex: 3,
                padding: { t: 10, r: 12, b: 10, l: 12 },
                radius: 10,
                background: { light: '#ffffff', dark: '#27272a' },
                shadow: { offsetY: 4, blur: 12, opacity: 0.15 },
              },
              restingMotions: [
                {
                  id: 'rm_pulse_card',
                  preset: 'pulse',
                  durationMs: 2400,
                  loop: true,
                  intensity: 0.85,
                },
              ],
              children: [tx('lyr_sh_ov_card_t', 'Floating card · z-index + resting pulse')],
            },
            {
              id: 'lyr_sh_ov_abs2',
              kind: 'stack',
              direction: 'vertical',
              style: {
                position: 'absolute',
                inset: { b: 56, l: 12 },
                zIndex: 2,
                padding: { t: 8, r: 8, b: 8, l: 8 },
                background: { light: '#fef3c7' },
                radius: 8,
              },
              restingMotions: [
                {
                  id: 'rm_bounce',
                  preset: 'bounce',
                  bounceAmplitudePx: 10,
                  loop: true,
                  durationMs: 3200,
                },
              ],
              children: [tx('lyr_sh_ov_abs2_t', 'Bottom-left · bounce')],
            },
            cta('lyr_sh_ov_go'),
          ]),
        },
        stagger: { stepMs: 64 },
        animations: [
          clipFade('an_ov_c', 'lyr_sh_ov_card', 'stagger', { staggerIndex: 0 }),
          clipFade('an_ov_b', 'lyr_sh_ov_base', 'stagger', { staggerIndex: 1 }),
          {
            id: 'an_ov_u',
            targetLayerId: 'lyr_sh_ov_card',
            trigger: 'unmount',
            durationMs: 300,
            tracks: [
              {
                property: 'opacity',
                keyframes: [
                  { t: 0, value: 1, easing: 'ease-in' },
                  { t: 1, value: 0 },
                ],
              },
            ],
          },
        ],
        next: { default: 'scr_sh_carousel' },
      },
      {
        id: 'scr_sh_carousel',
        name: 'Stress · Carousel',
        regions: {
          body: bodyStack('lyr_sh_cr_b', [
            {
              id: 'lyr_sh_cr',
              kind: 'carousel',
              loop: true,
              pagePeek: 12,
              pageControl: {
                position: 'bottom',
                spacing: 10,
                indicators: { width: 8, height: 8, activeWidth: 22, activeColor: '#6366f1' },
              },
              slides: [
                bodyStack('lyr_sh_s1', [tx('lyr_sh_s1_t', 'Slide A')]),
                bodyStack('lyr_sh_s2', [tx('lyr_sh_s2_t', 'Slide B')]),
                bodyStack('lyr_sh_s3', [tx('lyr_sh_s3_t', 'Slide C')]),
              ],
            },
            cta('lyr_sh_cr_go'),
          ]),
        },
        next: { default: 'scr_sh_branch' },
      },
      {
        id: 'scr_sh_branch',
        name: 'Stress · Grid branch',
        regions: {
          body: bodyStack('lyr_sh_br_b', [
            tx('lyr_sh_br_h', 'Pick a branch (grid single_choice)', { fontWeight: 700 }),
            {
              id: 'lyr_sh_br_ch',
              kind: 'single_choice',
              fieldKey: 'sh_branch_pick',
              direction: 'grid',
              columns: 2,
              gap: 10,
              children: [
                bodyStack('lyr_sh_br_lo', [tx('lyr_sh_br_lox', 'Low')]),
                bodyStack('lyr_sh_br_hi', [tx('lyr_sh_br_hix', 'High')]),
                bodyStack('lyr_sh_br_md', [tx('lyr_sh_br_mdx', 'Mid merge')]),
              ],
              optionBindings: [
                { optionId: 'opt_low', rootLayerId: 'lyr_sh_br_lo' },
                { optionId: 'opt_high', rootLayerId: 'lyr_sh_br_hi' },
                { optionId: 'opt_mid', rootLayerId: 'lyr_sh_br_md' },
              ],
              branching: {
                enabled: true,
                conditions: [
                  { choiceId: 'opt_low', goTo: 'scr_sh_b_low' },
                  { choiceId: 'opt_high', goTo: 'scr_sh_b_high' },
                  { choiceId: 'opt_mid', goTo: 'scr_sh_merge' },
                ],
              },
            },
          ]),
        },
        next: { default: 'scr_sh_merge' },
      },
      {
        id: 'scr_sh_b_low',
        name: 'Stress · Branch low',
        regions: {
          body: bodyStack('lyr_sh_bl_b', [tx('lyr_sh_bl_t', 'Low branch path'), cta('lyr_sh_bl_go')]),
        },
        next: { default: 'scr_sh_merge' },
      },
      {
        id: 'scr_sh_b_high',
        name: 'Stress · Branch high',
        regions: {
          body: bodyStack('lyr_sh_bh_b', [tx('lyr_sh_bh_t', 'High branch path'), cta('lyr_sh_bh_go')]),
        },
        next: { default: 'scr_sh_merge' },
      },
      {
        id: 'scr_sh_merge',
        name: 'Stress · Merge',
        regions: {
          body: bodyStack('lyr_sh_mg_b', [tx('lyr_sh_mg_t', 'Merged navigation'), cta('lyr_sh_mg_go')]),
        },
        next: { default: 'scr_sh_skip' },
      },
      {
        id: 'scr_sh_skip',
        name: 'Stress · Skip path',
        regions: {
          body: bodyStack('lyr_sh_sk_b', [
            tx('lyr_sh_sk_t', 'Optional step with skip button'),
            cta('lyr_sh_sk_go', 'Next'),
          ]),
        },
        next: { default: 'scr_sh_multi' },
      },
      {
        id: 'scr_sh_multi',
        name: 'Stress · Multi (tags)',
        regions: {
          body: bodyStack('lyr_sh_mu_root', [
            tx('lyr_sh_mu_h', 'Pick multiple tags'),
            {
              id: 'lyr_sh_mu',
              kind: 'multiple_choice',
              fieldKey: 'sh_topics',
              direction: 'vertical',
              gap: 8,
              minSelections: 1,
              maxSelections: 3,
              children: [
                bodyStack('lyr_sh_mu_a', [tx('lyr_sh_mu_ax', 'Tag A')]),
                bodyStack('lyr_sh_mu_b', [tx('lyr_sh_mu_bx', 'Tag B')]),
                bodyStack('lyr_sh_mu_c', [tx('lyr_sh_mu_cx', 'Tag C')]),
              ],
              optionBindings: [
                { optionId: 'tag_a', rootLayerId: 'lyr_sh_mu_a' },
                { optionId: 'tag_b', rootLayerId: 'lyr_sh_mu_b' },
                { optionId: 'tag_c', rootLayerId: 'lyr_sh_mu_c' },
              ],
              branching: { enabled: false, conditions: [] },
            },
            cta('lyr_sh_mu_go'),
          ]),
        },
        next: { default: 'dec_sh_intersect' },
      },
      {
        id: 'scr_sh_m_hit',
        name: 'Stress · Intersect true',
        regions: {
          body: bodyStack('lyr_sh_mh_b', [tx('lyr_sh_mh_t', 'Topics intersect A∩B ✓'), cta('lyr_sh_mh_go')]),
        },
        next: { default: 'dec_sh_contains' },
      },
      {
        id: 'scr_sh_m_miss',
        name: 'Stress · Intersect false',
        regions: {
          body: bodyStack('lyr_sh_mm_b', [
            tx('lyr_sh_mm_t', 'No A∩B overlap — continue matrix'),
            cta('lyr_sh_mm_go'),
          ]),
        },
        next: { default: 'dec_sh_contains' },
      },
      {
        id: 'scr_sh_ca_y',
        name: 'Stress · Contains all',
        regions: {
          body: bodyStack('lyr_sh_cy_b', [tx('lyr_sh_cy_t', 'Selected all A+B+C'), cta('lyr_sh_cy_go')]),
        },
        next: { default: 'scr_sh_pack' },
      },
      {
        id: 'scr_sh_ca_n',
        name: 'Stress · Not all tags',
        regions: {
          body: bodyStack('lyr_sh_cn_b', [tx('lyr_sh_cn_t', 'Missing some tags'), cta('lyr_sh_cn_go')]),
        },
        next: { default: 'scr_sh_pack' },
      },
      {
        id: 'scr_sh_pack',
        name: 'Stress · Multi (pack)',
        regions: {
          body: bodyStack('lyr_sh_pk_root', [
            tx('lyr_sh_pk_h', 'Subset-of test · pick packs'),
            {
              id: 'lyr_sh_pk',
              kind: 'multiple_choice',
              fieldKey: 'sh_pack',
              children: [
                bodyStack('lyr_sh_pk_a', [tx('lyr_sh_pk_ax', 'Pack A')]),
                bodyStack('lyr_sh_pk_b', [tx('lyr_sh_pk_bx', 'Pack B')]),
                bodyStack('lyr_sh_pk_c', [tx('lyr_sh_pk_cx', 'Pack C')]),
              ],
              optionBindings: [
                { optionId: 'pack_a', rootLayerId: 'lyr_sh_pk_a' },
                { optionId: 'pack_b', rootLayerId: 'lyr_sh_pk_b' },
                { optionId: 'pack_c', rootLayerId: 'lyr_sh_pk_c' },
              ],
              branching: { enabled: false, conditions: [] },
            },
            cta('lyr_sh_pk_go'),
          ]),
        },
        next: { default: 'dec_sh_subset' },
      },
      {
        id: 'scr_sh_ss_y',
        name: 'Stress · Subset ok',
        regions: {
          body: bodyStack('lyr_sh_sy_b', [tx('lyr_sh_sy_t', 'Selection ⊆ {A,B}'), cta('lyr_sh_sy_go')]),
        },
        next: { default: 'scr_sh_scale' },
      },
      {
        id: 'scr_sh_ss_n',
        name: 'Stress · Subset fail',
        regions: {
          body: bodyStack('lyr_sh_sn_b', [
            tx('lyr_sh_sn_t', 'Had Pack C outside allow-list'),
            cta('lyr_sh_sn_go'),
          ]),
        },
        next: { default: 'scr_sh_scale' },
      },
];
