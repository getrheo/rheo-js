import { describe, expect, it } from 'vitest';
import { DEFAULT_THEMED_FOREGROUND } from '@getrheo/contracts/layers';
import { MANIFEST_SCHEMA_VERSION, type FlowManifest } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';
import { validateManifest } from './validation';
import {
  addLayerToAgentManifest,
  removeLayerFromAgentManifest,
  updateLayerInAgentManifest,
} from './rheoAgentLayerMerge';

const sampleScreen = (): Screen => ({
  id: 'scr_a',
  name: 'Welcome',
  regions: {
    body: {
      id: 'lyr_body',
      kind: 'stack',
      direction: 'vertical',
      gap: 12,
      children: [
        {
          id: 'lyr_title',
          kind: 'text',
          text: { default: 'Hello' },
          style: { color: DEFAULT_THEMED_FOREGROUND },
        },
      ],
    },
  },
  next: { default: null },
});

const baseManifest = (): FlowManifest => ({
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  flowId: '22222222-2222-4222-8222-222222222222',
  version: 1,
  defaultLocale: 'en',
  locales: ['en'],
  entryScreenId: 'scr_a',
  screens: [sampleScreen()],
  decisionNodes: [],
  externalSurfaceNodes: [],
  sdkAttributeKeys: [],
});

describe('rheoAgentLayerMerge', () => {
  it('updates a layer by id', () => {
    const draft = baseManifest();
    const merged = updateLayerInAgentManifest(draft, 'scr_a', 'lyr_title', {
      id: 'lyr_title',
      kind: 'text',
      text: { default: 'Get started' },
      style: { color: DEFAULT_THEMED_FOREGROUND },
    });
    expect(merged).not.toBeNull();
    const body = merged!.screens[0]!.regions.body;
    expect(body.kind).toBe('stack');
    const title = body.children[0];
    expect(title?.kind).toBe('text');
    if (title?.kind === 'text') {
      expect(title.text.default).toBe('Get started');
    }
    expect(validateManifest(merged!).ok).toBe(true);
  });

  it('adds a layer under a parent stack', () => {
    const draft = baseManifest();
    const merged = addLayerToAgentManifest(draft, 'scr_a', 'lyr_body', {
      id: 'lyr_sub',
      kind: 'text',
      text: { default: 'Subtitle' },
      style: { color: DEFAULT_THEMED_FOREGROUND },
    });
    expect(merged).not.toBeNull();
    expect(merged!.screens[0]!.regions.body.children).toHaveLength(2);
    expect(validateManifest(merged!).ok).toBe(true);
  });

  it('removes a layer by id', () => {
    const draft = baseManifest();
    const merged = removeLayerFromAgentManifest(draft, 'scr_a', 'lyr_title');
    expect(merged).not.toBeNull();
    expect(merged!.screens[0]!.regions.body.children).toHaveLength(0);
    expect(validateManifest(merged!).ok).toBe(true);
  });
});
