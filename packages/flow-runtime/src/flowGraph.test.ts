import { describe, expect, it } from 'vitest';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import { MANIFEST_SCHEMA_VERSION } from '@getrheo/contracts/manifest';
import {
  collectDecisionWarnings,
  collectInterpolationWarnings,
  computeDominators,
  upstreamFieldKeysForPicker,
  upstreamScreenIdsForPicker,
} from './flowGraph';

const base = {
  flowId: '00000000-0000-0000-0000-0000000000aa',
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  version: 1,
  defaultLocale: 'en',
  locales: ['en'] as string[],
};

const linearManifest = {
  ...base,
  entryScreenId: 'scr_a',
  screens: [
    {
      id: 'scr_a',
      name: 'A',
      regions: {
        body: {
          id: 'lyr_s',
          kind: 'stack' as const,
          direction: 'vertical' as const,
          children: [
            {
              id: 'lyr_t',
              kind: 'text_input' as const,
              fieldKey: 'a_field',
              inputType: 'plain' as const,
              classification: 'safe' as const,
            },
          ],
        },
      },
      next: { default: 'scr_b' },
    },
    {
      id: 'scr_b',
      name: 'B',
      regions: {
        body: {
          id: 'lyr_s2',
          kind: 'stack' as const,
          direction: 'vertical' as const,
          children: [
            {
              id: 'lyr_txt',
              kind: 'text' as const,
              text: { default: 'Hello {{ a_field }}' },
            },
          ],
        },
      },
      next: { default: null },
    },
  ],
} as FlowManifest;

const diamondManifest = {
  ...base,
  flowId: '00000000-0000-0000-0000-0000000000bb',
  entryScreenId: 'scr_entry',
  screens: [
    {
      id: 'scr_entry',
      name: 'Entry',
      regions: {
        body: {
          id: 'lyr_s0',
          kind: 'stack' as const,
          direction: 'vertical' as const,
          children: [
            {
              id: 'lyr_pick',
              kind: 'single_choice' as const,
              fieldKey: 'branch',
              children: [
                {
                  id: 'lyr_pick_left',
                  kind: 'stack' as const,
                  direction: 'horizontal' as const,
                  align: 'center' as const,
                  gap: 8,
                  children: [
                    { id: 'lyr_pick_left_text', kind: 'text' as const, text: { default: 'Left' } },
                  ],
                },
                {
                  id: 'lyr_pick_right',
                  kind: 'stack' as const,
                  direction: 'horizontal' as const,
                  align: 'center' as const,
                  gap: 8,
                  children: [
                    { id: 'lyr_pick_right_text', kind: 'text' as const, text: { default: 'Right' } },
                  ],
                },
              ],
              optionBindings: [
                { optionId: 'left', rootLayerId: 'lyr_pick_left' },
                { optionId: 'right', rootLayerId: 'lyr_pick_right' },
              ],
              branching: {
                enabled: true,
                conditions: [
                  { choiceId: 'left', goTo: 'scr_left' },
                  { choiceId: 'right', goTo: 'scr_right' },
                ],
              },
            },
          ],
        },
      },
      next: { default: null },
    },
    {
      id: 'scr_left',
      name: 'Left',
      regions: {
        body: {
          id: 'lyr_sl',
          kind: 'stack' as const,
          direction: 'vertical' as const,
          children: [
            {
              id: 'lyr_l',
              kind: 'text_input' as const,
              fieldKey: 'only_left',
              inputType: 'plain' as const,
              classification: 'safe' as const,
            },
          ],
        },
      },
      next: { default: 'scr_join' },
    },
    {
      id: 'scr_right',
      name: 'Right',
      regions: {
        body: {
          id: 'lyr_sr',
          kind: 'stack' as const,
          direction: 'vertical' as const,
          children: [
            {
              id: 'lyr_r',
              kind: 'text_input' as const,
              fieldKey: 'only_right',
              inputType: 'plain' as const,
              classification: 'safe' as const,
            },
          ],
        },
      },
      next: { default: 'scr_join' },
    },
    {
      id: 'scr_join',
      name: 'Join',
      regions: {
        body: {
          id: 'lyr_sj',
          kind: 'stack' as const,
          direction: 'vertical' as const,
          children: [
            {
              id: 'lyr_txt',
              kind: 'text' as const,
              text: { default: '{{ only_left }} {{ only_right }}' },
            },
          ],
        },
      },
      next: { default: null },
    },
  ],
} as FlowManifest;

describe('upstreamScreenIdsForPicker', () => {
  it('lists strict predecessors on a linear flow', () => {
    const u = upstreamScreenIdsForPicker(linearManifest, 'scr_b');
    expect(u).toContain('scr_a');
    expect(u).not.toContain('scr_b');
  });

  it('includes both branches before join', () => {
    const u = upstreamScreenIdsForPicker(diamondManifest, 'scr_join');
    expect(new Set(u)).toEqual(new Set(['scr_entry', 'scr_left', 'scr_right']));
  });
});

describe('upstreamFieldKeysForPicker', () => {
  it('returns field keys from upstream screens only', () => {
    expect(upstreamFieldKeysForPicker(linearManifest, 'scr_b')).toEqual(['a_field']);
    expect(upstreamFieldKeysForPicker(linearManifest, 'scr_a')).toEqual([]);
  });
});

describe('computeDominators', () => {
  it('marks join so branch-only keys are not dominators', () => {
    const dom = computeDominators(diamondManifest);
    const d = dom.get('scr_join');
    expect(d?.has('scr_entry')).toBe(true);
    expect(d?.has('scr_left')).toBe(false);
    expect(d?.has('scr_right')).toBe(false);
  });
});

describe('collectInterpolationWarnings', () => {
  it('warns on join when referencing branch-only variables', () => {
    const w = collectInterpolationWarnings(diamondManifest);
    expect(w.some((x) => x.includes('only_left'))).toBe(true);
    expect(w.some((x) => x.includes('only_right'))).toBe(true);
  });

  it('does not warn on linear flow when variable always collected', () => {
    const w = collectInterpolationWarnings(linearManifest);
    expect(w.filter((x) => x.includes('a_field'))).toHaveLength(0);
  });
});

describe('collectDecisionWarnings', () => {
  it('warns when a decision references an unknown fieldKey', () => {
    const m: FlowManifest = {
      ...linearManifest,
      screens: linearManifest.screens.map((s) =>
        s.id === 'scr_a' ? { ...s, next: { default: 'dec_x' } } : s,
      ),
      decisionNodes: [
        {
          id: 'dec_x',
          cases: [
            {
              id: 'dec_x_case_0',
              name: 'Group 1',
              expression: {
                kind: 'predicate',
                variable: { kind: 'field', fieldKey: 'missing_key' },
                predicate: { type: 'string', pred: { op: 'eq', value: 'a' } },
              },
              next: 'scr_b',
            },
          ],
          elseNext: 'scr_b',
        },
      ],
      sdkAttributeKeys: [],
    };
    const w = collectDecisionWarnings(m);
    expect(w.some((x) => x.includes('unknown fieldKey'))).toBe(true);
  });
});
