import { DEFAULT_THEMED_FOREGROUND, PRIMARY_FILLED_LABEL } from '@getrheo/contracts/layers';
import { FlowManifestSchema, MANIFEST_SCHEMA_VERSION, type FlowManifest } from '@getrheo/contracts/manifest';

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

const endCta = (id: string, label: string): Record<string, unknown> => ({
  id,
  kind: 'button',
  variant: 'primary',
  action: { kind: 'end_flow' },
  direction: 'horizontal',
  align: 'center',
  distribution: 'center',
  children: [
    {
      id: `${id}_t`,
      kind: 'text',
      text: { default: label },
      style: { color: PRIMARY_FILLED_LABEL },
    },
  ],
});

const choiceOption = (id: string, label: string): Record<string, unknown> =>
  bodyStack(id, [tx(`${id}_t`, label, { fontSize: 16, fontWeight: 600 })]);

/**
 * Seed harness for RevenueCat + Superwall Integration Nodes.
 * One picker screen branches via `single_choice` to each provider surface.
 */
export const buildPaywallIntegrationsHarnessManifest = (flowId: string): FlowManifest =>
  FlowManifestSchema.parse({
    flowId,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    version: 1,
    defaultLocale: 'en',
    locales: ['en'],
    entryScreenId: 'scr_pi_pick',
    theme: {
      primary: '#18181B',
      primaryForeground: '#FFFFFF',
      background: '#FFFFFF',
      foreground: '#18181B',
      borderRadius: 16,
    },
    builderMeta: {
      layout: {
        nodes: [
          { id: 'scr_pi_pick', kind: 'screen', x: 80, y: 200 },
          { id: 'scr_pi_done', kind: 'screen', x: 760, y: 80 },
          { id: 'scr_pi_skipped', kind: 'screen', x: 760, y: 360 },
        ],
        canvas: { zoom: 0.72, x: 24, y: 20 },
      },
    },
    screens: [
      {
        id: 'scr_pi_pick',
        name: 'Pick paywall integration',
        regions: {
          body: bodyStack('lyr_pi_pick_b', [
            tx('lyr_pi_pick_h', 'Which paywall integration do you want to test?', {
              fontSize: 22,
              fontWeight: 700,
            }),
            tx(
              'lyr_pi_pick_p',
              'Choose RevenueCat or Superwall. The flow opens that Integration Node next.',
              { fontSize: 14 },
            ),
            {
              id: 'lyr_pi_pick_ch',
              kind: 'single_choice',
              fieldKey: 'paywall_integration',
              direction: 'vertical',
              gap: 10,
              children: [
                choiceOption('lyr_pi_opt_rc', 'RevenueCat'),
                choiceOption('lyr_pi_opt_sw', 'Superwall'),
              ],
              optionBindings: [
                { optionId: 'opt_revenuecat', rootLayerId: 'lyr_pi_opt_rc' },
                { optionId: 'opt_superwall', rootLayerId: 'lyr_pi_opt_sw' },
              ],
              branching: {
                enabled: true,
                conditions: [
                  { choiceId: 'opt_revenuecat', goTo: 'surf_pi_rc' },
                  { choiceId: 'opt_superwall', goTo: 'surf_pi_sw' },
                ],
              },
            },
          ]),
        },
        next: { default: 'surf_pi_rc' },
      },
      {
        id: 'scr_pi_done',
        name: 'Purchase / restore complete',
        regions: {
          body: bodyStack('lyr_pi_done_b', [
            tx('lyr_pi_done_h', 'Paywall completed', { fontSize: 22, fontWeight: 700 }),
            tx('lyr_pi_done_p', 'Purchase or restore finished successfully.', { fontSize: 14 }),
            endCta('lyr_pi_done_end', 'Finish'),
          ]),
        },
        next: { default: null },
      },
      {
        id: 'scr_pi_skipped',
        name: 'Dismissed or failed',
        regions: {
          body: bodyStack('lyr_pi_skip_b', [
            tx('lyr_pi_skip_h', 'Paywall skipped', { fontSize: 22, fontWeight: 700 }),
            tx(
              'lyr_pi_skip_p',
              'The user dismissed, cancelled, or the surface failed — Fallback path.',
              { fontSize: 14 },
            ),
            endCta('lyr_pi_skip_end', 'Finish'),
          ]),
        },
        next: { default: null },
      },
    ],
    decisionNodes: [],
    externalSurfaceNodes: [
      {
        id: 'surf_pi_rc',
        name: 'RevenueCat paywall',
        config: {
          provider: 'revenuecat',
          offeringId: 'default',
          presentation: 'paywall',
        },
        outcomes: {
          purchase_completed: 'scr_pi_done',
          restore_completed: 'scr_pi_done',
          purchase_cancelled: 'scr_pi_skipped',
          dismissed: 'scr_pi_skipped',
          failed: 'scr_pi_skipped',
        },
        fallback: 'scr_pi_skipped',
      },
      {
        id: 'surf_pi_sw',
        name: 'Superwall paywall',
        config: {
          provider: 'superwall',
          placementId: 'campaign_trigger',
        },
        outcomes: {
          purchase_completed: 'scr_pi_done',
          restore_completed: 'scr_pi_done',
          purchase_cancelled: 'scr_pi_skipped',
          dismissed: 'scr_pi_skipped',
          failed: 'scr_pi_skipped',
        },
        fallback: 'scr_pi_skipped',
      },
    ],
    sdkAttributeKeys: [],
  });
