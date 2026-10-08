import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { validFlow } from '@rheo/contracts-fixtures/validFlow';
import type { Screen } from '@getrheo/contracts/screens';
import { ScreenShellBackdrop } from './screenBackground';

describe('ScreenShellBackdrop video', () => {
  const screenWithVideoBg = (): Screen => ({
    id: 'scr_bg_video',
    name: 'Video bg',
    next: { default: null },
    containerStyle: {
      backgroundFill: {
        kind: 'video',
        media: { mediaAssetId: 'asset-bg-video' },
        audioEnabled: true,
        autoPlay: true,
      },
    },
    regions: {
      body: {
        id: 'lyr_body',
        kind: 'stack',
        direction: 'vertical',
        children: [],
      },
    },
  });

  it('renders shell video muted in canvas poster mode even when audioEnabled', () => {
    const screen = screenWithVideoBg();
    const html = renderToStaticMarkup(
      createElement(ScreenShellBackdrop, {
        screen,
        theme: validFlow().theme,
        palette: 'dark',
        mediaMap: { 'asset-bg-video': 'https://example.com/bg.mp4' },
        canvasPosterMode: true,
      }),
    );
    expect(html).toContain('<video');
    expect(html).toContain('muted');
    expect(html).toContain('preload="metadata"');
  });

  it('renders shell video unmuted when not in poster mode and audioEnabled', () => {
    const screen = screenWithVideoBg();
    const html = renderToStaticMarkup(
      createElement(ScreenShellBackdrop, {
        screen,
        theme: validFlow().theme,
        palette: 'dark',
        mediaMap: { 'asset-bg-video': 'https://example.com/bg.mp4' },
        canvasPosterMode: false,
      }),
    );
    expect(html).toContain('<video');
    expect(html).not.toContain('muted');
  });
});
