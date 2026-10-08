import {
  DEFAULT_THEMED_FOREGROUND,
  PRIMARY_FILLED_LABEL,
} from '@getrheo/contracts/layers';
import {
  asBody,
  bodyStack,
  choiceOption,
  cta,
  qaBrief,
  type ScreenDraft,
  tx,
} from './builders.js';

const OAUTH_CUSTOM_ROW = '55555555-5555-4555-8555-555555555555';

/** Input, auth, and conditional layer screens. */
export const sdkRegressionKindScreensLate = (): ScreenDraft[] => [
  {
    id: 'scr_srg_single',
    name: 'SRG · single_choice',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_sc_body', [
          ...qaBrief('lyr_srg_sc', {
            title: 'Layer · single_choice (vertical)',
            test: 'Select one option. Confirm selectedStyle chrome and exclusive selection.',
            expected:
              'Only one option can be selected. selectedStyle border/background apply. Tapping another deselects the first. Continue works after a selection.',
          }),
          {
            id: 'lyr_srg_sc',
            kind: 'single_choice',
            fieldKey: 'srg_single_pick',
            direction: 'vertical',
            gap: 10,
            style: { width: 'full', height: 'auto' },
            children: [
              choiceOption('lyr_srg_sc_a', 'Option A'),
              choiceOption('lyr_srg_sc_b', 'Option B'),
              choiceOption('lyr_srg_sc_c', 'Option C'),
            ],
            optionBindings: [
              { optionId: 'a', rootLayerId: 'lyr_srg_sc_a' },
              { optionId: 'b', rootLayerId: 'lyr_srg_sc_b' },
              { optionId: 'c', rootLayerId: 'lyr_srg_sc_c' },
            ],
            branching: { enabled: false, conditions: [] },
          },
          cta('lyr_srg_sc_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_multi',
    name: 'SRG · multiple_choice',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_mc_body', [
          ...qaBrief('lyr_srg_mc', {
            title: 'Layer · multiple_choice',
            test: 'Toggle Tag 1 and Tag 2 independently. Both may stay selected.',
            expected:
              'Multi-select keeps both tags selected. selectedStyle applies per option. Deselect works. Continue advances with multi value payload.',
          }),
          {
            id: 'lyr_srg_mc',
            kind: 'multiple_choice',
            fieldKey: 'srg_multi_tags',
            direction: 'vertical',
            gap: 10,
            style: { width: 'full', height: 'auto' },
            children: [
              choiceOption('lyr_srg_mc_a', 'Tag 1'),
              choiceOption('lyr_srg_mc_b', 'Tag 2'),
            ],
            optionBindings: [
              { optionId: 't1', rootLayerId: 'lyr_srg_mc_a' },
              { optionId: 't2', rootLayerId: 'lyr_srg_mc_b' },
            ],
            branching: { enabled: false, conditions: [] },
          },
          cta('lyr_srg_mc_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_text_input',
    name: 'SRG · text_input',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_ti_b', [
          ...qaBrief('lyr_srg_ti', {
            title: 'Layer · text_input',
            test: 'Type into the field. Chrome is on outer style; fieldStyle is typography only.',
            expected:
              'Placeholder visible when empty. Radius/padding/border come from outer style. Typed text uses fieldStyle fontSize/color. Keyboard does not cover Continue on mobile.',
          }),
          {
            id: 'lyr_srg_ti',
            kind: 'text_input',
            name: 'Name',
            fieldKey: 'srg_name',
            classification: 'safe',
            placeholder: { default: 'Type your name…' },
            fieldStyle: { fontSize: 16, color: DEFAULT_THEMED_FOREGROUND },
            style: {
              width: 'full',
              height: 'auto',
              padding: { t: 12, r: 14, b: 12, l: 14 },
              radius: 12,
              background: { light: '#ffffff', dark: '#18181b' },
              border: { width: 1, color: { light: '#d4d4d8', dark: '#3f3f46' } },
            },
          },
          cta('lyr_srg_ti_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_scale',
    name: 'SRG · scale_input',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_scale_b', [
          ...qaBrief('lyr_srg_scale', {
            title: 'Layer · scale_input',
            test: 'Drag/tap scale from Low (1) to High (10). Default starts at 5.',
            expected:
              'Min/max labels render. Value updates on interaction. Default is 5 on first paint. Continue submits the numeric value.',
          }),
          {
            id: 'lyr_srg_scale',
            kind: 'scale_input',
            fieldKey: 'srg_level',
            min: 1,
            max: 10,
            step: 1,
            defaultValue: 5,
            minLabel: { default: 'Low' },
            maxLabel: { default: 'High' },
            style: { width: 'full', height: 'auto' },
          },
          cta('lyr_srg_scale_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_wheel',
    name: 'SRG · wheel_picker',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_wheel_b', [
          ...qaBrief('lyr_srg_wheel', {
            title: 'Layer · wheel_picker (options)',
            test: 'Scroll the wheel and pick Small / Medium / Large. Continue required.',
            expected:
              'Wheel shows ≥2 options. Selected item uses selectedItemStyle emphasis. Value is a string optionId. No crash on fast fling.',
          }),
          {
            id: 'lyr_srg_wheel',
            kind: 'wheel_picker',
            fieldKey: 'srg_size',
            mode: 'options',
            options: [
              { optionId: 'small', label: { default: 'Small' } },
              { optionId: 'medium', label: { default: 'Medium' } },
              { optionId: 'large', label: { default: 'Large' } },
            ],
            defaultOptionId: 'medium',
            style: { width: 'full', height: 'fill' },
          },
          cta('lyr_srg_wheel_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_checkbox',
    name: 'SRG · checkbox',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_chk_b', [
          ...qaBrief('lyr_srg_chk', {
            title: 'Layer · checkbox',
            test: 'Toggle the checkbox on and off.',
            expected:
              'Checked/unchecked states are clear. Row chrome is Rheo (not stock OS checkbox alone). fieldKey value flips boolean.',
          }),
          {
            id: 'lyr_srg_chk_row',
            kind: 'stack',
            direction: 'horizontal',
            gap: 12,
            align: 'center',
            style: { width: 'full', height: 'auto' },
            children: [
              { id: 'lyr_srg_chk', kind: 'checkbox', fieldKey: 'srg_agree' },
              tx('lyr_srg_chk_label', 'I agree to the regression checklist'),
            ],
          },
          cta('lyr_srg_chk_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_carousel',
    name: 'SRG · carousel',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_car_b', [
          ...qaBrief('lyr_srg_car', {
            title: 'Layer · carousel',
            test: 'Swipe between Slide 1 and Slide 2. pagePeek=12 should show a peek of the next slide.',
            expected:
              'Horizontal paging works. Peek reveals neighbor. Dots/indicators (if present) update. Loop=true wraps. Layout height stays stable.',
          }),
          {
            id: 'lyr_srg_car',
            kind: 'carousel',
            loop: true,
            pagePeek: 12,
            style: { width: 'full', height: 'auto' },
            slides: [
              bodyStack('lyr_srg_car_s1', [
                tx('lyr_srg_car_s1_t', 'Slide 1', { fontSize: 18, fontWeight: 700, align: 'center' }),
              ]),
              bodyStack('lyr_srg_car_s2', [
                tx('lyr_srg_car_s2_t', 'Slide 2', { fontSize: 18, fontWeight: 700, align: 'center' }),
              ], {
                style: {
                  width: 'full',
                  height: 'auto',
                  padding: { t: 16, r: 16, b: 16, l: 16 },
                  background: { light: '#eef2ff', dark: '#1e1b4b' },
                  radius: 12,
                },
              }),
            ],
          },
          cta('lyr_srg_car_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_hyperlink',
    name: 'SRG · hyperlink',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_link_b', [
          ...qaBrief('lyr_srg_link', {
            title: 'Layer · hyperlink',
            test: 'Tap the getrheo.io link (opens in host browser / SFSafariView).',
            expected:
              'Uses Rheo hyperlink chrome, not a bare system TextButton. Label uses link-colored text. Tap opens URL without exiting the flow host incorrectly.',
          }),
          {
            id: 'lyr_srg_link',
            kind: 'hyperlink',
            href: 'https://getrheo.io',
            style: { width: 'auto', height: 'auto' },
            children: [
              tx('lyr_srg_link_t', 'Open getrheo.io', {
                color: { light: '#2563eb', dark: '#93c5fd' },
                fontWeight: 600,
              }),
            ],
          },
          cta('lyr_srg_link_go'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_oauth',
    name: 'SRG · oauth_login',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_oa_b', [
          ...qaBrief('lyr_srg_oa', {
            title: 'Layers · oauth_login + oauth_provider',
            test: 'Confirm GitHub/Google preset rows and one custom provider row with icon+label.',
            expected:
              'Preset providers show brand chrome. Custom row uses buttonVariant secondary with icon+text children. Gap=8 between rows. Taps invoke host OAuth provider (or no-op stub) without layout break.',
          }),
          {
            id: 'lyr_srg_oa',
            kind: 'oauth_login',
            gap: 8,
            style: { width: 'full', height: 'fill' },
            children: [
              { id: 'lyr_srg_oa_gh', kind: 'oauth_provider', variant: 'preset', provider: 'github' },
              { id: 'lyr_srg_oa_goog', kind: 'oauth_provider', variant: 'preset', provider: 'google' },
              {
                id: 'lyr_srg_oa_cu',
                kind: 'oauth_provider',
                variant: 'custom',
                rowId: OAUTH_CUSTOM_ROW,
                buttonVariant: 'secondary',
                direction: 'horizontal',
                align: 'center',
                distribution: 'center',
                style: { width: 'full', height: 'auto' },
                children: [
                  {
                    id: 'lyr_srg_oa_cu_i',
                    kind: 'icon',
                    family: 'ionicons',
                    iconName: 'key-outline',
                    style: { width: 20, height: 20, color: DEFAULT_THEMED_FOREGROUND },
                  },
                  {
                    id: 'lyr_srg_oa_cu_t',
                    kind: 'text',
                    text: { default: 'Custom provider' },
                    style: { width: 'auto', height: 'auto', color: DEFAULT_THEMED_FOREGROUND },
                  },
                ],
              },
            ],
          },
          cta('lyr_srg_oa_skip', 'Skip auth'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_email',
    name: 'SRG · email_password_auth',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_ep_b', [
          ...qaBrief('lyr_srg_ep', {
            title: 'Layers · email_password_auth (+ field + submit)',
            test: 'Email + password fields and Sign in submit. Nested kinds must not escape parent.',
            expected:
              'email_password_field slots render email then password. Submit uses Rheo primary chrome with white label. Host auth provider receives credentials on submit. Continue below skips for visual QA.',
          }),
          {
            id: 'lyr_srg_ep',
            kind: 'email_password_auth',
            mode: 'sign_in',
            fieldKey: 'srg_credentials',
            gap: 8,
            style: { width: 'full', height: 'fill' },
            children: [
              {
                id: 'lyr_srg_ep_e',
                kind: 'email_password_field',
                slot: 'email',
                placeholder: { default: 'Email' },
              },
              {
                id: 'lyr_srg_ep_p',
                kind: 'email_password_field',
                slot: 'password',
                placeholder: { default: 'Password' },
              },
              {
                id: 'lyr_srg_ep_s',
                kind: 'email_password_submit',
                buttonVariant: 'primary',
                direction: 'horizontal',
                align: 'center',
                distribution: 'center',
                style: { width: 'full', height: 'auto' },
                children: [
                  {
                    id: 'lyr_srg_ep_s_t',
                    kind: 'text',
                    text: { default: 'Sign in' },
                    style: { width: 'auto', height: 'auto', color: PRIMARY_FILLED_LABEL },
                  },
                ],
              },
            ],
          },
          cta('lyr_srg_ep_go', 'Skip auth'),
        ]),
      ),
    },
  },
  {
    id: 'scr_srg_conditional',
    name: 'SRG · conditional',
    regions: {
      body: asBody(
        bodyStack('lyr_srg_cond_b', [
          ...qaBrief('lyr_srg_cond', {
            title: 'Layer · conditional',
            test: 'Winning branch only: iOS platform shows "On iOS"; else shows "Everyone else".',
            expected:
              'Exactly one branch child is visible. No wrapper chrome around the conditional. Non-winning branch is not mounted (no invisible layout gap).',
          }),
          {
            id: 'lyr_srg_cond',
            kind: 'conditional',
            cases: [
              {
                id: 'case_ios',
                name: 'iOS',
                expression: {
                  kind: 'predicate',
                  variable: { kind: 'builtin', name: 'platform' },
                  predicate: { type: 'string', pred: { op: 'eq', value: 'ios' } },
                },
                rootLayerId: 'lyr_srg_cond_ios',
              },
            ],
            elseRootLayerId: 'lyr_srg_cond_else',
            children: [
              {
                id: 'lyr_srg_cond_ios',
                kind: 'stack',
                direction: 'vertical',
                gap: 8,
                style: {
                  width: 'full',
                  height: 'auto',
                  padding: { t: 12, r: 12, b: 12, l: 12 },
                  radius: 10,
                  background: { light: '#e0f2fe', dark: '#0c4a6e' },
                },
                children: [tx('lyr_srg_cond_ios_t', 'On iOS', { fontWeight: 700 })],
              },
              {
                id: 'lyr_srg_cond_else',
                kind: 'stack',
                direction: 'vertical',
                gap: 8,
                style: {
                  width: 'full',
                  height: 'auto',
                  padding: { t: 12, r: 12, b: 12, l: 12 },
                  radius: 10,
                  background: { light: '#fef3c7', dark: '#78350f' },
                },
                children: [tx('lyr_srg_cond_else_t', 'Everyone else', { fontWeight: 700 })],
              },
            ],
          },
          cta('lyr_srg_cond_go'),
        ]),
      ),
    },
  }
];
