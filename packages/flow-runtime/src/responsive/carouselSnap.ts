/** RN ScrollView `decelerationRate="fast"` numeric value (platform constant). */
export const carouselScrollDecelerationRateFast = 0.99;

/** Carousel snap scroll animation duration (parity with Flutter/RN distance-proportional easing). */
export const carouselSnapDurationMs = (params: {
  distance: number;
  snapInterval: number;
}): number => {
  const { distance, snapInterval } = params;
  if (snapInterval <= 0) return 280;
  return Math.round(Math.min(400, Math.max(180, (distance / snapInterval) * 280)));
};
