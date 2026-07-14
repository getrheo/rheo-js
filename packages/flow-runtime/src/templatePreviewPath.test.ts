import { describe, expect, it } from 'vitest';
import { validFlow } from '@rheo/contracts-fixtures/validFlow';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';
import type { SingleChoiceLayer } from '@getrheo/contracts/layers';

import { buildTemplatePreviewPath } from './templatePreviewPath';

const flowWithDecisionRoute = (): FlowManifest => {
  const base = validFlow();
  return {
    ...base,
    screens: base.screens.map((s) =>
      s.id === 'scr_welcome' ? { ...s, next: { default: 'dec_route' } } : s,
    ),
    decisionNodes: [
      {
        id: 'dec_route',
        name: 'Route',
        cases: [
          {
            id: 'dec_route_case_0',
            name: 'Group 1',
            expression: {
              kind: 'predicate',
              variable: { kind: 'builtin', name: 'locale' },
              predicate: { type: 'string', pred: { op: 'eq', value: 'en' } },
            },
            next: 'scr_goal',
          },
        ],
        elseNext: 'scr_done',
      },
    ],
  };
};

const branchingChoiceFlow = (): FlowManifest => {
  const choiceScreen: Screen = {
    id: 'scr_branch',
    name: 'Branch',
    regions: {
      body: {
        id: 'lyr_branch_body',
        kind: 'stack',
        direction: 'vertical',
        gap: 8,
        children: [
          {
            id: 'lyr_branch_choice',
            kind: 'single_choice',
            fieldKey: 'path',
            optionBindings: [
              { optionId: 'left', rootLayerId: 'lyr_left' },
              { optionId: 'right', rootLayerId: 'lyr_right' },
            ],
            children: [
              {
                id: 'lyr_left',
                kind: 'stack',
                direction: 'horizontal',
                gap: 8,
                children: [
                  { id: 'lyr_left_txt', kind: 'text', text: { default: 'Left' } },
                ],
              },
              {
                id: 'lyr_right',
                kind: 'stack',
                direction: 'horizontal',
                gap: 8,
                children: [
                  { id: 'lyr_right_txt', kind: 'text', text: { default: 'Right' } },
                ],
              },
            ],
            branching: {
              enabled: true,
              conditions: [
                { choiceId: 'left', goTo: 'scr_left' },
                { choiceId: 'right', goTo: 'scr_right' },
              ],
            },
          } satisfies SingleChoiceLayer,
        ],
      },
    },
    next: { default: 'scr_left' },
  };

  const mkLeaf = (id: string, name: string): Screen => ({
    id,
    name,
    regions: {
      body: {
        id: `${id}_body`,
        kind: 'stack',
        direction: 'vertical',
        gap: 8,
        children: [{ id: `${id}_txt`, kind: 'text', text: { default: name } }],
      },
    },
    next: { default: 'scr_end' },
  });

  const end: Screen = {
    id: 'scr_end',
    name: 'End',
    regions: {
      body: {
        id: 'scr_end_body',
        kind: 'stack',
        direction: 'vertical',
        gap: 8,
        children: [{ id: 'scr_end_txt', kind: 'text', text: { default: 'Done' } }],
      },
    },
    next: { default: null },
  };

  return {
    ...validFlow(),
    entryScreenId: 'scr_branch',
    screens: [choiceScreen, mkLeaf('scr_left', 'Left path'), mkLeaf('scr_right', 'Right path'), end],
    decisionNodes: [],
    externalSurfaceNodes: [],
  };
};

describe('buildTemplatePreviewPath', () => {
  it('follows the first choice branch instead of listing every screen', () => {
    const path = buildTemplatePreviewPath(branchingChoiceFlow());
    const ids = path.steps.map((s) => s.screen.id);
    expect(ids).toContain('scr_left');
    expect(ids).not.toContain('scr_right');
  });

  it('evaluates decision nodes using stub responses from earlier screens', () => {
    const path = buildTemplatePreviewPath(flowWithDecisionRoute(), { locale: 'en' });
    const ids = path.steps.map((s) => s.screen.id);
    expect(ids[0]).toBe('scr_welcome');
    expect(ids[1]).toBe('scr_goal');
    expect(ids).not.toEqual(['scr_welcome', 'scr_done']);
  });

  it('prefills upstream field responses before screens that interpolate them', () => {
    const path = buildTemplatePreviewPath(validFlow());
    const nameStep = path.steps.find((s) => s.screen.id === 'scr_name');
    expect(nameStep).toBeDefined();
    expect(nameStep?.interpolationResponses.goal).toEqual({
      kind: 'choice',
      choiceId: expect.any(String),
    });
  });
});
