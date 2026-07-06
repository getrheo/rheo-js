/** Pixel width for one choice-grid tile (SwiftUI / Flutter parity). */
export const choiceGridTileWidth = (
  containerWidth: number,
  columns: number,
  gap: number,
): number => {
  const cols = Math.max(1, columns);
  const totalGap = gap * Math.max(0, cols - 1);
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return 0;
  return Math.max(0, (containerWidth - totalGap) / cols);
};
