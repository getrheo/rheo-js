import { FlowManifestSchema, MANIFEST_SCHEMA_VERSION, type FlowManifest } from '@getrheo/contracts/manifest';
import piedPiperOnboardingTemplate from './fixtures/pied-piper-onboarding-manifest.template.json';

type PiedPiperOnboardingTemplate = Omit<FlowManifest, 'flowId' | 'schemaVersion'>;

const template = piedPiperOnboardingTemplate as PiedPiperOnboardingTemplate;

/** Stable id for the seeded Pied Piper onboarding flow (matches agent-generated canvas). */
export const PIED_PIPER_ONBOARDING_FLOW_ID = '7dd6c19a-07c6-4c26-8896-735e85613e8c';

export const PIED_PIPER_ONBOARDING_FLOW_NAME = 'Onboarding';

export const PIED_PIPER_ONBOARDING_SURFACE_NODE_ID = 'surf_mr8mi319gnme';
export const PIED_PIPER_ONBOARDING_PURCHASE_SUCCESS_SCREEN_ID = 'scr_mr8mjwy14s0m';
export const PIED_PIPER_ONBOARDING_NOTIFICATIONS_SCREEN_ID = 'scr_mr8n77wb7ma5';
export const PIED_PIPER_ONBOARDING_OFFERING_ID = 'default';

/** Personal branch: education → questionnaire → personal path → completion. */
export const PIED_PIPER_ONBOARDING_PERSONAL_PATH = [
  { id: 'scr_welcome' },
  { id: 'scr_education_1' },
  { id: 'scr_education_2' },
  { id: 'scr_questionnaire', choices: [{ field_key: 'use_case', value: 'personal' }] },
  { id: 'scr_personal_path_1' },
  { id: 'scr_personal_path_2' },
  { id: 'scr_completion' },
  { id: 'scr_mr8n77wb7ma5' },
] as const;

/** Business branch: education → questionnaire → business path → completion. */
export const PIED_PIPER_ONBOARDING_PRO_PATH = [
  { id: 'scr_welcome' },
  { id: 'scr_education_1' },
  { id: 'scr_education_2' },
  { id: 'scr_questionnaire', choices: [{ field_key: 'use_case', value: 'business' }] },
  { id: 'scr_business_path_1' },
  { id: 'scr_business_path_2' },
  { id: 'scr_completion' },
  { id: 'scr_mr8n77wb7ma5' },
] as const;

export const buildPiedPiperOnboardingManifest = (flowId: string): FlowManifest =>
  FlowManifestSchema.parse({
    ...structuredClone(template),
    flowId,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
  });
