import type { DecisionNode } from '../decisions.js';
import type { ExternalSurfaceNode } from '../externalSurfaces.js';

/** Minimal decision node example for agent prompts and import tooling. */
export const minimalDecisionNodeExample = (): DecisionNode => ({
  id: 'dec_platform',
  name: 'Platform',
  cases: [
    {
      id: 'case_ios',
      name: 'iOS',
      expression: {
        kind: 'predicate',
        variable: { kind: 'builtin', name: 'platform' },
        predicate: { type: 'string', pred: { op: 'eq', value: 'ios' } },
      },
      next: 'scr_ios_intro',
    },
  ],
  elseNext: 'scr_android_intro',
});

/** Decision node branching on a prior single_choice field answer (questionnaire flow). */
export const fieldChoiceDecisionNodeExample = (): DecisionNode => ({
  id: 'dec_goal_branch',
  name: 'Goal branch',
  cases: [
    {
      id: 'case_mindfulness',
      name: 'Mindfulness',
      expression: {
        kind: 'predicate',
        variable: { kind: 'field', fieldKey: 'primary_goal' },
        predicate: { type: 'choice', pred: { op: 'eq', optionId: 'mindfulness' } },
      },
      next: 'scr_mindfulness_path',
    },
  ],
  elseNext: 'scr_default_path',
});

/**
 * single_choice layer with per-answer routing on the same screen (preferred over a decision node).
 * choiceId values MUST match optionBindings[].optionId (not rootLayerId).
 */
export const choiceLayerBranchingExample = () => ({
  id: 'lyr_goal',
  kind: 'single_choice' as const,
  fieldKey: 'primary_goal',
  children: [
    {
      id: 'lyr_opt_mind',
      kind: 'stack' as const,
      direction: 'vertical' as const,
      children: [
        {
          id: 'lyr_opt_mind_t',
          kind: 'text' as const,
          text: { default: 'Mindfulness' },
          style: { width: 'auto', height: 'auto' },
        },
      ],
      style: { width: 'full', height: 'auto' },
    },
    {
      id: 'lyr_opt_fit',
      kind: 'stack' as const,
      direction: 'vertical' as const,
      children: [
        {
          id: 'lyr_opt_fit_t',
          kind: 'text' as const,
          text: { default: 'Fitness' },
          style: { width: 'auto', height: 'auto' },
        },
      ],
      style: { width: 'full', height: 'auto' },
    },
  ],
  optionBindings: [
    { optionId: 'mindfulness', rootLayerId: 'lyr_opt_mind' },
    { optionId: 'fitness', rootLayerId: 'lyr_opt_fit' },
  ],
  branching: {
    enabled: true,
    conditions: [
      { choiceId: 'mindfulness', goTo: 'scr_mindfulness_path' },
      { choiceId: 'fitness', goTo: 'scr_fitness_path' },
    ],
  },
  style: { width: 'full', height: 'auto' },
});

/** Decision node branching on a text_input field (after the user leaves that screen). */
export const textFieldDecisionNodeExample = (): DecisionNode => ({
  id: 'dec_name_branch',
  name: 'Name branch',
  cases: [
    {
      id: 'case_vip',
      name: 'VIP code',
      expression: {
        kind: 'predicate',
        variable: { kind: 'field', fieldKey: 'invite_code' },
        predicate: { type: 'string', pred: { op: 'eq', value: 'VIP' } },
      },
      next: 'scr_vip_welcome',
    },
  ],
  elseNext: 'scr_standard_welcome',
});

/** Decision node branching on a scale_input field value. */
export const scaleFieldDecisionNodeExample = (): DecisionNode => ({
  id: 'dec_engagement',
  name: 'Engagement',
  cases: [
    {
      id: 'case_high',
      name: 'High engagement',
      expression: {
        kind: 'predicate',
        variable: { kind: 'field', fieldKey: 'engagement_level' },
        predicate: { type: 'number', pred: { op: 'gte', value: 4 } },
      },
      next: 'scr_power_user',
    },
  ],
  elseNext: 'scr_casual',
});

/** Minimal RevenueCat external surface example for agent prompts and import tooling. */
export const minimalExternalSurfaceExample = (): ExternalSurfaceNode => ({
  id: 'surf_paywall',
  name: 'RevenueCat paywall',
  config: {
    provider: 'revenuecat',
    offeringId: 'default',
    presentation: 'paywall',
  },
  outcomes: {
    purchase_completed: 'scr_premium',
    restore_completed: 'scr_premium',
    dismissed: 'scr_free',
    failed: 'scr_free',
  },
  fallback: 'scr_free',
});
