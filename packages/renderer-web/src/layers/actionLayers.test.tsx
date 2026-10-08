import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@getrheo/flow-ui-state', () => ({
  useScreenInputDraft: () => null,
  useScreenInputValidity: () => ({ valid: false }),
  useScreenCheckboxAck: () => null,
  useCheckboxContinueBlocked: () => false,
}));
import { renderToStaticMarkup } from 'react-dom/server';
import { layerSmokeManifest, layerSmokeScreen } from '@rheo/contracts-fixtures/layerSmoke';
import type { BackButtonLayer, ButtonLayer } from '@getrheo/contracts/layers';
import { buttonBaseStyle, BackButtonView, ButtonView } from './actionLayers';
import type { Ctx, RenderLayer } from '../LayerRendererShared';

const smokeCtx = (screenId: string, overrides?: Partial<Ctx>): Ctx => ({
  manifest: layerSmokeManifest(),
  screen: layerSmokeScreen(screenId),
  locale: 'en',
  interactive: false,
  theme: 'dark',
  ...overrides,
});

const noopRender: RenderLayer = () => null;

const findLayer = <T extends { id: string }>(screenId: string, layerId: string): T => {
  const body = layerSmokeScreen(screenId).regions.body;
  if (!body || body.kind !== 'stack') throw new Error('expected stack body');
  const layer = body.children.find((c) => c.id === layerId);
  if (!layer) throw new Error(`layer ${layerId} missing`);
  return layer as unknown as T;
};

describe('actionLayers', () => {
  describe('buttonBaseStyle parity', () => {
    it('matches golden palette for variants × themes', () => {
      const matrix = (['primary', 'secondary', 'ghost'] as const).flatMap((variant) =>
        (['light', 'dark'] as const).map((theme) => ({
          variant,
          theme,
          style: buttonBaseStyle(variant, theme),
        })),
      );
      expect(matrix).toMatchSnapshot();
    });
  });

  describe('ButtonView / BackButtonView smoke', () => {
    it('renders continue button element', () => {
      const layer = findLayer<ButtonLayer>('scr_sm_button', 'lyr_sm_btn_primary');
      const html = renderToStaticMarkup(
        createElement(ButtonView, { layer, ctx: smokeCtx('scr_sm_button'), renderLayer: noopRender }),
      );
      expect(html).toContain('<button');
      expect(html).toContain('Continue');
    });

    it('marks nativeDisabled on continue when interactive and invalid', () => {
      const layer = findLayer<ButtonLayer>('scr_sm_button', 'lyr_sm_btn_primary');
      const html = renderToStaticMarkup(
        createElement(ButtonView, {
          layer,
          ctx: smokeCtx('scr_sm_button', { interactive: true }),
          renderLayer: noopRender,
        }),
      );
      expect(html).toContain('opacity:0.5');
    });

    it('fills height by stretching the selectable wrap when height is fill', () => {
      const base = findLayer<ButtonLayer>('scr_sm_button', 'lyr_sm_btn_primary');
      const layer: ButtonLayer = { ...base, style: { ...base.style, height: 'fill' } };
      const html = renderToStaticMarkup(
        createElement(ButtonView, {
          layer,
          ctx: smokeCtx('scr_sm_button', { parentStackDirection: 'vertical' }),
          renderLayer: noopRender,
        }),
      );
      // The `data-layer-id` wrapper must carry the fill bridge so the inner
      // `<button>` (`flex-grow:1; height:100%`) can stretch via cross-axis stretch.
      const wrap = html.slice(html.indexOf(`data-layer-id="${layer.id}"`));
      expect(wrap).toContain('flex:1');
      expect(wrap).toContain('align-self:stretch');
      expect(wrap).toContain('display:flex');
    });

    it('does not stretch the selectable wrap when height hugs content', () => {
      const layer = findLayer<ButtonLayer>('scr_sm_button', 'lyr_sm_btn_primary');
      const html = renderToStaticMarkup(
        createElement(ButtonView, {
          layer,
          ctx: smokeCtx('scr_sm_button', { parentStackDirection: 'vertical' }),
          renderLayer: noopRender,
        }),
      );
      const wrap = html.slice(
        html.indexOf(`data-layer-id="${layer.id}"`),
        html.indexOf('<button'),
      );
      expect(wrap).not.toContain('flex:1');
    });

    it('hugs width on the pressable chrome in a horizontal stack when width is auto', () => {
      const base = findLayer<ButtonLayer>('scr_sm_button', 'lyr_sm_btn_primary');
      const layer: ButtonLayer = { ...base, style: { ...base.style, width: 'auto' } };
      const html = renderToStaticMarkup(
        createElement(ButtonView, {
          layer,
          ctx: smokeCtx('scr_sm_button', { parentStackDirection: 'horizontal' }),
          renderLayer: noopRender,
        }),
      );
      const buttonStyle = html.match(/<button[^>]*style="([^"]*)"/)?.[1] ?? '';
      expect(buttonStyle).not.toContain('width:100%');
    });

    it('renders BackButtonView with icon child', () => {
      const layer = findLayer<BackButtonLayer>('scr_sm_button', 'lyr_sm_back');
      const renderLayer: RenderLayer = (child) =>
        createElement('span', { key: child.id, 'data-kind': child.kind });
      const html = renderToStaticMarkup(
        createElement(BackButtonView, {
          layer,
          ctx: smokeCtx('scr_sm_button'),
          renderLayer,
        }),
      );
      expect(html).toContain('data-kind="icon"');
    });

    it('uses text-child typography over button chrome for inline labels', () => {
      const base = findLayer<ButtonLayer>('scr_sm_button', 'lyr_sm_btn_primary');
      const layer: ButtonLayer = {
        ...base,
        style: { ...base.style, fontSize: 13, fontWeight: 600 },
        children: base.children.map((c) =>
          c.kind === 'text'
            ? { ...c, style: { ...c.style, fontSize: 24, fontWeight: 300 } }
            : c,
        ),
      };
      const html = renderToStaticMarkup(
        createElement(ButtonView, {
          layer,
          ctx: smokeCtx('scr_sm_button'),
          renderLayer: noopRender,
        }),
      );
      expect(html).toContain('font-size:24px');
      expect(html).toContain('font-weight:300');
    });
  });
});
