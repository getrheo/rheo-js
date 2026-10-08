import { createElement } from 'react';
import { create, act } from 'react-test-renderer';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatCounterLayerDisplay } from '@getrheo/flow-runtime/counterLayer';
import { layerSmokeManifest, layerSmokeScreen } from '@rheo/contracts-fixtures/layerSmoke';
import type { CounterLayer, LoaderLayer, ProgressLayer } from '@getrheo/contracts/layers';
import { CounterView, LoaderView, ProgressView } from './feedbackLayers';
import type { Ctx } from '../LayerRendererShared';

vi.mock('../motionPlayback', () => ({
  useMotionController: () => ({
    getTime: () => 0,
    subscribe: () => () => undefined,
  }),
}));

const smokeCtx = (screenId: string, overrides?: Partial<Ctx>): Ctx => ({
  manifest: layerSmokeManifest(),
  screen: layerSmokeScreen(screenId),
  locale: 'en',
  interactive: false,
  theme: 'dark',
  ...overrides,
});

const findLayer = <T extends { id: string }>(
  screenId: string,
  layerId: string,
): T => {
  const screen = layerSmokeScreen(screenId);
  const body = screen.regions.body;
  if (!body || body.kind !== 'stack') throw new Error('expected stack body');
  const layer = body.children.find((c) => c.id === layerId);
  if (!layer) throw new Error(`layer ${layerId} missing`);
  return layer as unknown as T;
};

describe('LoaderView onComplete', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires cta primary after fill duration when onComplete is next (with motion controller)', () => {
    vi.useFakeTimers();
    const onRespond = vi.fn();
    const layer = findLayer<LoaderLayer>('scr_sm_loader_linear', 'lyr_sm_ld_lin');
    act(() => {
      create(
        createElement(LoaderView, {
          layer: { ...layer, onComplete: { mode: 'next' }, durationMs: 800, fillDelayMs: 0 },
          ctx: smokeCtx('scr_sm_loader_linear', { interactive: true, onRespond }),
        }),
      );
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(onRespond).toHaveBeenCalledWith({ kind: 'cta', action: 'primary' });
  });
});

describe('feedbackLayers SSR smoke', () => {
  it('renders ProgressView with flow progress aria-valuenow on screen 2 of 10', () => {
    const layer = findLayer<ProgressLayer>('scr_sm_progress', 'lyr_sm_prog');
    const html = renderToStaticMarkup(
      createElement(ProgressView, { layer, ctx: smokeCtx('scr_sm_progress') }),
    );
    expect(html).toContain('role="progressbar"');
    expect(html).toMatch(/aria-valuenow="22"/);
  });

  it('renders LoaderView linear track at full width when interactive is false', () => {
    const layer = findLayer<LoaderLayer>('scr_sm_loader_linear', 'lyr_sm_ld_lin');
    const html = renderToStaticMarkup(
      createElement(LoaderView, { layer, ctx: smokeCtx('scr_sm_loader_linear') }),
    );
    expect(html).toContain('width:100%');
  });

  it('renders LoaderView circular variant with svg circle', () => {
    const layer = findLayer<LoaderLayer>('scr_sm_loader_circ', 'lyr_sm_ld_circ');
    const html = renderToStaticMarkup(
      createElement(LoaderView, { layer, ctx: smokeCtx('scr_sm_loader_circ') }),
    );
    expect(html.toLowerCase()).toContain('<circle');
  });

  it('centers circular LoaderView when align is center', () => {
    const layer = findLayer<LoaderLayer>('scr_sm_loader_circ', 'lyr_sm_ld_circ');
    const html = renderToStaticMarkup(
      createElement(LoaderView, {
        layer: { ...layer, align: 'center' },
        ctx: smokeCtx('scr_sm_loader_circ'),
      }),
    );
    expect(html).toContain('justify-content:center');
  });

  it('renders CounterView time display at t=0', () => {
    const layer = findLayer<CounterLayer>('scr_sm_counter', 'lyr_sm_ctr');
    const expected = formatCounterLayerDisplay(layer.startValue, {
      displayKind: layer.displayKind,
      decimalPlaces: layer.decimalPlaces,
      timeFormat: layer.timeFormat,
    });
    const html = renderToStaticMarkup(
      createElement(CounterView, { layer, ctx: smokeCtx('scr_sm_counter') }),
    );
    expect(html).toContain(expected);
  });
});
