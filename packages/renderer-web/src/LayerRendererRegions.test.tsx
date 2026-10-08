import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { StackLayer } from '@getrheo/contracts/layers';
import { layerSmokeManifest, layerSmokeScreen } from '@rheo/contracts-fixtures/layerSmoke';
import { BodyRegion } from './LayerRendererRegions';
import type { Ctx } from './LayerRendererShared';

const smokeCtx = (overrides?: Partial<Ctx>): Ctx => ({
  manifest: layerSmokeManifest(),
  screen: layerSmokeScreen('scr_sm_progress'),
  locale: 'en',
  interactive: false,
  theme: 'dark',
  ...overrides,
});

const LayerView = ({ layer, ctx: _ctx }: { layer: StackLayer['children'][number]; ctx: Ctx }) =>
  createElement('div', { 'data-layer-id': layer.id }, layer.kind);

describe('BodyRegion smoke', () => {
  it('renders stack children inside the body region', () => {
    const body = layerSmokeScreen('scr_sm_progress').regions.body as StackLayer;
    const html = renderToStaticMarkup(
      createElement(BodyRegion, {
        bodyLayer: body,
        ctx: smokeCtx(),
        theme: 'dark',
        showLabels: false,
        LayerView,
      }),
    );
    expect(html).toContain('data-layer-id="lyr_sm_prog_b"');
  });

  it('includes a label row when showLabels is true', () => {
    const body = layerSmokeScreen('scr_sm_progress').regions.body as StackLayer;
    const html = renderToStaticMarkup(
      createElement(BodyRegion, {
        bodyLayer: body,
        ctx: smokeCtx(),
        theme: 'light',
        showLabels: true,
        LayerView,
      }),
    );
    expect(html).toContain('Body');
    expect(html).toContain('border-top');
  });
});
