import { describe, expect, it } from 'vitest';
import { DEFAULT_THEMED_FOREGROUND } from '@getrheo/contracts/layers';
import { MANIFEST_SCHEMA_VERSION, type FlowManifest } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';
import { validateManifest } from './validation';
import { mergeRheoAgentPatchIntoDraft } from './rheoAgentManifestMerge';

const uuid = '22222222-2222-4222-8222-222222222222';

const sampleScreen = (id: string, name: string, next: string | null = null): Screen => ({
  id,
  name,
  regions: {
    body: {
      id: `lyr_${id}_body`,
      kind: 'stack',
      direction: 'vertical',
      gap: 12,
      children: [
        {
          id: `lyr_${id}_t`,
          kind: 'text',
          text: { default: `Hello ${name}` },
          style: { color: DEFAULT_THEMED_FOREGROUND },
        },
      ],
    },
  },
  next: { default: next },
});

const baseManifest = (): FlowManifest => ({
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  flowId: uuid,
  version: 1,
  defaultLocale: 'en',
  locales: ['en'],
  entryScreenId: 'scr_a',
  screens: [sampleScreen('scr_a', 'A', 'scr_b'), sampleScreen('scr_b', 'B', null)],
  decisionNodes: [],
  externalSurfaceNodes: [],
  sdkAttributeKeys: [],
  builderMeta: {
    layout: {
      nodes: [
        { id: 'scr_a', x: 80, y: 120 },
        { id: 'scr_b', x: 440, y: 120 },
      ],
    },
  },
});

describe('mergeRheoAgentPatchIntoDraft', () => {
  it('appends a single new blank screen and adds a layout node', () => {
    const draft = baseManifest();
    const merged = mergeRheoAgentPatchIntoDraft(draft, {
      screens: [sampleScreen('scr_new', 'New Screen', null)],
    });
    expect(merged.screens).toHaveLength(3);
    expect(merged.screens.find((s) => s.id === 'scr_new')).toBeDefined();
    expect(merged.builderMeta?.layout?.nodes?.some((n) => n.id === 'scr_new')).toBe(true);
    expect(validateManifest(merged).ok).toBe(true);
  });

  it('replaces one screen by id without touching others', () => {
    const draft = baseManifest();
    const edited = sampleScreen('scr_a', 'A renamed', 'scr_b');
    const merged = mergeRheoAgentPatchIntoDraft(draft, { screens: [edited] });
    expect(merged.screens).toHaveLength(2);
    expect(merged.screens.find((s) => s.id === 'scr_a')?.name).toBe('A renamed');
    expect(merged.screens.find((s) => s.id === 'scr_b')?.name).toBe('B');
    expect(validateManifest(merged).ok).toBe(true);
  });

  it('removes a screen and rewires the predecessor via patch', () => {
    const draft = baseManifest();
    const merged = mergeRheoAgentPatchIntoDraft(draft, {
      removeScreenIds: ['scr_b'],
      screens: [sampleScreen('scr_a', 'A', null)],
    });
    expect(merged.screens).toHaveLength(1);
    expect(merged.screens[0]?.id).toBe('scr_a');
    expect(merged.screens[0]?.next.default).toBe(null);
    expect(validateManifest(merged).ok).toBe(true);
  });

  it('upserts an external surface node by id', () => {
    const draft = baseManifest();
    const merged = mergeRheoAgentPatchIntoDraft(draft, {
      externalSurfaceNodes: [
        {
          id: 'surf_paywall',
          name: 'RevenueCat paywall',
          config: { provider: 'revenuecat', offeringId: 'default', presentation: 'paywall' },
          outcomes: { dismissed: 'scr_b' },
          fallback: 'scr_b',
        },
      ],
    });
    expect(merged.externalSurfaceNodes).toHaveLength(1);
    expect(merged.externalSurfaceNodes?.[0]?.id).toBe('surf_paywall');
  });

  it('preserves builderMeta and never accepts identity field overrides', () => {
    const draft = baseManifest();
    const merged = mergeRheoAgentPatchIntoDraft(draft, {
      screens: [sampleScreen('scr_a', 'A', 'scr_b')],
    });
    expect(merged.flowId).toBe(uuid);
    expect(merged.version).toBe(1);
    expect(merged.locales).toEqual(['en']);
    expect(merged.builderMeta?.layout?.nodes?.find((n) => n.id === 'scr_a')).toMatchObject({
      id: 'scr_a',
      x: 80,
      y: 120,
    });
  });

  it('applies entryScreenId and sdkAttributeKeys only when present', () => {
    const draft = baseManifest();
    const unchanged = mergeRheoAgentPatchIntoDraft(draft, {
      screens: [sampleScreen('scr_a', 'A', 'scr_b')],
    });
    expect(unchanged.entryScreenId).toBe('scr_a');
    expect(unchanged.sdkAttributeKeys).toEqual([]);

    const changed = mergeRheoAgentPatchIntoDraft(draft, {
      entryScreenId: 'scr_b',
      sdkAttributeKeys: ['plan'],
    });
    expect(changed.entryScreenId).toBe('scr_b');
    expect(changed.sdkAttributeKeys).toEqual(['plan']);
  });

  it('repairs entryScreenId when the entry screen is removed', () => {
    const draft = baseManifest();
    const merged = mergeRheoAgentPatchIntoDraft(draft, {
      removeScreenIds: ['scr_a'],
    });
    expect(merged.screens).toHaveLength(1);
    expect(merged.entryScreenId).toBe('scr_b');
  });

  it('merges sdk keys from upserted decision nodes', () => {
    const draft = baseManifest();
    const merged = mergeRheoAgentPatchIntoDraft(draft, {
      decisionNodes: [
        {
          id: 'dec_plan',
          cases: [
            {
              id: 'case_paid',
              expression: {
                kind: 'predicate',
                variable: { kind: 'sdk', key: 'plan' },
                predicate: { type: 'string', pred: { op: 'eq', value: 'pro' } },
              },
              next: 'scr_b',
            },
          ],
          elseNext: 'scr_a',
        },
      ],
    });
    expect(merged.sdkAttributeKeys).toContain('plan');
  });
});
