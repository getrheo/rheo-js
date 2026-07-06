import { describe, expect, it } from 'vitest';
import { DEFAULT_THEMED_FOREGROUND } from '@getrheo/contracts/layers';
import { MANIFEST_SCHEMA_VERSION, type FlowManifest } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';
import { validateManifest } from './validation';
import {
  AI_FLOW_PLACEHOLDER_SCREEN_ID,
  findDefaultPathTailScreen,
  mergeAiGeneratedScreenIntoManifest,
  mergeSlimManifestPreservingBuilderMeta,
  insertScreenAfterAnchorInManifest,
  appendGeneratedScreenToManifest,
  isAiFlowPlaceholderManifest,
  resolveDefaultPathEntryScreenId,
} from './aiFlowGenerationMerge';

const uuid = '22222222-2222-4222-8222-222222222222';

const buildBlankManifest = (id: string): FlowManifest => ({
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  flowId: id,
  version: 1,
  defaultLocale: 'en',
  locales: ['en'],
  screens: [
    {
      id: AI_FLOW_PLACEHOLDER_SCREEN_ID,
      name: 'Blank',
      regions: {
        body: {
          id: 'lyr_blank_body',
          kind: 'stack',
          direction: 'vertical',
          children: [],
        },
      },
      next: { default: null },
    },
  ],
  entryScreenId: AI_FLOW_PLACEHOLDER_SCREEN_ID,
  decisionNodes: [],
  externalSurfaceNodes: [],
  sdkAttributeKeys: [],
  builderMeta: {
    layout: {
      nodes: [{ id: AI_FLOW_PLACEHOLDER_SCREEN_ID, x: 80, y: 120 }],
    },
  },
});

const sampleScreen = (id: string, name: string): Screen => ({
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
  next: { default: null },
});

