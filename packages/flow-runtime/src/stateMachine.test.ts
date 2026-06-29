import { describe, expect, it } from 'vitest';
import { validFlow } from '@rheo/contracts-fixtures/validFlow';
import {
  buildCompletionResponses,
  findScreen,
  initFlowState,
  resolveNextScreenId,
  startFlow,
  stepResponseToCompletionValue,
  stripAuthResponsesForTerminalExport,
  submitResponse,
  type DecisionEvaluationTelemetry,
  type StepResponse,
} from './stateMachine';
import type { Screen } from '@getrheo/contracts/screens';
import type { SingleChoiceLayer } from '@getrheo/contracts/layers';
import { OS_PERMISSION_OUTCOME_END, OS_PERMISSION_OUTCOME_CONTINUE } from '@getrheo/contracts/layers';
import { EXTERNAL_SURFACE_NO_NEXT } from '@getrheo/contracts/decisions';
import type { FlowManifest } from '@getrheo/contracts/manifest';

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

describe('flow state machine', () => {
  it('starts at the entry screen and transitions to completion', () => {
    let state = initFlowState(validFlow());
    state = startFlow(state, '2026-01-01T00:00:00.000Z');
    expect(state.currentScreenId).toBe('scr_welcome');

    state = submitResponse(state, { kind: 'cta', action: 'primary' });
    expect(state.currentScreenId).toBe('scr_goal');

    state = submitResponse(state, { kind: 'choice', choiceId: 'fitness' });
    expect(state.currentScreenId).toBe('scr_name');

    state = submitResponse(state, { kind: 'text', value: 'Stefano', classification: 'safe' });
    expect(state.currentScreenId).toBe('scr_done');

    state = submitResponse(state, { kind: 'cta', action: 'primary' });
    expect(state.status).toBe('completed');
    expect(state.currentScreenId).toBeNull();
  });

  it('honours per-choice branch conditions when branching is enabled on the input layer', () => {
    const flow = validFlow();
    const goal = flow.screens.find((s) => s.id === 'scr_goal') as Screen;
    expect(resolveNextScreenId(goal, { kind: 'choice', choiceId: 'mindfulness' })).toBe('scr_name');
    expect(resolveNextScreenId(goal, { kind: 'choice', choiceId: 'fitness' })).toBe('scr_name');
  });

  it('ignores per-choice conditions when branching is disabled', () => {
    const flow = validFlow();
    const goal = flow.screens.find((s) => s.id === 'scr_goal') as Screen;
    const input = goal.regions.body.children.find((c) => c.kind === 'single_choice') as SingleChoiceLayer;
    input.branching.enabled = false;
    goal.next.default = 'scr_done';

    expect(resolveNextScreenId(goal, { kind: 'choice', choiceId: 'fitness' })).toBe('scr_done');
    expect(resolveNextScreenId(goal, { kind: 'choice', choiceId: 'mindfulness' })).toBe('scr_done');
  });

  it('go_to_screen response always wins (button layer action)', () => {
    const flow = validFlow();
    const welcome = flow.screens.find((s) => s.id === 'scr_welcome') as Screen;
    expect(
      resolveNextScreenId(welcome, { kind: 'go_to_screen', screenId: 'scr_done' }),
    ).toBe('scr_done');
  });

  it('produces a completion payload keyed by fieldKey for input responses', () => {
    let state = startFlow(initFlowState(validFlow()));
    state = submitResponse(state, { kind: 'cta', action: 'primary' });
    state = submitResponse(state, { kind: 'choice', choiceId: 'fitness' });
    state = submitResponse(state, { kind: 'text', value: 'Ada', classification: 'sensitive' });
    state = submitResponse(state, { kind: 'cta', action: 'primary' });

    const responses = buildCompletionResponses(state);
    expect(responses).toEqual({
      scr_welcome: 'primary',
      goal: 'fitness',
      first_name: { value: 'Ada', classification: 'sensitive' },
      scr_done: 'primary',
    });
  });

  it('go_back pops history to the previous screen', () => {
    let state = startFlow(initFlowState(validFlow()));
    expect(state.history).toEqual(['scr_welcome']);
    state = submitResponse(state, { kind: 'cta', action: 'primary' });
    expect(state.currentScreenId).toBe('scr_goal');
    expect(state.history).toEqual(['scr_welcome', 'scr_goal']);
    state = submitResponse(state, { kind: 'go_back' });
    expect(state.currentScreenId).toBe('scr_welcome');
    expect(state.history).toEqual(['scr_welcome']);
  });

  it('go_back uses fallback when there is no prior step', () => {
    let state = startFlow(initFlowState(validFlow()));
    state = submitResponse(state, {
      kind: 'go_back',
      fallbackScreenId: 'scr_done',
    });
    expect(state.currentScreenId).toBe('scr_done');
    expect(state.history).toEqual(['scr_done']);
  });

  it('findScreen returns the matching screen', () => {
    const flow = validFlow();
    expect(findScreen(flow, 'scr_goal')?.name).toBe('Goal');
    expect(findScreen(flow, 'scr_missing')).toBeUndefined();
  });

  it('silently evaluates decision nodes after a screen transition', () => {
    const flow = flowWithDecisionRoute();
    const telemetry: DecisionEvaluationTelemetry[] = [];
    let state = startFlow(initFlowState(flow));
    expect(state.currentScreenId).toBe('scr_welcome');
    state = submitResponse(state, { kind: 'cta', action: 'primary' }, {
      onDecisionEvaluated: (p) => telemetry.push(p),
    });
    expect(state.currentScreenId).toBe('scr_goal');
    expect(telemetry).toHaveLength(1);
    expect(telemetry[0]).toMatchObject({
      decisionNodeId: 'dec_route',
      matchedCaseId: 'dec_route_case_0',
    });
    expect(typeof telemetry[0]?.clauseDigest).toBe('string');
  });

  it('routes to elseNext when no case matches', () => {
    const flow = flowWithDecisionRoute();
    let state = startFlow(
      initFlowState(flow, { locale: 'fr', platform: 'web', sdkAttributes: {} }),
    );
    state = submitResponse(state, { kind: 'cta', action: 'primary' });
    expect(state.currentScreenId).toBe('scr_done');
  });

  it('completes flow when the evaluated branch has no target', () => {
    const base = flowWithDecisionRoute();
    const flow: FlowManifest = {
      ...base,
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
              next: null,
            },
          ],
          elseNext: 'scr_done',
        },
      ],
    };
    let state = startFlow(initFlowState(flow));
    state = submitResponse(state, { kind: 'cta', action: 'primary' });
    expect(state.status).toBe('completed');
    expect(state.currentScreenId).toBeNull();
  });

  it('buildCompletionResponses includes numeric scale values', () => {
    let state = startFlow(initFlowState(validFlow()));
    state = submitResponse(state, { kind: 'cta', action: 'primary' });
    state = submitResponse(state, { kind: 'choice', choiceId: 'fitness' });
    state = submitResponse(state, { kind: 'text', value: 'Ada', classification: 'sensitive' });
    state = {
      ...state,
      responses: {
        ...state.responses,
        nps: { kind: 'scale', value: 8 },
      },
    };
    const responses = buildCompletionResponses(state);
    expect(responses.nps).toBe(8);
  });

  it('end_flow completes immediately', () => {
    let state = startFlow(initFlowState(validFlow()));
    state = submitResponse(state, { kind: 'end_flow' });
    expect(state.status).toBe('completed');
    expect(state.currentScreenId).toBeNull();
  });

  it('end_flow with consumedDraft merges input under fieldKey then completes', () => {
    let state = startFlow(initFlowState(validFlow()));
    state = submitResponse(state, { kind: 'cta', action: 'primary' });
    state = submitResponse(state, { kind: 'choice', choiceId: 'fitness' });
    expect(state.currentScreenId).toBe('scr_name');

    state = submitResponse(state, {
      kind: 'end_flow',
      consumedDraft: { kind: 'text', value: 'Drafted', classification: 'safe' },
    });
    expect(state.status).toBe('completed');
    expect(state.currentScreenId).toBeNull();
    expect(state.responses.first_name).toEqual({
      kind: 'text',
      value: 'Drafted',
      classification: 'safe',
    });
    expect(state.responses.scr_name).toEqual({ kind: 'end_flow' });

    const completion = buildCompletionResponses(state);
    expect(completion.first_name).toEqual({ value: 'Drafted', classification: 'safe' });
    expect(completion.scr_name).toBe('end_flow');
  });

  it('skip on manual-submit input records bypass_input, not consumed draft', () => {
    let state = startFlow(initFlowState(validFlow()));
    state = submitResponse(state, { kind: 'cta', action: 'primary' });
    state = submitResponse(state, { kind: 'choice', choiceId: 'fitness' });
    expect(state.currentScreenId).toBe('scr_name');

    state = submitResponse(state, {
      kind: 'skip',
      consumedDraft: { kind: 'text', value: 'Ignored', classification: 'safe' },
    });
    expect(state.status).toBe('running');
    expect(state.currentScreenId).toBe('scr_done');
    expect(state.responses.first_name).toEqual({ kind: 'bypass_input', via: 'skip' });
    expect(state.responses.scr_name).toEqual({ kind: 'skip' });

    const completion = buildCompletionResponses(state);
    expect(completion.first_name).toEqual({ bypassed: true, via: 'skip' });
  });

  it('go_to_screen on manual-submit input records bypass_input under fieldKey', () => {
    let state = startFlow(initFlowState(validFlow()));
    state = submitResponse(state, { kind: 'cta', action: 'primary' });
    state = submitResponse(state, { kind: 'choice', choiceId: 'fitness' });
    expect(state.currentScreenId).toBe('scr_name');

    state = submitResponse(state, { kind: 'go_to_screen', screenId: 'scr_done' });
    expect(state.currentScreenId).toBe('scr_done');
    expect(state.responses.first_name).toEqual({ kind: 'bypass_input', via: 'go_to_screen' });
    expect(state.responses.scr_name).toEqual({ kind: 'go_to_screen', screenId: 'scr_done' });
  });

  it('screen_commit merges checkbox values then applies primary navigation', () => {
    let state = startFlow(initFlowState(validFlow()));
    state = submitResponse(state, { kind: 'cta', action: 'primary' });
    state = submitResponse(state, { kind: 'choice', choiceId: 'fitness' });
    state = submitResponse(state, {
      kind: 'screen_commit',
      primary: { kind: 'text', value: 'Ada', classification: 'safe' },
      checkboxValues: { terms: true, marketing: false },
    });
    expect(state.currentScreenId).toBe('scr_done');
    expect(state.responses.terms).toEqual({ kind: 'checkbox', fieldKey: 'terms', value: true });
    expect(state.responses.marketing).toEqual({ kind: 'checkbox', fieldKey: 'marketing', value: false });
    expect(state.responses.first_name).toEqual({ kind: 'text', value: 'Ada', classification: 'safe' });
  });

  it('permission_outcome targets end and completes even without default next', () => {
    const flow: FlowManifest = {
      ...validFlow(),
      entryScreenId: 'scr_welcome',
      screens: [
        {
          id: 'scr_welcome',
          name: 'Welcome',
          regions: {
            body: {
              id: 'lyr_body',
              kind: 'stack',
              direction: 'vertical',
              gap: 12,
              style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
              children: [
                {
                  id: 'lyr_btn',
                  kind: 'button',
                  variant: 'primary',
                  action: {
                    kind: 'request_os_permission',
                    permissionKey: 'notifications',
                    outcomes: {
                      granted: OS_PERMISSION_OUTCOME_END,
                      denied: OS_PERMISSION_OUTCOME_END,
                      blocked: OS_PERMISSION_OUTCOME_END,
                    },
                  },
                  direction: 'horizontal',
                  align: 'center',
                  distribution: 'center',
                  children: [
                    { id: 'lyr_btn_t', kind: 'text', text: { default: 'Allow' } },
                  ],
                },
              ],
            },
          },
          next: { default: null },
        },
      ],
    };
    let state = startFlow(initFlowState(flow));
    state = submitResponse(state, {
      kind: 'permission_outcome',
      layerId: 'lyr_btn',
      permissionKey: 'notifications',
      outcome: 'granted',
    });
    expect(state.status).toBe('completed');
    expect(state.currentScreenId).toBeNull();
  });

  it('app_review_outcome via screen_commit uses default next', () => {
    const flow: FlowManifest = {
      ...validFlow(),
      entryScreenId: 'scr_welcome',
      screens: [
        {
          id: 'scr_welcome',
          name: 'Welcome',
          regions: {
            body: {
              id: 'lyr_body',
              kind: 'stack',
              direction: 'vertical',
              gap: 12,
              style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
              children: [
                {
                  id: 'lyr_review',
                  kind: 'button',
                  variant: 'secondary',
                  action: { kind: 'request_app_review' },
                  direction: 'horizontal',
                  align: 'center',
                  distribution: 'center',
                  children: [
                    { id: 'lyr_review_t', kind: 'text', text: { default: 'Rate' } },
                  ],
                },
              ],
            },
          },
          next: { default: 'scr_done' },
        },
        validFlow().screens.find((s) => s.id === 'scr_done')!,
      ],
    };
    let state = startFlow(initFlowState(flow));
    state = submitResponse(state, {
      kind: 'screen_commit',
      primary: { kind: 'app_review_outcome', layerId: 'lyr_review', outcome: 'not_shown' },
      checkboxValues: {},
    });
    expect(state.currentScreenId).toBe('scr_done');
    expect(state.responses['app_review:lyr_review']).toEqual({
      kind: 'app_review_outcome',
      layerId: 'lyr_review',
      outcome: 'not_shown',
    });
  });

  it('permission_outcome continue with no default next completes the flow', () => {
    const flow: FlowManifest = {
      ...validFlow(),
      entryScreenId: 'scr_welcome',
      screens: [
        {
          id: 'scr_welcome',
          name: 'Welcome',
          regions: {
            body: {
              id: 'lyr_body',
              kind: 'stack',
              direction: 'vertical',
              gap: 12,
              style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
              children: [
                {
                  id: 'lyr_btn',
                  kind: 'button',
                  variant: 'primary',
                  action: {
                    kind: 'request_os_permission',
                    permissionKey: 'notifications',
                    outcomes: {
                      granted: OS_PERMISSION_OUTCOME_CONTINUE,
                      denied: OS_PERMISSION_OUTCOME_CONTINUE,
                      blocked: OS_PERMISSION_OUTCOME_CONTINUE,
                    },
                  },
                  direction: 'horizontal',
                  align: 'center',
                  distribution: 'center',
                  children: [
                    { id: 'lyr_btn_t', kind: 'text', text: { default: 'Allow' } },
                  ],
                },
              ],
            },
          },
          next: { default: null },
        },
      ],
    };
    let state = startFlow(initFlowState(flow));
    state = submitResponse(state, {
      kind: 'permission_outcome',
      layerId: 'lyr_btn',
      permissionKey: 'notifications',
      outcome: 'granted',
    });
    expect(state.status).toBe('completed');
    expect(state.currentScreenId).toBeNull();
  });

  it('oauth_login_resolve failure stays on screen', () => {
    const vf = validFlow();
    const done = vf.screens.find((s) => s.id === 'scr_done')!;
    const flow: FlowManifest = {
      ...vf,
      entryScreenId: 'scr_oauth',
      screens: [
        {
          id: 'scr_oauth',
          name: 'OAuth',
          regions: {
            body: {
              id: 'lyr_oauth_body',
              kind: 'stack',
              direction: 'vertical',
              gap: 8,
              children: [
                {
                  id: 'lyr_oauth',
                  kind: 'oauth_login',
                  children: [
                    {
                      id: 'lyr_oauth_gp',
                      kind: 'oauth_provider',
                      variant: 'preset',
                      provider: 'google',
                    },
                  ],
                },
              ],
            },
          },
          next: { default: done.id },
        },
        done,
      ],
    };
    let state = startFlow(initFlowState(flow));
    expect(state.currentScreenId).toBe('scr_oauth');
    const histBefore = [...state.history];
    state = submitResponse(state, {
      kind: 'oauth_login_resolve',
      layerId: 'lyr_oauth',
      provider: { type: 'preset', provider: 'google' },
      success: false,
    });
    expect(state.currentScreenId).toBe('scr_oauth');
    expect(state.history).toEqual(histBefore);
    expect(state.status).toBe('running');
  });

  it('oauth_login_resolve success advances via next.default', () => {
    const vf = validFlow();
    const done = vf.screens.find((s) => s.id === 'scr_done')!;
    const flow: FlowManifest = {
      ...vf,
      entryScreenId: 'scr_oauth',
      screens: [
        {
          id: 'scr_oauth',
          name: 'OAuth',
          regions: {
            body: {
              id: 'lyr_oauth_body',
              kind: 'stack',
              direction: 'vertical',
              gap: 8,
              children: [
                {
                  id: 'lyr_oauth',
                  kind: 'oauth_login',
                  children: [
                    {
                      id: 'lyr_oauth_gp',
                      kind: 'oauth_provider',
                      variant: 'preset',
                      provider: 'google',
                    },
                  ],
                },
              ],
            },
          },
          next: { default: done.id },
        },
        done,
      ],
    };
    let state = startFlow(initFlowState(flow));
    state = submitResponse(state, {
      kind: 'oauth_login_resolve',
      layerId: 'lyr_oauth',
      provider: { type: 'preset', provider: 'google' },
      success: true,
      customerExternalId: 'cust_xyz',
    });
    expect(state.currentScreenId).toBe(done.id);
    expect(state.responses['oauth:lyr_oauth']).toMatchObject({
      success: true,
      customerExternalId: 'cust_xyz',
    });
  });

  it('buildCompletionResponses maps oauth_login_resolve', () => {
    const vf = validFlow();
    const done = vf.screens.find((s) => s.id === 'scr_done')!;
    const flow: FlowManifest = {
      ...vf,
      entryScreenId: 'scr_oauth',
      screens: [
        {
          id: 'scr_oauth',
          name: 'OAuth',
          regions: {
            body: {
              id: 'lyr_oauth_body',
              kind: 'stack',
              direction: 'vertical',
              gap: 8,
              children: [
                {
                  id: 'lyr_oauth',
                  kind: 'oauth_login',
                  children: [
                    {
                      id: 'lyr_oauth_gp',
                      kind: 'oauth_provider',
                      variant: 'preset',
                      provider: 'google',
                    },
                  ],
                },
              ],
            },
          },
          next: { default: done.id },
        },
        done,
      ],
    };
    let state = startFlow(initFlowState(flow));
    state = submitResponse(state, {
      kind: 'oauth_login_resolve',
      layerId: 'lyr_oauth',
      provider: { type: 'preset', provider: 'google' },
      success: true,
    });
    expect(buildCompletionResponses(state)['oauth:lyr_oauth']).toEqual({
      success: true,
      provider: { type: 'preset', provider: 'google' },
    });
  });

  it('email_password_auth_resolve success advances and buildCompletionResponses omits password', () => {
    const vf = validFlow();
    const done = vf.screens.find((s) => s.id === 'scr_done')!;
    const flow: FlowManifest = {
      ...vf,
      entryScreenId: 'scr_ep',
      screens: [
        {
          id: 'scr_ep',
          name: 'Email',
          regions: {
            body: {
              id: 'lyr_ep_body',
              kind: 'stack',
              direction: 'vertical',
              gap: 8,
              children: [
                {
                  id: 'lyr_ep',
                  kind: 'email_password_auth',
                  mode: 'sign_in',
                  fieldKey: 'email_auth',
                  children: [
                    {
                      id: 'lyr_ep_f_email',
                      kind: 'email_password_field',
                      slot: 'email',
                      placeholder: { default: 'Email' },
                      children: [],
                    },
                    {
                      id: 'lyr_ep_f_pw',
                      kind: 'email_password_field',
                      slot: 'password',
                      placeholder: { default: 'Password' },
                      children: [],
                    },
                    {
                      id: 'lyr_ep_sub',
                      kind: 'email_password_submit',
                      buttonVariant: 'primary',
                      direction: 'horizontal',
                      align: 'center',
                      distribution: 'center',
                      gap: 8,
                      children: [
                        {
                          id: 'lyr_ep_sub_txt',
                          kind: 'text',
                          text: { default: 'Sign in' },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
          next: { default: done.id },
        },
        done,
      ],
    };
    let state = startFlow(initFlowState(flow), '2026-01-01T00:00:00.000Z');
    expect(state.currentScreenId).toBe('scr_ep');
    state = submitResponse(state, {
      kind: 'email_password_auth_resolve',
      layerId: 'lyr_ep',
      fieldKey: 'email_auth',
      mode: 'sign_in',
      email: 'a@b.co',
      password: 'secret',
      success: true,
    });
    expect(state.currentScreenId).toBe('scr_done');
    expect(buildCompletionResponses(state)['email_pw:lyr_ep']).toEqual({
      success: true,
      mode: 'sign_in',
      email: 'a@b.co',
    });
  });

  describe('external surface nodes', () => {
    const flowWithMidPaywall = (): FlowManifest => {
      const base = validFlow();
      return {
        ...base,
        screens: base.screens.map((s) =>
          s.id === 'scr_welcome' ? { ...s, next: { default: 'surf_paywall' } } : s,
        ),
        externalSurfaceNodes: [
          {
            id: 'surf_paywall',
            name: 'Welcome paywall',
            config: { provider: 'revenuecat', offeringId: 'default' },
            outcomes: {
              purchase_completed: 'scr_done',
              dismissed: 'scr_goal',
            },
            fallback: 'scr_goal',
          },
        ],
      };
    };

    it('enters pending state when a screen transitions onto an external surface', () => {
      let state = startFlow(initFlowState(flowWithMidPaywall()));
      expect(state.currentScreenId).toBe('scr_welcome');
      expect(state.pendingExternalSurface).toBeNull();

      state = submitResponse(state, { kind: 'cta', action: 'primary' });
      expect(state.currentScreenId).toBeNull();
      expect(state.pendingExternalSurface).toEqual({ nodeId: 'surf_paywall' });
      expect(state.history).toEqual(['scr_welcome', 'surf_paywall']);
      expect(state.status).toBe('running');
    });

    it('advances to the purchase_completed target and merges sdkKeyPatch into session', () => {
      let state = startFlow(initFlowState(flowWithMidPaywall()));
      state = submitResponse(state, { kind: 'cta', action: 'primary' });
      state = submitResponse(state, {
        kind: 'external_surface_outcome',
        nodeId: 'surf_paywall',
        outcome: 'purchase_completed',
        sdkKeyPatch: {
          onb_rc_last_event: 'purchase_completed',
          onb_rc_last_product_id: 'pro.annual',
        },
      });
      expect(state.currentScreenId).toBe('scr_done');
      expect(state.pendingExternalSurface).toBeNull();
      expect(state.session.sdkAttributes.onb_rc_last_event).toBe('purchase_completed');
      expect(state.session.sdkAttributes.onb_rc_last_product_id).toBe('pro.annual');
    });

    it('uses the per-outcome target when one is mapped, otherwise the fallback', () => {
      let stateA = startFlow(initFlowState(flowWithMidPaywall()));
      stateA = submitResponse(stateA, { kind: 'cta', action: 'primary' });
      stateA = submitResponse(stateA, {
        kind: 'external_surface_outcome',
        nodeId: 'surf_paywall',
        outcome: 'dismissed',
      });
      expect(stateA.currentScreenId).toBe('scr_goal');

      // No `failed` mapping in fixture; should fall back to `scr_goal`.
      let stateB = startFlow(initFlowState(flowWithMidPaywall()));
      stateB = submitResponse(stateB, { kind: 'cta', action: 'primary' });
      stateB = submitResponse(stateB, {
        kind: 'external_surface_outcome',
        nodeId: 'surf_paywall',
        outcome: 'failed',
      });
      expect(stateB.currentScreenId).toBe('scr_goal');
    });

    it('completes the flow when a branch targets the terminal no-next sentinel', () => {
      const manifest = flowWithMidPaywall();
      const withNoop = {
        ...manifest,
        externalSurfaceNodes: manifest.externalSurfaceNodes!.map((n) =>
          n.id === 'surf_paywall'
            ? {
                ...n,
                outcomes: {
                  ...n.outcomes,
                  purchase_cancelled: EXTERNAL_SURFACE_NO_NEXT,
                },
              }
            : n,
        ),
      };
      let state = startFlow(initFlowState(withNoop));
      state = submitResponse(state, { kind: 'cta', action: 'primary' });
      state = submitResponse(state, {
        kind: 'external_surface_outcome',
        nodeId: 'surf_paywall',
        outcome: 'purchase_cancelled',
      });
      expect(state.status).toBe('completed');
      expect(state.pendingExternalSurface).toBeNull();
      expect(state.currentScreenId).toBeNull();
    });

    it('ignores outcomes that target a different pending surface', () => {
      let state = startFlow(initFlowState(flowWithMidPaywall()));
      state = submitResponse(state, { kind: 'cta', action: 'primary' });
      const before = state;
      const next = submitResponse(state, {
        kind: 'external_surface_outcome',
        nodeId: 'surf_other',
        outcome: 'purchase_completed',
      });
      expect(next).toBe(before);
    });

    it('starts directly into pending state when the entry node is an external surface', () => {
      const base = validFlow();
      const manifest: FlowManifest = {
        ...base,
        entryScreenId: 'surf_paywall',
        externalSurfaceNodes: [
          {
            id: 'surf_paywall',
            config: { provider: 'revenuecat' },
            outcomes: { purchase_completed: 'scr_done' },
            fallback: 'scr_done',
          },
        ],
      };
      const state = startFlow(initFlowState(manifest));
      expect(state.currentScreenId).toBeNull();
      expect(state.pendingExternalSurface).toEqual({ nodeId: 'surf_paywall' });
      expect(state.status).toBe('running');
    });

    it('makes sdkKeyPatch visible to a downstream decision node', () => {
      const base = validFlow();
      const manifest: FlowManifest = {
        ...base,
        screens: base.screens.map((s) =>
          s.id === 'scr_welcome' ? { ...s, next: { default: 'surf_paywall' } } : s,
        ),
        externalSurfaceNodes: [
          {
            id: 'surf_paywall',
            config: { provider: 'revenuecat' },
            outcomes: { purchase_completed: 'dec_after_paywall', dismissed: 'dec_after_paywall' },
            fallback: 'dec_after_paywall',
          },
        ],
        decisionNodes: [
          {
            id: 'dec_after_paywall',
            cases: [
              {
                id: 'dec_after_paywall_case_0',
                name: 'Group 1',
                expression: {
                  kind: 'predicate',
                  variable: { kind: 'sdk', key: 'onb_rc_last_event' },
                  predicate: { type: 'string', pred: { op: 'eq', value: 'purchase_completed' } },
                },
                next: 'scr_done',
              },
            ],
            elseNext: 'scr_goal',
          },
        ],
      };
      let state = startFlow(initFlowState(manifest));
      state = submitResponse(state, { kind: 'cta', action: 'primary' });
      expect(state.pendingExternalSurface?.nodeId).toBe('surf_paywall');
      state = submitResponse(state, {
        kind: 'external_surface_outcome',
        nodeId: 'surf_paywall',
        outcome: 'purchase_completed',
        sdkKeyPatch: { onb_rc_last_event: 'purchase_completed' },
      });
      expect(state.currentScreenId).toBe('scr_done');
    });

    it('records the surface outcome in buildCompletionResponses under surface_<nodeId>', () => {
      let state = startFlow(initFlowState(flowWithMidPaywall()));
      state = submitResponse(state, { kind: 'cta', action: 'primary' });
      state = submitResponse(state, {
        kind: 'external_surface_outcome',
        nodeId: 'surf_paywall',
        outcome: 'purchase_completed',
      });
      const responses = buildCompletionResponses(state);
      expect(responses['surface_surf_paywall']).toEqual({ outcome: 'purchase_completed' });
    });
  });

  it('stepResponseToCompletionValue maps multiChoice to choice ids', () => {
    expect(stepResponseToCompletionValue({ kind: 'multiChoice', choiceIds: ['opt_a', 'opt_b'] })).toEqual([
      'opt_a',
      'opt_b',
    ]);
  });

  it('stripAuthResponsesForTerminalExport removes oauth/email_pw keys', () => {
    const responses: Record<string, StepResponse> = {
      goal_pick: { kind: 'choice', choiceId: 'fitness' },
      'oauth:lyr_o': {
        kind: 'oauth_login_resolve',
        layerId: 'lyr_o',
        provider: { type: 'preset', provider: 'google' },
        success: true,
      },
      'email_pw:lyr_e': {
        kind: 'email_password_auth_resolve',
        layerId: 'lyr_e',
        fieldKey: 'email',
        mode: 'sign_in',
        email: 'u@example.com',
        password: 'secret',
        success: true,
      },
    };
    const stripped = stripAuthResponsesForTerminalExport(responses);
    expect(Object.keys(stripped)).toEqual(['goal_pick']);
  });
});
