import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { validFlow } from '@rheo/contracts-fixtures/validFlow';
import type { Screen } from '@getrheo/contracts/screens';
import { LayerRenderer } from './LayerRenderer';

describe('LayerRenderer shell media backdrop', () => {
  const screenWithImageBgAndHeader = (): Screen => ({
    id: 'scr_bg_image',
    name: 'Image bg',
    next: { default: null },
    containerStyle: {
      backgroundFill: {
        kind: 'image',
        media: { mediaAssetId: 'asset-bg-image' },
      },
    },
    regions: {
      header: {
        id: 'lyr_header',
        kind: 'stack',
        direction: 'vertical',
        children: [
          {
            id: 'lyr_header_text',
            kind: 'text',
            text: { default: 'Header visible' },
          },
        ],
      },
      body: {
        id: 'lyr_body',
        kind: 'stack',
        direction: 'vertical',
        children: [],
      },
    },
  });

  it('keeps header/footer regions above the absolute shell backdrop when safe area is off', () => {
    const manifest = validFlow();
    const screen = screenWithImageBgAndHeader();
    const html = renderToStaticMarkup(
      createElement(LayerRenderer, {
        manifest,
        screen,
        mode: 'static',
        theme: 'dark',
        mediaMap: { 'asset-bg-image': 'https://example.com/bg.jpg' },
      }),
    );
    const backdropIdx = html.indexOf('https://example.com/bg.jpg');
    const headerIdx = html.indexOf('Header visible');
    expect(backdropIdx).toBeGreaterThan(-1);
    expect(headerIdx).toBeGreaterThan(backdropIdx);
    expect(html).toMatch(/z-index:\s*1/);
    expect(html).not.toMatch(/padding-top:\d+px/);
  });

  const screenWithColorBg = (): Screen => ({
    id: 'scr_bg_color',
    name: 'Color bg',
    next: { default: null },
    containerStyle: {
      backgroundFill: { kind: 'color', color: '#ff0000' },
    },
    regions: {
      body: {
        id: 'lyr_body',
        kind: 'stack',
        direction: 'vertical',
        children: [
          { id: 'lyr_text', kind: 'text', text: { default: 'Edit me' } },
        ],
      },
    },
  });

  it('paints shell color background when intrinsicHeight is true (responsive banner)', () => {
    const manifest = validFlow();
    const screen = screenWithColorBg();
    const html = renderToStaticMarkup(
      createElement(LayerRenderer, {
        manifest,
        screen,
        mode: 'static',
        theme: 'dark',
        intrinsicHeight: true,
        showRegionLabels: true,
        previewWidthPx: 390,
        authoringPreview: true,
        motionMode: 'paused',
      }),
    );
    expect(html).toMatch(/background:(#ff0000|rgb\(255,\s*0,\s*0\))/);
    expect(html).not.toMatch(/position:absolute;inset:0;z-index:0[^"]*background:#ff0000/);
    expect(html).toContain('Edit me');
  });

  it('keeps regions above the shell backdrop when intrinsicHeight is true (banner canvas)', () => {
    const manifest = validFlow();
    const screen = screenWithImageBgAndHeader();
    const html = renderToStaticMarkup(
      createElement(LayerRenderer, {
        manifest,
        screen,
        mode: 'static',
        theme: 'dark',
        intrinsicHeight: true,
        mediaMap: { 'asset-bg-image': 'https://example.com/bg.jpg' },
      }),
    );
    const backdropIdx = html.indexOf('https://example.com/bg.jpg');
    const headerIdx = html.indexOf('Header visible');
    expect(backdropIdx).toBeGreaterThan(-1);
    expect(headerIdx).toBeGreaterThan(backdropIdx);
    expect(html).toMatch(/z-index:\s*1/);
  });
});
