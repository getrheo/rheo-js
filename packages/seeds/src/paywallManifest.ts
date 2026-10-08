import { DEFAULT_THEMED_FOREGROUND, PRIMARY_FILLED_LABEL } from '@getrheo/contracts/layers';
import { FlowManifestSchema, MANIFEST_SCHEMA_VERSION, type FlowManifest } from '@getrheo/contracts/manifest';

/** RevenueCat paywall flow for analytics / IAP purchase stress fixtures. */
export const buildPaywallManifest = (flowId: string): FlowManifest =>
  FlowManifestSchema.parse({
    flowId,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    version: 1,
    defaultLocale: 'en',
    locales: ['en'],
    entryScreenId: 'scr_pw_intro',
    screens: [
      {
        id: 'scr_pw_intro',
        name: 'Intro',
        regions: {
          body: {
            id: 'lyr_pw_intro_body',
            kind: 'stack',
            direction: 'vertical',
            gap: 12,
            style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
            children: [
              {
                id: 'lyr_pw_intro_title',
                kind: 'text',
                text: { default: 'Unlock premium' },
                style: { fontSize: 24, fontWeight: 700, color: DEFAULT_THEMED_FOREGROUND },
              },
              {
                id: 'lyr_pw_intro_cta',
                kind: 'button',
                variant: 'primary',
                action: { kind: 'continue' },
                direction: 'horizontal',
                align: 'center',
                distribution: 'center',
                children: [
                  {
                    id: 'lyr_pw_intro_cta_text',
                    kind: 'text',
                    text: { default: 'See plans' },
                    style: { color: PRIMARY_FILLED_LABEL },
                  },
                ],
              },
            ],
          },
        },
        next: { default: 'surf_paywall' },
      },
      {
        id: 'scr_pw_premium',
        name: 'Premium success',
        regions: {
          body: {
            id: 'lyr_pw_premium_body',
            kind: 'stack',
            direction: 'vertical',
            gap: 12,
            style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
            children: [
              {
                id: 'lyr_pw_premium_title',
                kind: 'text',
                text: { default: 'Premium is ready' },
                style: { fontSize: 22, fontWeight: 700, color: DEFAULT_THEMED_FOREGROUND },
              },
              {
                id: 'lyr_pw_premium_end',
                kind: 'button',
                variant: 'primary',
                action: { kind: 'end_flow' },
                direction: 'horizontal',
                align: 'center',
                distribution: 'center',
                children: [
                  {
                    id: 'lyr_pw_premium_end_text',
                    kind: 'text',
                    text: { default: 'Finish' },
                    style: { color: PRIMARY_FILLED_LABEL },
                  },
                ],
              },
            ],
          },
        },
        next: { default: null },
      },
      {
        id: 'scr_pw_free',
        name: 'Continue free',
        regions: {
          body: {
            id: 'lyr_pw_free_body',
            kind: 'stack',
            direction: 'vertical',
            gap: 12,
            style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
            children: [
              {
                id: 'lyr_pw_free_title',
                kind: 'text',
                text: { default: 'Continue with free' },
                style: { fontSize: 22, fontWeight: 700, color: DEFAULT_THEMED_FOREGROUND },
              },
              {
                id: 'lyr_pw_free_end',
                kind: 'button',
                variant: 'secondary',
                action: { kind: 'end_flow' },
                direction: 'horizontal',
                align: 'center',
                distribution: 'center',
                children: [
                  {
                    id: 'lyr_pw_free_end_text',
                    kind: 'text',
                    text: { default: 'Finish' },
                    style: { color: PRIMARY_FILLED_LABEL },
                  },
                ],
              },
            ],
          },
        },
        next: { default: null },
      },
    ],
    decisionNodes: [],
    externalSurfaceNodes: [
      {
        id: 'surf_paywall',
        name: 'RevenueCat paywall',
        config: {
          provider: 'revenuecat',
          offeringId: 'default',
          presentation: 'paywall',
        },
        outcomes: {
          purchase_completed: 'scr_pw_premium',
          restore_completed: 'scr_pw_premium',
          dismissed: 'scr_pw_free',
          failed: 'scr_pw_free',
        },
        fallback: 'scr_pw_free',
      },
    ],
    sdkAttributeKeys: [],
  });
