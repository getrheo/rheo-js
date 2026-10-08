import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@getrheo/flow-ui-state', () => ({
  useScreenInputDraft: () => null,
  useScreenInputValidity: () => ({ valid: true }),
  useScreenCheckboxAck: () => null,
  useCheckboxContinueBlocked: () => false,
}));
import { layerSmokeManifest, layerSmokeScreen } from '@rheo/contracts-fixtures/layerSmoke';
import type { ButtonLayer, CarouselLayer, StackLayer } from '@getrheo/contracts/layers';
import type { StepResponse } from '@getrheo/flow-runtime/stateMachine';
import { CarouselControlProvider } from '../carouselControl';
import { ButtonView } from './actionLayers';
import { CarouselView } from './carouselLayers';
import type { Ctx, RenderLayer } from '../LayerRendererShared';

type TestNode = { props: Record<string, unknown> };
type ReactTestRenderer = {
  root: { findAllByType: (type: string) => TestNode[] };
  unmount: () => void;
};
type RtrModule = {
  create: (element: ReactNode) => ReactTestRenderer;
  act: (cb: () => Promise<void> | void) => Promise<void>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer = require('react-test-renderer') as RtrModule;
const { act } = TestRenderer;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const slide = (id: string): StackLayer => ({
  id,
  kind: 'stack',
  direction: 'vertical',
  children: [],
});

const carousel = (overrides: Partial<CarouselLayer> = {}): CarouselLayer => ({
  id: 'lyr_car_1',
  kind: 'carousel',
  slides: [slide('lyr_s1'), slide('lyr_s2'), slide('lyr_s3')],
  ...overrides,
});

const advanceButton = (action: ButtonLayer['action']): ButtonLayer => ({
  id: 'lyr_btn_next',
  kind: 'button',
  variant: 'primary',
  action,
  children: [],
});

const noopRender: RenderLayer = () => null;

const renderPair = async (
  carouselLayer: CarouselLayer,
  button: ButtonLayer,
  onRespond: (r: StepResponse) => void,
) => {
  const ctx: Ctx = {
    manifest: layerSmokeManifest(),
    screen: layerSmokeScreen('scr_sm_1'),
    locale: 'en',
    interactive: true,
    theme: 'dark',
    onRespond,
  };
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = TestRenderer.create(
      createElement(
        CarouselControlProvider,
        null,
        createElement(CarouselView, { layer: carouselLayer, ctx, renderLayer: noopRender }),
        createElement(ButtonView, { layer: button, ctx, renderLayer: noopRender }),
      ),
    );
  });
  const tap = async () => {
    const btn = tree!.root.findAllByType('button')[0];
    const onClick = btn?.props.onClick as
      | ((e: { stopPropagation: () => void }) => void)
      | undefined;
    await act(async () => {
      onClick?.({ stopPropagation: () => {} });
    });
  };
  const unmount = async () => {
    await act(async () => {
      tree?.unmount();
    });
  };
  return { tap, unmount };
};

describe('advance_carousel button action (web)', () => {
  it('pages forward and emits carousel completion on arrival at the last slide', async () => {
    const onRespond = vi.fn();
    const { tap, unmount } = await renderPair(
      carousel(),
      advanceButton({ kind: 'advance_carousel', targetLayerId: 'lyr_car_1' }),
      onRespond,
    );

    await tap();
    expect(onRespond).not.toHaveBeenCalled();

    await tap();
    expect(onRespond).toHaveBeenCalledTimes(1);
    expect(onRespond).toHaveBeenCalledWith({ kind: 'carousel' });

    await unmount();
  });

  it('stays put without completing when tapped on the last slide with onLast noop', async () => {
    const onRespond = vi.fn();
    const { tap, unmount } = await renderPair(
      carousel({ openOn: 2 }),
      advanceButton({ kind: 'advance_carousel', targetLayerId: 'lyr_car_1', onLast: 'noop' }),
      onRespond,
    );

    await tap();
    expect(onRespond).not.toHaveBeenCalled();

    await unmount();
  });

  it('completes when tapped on the last slide with onLast complete', async () => {
    const onRespond = vi.fn();
    const { tap, unmount } = await renderPair(
      carousel({ openOn: 2 }),
      advanceButton({ kind: 'advance_carousel', targetLayerId: 'lyr_car_1', onLast: 'complete' }),
      onRespond,
    );

    await tap();
    expect(onRespond).toHaveBeenCalledWith({ kind: 'carousel' });

    await unmount();
  });

  it('never completes a looping carousel', async () => {
    const onRespond = vi.fn();
    const { tap, unmount } = await renderPair(
      carousel({ openOn: 2, loop: true }),
      advanceButton({ kind: 'advance_carousel', targetLayerId: 'lyr_car_1', onLast: 'complete' }),
      onRespond,
    );

    await tap();
    await tap();
    expect(onRespond).not.toHaveBeenCalled();

    await unmount();
  });

  it('no-ops on a single-slide carousel even with onLast complete', async () => {
    const onRespond = vi.fn();
    const { tap, unmount } = await renderPair(
      carousel({ slides: [slide('lyr_s1')] }),
      advanceButton({ kind: 'advance_carousel', targetLayerId: 'lyr_car_1', onLast: 'complete' }),
      onRespond,
    );

    await tap();
    expect(onRespond).not.toHaveBeenCalled();

    await unmount();
  });

  it('ignores taps that target a carousel which is not mounted', async () => {
    const onRespond = vi.fn();
    const { tap, unmount } = await renderPair(
      carousel(),
      advanceButton({ kind: 'advance_carousel', targetLayerId: 'lyr_car_missing' }),
      onRespond,
    );

    await tap();
    await tap();
    expect(onRespond).not.toHaveBeenCalled();

    await unmount();
  });
});
