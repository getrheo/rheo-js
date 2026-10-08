/** Inlined for public mirror — @rheo/platform-contracts stays private. */
export type FlowTemplateId =
  | 'language_learning'
  | 'fitness'
  | 'win_back'
  | 'feedback'
  | 'word_learning'
  | 'finch_onboarding'
  | 'training_app'
  | 'yazio_onboarding'
  | 'flo_onboarding';

/** Display names for seeded template flows — titles match `FLOW_TEMPLATE_CATALOG`. */
export const SEED_TEMPLATE_FLOW_NAMES: Record<FlowTemplateId, string> = {
  language_learning: 'Seed · Duolingo',
  flo_onboarding: 'Seed · Flo',
  yazio_onboarding: 'Seed · Yazio',
  word_learning: 'Seed · Vocabulary',
  finch_onboarding: 'Seed · Finch',
  training_app: 'Seed · Training',
  fitness: 'Seed · Layer stress harness',
  feedback: 'Seed · Feedback',
  win_back: 'Seed · WinBack',
};

export const seedFlowNameForTemplate = (templateId: FlowTemplateId): string =>
  SEED_TEMPLATE_FLOW_NAMES[templateId];

/** Primary onboarding flow for default channels, experiments, and E2E. */
export const SEED_WELCOME_FLOW_NAME = SEED_TEMPLATE_FLOW_NAMES.language_learning;
export const SEED_STRESS_HARNESS_FLOW_NAME = SEED_TEMPLATE_FLOW_NAMES.fitness;
export const SEED_ANIMATION_LAB_FLOW_NAME = 'Seed · Animation stress harness';
export const SEED_AUTH_CANVAS_FLOW_NAME = 'Seed · Auth canvas';
export const SEED_PAYWALL_INTEGRATIONS_FLOW_NAME = 'Seed · Paywall integrations';
export const SEED_SDK_REGRESSION_GOLD_FLOW_NAME = 'Seed · SDK regression gold';
export const SEED_PAYWALL_FLOW_NAME = SEED_TEMPLATE_FLOW_NAMES.win_back;
