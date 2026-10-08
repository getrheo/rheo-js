import { FlowManifestSchema, MANIFEST_SCHEMA_VERSION, type FlowManifest } from '@getrheo/contracts/manifest';
import { animationStressHarnessScreens } from './animationStressHarness/screens.js';

/** Exhaustive animation clip + resting-motion harness for cross-SDK parity QA. */
export const buildAnimationStressHarnessManifest = (flowId: string): FlowManifest => {
  const screens = animationStressHarnessScreens();
  return FlowManifestSchema.parse({
    flowId,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    version: 1,
    defaultLocale: 'en',
    locales: ['en'],
    entryScreenId: screens[0]!.id,
    theme: {
      primary: '#4f46e5',
      background: '#fafafa',
      foreground: '#0a0a0a',
      borderRadius: 12,
    },
    builderMeta: {
      layout: {
        nodes: screens.map((screen, index) => ({
          id: screen.id,
          kind: 'screen' as const,
          x: 40 + (index % 5) * 200,
          y: 40 + Math.floor(index / 5) * 120,
        })),
        canvas: { zoom: 0.7, x: 0, y: 0 },
      },
    },
    sdkAttributeKeys: [],
    screens,
    decisionNodes: [],
  });
};

/** @deprecated Use {@link buildAnimationStressHarnessManifest}. */
export const buildAnimationLabManifest = buildAnimationStressHarnessManifest;
