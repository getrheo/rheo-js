import { DEFAULT_THEMED_FOREGROUND } from '@getrheo/contracts/layers';
import {
  asBody,
  bodyStack,
  choiceOption,
  cta,
  qaBrief,
  type ScreenDraft,
  tx,
} from './builders.js';

/** Layout / region / input permutations beyond the per-kind gallery. */
export const sdkRegressionPermutationScreens = (): ScreenDraft[] => [
  {
    id: 'scr_srg_stack_wrap',
    name: 'SRG · stack wrap',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_sw_b', [
          ...qaBrief('lyr_srg_sw', {
            title: 'Permutation · stack horizontal + wrap',
            test: 'Six chips in a horizontal wrap stack with gap=8 align=center.',
            expected:
              'Chips wrap onto a second line on ~390px width. Gap is 8 on both axes. No clipping at screen edges.',
          }),
          {
            id: 'lyr_srg_sw',
            kind: 'stack',
            direction: 'horizontal',
            gap: 8,
            wrap: true,
            align: 'center',
            distribution: 'start',
            style: { width: 'full', height: 'auto' },
            children: Array.from({ length: 6 }, (_, i) =>
              tx(`lyr_srg_sw_c_${i}`, `Chip ${i + 1}`, {
                fontSize: 12,
                fontWeight: 600,
                padding: { t: 6, r: 10, b: 6, l: 10 },
                radius: 24,
                background: { light: '#e4e4e7', dark: '#3f3f46' },
              }),
            ),
          },
          cta('lyr_srg_sw_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_choice_h',
    name: 'SRG · choice horizontal',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_ch_body', [
          ...qaBrief('lyr_srg_ch', {
            title: 'Permutation · single_choice horizontal',
            test: 'Two options side-by-side with direction=horizontal gap=8.',
            expected:
              'Options share one row on phone width when possible. Selection chrome still applies. Exclusive select works.',
          }),
          {
            id: 'lyr_srg_ch',
            kind: 'single_choice',
            fieldKey: 'srg_dir_horiz',
            direction: 'horizontal',
            gap: 8,
            style: { width: 'full', height: 'auto' },
            children: [
              choiceOption('lyr_srg_ch_a', 'H-A'),
              choiceOption('lyr_srg_ch_b', 'H-B'),
            ],
            optionBindings: [
              { optionId: 'a', rootLayerId: 'lyr_srg_ch_a' },
              { optionId: 'b', rootLayerId: 'lyr_srg_ch_b' },
            ],
            branching: { enabled: false, conditions: [] },
          },
          cta('lyr_srg_ch_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_choice_g',
    name: 'SRG · choice grid',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_cg_body', [
          ...qaBrief('lyr_srg_cg', {
            title: 'Permutation · single_choice grid 2×2',
            test: 'Four options in direction=grid columns=2.',
            expected:
              '2×2 grid with even gaps. Each cell full width of its column. Selection exclusive across the grid.',
          }),
          {
            id: 'lyr_srg_cg',
            kind: 'single_choice',
            fieldKey: 'srg_dir_grid',
            direction: 'grid',
            columns: 2,
            gap: 8,
            style: { width: 'full', height: 'auto' },
            children: [
              choiceOption('lyr_srg_cg_a', 'G-A'),
              choiceOption('lyr_srg_cg_b', 'G-B'),
              choiceOption('lyr_srg_cg_c', 'G-C'),
              choiceOption('lyr_srg_cg_d', 'G-D'),
            ],
            optionBindings: [
              { optionId: 'a', rootLayerId: 'lyr_srg_cg_a' },
              { optionId: 'b', rootLayerId: 'lyr_srg_cg_b' },
              { optionId: 'c', rootLayerId: 'lyr_srg_cg_c' },
              { optionId: 'd', rootLayerId: 'lyr_srg_cg_d' },
            ],
            branching: { enabled: false, conditions: [] },
          },
          cta('lyr_srg_cg_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_wheel_date',
    name: 'SRG · wheel date',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_wd_b', [
          ...qaBrief('lyr_srg_wd', {
            title: 'Permutation · wheel_picker date year',
            test: 'Date-mode wheel for year (2000–2005), default 2002.',
            expected:
              'Years scroll within min/max. Default lands on 2002. Captured value is a string year. Continue required.',
          }),
          {
            id: 'lyr_srg_wd',
            kind: 'wheel_picker',
            fieldKey: 'srg_birth_year',
            mode: 'date',
            datePart: 'year',
            minYear: 2000,
            maxYear: 2005,
            defaultValue: '2002',
            placeholder: { default: 'Select year' },
            style: { width: 'full', height: 'fill' },
          },
          cta('lyr_srg_wd_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_regions',
    name: 'SRG · regions',
    regions: {
      header: asBody(
        bodyStack(
          'lyr_srg_rg_hdr',
          [
            {
              id: 'lyr_srg_rg_prog',
              kind: 'progress',
              trackColor: { light: '#e4e4e7', dark: '#3f3f46' },
              fillColor: '#6366f1',
              style: { width: 'full', height: 6 },
            },
            tx('lyr_srg_rg_ht', 'HEADER region', {
              fontSize: 11,
              fontWeight: 700,
              color: { light: '#71717a', dark: '#a1a1aa' },
            }),
          ],
          {
            style: {
              width: 'full',
              height: 'auto',
              padding: { t: 8, r: 16, b: 8, l: 16 },
            },
          },
        ),
      ),
      body: asBody(
        bodyStack('lyr_srg_rg_body', [
          ...qaBrief('lyr_srg_rg', {
            title: 'Permutation · header / body / footer regions',
            test: 'Confirm three regions: sticky-ish header progress, scrollable body, footer label.',
            expected:
              'Header stays above body content. Footer sits below CTA area. Safe-area insets respected when containerStyle.insetSafeArea is on. Body scrolls if needed without clipping footer permanently.',
          }),
          {
            id: 'lyr_srg_rg_icons',
            kind: 'stack',
            direction: 'horizontal',
            gap: 16,
            align: 'center',
            style: { width: 'full', height: 'auto' },
            children: [
              {
                id: 'lyr_srg_rg_i1',
                kind: 'icon',
                family: 'ionicons',
                iconName: 'star-outline',
                style: { width: 28, height: 28, color: DEFAULT_THEMED_FOREGROUND },
              },
              {
                id: 'lyr_srg_rg_i2',
                kind: 'icon',
                family: 'ionicons',
                iconName: 'sparkles-outline',
                style: { width: 28, height: 28, color: '#6366f1' },
              },
            ],
          },
          cta('lyr_srg_rg_go'),
        ]),
      ),
      footer: asBody(
        bodyStack(
          'lyr_srg_rg_ftr',
          [
            tx('lyr_srg_rg_ft', 'FOOTER region · success if this stays pinned below body', {
              fontSize: 11,
              color: { light: '#71717a', dark: '#a1a1aa' },
              align: 'center',
            }),
          ],
          {
            style: {
              width: 'full',
              height: 'auto',
              padding: { t: 8, r: 16, b: 12, l: 16 },
            },
          },
        ),
      ),
    },
    containerStyle: {
      insetSafeArea: true,
      backgroundFill: {
        kind: 'color',
        color: { light: '#fafafa', dark: '#09090b' },
      },
    },
  },
  {
    id: 'scr_srg_absolute',
    name: 'SRG · absolute stack',
    regions: {
      body: asBody(
        bodyStack(
          'lyr_srg_abs_b',
          [
            ...qaBrief('lyr_srg_abs', {
              title: 'Permutation · absolute positioned stack',
              test: 'Overlay card uses position=absolute inset top/right with zIndex 3 and shadow.',
              expected:
                'Overlay floats over the base card. Shadow visible on Web/RN; native approximates. Base content remains visible underneath. No absolute on region roots (only nested stack).',
            }),
            {
              id: 'lyr_srg_abs_base',
              kind: 'stack',
              direction: 'vertical',
              gap: 8,
              style: {
                width: 'full',
                height: 'auto',
                padding: { t: 48, r: 12, b: 16, l: 12 },
                radius: 12,
                background: { light: '#f4f4f5', dark: '#27272a' },
              },
              children: [
                tx('lyr_srg_abs_base_t', 'Base layer under the overlay'),
                tx('lyr_srg_abs_base_s', 'Secondary line for scroll context', { fontSize: 13 }),
              ],
            },
            {
              id: 'lyr_srg_abs_card',
              kind: 'stack',
              direction: 'vertical',
              gap: 4,
              style: {
                position: 'absolute',
                inset: { t: 8, r: 12 },
                zIndex: 3,
                width: 'auto',
                height: 'auto',
                padding: { t: 10, r: 12, b: 10, l: 12 },
                radius: 10,
                background: { light: '#ffffff', dark: '#18181b' },
                shadow: { offsetY: 4, blur: 12, opacity: 0.15 },
              },
              children: [tx('lyr_srg_abs_card_t', 'Absolute overlay', { fontWeight: 700, fontSize: 13 })],
            },
            cta('lyr_srg_abs_go'),
          ],
          { style: { minHeight: 180 } },
        ),
      ),
    },
  },
  {
    id: 'scr_srg_done',
    name: 'SRG · Done',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_done_b', [
          tx('lyr_srg_done_h', 'Regression walkthrough complete', {
            fontSize: 22,
            fontWeight: 800,
          }),
          tx(
            'lyr_srg_done_p',
            'SUCCESS CRITERIA: every prior screen matched its EXPECTED outcome on Web, RN, Flutter, and SwiftUI (light + dark). File bugs with screen id, SDK, theme, viewport, and screenshots.',
            { fontSize: 14, lineHeight: 1.4 },
          ),
          {
            id: 'lyr_srg_done_end',
            kind: 'button',
            variant: 'primary',
            action: { kind: 'end_flow' },
            direction: 'horizontal',
            align: 'center',
            distribution: 'center',
            style: { width: 'full', height: 'auto' },
            children: [
              {
                id: 'lyr_srg_done_end_t',
                kind: 'text',
                text: { default: 'End flow' },
                style: { width: 'auto', height: 'auto', color: '#ffffff' },
              },
            ],
          },
        ]),
      ),
    },
  },
];
