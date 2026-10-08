import { FlowManifestSchema, MANIFEST_SCHEMA_VERSION, type FlowManifest } from '@getrheo/contracts/manifest';
import { chainScreens, type ScreenDraft } from './sdkRegressionGold/builders.js';
import { SRG_SCREEN_IDS, srgNodePosition } from './sdkRegressionGold/comments.js';
import {
  sdkRegressionButtonVariantScreen,
  sdkRegressionKindScreensEarly,
} from './sdkRegressionGold/screensKindEarly.js';
import { sdkRegressionKindScreensLate } from './sdkRegressionGold/screensKindLate.js';
import { sdkRegressionPermutationScreens } from './sdkRegressionGold/screensPermutations.js';

const assembleDrafts = (): ScreenDraft[] => {
  const early = sdkRegressionKindScreensEarly();
  const buttonIdx = early.findIndex((s) => s.id === 'scr_srg_button');
  if (buttonIdx < 0) throw new Error('sdk regression gold: missing scr_srg_button');
  return [
    ...early.slice(0, buttonIdx + 1),
    sdkRegressionButtonVariantScreen(),
    ...early.slice(buttonIdx + 1),
    ...sdkRegressionKindScreensLate(),
    ...sdkRegressionPermutationScreens(),
  ];
};

/**
 * Gold-standard SDK / renderer regression flow.
 * Each screen isolates a layer or permutation with on-device TEST / EXPECTED copy.
 * Pair with {@link buildSdkRegressionGoldComments} for canvas success-criteria pins.
 */
export const buildSdkRegressionGoldManifest = (flowId: string): FlowManifest => {
  const drafts = assembleDrafts();
  const screens = chainScreens(drafts);
  const byId = new Map(screens.map((s) => [s.id, s]));
  for (const id of SRG_SCREEN_IDS) {
    if (!byId.has(id)) {
      throw new Error(`sdk regression gold: missing screen ${id}`);
    }
  }
  if (screens.length !== SRG_SCREEN_IDS.length) {
    throw new Error(
      `sdk regression gold: expected ${SRG_SCREEN_IDS.length} screens, got ${screens.length}`,
    );
  }
  // Keep chain order aligned with SRG_SCREEN_IDS for predictable QA walkthrough.
  const ordered = SRG_SCREEN_IDS.map((id) => byId.get(id)!);
  const chained = chainScreens(ordered);

  return FlowManifestSchema.parse({
    flowId,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    version: 1,
    defaultLocale: 'en',
    locales: ['en'],
    entryScreenId: 'scr_srg_entry',
    theme: {
      primary: '#4f46e5',
      primaryForeground: '#ffffff',
      background: '#fafafa',
      foreground: '#0f172a',
      accent: '#0ea5e9',
      borderRadius: 14,
      fontFamily: 'system-ui',
    },
    builderMeta: {
      layout: {
        nodes: SRG_SCREEN_IDS.map((id, index) => ({
          id,
          kind: 'screen' as const,
          ...srgNodePosition(index),
        })),
        canvas: { zoom: 0.55, x: 0, y: 0 },
      },
    },
    sdkAttributeKeys: [],
    screens: chained,
    decisionNodes: [],
    externalSurfaceNodes: [],
  });
};

export { buildSdkRegressionGoldComments } from './sdkRegressionGold/comments.js';
