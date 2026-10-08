import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { collectCanvasGateViolations, parseCanvasEditorGates } from '@getrheo/contracts/canvasEditorGates';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import { collectFlowBuilderIssues } from '@getrheo/flow-runtime/flowBuilderRules';
import { validateManifest, validatePublishable } from '@getrheo/flow-runtime/validation';
import { buildAnimationStressHarnessManifest } from './animationStressHarnessManifest';
import { buildAuthCanvasManifest } from './authCanvasManifest';
import { buildPaywallIntegrationsHarnessManifest } from './paywallIntegrationsHarnessManifest';
import { buildPaywallManifest } from './paywallManifest';
import { buildPiedPiperOnboardingManifest } from './piedPiperOnboardingManifest';
import {
  buildSdkRegressionGoldComments,
  buildSdkRegressionGoldManifest,
} from './sdkRegressionGoldManifest';
import { SRG_SCREEN_IDS } from './sdkRegressionGold/comments.js';
import { buildLayerStressHarnessManifest } from './stressHarnessManifest';
import { buildWelcomeLinearManifest } from './welcomeLinearManifest';

const expectSeedManifestHealthy = (m: FlowManifest): void => {
  const parsed = validateManifest(m);
  expect(parsed.ok, parsed.ok ? '' : parsed.issues.map((i) => i.message).join('; ')).toBe(true);
  if (!parsed.ok) return;
  const pub = validatePublishable(parsed.manifest);
  expect(pub.ok, pub.ok ? '' : pub.issues.map((i) => i.message).join('; ')).toBe(true);
  const gates = collectCanvasGateViolations(parsed.manifest, parseCanvasEditorGates(null));
  expect(gates, gates.join('; ')).toEqual([]);
  const builder = collectFlowBuilderIssues(parsed.manifest);
  expect(builder, builder.join('; ')).toEqual([]);
  expect(collectLegacyAuthoringConventionIssues(parsed.manifest)).toEqual([]);
};

/** Fail if seed manifests still emit hard-removed / aliased authoring shapes. */
const collectLegacyAuthoringConventionIssues = (value: unknown, path = ''): string[] => {
  const issues: string[] = [];
  if (!value || typeof value !== 'object') return issues;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      issues.push(...collectLegacyAuthoringConventionIssues(entry, `${path}[${index}]`));
    });
    return issues;
  }
  const record = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, 'justify')) {
    issues.push(`${path || 'root'}: use "distribution" instead of legacy "justify"`);
  }
  if (record.width === 'fill') {
    issues.push(`${path || 'root'}: width "fill" must be authored as "full"`);
  }
  for (const [key, child] of Object.entries(record)) {
    issues.push(
      ...collectLegacyAuthoringConventionIssues(child, path ? `${path}.${key}` : key),
    );
  }
  return issues;
};

describe('dev seed manifests', () => {
  it('parses welcome linear fixture with any flow UUID', () => {
    const id = randomUUID();
    const m = buildWelcomeLinearManifest(id);
    expect(m.flowId).toBe(id);
    expectSeedManifestHealthy(m);
  });

  it('parses layer stress harness', () => {
    const id = randomUUID();
    const m = buildLayerStressHarnessManifest(id);
    expect(m.entryScreenId).toBe('scr_sh_entry');
    expect(m.screens.length).toBeGreaterThan(50);
    expectSeedManifestHealthy(m);
  });

  it('parses animation stress harness', () => {
    const id = randomUUID();
    const m = buildAnimationStressHarnessManifest(id);
    expect(m.entryScreenId).toBe('scr_ash_entry');
    expect(m.screens.length).toBeGreaterThan(15);
    expectSeedManifestHealthy(m);
  });

  it('parses auth canvas harness', () => {
    const id = randomUUID();
    const m = buildAuthCanvasManifest(id);
    expect(m.entryScreenId).toBe('scr_auth_intro');
    expectSeedManifestHealthy(m);
  });

  it('parses RevenueCat paywall seed flow', () => {
    const id = randomUUID();
    const m = buildPaywallManifest(id);
    expect(m.externalSurfaceNodes?.[0]?.config).toMatchObject({
      provider: 'revenuecat',
      offeringId: 'default',
    });
    expectSeedManifestHealthy(m);
  });

  it('parses paywall integrations harness (RevenueCat + Superwall)', () => {
    const id = randomUUID();
    const m = buildPaywallIntegrationsHarnessManifest(id);
    expect(m.entryScreenId).toBe('scr_pi_pick');
    expect(m.externalSurfaceNodes?.map((n) => n.config.provider)).toEqual([
      'revenuecat',
      'superwall',
    ]);
    const pick = m.screens.find((s) => s.id === 'scr_pi_pick');
    const choice = pick?.regions.body.children?.find((c) => c.kind === 'single_choice');
    expect(choice && 'branching' in choice ? choice.branching : null).toMatchObject({
      enabled: true,
      conditions: [
        { choiceId: 'opt_revenuecat', goTo: 'surf_pi_rc' },
        { choiceId: 'opt_superwall', goTo: 'surf_pi_sw' },
      ],
    });
    expectSeedManifestHealthy(m);
  });

  it('parses Pied Piper onboarding seed flow', () => {
    const id = randomUUID();
    const m = buildPiedPiperOnboardingManifest(id);
    expect(m.flowId).toBe(id);
    expect(m.entryScreenId).toBe('scr_welcome');
    expect(m.screens).toHaveLength(11);
    expect(m.externalSurfaceNodes?.[0]?.config).toMatchObject({
      provider: 'revenuecat',
      offeringId: 'default',
    });
    expectSeedManifestHealthy(m);
  });

  it('parses SDK regression gold harness', () => {
    const id = randomUUID();
    const m = buildSdkRegressionGoldManifest(id);
    expect(m.entryScreenId).toBe('scr_srg_entry');
    expect(m.screens.map((s) => s.id)).toEqual([...SRG_SCREEN_IDS]);
    expectSeedManifestHealthy(m);
    const comments = buildSdkRegressionGoldComments();
    expect(comments.length).toBe(SRG_SCREEN_IDS.length + 1);
    for (const comment of comments) {
      expect(comment.body.length).toBeGreaterThan(20);
      expect(comment.body.length).toBeLessThanOrEqual(8000);
    }
  });
});
