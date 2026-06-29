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
