import { describe, expect, it } from 'vitest';
import type { Branding } from '@getrheo/contracts/branding';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import { collectBrandGradientManifestIssues } from './brandGradientManifestIssues';

const presetId = '11111111-1111-4111-8111-111111111111';
const token = `$brandGradient:${presetId}`;

const branding: Branding = {
  gradientPresets: [
    {
      id: presetId,
      name: 'P1',
      type: 'linear',
      angle: 180,
      stops: [
        { color: '#000000', offset: 0 },
        { color: '#ffffff', offset: 1 },
      ],
    },
  ],
  colorPresets: [],
  fontFamilies: [],
};

const baseManifest = (regions: FlowManifest['screens'][0]['regions']): FlowManifest => ({
  flowId: '00000000-0000-4000-8000-000000000001',
  version: 1,
  defaultLocale: 'en',
  locales: ['en'],
  entryScreenId: 'scr_bg_test',
  decisionNodes: [],
  externalSurfaceNodes: [],
  sdkAttributeKeys: [],
  screens: [
    {
      id: 'scr_bg_test',
      name: 'Test',
      regions,
      next: { default: null },
    },
  ],
});

describe('collectBrandGradientManifestIssues', () => {
  it('allows brand gradient on stack background', () => {
    const manifest = baseManifest({
      body: {
        id: 'lyr_root',
        kind: 'stack',
        direction: 'vertical',
        children: [],
        style: { background: token },
      },
    });
    expect(collectBrandGradientManifestIssues(manifest, branding)).toHaveLength(0);
  });

  it('flags gradient on text color', () => {
    const manifest = baseManifest({
      body: {
        id: 'lyr_root',
        kind: 'stack',
        direction: 'vertical',
        children: [
          {
            id: 'lyr_t1',
            kind: 'text',
            text: { default: 'Hi' },
            style: { color: token },
          },
        ],
      },
    });
    const issues = collectBrandGradientManifestIssues(manifest, branding);
    expect(issues.some((i) => i.code === 'brand_gradient.disallowed_field')).toBe(true);
  });

  it('flags CSS linear-gradient on text color', () => {
    const manifest = baseManifest({
      body: {
        id: 'lyr_root',
        kind: 'stack',
        direction: 'vertical',
        children: [
          {
            id: 'lyr_t1',
            kind: 'text',
            text: { default: 'Hi' },
            style: { color: 'linear-gradient(180deg, #000000 0%, #ffffff 100%)' },
          },
        ],
      },
    });
    const issues = collectBrandGradientManifestIssues(manifest, branding);
    expect(issues.some((i) => i.code === 'brand_gradient.linear_css_disallowed_field')).toBe(true);
  });

  it('allows canonical two-stop linear-gradient on stack background', () => {
    const manifest = baseManifest({
      body: {
        id: 'lyr_root',
        kind: 'stack',
        direction: 'vertical',
        children: [],
        style: { background: 'linear-gradient(180deg, #000000 0%, #ffffff 100%)' },
      },
    });
    expect(collectBrandGradientManifestIssues(manifest, branding)).toHaveLength(0);
  });
});