describe('aiFlowGenerationMerge', () => {
  it('detects placeholder manifest', () => {
    const m = buildBlankManifest(uuid);
    expect(isAiFlowPlaceholderManifest(m)).toBe(true);
  });

  it('replaces placeholder with first AI screen', () => {
    const m = buildBlankManifest(uuid);
    const merged = mergeAiGeneratedScreenIntoManifest(m, sampleScreen('scr_intro', 'Intro'));
    expect(merged.entryScreenId).toBe('scr_intro');
    expect(merged.screens).toHaveLength(1);
    expect(merged.screens[0]?.id).toBe('scr_intro');
    const v = validateManifest(merged);
    expect(v.ok).toBe(true);
  });

  it('appends along default path', () => {
    let m = buildBlankManifest(uuid);
    m = mergeAiGeneratedScreenIntoManifest(m, sampleScreen('scr_a', 'A'));
    m = mergeAiGeneratedScreenIntoManifest(m, sampleScreen('scr_b', 'B'));
    expect(m.screens).toHaveLength(2);
    expect(m.entryScreenId).toBe('scr_a');
    expect(m.screens.find((s) => s.id === 'scr_a')?.next.default).toBe('scr_b');
    expect(m.screens.find((s) => s.id === 'scr_b')?.next.default).toBe(null);
    const v = validateManifest(m);
    expect(v.ok).toBe(true);
  });

  it('appends canvas-generated screen without rewiring default next', () => {
    let m = buildBlankManifest(uuid);
    m = mergeAiGeneratedScreenIntoManifest(m, sampleScreen('scr_a', 'A'));
    m = mergeAiGeneratedScreenIntoManifest(m, sampleScreen('scr_b', 'B'));
    const extra = sampleScreen('scr_extra', 'Extra');
    m = appendGeneratedScreenToManifest(m, extra);
    expect(m.screens).toHaveLength(3);
    expect(m.screens.find((s) => s.id === 'scr_a')?.next.default).toBe('scr_b');
    expect(m.screens.find((s) => s.id === 'scr_b')?.next.default).toBe(null);
    expect(m.screens.find((s) => s.id === 'scr_extra')?.next.default).toBe(null);
    const v = validateManifest(m);
    expect(v.ok).toBe(true);
  });

  it('inserts after anchor and forwards previous next', () => {
    let m = buildBlankManifest(uuid);
    m = mergeAiGeneratedScreenIntoManifest(m, sampleScreen('scr_a', 'A'));
    m = mergeAiGeneratedScreenIntoManifest(m, sampleScreen('scr_b', 'B'));
    const between = sampleScreen('scr_between', 'Between');
    m = insertScreenAfterAnchorInManifest(m, 'scr_a', between);
    expect(m.screens).toHaveLength(3);
    expect(m.screens.find((s) => s.id === 'scr_a')?.next.default).toBe('scr_between');
    expect(m.screens.find((s) => s.id === 'scr_between')?.next.default).toBe('scr_b');
    expect(m.screens.find((s) => s.id === 'scr_b')?.next.default).toBe(null);
    const v = validateManifest(m);
    expect(v.ok).toBe(true);
  });

  it('preserves builderMeta when merging slim manifest', () => {
    const draft = buildBlankManifest(uuid);
    const slim = {
      ...draft,
      builderMeta: undefined,
      screens: [sampleScreen('scr_intro', 'Intro')],
      entryScreenId: 'scr_intro',
    };
    const merged = mergeSlimManifestPreservingBuilderMeta(draft, slim);
    expect(merged.builderMeta?.layout?.nodes?.[0]?.id).toBe('scr_intro');
    expect(merged.screens[0]?.id).toBe('scr_intro');
    expect(validateManifest(merged).ok).toBe(true);
  });

  it('preserves placeholder id constant', () => {
    expect(AI_FLOW_PLACEHOLDER_SCREEN_ID).toBe('scr_blank');
  });

  it('resolves default-path entry when entryScreenId is stale', () => {
    const m = buildBlankManifest(uuid);
    const withWelcome = mergeAiGeneratedScreenIntoManifest(m, sampleScreen('scr_welcome', 'Welcome'));
    const staleEntry: FlowManifest = {
      ...withWelcome,
      entryScreenId: AI_FLOW_PLACEHOLDER_SCREEN_ID,
    };
    expect(resolveDefaultPathEntryScreenId(staleEntry)).toBe('scr_welcome');
    expect(findDefaultPathTailScreen(staleEntry)?.id).toBe('scr_welcome');
  });

  it('merges when entryScreenId still points at removed scr_blank', () => {
    const m = buildBlankManifest(uuid);
    const withWelcome = mergeAiGeneratedScreenIntoManifest(m, sampleScreen('scr_welcome', 'Welcome'));
    const staleEntry: FlowManifest = {
      ...withWelcome,
      entryScreenId: AI_FLOW_PLACEHOLDER_SCREEN_ID,
    };
    const merged = mergeAiGeneratedScreenIntoManifest(staleEntry, sampleScreen('scr_next', 'Next'));
    expect(merged.screens).toHaveLength(2);
    expect(merged.entryScreenId).toBe('scr_welcome');
    expect(merged.screens.find((screen) => screen.id === 'scr_welcome')?.next.default).toBe('scr_next');
    expect(validateManifest(merged).ok).toBe(true);
  });

  it('drops orphaned empty scr_blank before appending generated screens', () => {
    const m = buildBlankManifest(uuid);
    const withExtra = appendGeneratedScreenToManifest(m, sampleScreen('scr_welcome', 'Welcome'));
    expect(withExtra.screens).toHaveLength(2);
    const merged = mergeAiGeneratedScreenIntoManifest(withExtra, sampleScreen('scr_next', 'Next'));
    expect(merged.screens.map((screen) => screen.id)).toEqual(['scr_welcome', 'scr_next']);
    expect(merged.screens.find((screen) => screen.id === 'scr_welcome')?.next.default).toBe('scr_next');
    expect(validateManifest(merged).ok).toBe(true);
  });

  it('seeds first screen when manifest has no screens', () => {
    const empty: FlowManifest = {
      ...buildBlankManifest(uuid),
      screens: [],
      entryScreenId: AI_FLOW_PLACEHOLDER_SCREEN_ID,
    };
    const merged = mergeAiGeneratedScreenIntoManifest(empty, sampleScreen('scr_intro', 'Intro'));
    expect(merged.screens).toHaveLength(1);
    expect(merged.entryScreenId).toBe('scr_intro');
    expect(validateManifest(merged).ok).toBe(true);
  });

  it('appends when default-path tail points at a missing screen id', () => {
    const welcome = sampleScreen('scr_welcome', 'Welcome');
    const broken: FlowManifest = {
      ...buildBlankManifest(uuid),
      screens: [{ ...welcome, next: { default: 'scr_missing' } }],
      entryScreenId: 'scr_welcome',
    };
    const merged = mergeAiGeneratedScreenIntoManifest(broken, sampleScreen('scr_next', 'Next'));
    expect(merged.screens).toHaveLength(2);
    expect(merged.screens.find((screen) => screen.id === 'scr_welcome')?.next.default).toBe('scr_next');
    expect(validateManifest(merged).ok).toBe(true);
  });
});
