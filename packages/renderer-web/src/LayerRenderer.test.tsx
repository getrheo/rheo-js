import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { previewPhoneSafeAreaPadding } from '@getrheo/flow-runtime/responsive/previewSafeAreaInsets';
import { LayerRenderer } from './LayerRenderer';
import { validFlow } from '@rheo/contracts-fixtures/validFlow';
import { buildAuthCanvasManifest, buildStressHarnessManifest } from '@rheo/seeds';
import type { Screen } from '@getrheo/contracts/screens';

describe('LayerRenderer', () => {
  it('renders the entry screen of the valid fixture (snapshot)', () => {
    const manifest = validFlow();
    const screen = manifest.screens.find((s) => s.id === manifest.entryScreenId) as
      | Screen
      | undefined;
    if (!screen) throw new Error('entry screen missing in fixture');

    const html = renderToStaticMarkup(
      <LayerRenderer manifest={manifest} screen={screen} mode="static" theme="dark" />,
    );

    expect(html).toMatchSnapshot();
  });

  it('renders each screen without throwing', () => {
    const manifest = validFlow();
    for (const screen of manifest.screens as unknown as Screen[]) {
      const html = renderToStaticMarkup(
        <LayerRenderer manifest={manifest} screen={screen} mode="static" />,
      );
      expect(html).toBeTruthy();
    }
  });

  it('renders every stress-harness screen in static mode without throwing', () => {
    const manifest = buildStressHarnessManifest('00000000-0000-0000-0000-00000000beef');
    for (const screen of manifest.screens) {
      const html = renderToStaticMarkup(
        <LayerRenderer manifest={manifest} screen={screen} mode="static" theme="light" />,
      );
      expect(html.length).toBeGreaterThan(0);
    }
  });

  it('applies motion wrappers to nested animated layers', () => {
    const manifest = validFlow();
    const screen: Screen = {
      id: 'scr_motion',
      name: 'Motion',
      next: { default: null },
      regions: {
        body: {
          id: 'lyr_body',
          kind: 'stack',
          direction: 'vertical',
          children: [
            {
              id: 'lyr_text',
              kind: 'text',
              text: { default: 'Animated child' },
            },
          ],
        },
      },
      animations: [
        {
          id: 'clip_text',
          targetLayerId: 'lyr_text',
          trigger: 'mount',
          durationMs: 400,
          tracks: [
            {
              property: 'translateY',
              keyframes: [
                { t: 0, value: -16 },
                { t: 1, value: 0 },
              ],
            },
          ],
        },
      ],
    };

    const html = renderToStaticMarkup(
      <LayerRenderer
        manifest={{ ...manifest, screens: [screen], entryScreenId: screen.id }}
        screen={screen}
        mode="static"
        motionMode="scrub"
        motionScrubTimeMs={0}
      />,
    );

    expect(html).toContain('translateY(-16px)');
    expect(html.indexOf('translateY(-16px)')).toBeLessThan(html.indexOf('data-layer-id="lyr_text"'));
  });

  it('does not apply horizontal safe-area preview padding (portrait matches RN)', () => {
    const manifest = validFlow();
    const screen = manifest.screens.find((s) => s.id === manifest.entryScreenId) as
      | Screen
      | undefined;
    if (!screen) throw new Error('entry screen missing in fixture');

    const html = renderToStaticMarkup(
      <LayerRenderer
        manifest={manifest}
        screen={screen}
        mode="static"
        theme="dark"
        simulateSafeArea
      />,
    );

    expect(html).not.toMatch(/padding-left:max\(env\(safe-area-inset-left/);
    expect(html).not.toMatch(/padding-right:max\(env\(safe-area-inset-right/);
    expect(html).toContain('padding-left:env(safe-area-inset-left, 0px)');
    expect(html).toContain('padding-right:env(safe-area-inset-right, 0px)');
  });

  it('merges insetSafeArea into shell padding without duplicate simulateSafeArea', () => {
    const manifest = validFlow();
    const baseScreen = manifest.screens.find((s) => s.id === manifest.entryScreenId);
    if (!baseScreen) throw new Error('entry screen missing in fixture');
    const previewWidth = 390;
    const safe = previewPhoneSafeAreaPadding(previewWidth, 'ios');
    const screen: Screen = {
      ...baseScreen,
      containerStyle: {
        insetSafeArea: true,
        padding: { t: 8, l: 12 },
      },
    };

    const html = renderToStaticMarkup(
      <LayerRenderer
        manifest={manifest}
        screen={screen}
        mode="static"
        theme="dark"
        previewWidthPx={previewWidth}
        previewSafeAreaSystemUi="ios"
      />,
    );

    expect(html).toContain(`padding-top:${(safe.t ?? 0) + 8}px`);
    expect(html).toContain(`padding-left:12px`);
    expect(html).not.toMatch(/padding-top:max\(env\(safe-area-inset-top/);
  });

  it('does not simulate safe area on the builder canvas unless insetSafeArea is enabled', () => {
    const manifest = validFlow();
    const baseScreen = manifest.screens.find((s) => s.id === manifest.entryScreenId);
    if (!baseScreen) throw new Error('entry screen missing in fixture');

    const html = renderToStaticMarkup(
      <LayerRenderer
        manifest={manifest}
        screen={baseScreen}
        mode="static"
        theme="dark"
        previewWidthPx={390}
        authoringPreview
      />,
    );

    expect(html).not.toMatch(/padding-top:max\(env\(safe-area-inset-top/);
    // Foreground flex column still wraps regions so Fill chains work without safe-area sim.
    expect(html).toMatch(
      /position:relative;display:flex;flex-direction:column;box-sizing:border-box;flex:1;min-height:0;min-width:0/,
    );
  });

  it('does not inset foreground content when insetSafeArea is off', () => {
    const manifest = validFlow();
    const baseScreen = manifest.screens.find((s) => s.id === manifest.entryScreenId);
    if (!baseScreen) throw new Error('entry screen missing in fixture');
    const previewWidth = 390;
    const safe = previewPhoneSafeAreaPadding(previewWidth, 'ios');
    const screen: Screen = {
      ...baseScreen,
      containerStyle: {
        insetSafeArea: false,
      },
    };

    const html = renderToStaticMarkup(
      <LayerRenderer
        manifest={manifest}
        screen={screen}
        mode="static"
        theme="dark"
        previewWidthPx={previewWidth}
        previewSafeAreaSystemUi="ios"
      />,
    );

    expect(html).not.toContain(`padding-top:${safe.t}px`);
    expect(html).not.toMatch(/padding-top:max\(env\(safe-area-inset-top/);
  });

  it('renders auth canvas entry screen (snapshot)', () => {
    const manifest = buildAuthCanvasManifest('00000000-0000-0000-0000-00000000a001');
    const screen = manifest.screens.find((s) => s.id === manifest.entryScreenId);
    if (!screen) throw new Error('auth entry screen missing');
    const html = renderToStaticMarkup(
      <LayerRenderer manifest={manifest} screen={screen} mode="static" theme="dark" />,
    );
    expect(html).toMatchSnapshot();
  });
});
