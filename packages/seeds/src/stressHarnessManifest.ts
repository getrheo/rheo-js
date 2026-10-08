import { FlowManifestSchema, MANIFEST_SCHEMA_VERSION, type FlowManifest } from '@getrheo/contracts/manifest';
import { layerKindGalleryScreens, layerStyleComboScreens } from './stressHarness/layerKindScreens.js';
import { stressHarnessScreensEarly } from './stressHarness/screensEarly.js';
import { stressHarnessScreensMid } from './stressHarness/screensMid.js';
import { stressHarnessScreensLate } from './stressHarness/screensLate.js';
import { stressHarnessDecisionNodes } from './stressHarness/decisionNodes.js';

/** Gold-standard layer + decision + integration harness for builder and SDK QA. */
export const buildLayerStressHarnessManifest = (flowId: string): FlowManifest =>
  FlowManifestSchema.parse({
    flowId,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    version: 1,
    defaultLocale: 'en',
    locales: ['en', 'es'],
    entryScreenId: 'scr_sh_entry',
    theme: {
      primary: '#6366f1',
      primaryForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#0f172a',
      accent: '#f97316',
      borderRadius: 14,
      fontFamily: 'system-ui',
    },
    builderMeta: {
      layout: {
        nodes: [
          { id: 'scr_sh_entry', kind: 'screen', x: 80, y: 60 },
          { id: 'scr_sh_regions', kind: 'screen', x: 380, y: 60 },
          { id: 'dec_sh_intersect', kind: 'decision', x: 900, y: 320 },
          { id: 'dec_sh_combo', kind: 'decision', x: 620, y: 520 },
        ],
        canvas: { zoom: 0.75, x: 20, y: 10 },
      },
    },
    sdkAttributeKeys: ['plan'],
    screens: [
      ...stressHarnessScreensEarly,
      ...layerKindGalleryScreens(),
      ...layerStyleComboScreens(),
      ...stressHarnessScreensMid,
      ...stressHarnessScreensLate,
    ],
    decisionNodes: stressHarnessDecisionNodes,
  });

/** @deprecated Use {@link buildLayerStressHarnessManifest}. */
export const buildStressHarnessManifest = buildLayerStressHarnessManifest;
