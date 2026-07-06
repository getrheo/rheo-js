import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYER_KINDS } from '@getrheo/contracts/layers';
import {
  GRADIENT_CLIP_PARENT_RENDERED_KINDS,
  buildGradientClipWidgetCoverage,
} from './gradientClipWidgetCoverage';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

/** RN/Flutter/SwiftUI sources live outside rheo-js; scan tests run only in the private monorepo. */
const hasMonorepoSdkSources = existsSync(
  path.join(repoRoot, 'packages/sdks/react-native-core/src/ui/layers'),
);

describe('buildGradientClipWidgetCoverage', () => {
  const coverage = buildGradientClipWidgetCoverage(repoRoot);

  it('includes all 23 layer kinds from contracts', () => {
    expect(Object.keys(coverage.kinds).sort()).toEqual([...LAYER_KINDS].sort());
    expect(coverage.totals.kindCount).toBe(23);
  });

  describe.skipIf(!hasMonorepoSdkSources)('monorepo SDK widget scans', () => {
    it('marks RN widget coverage true for all 23 kinds', () => {
      expect(coverage.totals.rnTrue).toBe(23);
      for (const kind of LAYER_KINDS) {
        expect(coverage.kinds[kind].rn, kind).toBe(true);
      }
    });

    it('marks Flutter widget coverage true for all 23 kinds', () => {
      expect(coverage.totals.flutterTrue).toBe(23);
      for (const kind of LAYER_KINDS) {
        expect(coverage.kinds[kind].flutter, kind).toBe(true);
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
      expect(coverage.totals.swiftuiNone).toBe(3);
    });
  });

  it('treats parent-rendered auth child kinds as covered without dedicated widget tests', () => {
    for (const kind of GRADIENT_CLIP_PARENT_RENDERED_KINDS) {
      expect(coverage.kinds[kind].rn, `${kind} rn`).toBe(true);
      expect(coverage.kinds[kind].flutter, `${kind} flutter`).toBe(true);
      expect(coverage.kinds[kind].swiftui, `${kind} swiftui`).toBe('none');
    }
  });
});
