import { describe, expect, it } from 'vitest';
import { validFlow } from '@rheo/contracts-fixtures/validFlow';
import type {
  ConditionalLayer,
  DecisionExpr,
  Layer,
  SingleChoiceLayer,
  StackLayer,
} from '@getrheo/contracts/layers';
import type { Screen } from '@getrheo/contracts/screens';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import {
  pruneVacatedConditionalResponses,
  resolveConditionalBranch,
  resolveConditionalCaseId,
  resolveScreenConditionals,
  screenHasConditional,
  vacatedConditionalFieldKeys,
} from './conditionalBranch';
import type { DecisionEvalCtx } from './decisionEval';
import { initFlowState, startFlow, submitResponse } from './stateMachine';

const ctx = (over: Partial<DecisionEvalCtx> = {}): DecisionEvalCtx => ({
  locale: 'en',
  platform: 'ios',
  sdkAttributes: {},
  responses: {},
  ...over,
});

const platformIs = (value: string): DecisionExpr => ({
  kind: 'predicate',
  variable: { kind: 'builtin', name: 'platform' },
  predicate: { type: 'string', pred: { op: 'eq', value } },
});

const localeIs = (value: string): DecisionExpr => ({
  kind: 'predicate',
  variable: { kind: 'builtin', name: 'locale' },
  predicate: { type: 'string', pred: { op: 'eq', value } },
});

const stack = (id: string, children: Layer[] = []): StackLayer => ({
  id,
  kind: 'stack',
  direction: 'vertical',
  gap: 8,
  children,
});

const textInput = (id: string, fieldKey: string): Layer => ({
  id,
  kind: 'text_input',
  fieldKey,
  classification: 'safe',
});

const conditional = (
  id: string,
  cases: ConditionalLayer['cases'],
  children: StackLayer[],
  elseRootLayerId: string,
): ConditionalLayer => ({ id, kind: 'conditional', cases, elseRootLayerId, children });

const screenWith = (body: StackLayer): Screen => ({
  id: 'scr_test',
  name: 'Test',
  regions: { body },
  next: { default: 'scr_next' },
});

describe('resolveConditionalBranch', () => {
  const layer = conditional(
    'lyr_cond',
    [
      { id: 'case_ios', expression: platformIs('ios'), rootLayerId: 'lyr_ios' },
      { id: 'case_en', expression: localeIs('en'), rootLayerId: 'lyr_en' },
    ],
    [stack('lyr_ios'), stack('lyr_en'), stack('lyr_else')],
    'lyr_else',
  );

  it('renders the first matching case even when a later case also matches', () => {
    expect(resolveConditionalBranch(layer, ctx()).id).toBe('lyr_ios');
    expect(resolveConditionalCaseId(layer, ctx())).toBe('case_ios');
  });

  it('renders a later case when earlier ones do not match', () => {
    const c = ctx({ platform: 'android' });
    expect(resolveConditionalBranch(layer, c).id).toBe('lyr_en');
    expect(resolveConditionalCaseId(layer, c)).toBe('case_en');
  });

  it('falls back to the else stack when no case matches', () => {
    const c = ctx({ platform: 'android', locale: 'fr' });
    expect(resolveConditionalBranch(layer, c).id).toBe('lyr_else');
    expect(resolveConditionalCaseId(layer, c)).toBe('else');
  });
});

