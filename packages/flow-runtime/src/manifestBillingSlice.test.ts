import { describe, expect, it } from 'vitest';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import {
  collapseManifestToDefaultLocaleOnly,
  manifestHasScreenAnimations,
  manifestUsesExternalIntegrations,
  manifestUsesTranslationsBeyondDefault,
  stripManifestAnimations,
  stripManifestMotion,
} from './manifestBillingSlice';

const minimalManifest = (): FlowManifest =>
  ({
    flowId: '550e8400-e29b-41d4-a716-446655440002',
    version: 1,
    schemaVersion: 7,
    defaultLocale: 'en',
    locales: ['en', 'fr'],
    entryScreenId: 's1',
    screens: [
      {
        id: 's1',
        name: 'Welcome',
        next: { default: null },
        regions: {
          body: { id: 'root', kind: 'stack', children: [] },
        },
        animations: [{ id: 'a1', layerId: 'x', clips: [] }],
      },
    ],
    decisionNodes: [],
    externalSurfaceNodes: [],
    sdkAttributeKeys: [],
    builderMeta: {},
  }) as unknown as FlowManifest;

describe('manifestBillingSlice', () => {
  it('stripManifestMotion removes animations, stagger, and resting motion', () => {
    const m: FlowManifest = {
      ...minimalManifest(),
      screens: [
        {
          id: 's1',
          name: 'Welcome',
          next: { default: null },
          stagger: { stepMs: 80 },
          regions: {
            body: {
              id: 'root',
              kind: 'stack',
              restingMotion: { preset: 'pulse', loop: true },
              children: [],
            },
          },
          animations: [
            {
              id: 'a1',
              targetLayerId: 'root',
              trigger: 'mount',
              durationMs: 320,
              tracks: [
                {
                  property: 'opacity',
                  keyframes: [
                    { t: 0, value: 0 },
                    { t: 1, value: 1 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as unknown as FlowManifest;
    const stripped = stripManifestMotion(m);
    expect(stripped.screens[0]).not.toHaveProperty('animations');
    expect(stripped.screens[0]).not.toHaveProperty('stagger');
    const body = stripped.screens[0]?.regions.body as { restingMotion?: unknown };
    expect(body.restingMotion).toBeUndefined();
  });

  it('stripManifestAnimations removes animations arrays from screens', () => {
    const m = minimalManifest();
    const stripped = stripManifestAnimations(m);
    expect(manifestHasScreenAnimations(m)).toBe(true);
    expect(manifestHasScreenAnimations(stripped)).toBe(false);
    expect(stripped.screens[0]).not.toHaveProperty('animations');
  });

  it('manifestUsesTranslationsBeyondDefault detects multi-locale', () => {
    const m = minimalManifest();
    expect(manifestUsesTranslationsBeyondDefault(m)).toBe(true);
    const single = { ...minimalManifest(), locales: ['en'] };
    expect(manifestUsesTranslationsBeyondDefault(single as FlowManifest)).toBe(false);
  });

  it('manifestUsesExternalIntegrations detects concrete providers', () => {
    const m = minimalManifest();
    expect(manifestUsesExternalIntegrations(m)).toBe(false);
    const withRc: FlowManifest = {
      ...m,
      externalSurfaceNodes: [
        {
          id: 'surf_rc',
          name: 'Paywall',
          config: { provider: 'revenuecat', offeringId: 'default' },
          next: { default: null },
        },
      ],
    } as unknown as FlowManifest;
    expect(manifestUsesExternalIntegrations(withRc)).toBe(true);
    const unspecified: FlowManifest = {
      ...m,
      externalSurfaceNodes: [
        {
          id: 'surf_u',
          name: 'TBD',
          config: { provider: 'unspecified' },
          next: { default: null },
        },
      ],
    } as unknown as FlowManifest;
    expect(manifestUsesExternalIntegrations(unspecified)).toBe(false);
  });

  it('collapseManifestToDefaultLocaleOnly trims locales and drops translation maps', () => {
    const m: FlowManifest = {
      ...minimalManifest(),
      screens: [
        {
          id: 's1',
          name: 'Welcome',
          next: { default: null },
          regions: {
            body: {
              id: 't1',
              kind: 'text',
              text: {
                default: 'Hello',
                translations: { fr: 'Bonjour' },
              },
            },
          },
        },
      ],
    } as unknown as FlowManifest;

    const collapsed = collapseManifestToDefaultLocaleOnly(m);
    expect(collapsed.locales).toEqual(['en']);
    const body = collapsed.screens[0]?.regions.body as {
      text?: { default?: string; translations?: unknown };
    };
    expect(body?.text?.default).toBe('Hello');
    expect(body?.text?.translations).toBeUndefined();
  });
});
