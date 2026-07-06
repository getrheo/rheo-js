import { describe, expect, it } from 'vitest';
import { carouselScrollDecelerationRateFast, carouselSnapDurationMs } from './carouselSnap';

describe('carouselScrollDecelerationRateFast', () => {
  it('matches RN ScrollView decelerationRate="fast" (0.99)', () => {
    expect(carouselScrollDecelerationRateFast).toBe(0.99);
  });
});

describe('carouselSnapDurationMs', () => {
  it('returns 280ms when snapInterval is zero', () => {
    expect(carouselSnapDurationMs({ distance: 0, snapInterval: 0 })).toBe(280);
  });

  it('returns 280ms for one snap interval of distance', () => {
    expect(carouselSnapDurationMs({ distance: 120, snapInterval: 120 })).toBe(280);
  });

  it('caps at 400ms for two snap intervals of distance', () => {
    expect(carouselSnapDurationMs({ distance: 240, snapInterval: 120 })).toBe(400);
  });
});