describe('resolveScreenConditionals', () => {
  it('leaves screens without conditionals untouched', () => {
    const screen = screenWith(stack('lyr_body', [textInput('lyr_input', 'first_name')]));
    expect(screenHasConditional(screen)).toBe(false);
    expect(resolveScreenConditionals(screen, ctx())).toBe(screen);
  });

  it('replaces the conditional with the active branch children', () => {
    const screen = screenWith(
      stack('lyr_body', [
        conditional(
          'lyr_cond',
          [{ id: 'case_ios', expression: platformIs('ios'), rootLayerId: 'lyr_ios' }],
          [stack('lyr_ios', [textInput('lyr_ios_input', 'ios_name')]), stack('lyr_else')],
          'lyr_else',
        ),
      ]),
    );

    const resolved = resolveScreenConditionals(screen, ctx());
    expect(resolved.regions.body.children.map((c) => c.id)).toEqual(['lyr_ios']);

    const android = resolveScreenConditionals(screen, ctx({ platform: 'android' }));
    expect(android.regions.body.children.map((c) => c.id)).toEqual(['lyr_else']);
  });

  it('resolves nested conditionals down to the active leaf', () => {
    const inner = conditional(
      'lyr_inner',
      [{ id: 'case_en', expression: localeIs('en'), rootLayerId: 'lyr_inner_en' }],
      [stack('lyr_inner_en', [textInput('lyr_en_input', 'en_name')]), stack('lyr_inner_else')],
      'lyr_inner_else',
    );
    const screen = screenWith(
      stack('lyr_body', [
        conditional(
          'lyr_outer',
          [{ id: 'case_ios', expression: platformIs('ios'), rootLayerId: 'lyr_outer_ios' }],
          [stack('lyr_outer_ios', [inner]), stack('lyr_outer_else')],
          'lyr_outer_else',
        ),
      ]),
    );

    const resolved = resolveScreenConditionals(screen, ctx());
    const branch = resolved.regions.body.children[0] as StackLayer;
    expect(branch.id).toBe('lyr_outer_ios');
    const leaf = branch.children[0] as StackLayer;
    expect(leaf.id).toBe('lyr_inner_en');
    expect(leaf.children.map((c) => c.id)).toEqual(['lyr_en_input']);
  });
});

describe('vacated branch responses', () => {
  const screen = screenWith(
    stack('lyr_body', [
      conditional(
        'lyr_cond',
        [{ id: 'case_ios', expression: platformIs('ios'), rootLayerId: 'lyr_ios' }],
        [
          stack('lyr_ios', [textInput('lyr_ios_input', 'ios_name')]),
          stack('lyr_else', [textInput('lyr_else_input', 'other_name')]),
        ],
        'lyr_else',
      ),
    ]),
  );

  it('lists field keys that only exist under inactive branches', () => {
    expect(vacatedConditionalFieldKeys(screen, ctx())).toEqual(['other_name']);
    expect(vacatedConditionalFieldKeys(screen, ctx({ platform: 'android' }))).toEqual(['ios_name']);
  });

  it('drops answers captured under a branch that is no longer active', () => {
    const responses = { ios_name: 'Ada', upstream: 'keep' };
    const pruned = pruneVacatedConditionalResponses(
      screen,
      ctx({ platform: 'android' }),
      responses,
    );
    expect(pruned).toEqual({ upstream: 'keep' });
  });

  it('returns the same responses object when nothing was vacated', () => {
    const responses = { ios_name: 'Ada' };
    expect(pruneVacatedConditionalResponses(screen, ctx(), responses)).toBe(responses);
  });
});

describe('state machine with a conditional screen', () => {
  /** Moves `scr_goal`'s choice input into the matching branch of a conditional. */
  const flowWithBranchedInput = (): FlowManifest => {
    const manifest = validFlow();
    const goal = manifest.screens.find((s) => s.id === 'scr_goal') as Screen;
    const input = goal.regions.body.children.find(
      (c) => c.kind === 'single_choice',
    ) as SingleChoiceLayer;
    goal.regions.body.children = [
      conditional(
        'lyr_goal_cond',
        [{ id: 'case_ios', expression: platformIs('ios'), rootLayerId: 'lyr_goal_ios' }],
        [stack('lyr_goal_ios', [input]), stack('lyr_goal_else')],
        'lyr_goal_else',
      ),
    ];
    return manifest;
  };

  it('finds the input inside the active branch and branches on its answer', () => {
    let state = initFlowState(flowWithBranchedInput(), { locale: 'en', platform: 'ios' });
    state = startFlow(state, '2026-01-01T00:00:00.000Z');
    state = submitResponse(state, { kind: 'cta', action: 'primary' });
    expect(state.currentScreenId).toBe('scr_goal');

    state = submitResponse(state, { kind: 'choice', choiceId: 'mindfulness' });
    expect(state.responses.goal).toEqual({ kind: 'choice', choiceId: 'mindfulness' });
    expect(state.currentScreenId).toBe('scr_name');
  });
});
