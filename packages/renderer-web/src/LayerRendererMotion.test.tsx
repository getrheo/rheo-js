import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { layerSmokeMotionScreen } from '@rheo/contracts-fixtures/layerSmoke';
import { MotionPlaybackProvider } from './motionPlayback';
import { MotionShell, RestingMotionKeyframesOnce, RestingShell } from './LayerRendererMotion';
import type { Layer } from '@getrheo/contracts/layers';

type ReactTestRenderer = {
  unmount: () => void;
};
type RtrModule = {
  create: (element: unknown) => ReactTestRenderer;
  act: (cb: () => Promise<void> | void) => Promise<void>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer = require('react-test-renderer') as RtrModule;
const { act } = TestRenderer;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('LayerRendererMotion shells', () => {
  it('wraps children with transform when a motion sample exists', () => {
    const html = renderToStaticMarkup(
      createElement(MotionPlaybackProvider, {
        screen: layerSmokeMotionScreen(),
        mode: 'scrub',
        scrubTimeMs: 200,
        children: createElement(
          MotionShell,
          {
            layerId: 'lyr_sm_motion_target',
            children: createElement('span', null, 'child'),
          },
        ),
      }),
    );
    expect(html).toContain('transform');
  });

  it('keeps the motion wrapper filling when the layer authors height fill', () => {
    const html = renderToStaticMarkup(
      createElement(MotionPlaybackProvider, {
        screen: layerSmokeMotionScreen(),
        mode: 'scrub',
        scrubTimeMs: 200,
        children: createElement(MotionShell, {
          layerId: 'lyr_sm_motion_target',
          fill: true,
          children: createElement('span', null, 'child'),
        }),
      }),
    );
    expect(html).toContain('flex:1');
    expect(html).toContain('align-self:stretch');
  });

  it('does not stretch the motion wrapper when the layer hugs', () => {
    const html = renderToStaticMarkup(
      createElement(MotionPlaybackProvider, {
        screen: layerSmokeMotionScreen(),
        mode: 'scrub',
        scrubTimeMs: 200,
        children: createElement(MotionShell, {
          layerId: 'lyr_sm_motion_target',
          children: createElement('span', null, 'child'),
        }),
      }),
    );
    expect(html).not.toContain('flex:1');
  });

  it('renders resting motion styles from RestingShell when entries exist', () => {
    const layer = layerSmokeMotionScreen().regions.body!.children[0] as Layer;
    const html = renderToStaticMarkup(
      createElement(MotionPlaybackProvider, {
        screen: layerSmokeMotionScreen(),
        mode: 'scrub',
        scrubTimeMs: 100,
        children: createElement(RestingShell, {
          layer,
          children: createElement('span', null, 'resting child'),
        }),
      }),
    );
    expect(html).toContain('resting child');
  });

  it('injects resting motion keyframes style once when document is available', async () => {
    const appendChild = vi.fn();
    const doc = {
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ id: '', textContent: '' })),
      head: { appendChild },
    };
    vi.stubGlobal('document', doc);

    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = TestRenderer.create(createElement(RestingMotionKeyframesOnce));
    });
    expect(doc.getElementById).toHaveBeenCalledWith('rheo-resting-motion-keyframes');
    expect(appendChild).toHaveBeenCalled();
    tree?.unmount();
    vi.unstubAllGlobals();
  });
});
