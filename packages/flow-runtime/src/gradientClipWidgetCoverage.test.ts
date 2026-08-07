import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYER_KINDS } from '@getrheo/contracts/layers';
import {
  GRADIENT_CLIP_CONTROL_FLOW_KINDS,
  GRADIENT_CLIP_PARENT_RENDERED_KINDS,
  GRADIENT_CLIP_PENDING_SDK_KINDS,
  buildGradientClipWidgetCoverage,
} from './gradientClipWidgetCoverage';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

/** RN/Flutter/SwiftUI sources live outside rheo-js; scan tests run only in the private monorepo. */
const hasMonorepoSdkSources = existsSync(
  path.join(repoRoot, 'packages/sdks/react-native-core/src/ui/layers'),
);

const pendingSdkSet = new Set(GRADIENT_CLIP_PENDING_SDK_KINDS);
const coveredKindCount = LAYER_KINDS.length - GRADIENT_CLIP_PENDING_SDK_KINDS.length;

describe('buildGradientClipWidgetCoverage', () => {
  const coverage = buildGradientClipWidgetCoverage(repoRoot);

  it('includes all layer kinds from contracts', () => {
    expect(Object.keys(coverage.kinds).sort()).toEqual([...LAYER_KINDS].sort());
    expect(coverage.totals.kindCount).toBe(LAYER_KINDS.length);
  });

  describe.skipIf(!hasMonorepoSdkSources)('monorepo SDK widget scans', () => {
    it('marks RN widget coverage true for all established kinds', () => {
      expect(coverage.totals.rnTrue).toBe(coveredKindCount);
      for (const kind of LAYER_KINDS) {
        if (pendingSdkSet.has(kind)) {
          expect(coverage.kinds[kind].rn, `${kind} pending RN SDK`).toBe(false);
        } else {
          expect(coverage.kinds[kind].rn, kind).toBe(true);
        }
      }
    });

    it('marks Flutter widget coverage true for all established kinds', () => {
      expect(coverage.totals.flutterTrue).toBe(coveredKindCount);
      for (const kind of LAYER_KINDS) {
        if (pendingSdkSet.has(kind)) {
          expect(coverage.kinds[kind].flutter, `${kind} pending Flutter SDK`).toBe(false);
        } else {
          expect(coverage.kinds[kind].flutter, kind).toBe(true);
        }
      }
    });

    it('documents SwiftUI integration coverage for all OuterChromeGradientClipIntegrationTests MARK sections', () => {
      const integrationKinds = LAYER_KINDS.filter(
        (kind) => coverage.kinds[kind].swiftui === 'integration',
      );
      expect(integrationKinds.sort()).toEqual(
        [
          'back_button',
          'button',
          'carousel',
          'checkbox',
          'counter',
          'email_password_auth',
          'hyperlink',
          'icon',
          'image',
          'loader',
          'lottie',
          'multiple_choice',
          'oauth_login',
          'progress',
          'scale_input',
          'single_choice',
          'stack',
          'text',
          'text_input',
          'video',
        ].sort(),
      );
      expect(coverage.totals.swiftuiIntegration).toBe(20);
      expect(coverage.totals.swiftuiNone).toBe(
        LAYER_KINDS.length - 20,
      );
    });
  });

  it('treats control-flow kinds as covered without dedicated widget tests', () => {
    for (const kind of GRADIENT_CLIP_CONTROL_FLOW_KINDS) {
      expect(coverage.kinds[kind].rn, `${kind} rn`).toBe(true);
      expect(coverage.kinds[kind].flutter, `${kind} flutter`).toBe(true);
      expect(coverage.kinds[kind].swiftui, `${kind} swiftui`).toBe('none');
    }
  });

  it('treats parent-rendered auth child kinds as covered without dedicated widget tests', () => {
    for (const kind of GRADIENT_CLIP_PARENT_RENDERED_KINDS) {
      expect(coverage.kinds[kind].rn, `${kind} rn`).toBe(true);
      expect(coverage.kinds[kind].flutter, `${kind} flutter`).toBe(true);
      expect(coverage.kinds[kind].swiftui, `${kind} swiftui`).toBe('none');
    }
  });

  it('documents pending SDK kinds without coverage', () => {
    for (const kind of GRADIENT_CLIP_PENDING_SDK_KINDS) {
      expect(coverage.kinds[kind].rn, `${kind} rn pending`).toBe(false);
      expect(coverage.kinds[kind].flutter, `${kind} flutter pending`).toBe(false);
      expect(coverage.kinds[kind].swiftui, `${kind} swiftui pending`).toBe('none');
    }
  });
});
