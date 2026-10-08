import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MotionController } from './motionPlayback';
import {
  MotionPlaybackProvider,
  useLayerMotion,
  useMotionController,
} from './motionPlayback';
import type { Screen } from '@getrheo/contracts/screens';

const scrubScreen = (): Screen => ({
  id: 'scr_scrub',
  name: 'Scrub',
  next: { default: null },
  regions: {
    body: { id: 'lyr_body', kind: 'stack', direction: 'vertical', children: [] },
  },
  animations: [
    {
      id: 'clip_scrub',
      targetLayerId: 'lyr_target',
      trigger: 'mount',
      durationMs: 400,
      tracks: [
        {
          property: 'opacity',
          keyframes: [
            { t: 0, value: 0, easing: 'standard' },
            { t: 1, value: 1 },
          ],
        },
      ],
    },
  ],
});

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

const motionScreen = () => scrubScreen();

const ControllerCapture = ({
  onController,
}: {
  onController: (c: MotionController | null) => void;
}) => {
  onController(useMotionController());
  return null;
};

const LayerMotionProbe = ({ layerId }: { layerId: string }) => {
  const sample = useLayerMotion(layerId);
  return createElement('span', { 'data-has-sample': sample ? 'yes' : 'no' });
};

describe('MotionPlaybackProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      const id = setTimeout(() => cb(performance.now()), 0);
      return id as unknown as number;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reflects scrubTimeMs when mode is scrub', async () => {
    let controller: MotionController | null = null;
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = TestRenderer.create(
        createElement(MotionPlaybackProvider, {
          screen: motionScreen(),
          mode: 'scrub',
          scrubTimeMs: 300,
          children: createElement(ControllerCapture, {
            onController: (c) => {
              controller = c;
            },
          }),
        }),
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(controller).not.toBeNull();
    expect(controller!.getTime()).toBe(300);
    tree?.unmount();
  });

  it('rewinds preview to t=0 when previewStartMs is at the timeline end', async () => {
    let controller: MotionController | null = null;
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = TestRenderer.create(
        createElement(MotionPlaybackProvider, {
          screen: motionScreen(),
          mode: 'preview',
          previewStartMs: 400,
          children: createElement(ControllerCapture, {
            onController: (c) => {
              controller = c;
            },
          }),
        }),
      );
    });
    expect(controller).not.toBeNull();
    expect(controller!.getTime()).toBe(0);
    await act(async () => {
      tree?.unmount();
    });
  });

  it('returns null from useLayerMotion when the layer has no clips', async () => {
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = TestRenderer.create(
        createElement(MotionPlaybackProvider, {
          screen: motionScreen(),
          mode: 'scrub',
          scrubTimeMs: 0,
          children: createElement(LayerMotionProbe, { layerId: 'lyr_no_clips' }),
        }),
      );
    });
    const json = JSON.stringify(tree);
    expect(json).toContain('"data-has-sample":"no"');
    tree?.unmount();
  });

});
