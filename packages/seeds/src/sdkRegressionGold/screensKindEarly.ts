import {
  BUTTON_LAYER_VARIANTS,
  DEFAULT_THEMED_FOREGROUND,
  PRIMARY_FILLED_LABEL,
} from '@getrheo/contracts/layers';
import {
  asBody,
  bodyStack,
  cta,
  qaBrief,
  type ScreenDraft,
  tx,
} from './builders.js';

/** Entry + layout/media/chrome layers through counter. */
export const sdkRegressionKindScreensEarly = (): ScreenDraft[] => [
  {
    id: 'scr_srg_entry',
    name: 'SRG · Start',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_entry_b', [
          tx('lyr_srg_entry_h', 'SDK regression gold', { fontSize: 24, fontWeight: 800 }),
          tx(
            'lyr_srg_entry_p',
            'Gold-standard walkthrough for SDK and renderer regression. Each screen isolates one layer or permutation with TEST and EXPECTED copy on-device. Canvas comments add success criteria for builders.',
            { fontSize: 14, lineHeight: 1.4 },
          ),
          tx(
            'lyr_srg_entry_how',
            'How to use: open this flow in Web sim, RN, Flutter, and SwiftUI. Walk screen by screen. Fail any screen whose EXPECTED outcome does not match.',
            { fontSize: 13, lineHeight: 1.35 },
          ),
          cta('lyr_srg_entry_go', 'Begin regression'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_stack',
    name: 'SRG · stack',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_stack_b', [
          ...qaBrief('lyr_srg_stack', {
            title: 'Layer · stack (vertical)',
            test: 'Confirm vertical stacking, gap=16 between children, and distribution=start.',
            expected:
              'Three colored rows stack top-to-bottom with even 16px gaps. No horizontal overlap. Children respect full width.',
          }),
          {
            id: 'lyr_srg_stack_demo',
            kind: 'stack',
            direction: 'vertical',
            gap: 16,
            distribution: 'start',
            style: { width: 'full', height: 'auto' },
            children: [
              {
                id: 'lyr_srg_stack_r1',
                kind: 'stack',
                direction: 'vertical',
                style: {
                  width: 'full',
                  height: 'auto',
                  padding: { t: 10, r: 10, b: 10, l: 10 },
                  radius: 8,
                  background: { light: '#dbeafe', dark: '#1e3a8a' },
                },
                children: [tx('lyr_srg_stack_r1_t', 'Row 1')],
              },
              {
                id: 'lyr_srg_stack_r2',
                kind: 'stack',
                direction: 'vertical',
                style: {
                  width: 'full',
                  height: 'auto',
                  padding: { t: 10, r: 10, b: 10, l: 10 },
                  radius: 8,
                  background: { light: '#fce7f3', dark: '#831843' },
                },
                children: [tx('lyr_srg_stack_r2_t', 'Row 2')],
              },
              {
                id: 'lyr_srg_stack_r3',
                kind: 'stack',
                direction: 'vertical',
                style: {
                  width: 'full',
                  height: 'auto',
                  padding: { t: 10, r: 10, b: 10, l: 10 },
                  radius: 8,
                  background: { light: '#dcfce7', dark: '#14532d' },
                },
                children: [tx('lyr_srg_stack_r3_t', 'Row 3')],
              },
            ],
          },
          cta('lyr_srg_stack_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_text',
    name: 'SRG · text',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_text_b', [
          ...qaBrief('lyr_srg_text', {
            title: 'Layer · text',
            test: 'Check fontSize, fontWeight, align, lineHeight, and light/dark color tokens.',
            expected:
              'Title is 22/800 and centered. Body is 14 with lineHeight 1.45. Colors flip for dark mode. No system theme inheritance overrides authored color.',
          }),
          tx('lyr_srg_text_demo_h', 'Centered title sample', {
            fontSize: 22,
            fontWeight: 800,
            align: 'center',
          }),
          tx(
            'lyr_srg_text_demo_b',
            'Body sample with explicit line height. Native SDKs must honor authored color (no CSS inheritance).',
            { fontSize: 14, lineHeight: 1.45, align: 'left' },
          ),
          cta('lyr_srg_text_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_icon',
    name: 'SRG · icon',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_icon_b', [
          ...qaBrief('lyr_srg_icon', {
            title: 'Layer · icon',
            test: 'Icons must fill the authored width×height box (24 and 40) without clipping or stretching glyphs oddly.',
            expected:
              'Two ionicons render at 24×24 and 40×40. Color matches style.color. Boxes are tight to glyph bounds on all SDKs.',
          }),
          {
            id: 'lyr_srg_icon_row',
            kind: 'stack',
            direction: 'horizontal',
            gap: 24,
            align: 'center',
            style: { width: 'full', height: 'auto' },
            children: [
              {
                id: 'lyr_srg_icon_24',
                kind: 'icon',
                family: 'ionicons',
                iconName: 'star-outline',
                style: { width: 24, height: 24, color: '#6366f1' },
              },
              {
                id: 'lyr_srg_icon_40',
                kind: 'icon',
                family: 'ionicons',
                iconName: 'rocket-outline',
                style: { width: 40, height: 40, color: DEFAULT_THEMED_FOREGROUND },
              },
            ],
          },
          cta('lyr_srg_icon_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_image',
    name: 'SRG · image',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_image_b', [
          ...qaBrief('lyr_srg_image', {
            title: 'Layer · image',
            test: 'Placeholder image at 160×100 with radius 12 and fit=cover.',
            expected:
              'Image box is exactly 160×100, corners rounded 12. Missing media shows a stable placeholder (no crash). Cover crops without distortion.',
          }),
          {
            id: 'lyr_srg_image_demo',
            kind: 'image',
            alt: 'Regression placeholder',
            style: { width: 160, height: 100, radius: 12, fit: 'cover' },
          },
          cta('lyr_srg_image_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_lottie',
    name: 'SRG · lottie',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_lottie_b', [
          ...qaBrief('lyr_srg_lottie', {
            title: 'Layer · lottie',
            test: 'Looping Lottie at 96×96. Confirm continuous loop and no layout jump when animation starts.',
            expected:
              'Animation loops forever inside a 96×96 box. Layout around it stays stable. Missing asset shows empty/placeholder without crashing the screen.',
          }),
          { id: 'lyr_srg_lottie_demo', kind: 'lottie', loop: true, style: { width: 96, height: 96 } },
          cta('lyr_srg_lottie_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_video',
    name: 'SRG · video',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_video_b', [
          ...qaBrief('lyr_srg_video', {
            title: 'Layer · video',
            test: 'Muted looping video 200×112 radius 8. Autoplay policy may differ by platform.',
            expected:
              'Video player box is 200×112 with radius 8. Muted + loop. No audio. Missing media does not freeze navigation.',
          }),
          {
            id: 'lyr_srg_video_demo',
            kind: 'video',
            loop: true,
            muted: true,
            style: { width: 200, height: 112, radius: 8 },
          },
          cta('lyr_srg_video_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_button',
    name: 'SRG · button',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_button_b', [
          ...qaBrief('lyr_srg_button', {
            title: 'Layer · button (primary continue)',
            test: 'Tap primary Continue. Watch press scale and label color on filled primary.',
            expected:
              'Button uses Rheo chrome (not stock Material/Cupertino). Press feedback scales slightly. Label is primaryForeground. Tap advances to next screen.',
          }),
          cta('lyr_srg_button_go', 'Continue'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_back',
    name: 'SRG · back_button',
    regions: {
      header: asBody(
        bodyStack(
          'lyr_srg_back_hdr',
          [
            {
              id: 'lyr_srg_back_demo',
              kind: 'back_button',
              variant: 'ghost',
              style: { width: 'auto', height: 'auto' },
              children: [
                {
                  id: 'lyr_srg_back_ico',
                  kind: 'icon',
                  family: 'ionicons',
                  iconName: 'arrow-back-outline',
                  style: { width: 24, height: 24, color: DEFAULT_THEMED_FOREGROUND },
                },
              ],
            },
          ],
          {
            style: {
              width: 'full',
              height: 'auto',
              padding: { t: 8, r: 16, b: 8, l: 12 },
            },
          },
        ),
      ),
      body: asBody(
        bodyStack('lyr_srg_back_b', [
          ...qaBrief('lyr_srg_back', {
            title: 'Layer · back_button',
            test: 'Header hosts a ghost back_button with arrow icon. Tap returns one screen.',
            expected:
              'Back control sits in header, not body. Tap goes back one screen (history). Icon color follows theme. No system navigation bar collision.',
          }),
          cta('lyr_srg_back_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_progress',
    name: 'SRG · progress',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_prog_b', [
          ...qaBrief('lyr_srg_prog', {
            title: 'Layer · progress',
            test: 'Authored height 8 track with indigo fill. Compare light vs dark track colors.',
            expected:
              'Bar is full width and 8px tall. Fill color #6366f1. Track uses light/dark tokens. No default platform ProgressView chrome.',
          }),
          {
            id: 'lyr_srg_prog_demo',
            kind: 'progress',
            trackColor: { light: '#e4e4e7', dark: '#3f3f46' },
            fillColor: '#6366f1',
            style: { width: 'full', height: 8 },
          },
          cta('lyr_srg_prog_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_loader',
    name: 'SRG · loader',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_load_b', [
          ...qaBrief('lyr_srg_load', {
            title: 'Layer · loader (linear + circular)',
            test: 'Linear loader ~2.4s and circular 48×48 strokeWidth 4 run simultaneously.',
            expected:
              'Both variants animate. Linear spans full width. Circular is 48×48. Completing linear does not auto-advance (Continue is required).',
          }),
          { id: 'lyr_srg_load_lin', kind: 'loader', variant: 'linear', durationMs: 2400 },
          {
            id: 'lyr_srg_load_circ',
            kind: 'loader',
            variant: 'circular',
            style: { width: 48, height: 48, strokeWidth: 4 },
          },
          cta('lyr_srg_load_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_counter',
    name: 'SRG · counter',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_ctr_b', [
          ...qaBrief('lyr_srg_ctr', {
            title: 'Layer · counter',
            test: 'Number counter 0→99 (~2.2s) and time counter mm_ss 0→90s.',
            expected:
              'Number animates smoothly to 99. Time displays mm:ss format. Both finish near 2s. Typography uses authored fontSize/weight.',
          }),
          {
            id: 'lyr_srg_ctr_num',
            kind: 'counter',
            startValue: 0,
            endValue: 99,
            durationMs: 2200,
            displayKind: 'number',
            style: { fontSize: 32, fontWeight: 800 },
          },
          {
            id: 'lyr_srg_ctr_time',
            kind: 'counter',
            startValue: 0,
            endValue: 90,
            durationMs: 2200,
            displayKind: 'time',
            timeFormat: 'mm_ss',
            style: { fontSize: 20, fontWeight: 700 },
          },
          cta('lyr_srg_ctr_go'),
        ]),
      ),
    },
  }
];

/** Button variant gallery (permutation of button layer). */
export const sdkRegressionButtonVariantScreen = (): ScreenDraft => ({
  id: 'scr_srg_btn_variants',
  name: 'SRG · button variants',
  regions: {
    body: asBody(
      bodyStack('lyr_srg_bv_b', [
        ...qaBrief('lyr_srg_bv', {
          title: 'Permutation · all button variants',
          test: `Render every BUTTON_LAYER_VARIANTS value (${BUTTON_LAYER_VARIANTS.join(', ')}).`,
          expected:
            'Each variant has distinct chrome. Filled variants use light label color. Ghost/secondary remain readable in light and dark. Press feedback works on all.',
        }),
        ...BUTTON_LAYER_VARIANTS.map((variant) => ({
          id: `lyr_srg_bv_${variant}`,
          kind: 'button' as const,
          variant,
          action: { kind: 'none' as const },
          direction: 'horizontal' as const,
          align: 'center' as const,
          distribution: 'center' as const,
          style: { width: 'full' as const, height: 'auto' as const },
          children: [
            {
              id: `lyr_srg_bv_${variant}_t`,
              kind: 'text' as const,
              text: { default: variant },
              style: {
                width: 'auto' as const,
                height: 'auto' as const,
                color:
                  variant === 'primary' || variant === 'destructive'
                    ? PRIMARY_FILLED_LABEL
                    : DEFAULT_THEMED_FOREGROUND,
              },
            },
          ],
        })),
        cta('lyr_srg_bv_go'),
      ]),
    ),
  },
});
