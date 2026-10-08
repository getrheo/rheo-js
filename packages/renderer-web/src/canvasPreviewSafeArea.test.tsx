import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { validFlow } from '@rheo/contracts-fixtures/validFlow';
import type { Screen } from '@getrheo/contracts/screens';
import { previewPhoneSafeAreaPadding } from '@getrheo/flow-runtime/responsive/previewSafeAreaInsets';
import { LayerRenderer } from './LayerRenderer';
import { PhoneFrame } from './PhoneFrame';

const IPHONE_17_PRO_WIDTH = 402;

const renderCanvasPreview = (screen: Screen, mediaMap?: Record<string, string>) =>
  renderToStaticMarkup(
    createElement(
      PhoneFrame,
      {
        width: IPHONE_17_PRO_WIDTH,
        height: 874,
        theme: 'dark',
        systemUi: 'ios',
        children: createElement(LayerRenderer, {
          manifest: validFlow(),
          screen,
          mode: 'static',
          theme: 'dark',
          authoringPreview: true,
          showRegionLabels: true,
          previewWidthPx: IPHONE_17_PRO_WIDTH,
          previewSafeAreaSystemUi: 'ios',
          simulateSafeArea: false,
          mediaMap,
        }),
      },
    ),
  );

describe('canvas preview safe area (PhoneFrame + LayerRenderer)', () => {
  it('applies preview safe-area padding when insetSafeArea is on', () => {
    const manifest = validFlow();
    const base = manifest.screens.find((s) => s.id === manifest.entryScreenId);
    if (!base) throw new Error('entry screen missing');
    const safe = previewPhoneSafeAreaPadding(IPHONE_17_PRO_WIDTH, 'ios');
    const screen: Screen = {
      ...base,
      containerStyle: {
        insetSafeArea: true,
        padding: { t: 0, r: 0, b: 0, l: 0 },
        backgroundFill: {
          kind: 'image',
          media: { mediaAssetId: 'asset-bg' },
        },
      },
    };

    const html = renderCanvasPreview(screen, { 'asset-bg': 'https://example.com/bg.jpg' });

    expect(html).toContain(`padding-top:${safe.t}px`);
  });

  it('does not apply preview safe-area padding when insetSafeArea is off', () => {
    const manifest = validFlow();
    const base = manifest.screens.find((s) => s.id === manifest.entryScreenId);
    if (!base) throw new Error('entry screen missing');
    const safe = previewPhoneSafeAreaPadding(IPHONE_17_PRO_WIDTH, 'ios');
    const screen: Screen = {
      ...base,
      containerStyle: {
        insetSafeArea: false,
        padding: { t: 0, r: 0, b: 0, l: 0 },
        backgroundFill: {
          kind: 'image',
          media: { mediaAssetId: 'asset-bg' },
        },
      },
    };

    const html = renderCanvasPreview(screen, { 'asset-bg': 'https://example.com/bg.jpg' });

    expect(html).not.toContain(`padding-top:${safe.t}px`);
    expect(html).not.toMatch(/padding-top:max\(env\(safe-area-inset-top/);
  });

  it('matches flow preview padding when canvas uses region labels and paused motion', () => {
    const manifest = validFlow();
    const base = manifest.screens.find((s) => s.id === manifest.entryScreenId);
    if (!base) throw new Error('entry screen missing');
    const safe = previewPhoneSafeAreaPadding(IPHONE_17_PRO_WIDTH, 'ios');
    const screen: Screen = {
      ...base,
      containerStyle: {
        insetSafeArea: false,
        padding: { t: 0, r: 0, b: 0, l: 0 },
      },
    };

    const canvasHtml = renderToStaticMarkup(
      createElement(
        PhoneFrame,
        {
          width: IPHONE_17_PRO_WIDTH,
          height: 874,
          theme: 'dark',
          systemUi: 'ios',
          children: createElement(LayerRenderer, {
            manifest,
            screen,
            mode: 'static',
            theme: 'dark',
            authoringPreview: true,
            showRegionLabels: true,
            simulateSafeArea: false,
            previewWidthPx: IPHONE_17_PRO_WIDTH,
            previewSafeAreaSystemUi: 'ios',
            motionMode: 'paused',
          }),
        },
      ),
    );

    const flowHtml = renderToStaticMarkup(
      createElement(
        PhoneFrame,
        {
          width: IPHONE_17_PRO_WIDTH,
          height: 874,
          theme: 'dark',
          systemUi: 'ios',
          children: createElement(LayerRenderer, {
            manifest,
            screen,
            mode: 'interactive',
            theme: 'dark',
            authoringPreview: false,
            simulateSafeArea: false,
            previewWidthPx: IPHONE_17_PRO_WIDTH,
            previewSafeAreaSystemUi: 'ios',
            motionMode: 'preview',
          }),
        },
      ),
    );

    expect(canvasHtml).not.toContain(`padding-top:${safe.t}px`);
    expect(flowHtml).not.toContain(`padding-top:${safe.t}px`);
    expect(canvasHtml).not.toMatch(/padding-top:max\(env\(safe-area-inset-top/);
    expect(flowHtml).not.toMatch(/padding-top:max\(env\(safe-area-inset-top/);
  });
});
