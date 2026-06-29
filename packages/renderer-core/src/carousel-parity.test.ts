import { describe, expect, it } from 'vitest';
import type { CarouselLayer, StackLayer } from '@getrheo/contracts/layers';
import {
  rendererCarouselAdvanceIndex,
  rendererCarouselShouldEmitComplete,
  rendererCarouselIndexFromScrollOffset,
  rendererCarouselLayoutModel,
  rendererCarouselPageDotsModel,
  rendererCarouselScrollOffset,
  rendererCarouselSlideIndex,
  rendererCarouselSlideWidth,
} from './carouselModel';

const slide = (id: string): StackLayer => ({
  id,
  kind: 'stack',
  direction: 'vertical',
  children: [],
});

const carouselLayer = (overrides: Partial<CarouselLayer> = {}): CarouselLayer => ({
  id: 'car_1',
  kind: 'carousel',
  slides: [slide('s1'), slide('s2'), slide('s3')],
  ...overrides,
});

describe('renderer-core carousel parity', () => {
  describe('rendererCarouselSlideIndex', () => {
    it('clamps openOn to slide bounds', () => {
      const layer = carouselLayer({ openOn: 99 });
      expect(rendererCarouselSlideIndex(layer, 3)).toBe(2);
      expect(rendererCarouselSlideIndex(carouselLayer({ openOn: -1 }), 3)).toBe(0);
    });

    it('returns 0 when slideCount is zero', () => {
      expect(rendererCarouselSlideIndex(carouselLayer(), 0)).toBe(0);
    });
  });

  describe('rendererCarouselLayoutModel', () => {
    it('maps pageAlignment to alignAxis', () => {
      expect(rendererCarouselLayoutModel(carouselLayer({ pageAlignment: 'top' })).alignAxis).toBe(
        'start',
      );
      expect(
        rendererCarouselLayoutModel(carouselLayer({ pageAlignment: 'bottom' })).alignAxis,
      ).toBe('end');
      expect(rendererCarouselLayoutModel(carouselLayer()).alignAxis).toBe('center');
    });
  });

  describe('scroll math', () => {
    it('round-trips index and offset', () => {
      const offset = rendererCarouselScrollOffset(2, 300, 12);
      expect(rendererCarouselIndexFromScrollOffset(offset, 300, 12, 5)).toBe(2);
    });

    it('returns null for invalid geometry', () => {
      expect(rendererCarouselIndexFromScrollOffset(10, 0, 12, 3)).toBeNull();
    });
  });

  describe('rendererCarouselSlideWidth', () => {
    it('subtracts peek from both sides', () => {
      expect(rendererCarouselSlideWidth(400, 16)).toBe(368);
    });
  });

  describe('rendererCarouselShouldEmitComplete', () => {
    it('emits when swiping onto the last slide', () => {
      expect(rendererCarouselShouldEmitComplete(1, 2, 3, false)).toBe(true);
    });

    it('does not emit on first paint or loop carousels', () => {
      expect(rendererCarouselShouldEmitComplete(0, 0, 3, false)).toBe(false);
      expect(rendererCarouselShouldEmitComplete(2, 2, 3, true)).toBe(false);
      expect(rendererCarouselShouldEmitComplete(0, 0, 1, false)).toBe(false);
    });
  });

  describe('rendererCarouselAdvanceIndex', () => {
    it('wraps to zero when loop is enabled', () => {
      expect(rendererCarouselAdvanceIndex(2, 3, true)).toBe(0);
    });

    it('stays on last index when loop is disabled', () => {
      expect(rendererCarouselAdvanceIndex(2, 3, false)).toBe(2);
    });
  });

  describe('rendererCarouselPageDotsModel', () => {
    it('is hidden when pageControl is absent', () => {
      expect(rendererCarouselPageDotsModel({
        layer: carouselLayer(),
        activeIndex: 0,
        theme: 'light',
        manifestTheme: undefined,
      }).visible).toBe(false);
    });

    it('resolves active vs inactive dot sizes and colors', () => {
      const model = rendererCarouselPageDotsModel({
        layer: carouselLayer({
          pageControl: {
            position: 'bottom',
            indicators: {
              width: 6,
              height: 6,
              activeWidth: 10,
              activeHeight: 10,
              defaultColor: { light: '#111111', dark: '#eeeeee' },
              activeColor: { light: '#ff0000', dark: '#00ff00' },
            },
          },
        }),
        activeIndex: 1,
        theme: 'light',
        manifestTheme: undefined,
      });
      expect(model.visible).toBe(true);
      expect(model.dots[0]).toMatchObject({
        active: false,
        width: 6,
        height: 6,
        backgroundColor: '#111111',
      });
      expect(model.dots[1]).toMatchObject({
        active: true,
        width: 10,
        height: 10,
        backgroundColor: '#ff0000',
      });
    });
  });
});
