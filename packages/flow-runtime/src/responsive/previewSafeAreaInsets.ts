/** Preview / sim status bar + home-indicator insets (portrait phone). */

export type PreviewPhoneSystemUi = 'ios' | 'android';

export const previewPhoneSafeAreaInsetTopPx = (width: number): number => {
  const statusChromePadY = Math.max(6, Math.round(width * 0.016));
  const chromePadBottom = Math.max(4, Math.round(width * 0.01));
  const padY = Math.max(5, Math.round(width * 0.012));
  const statusH = Math.max(23, Math.round(width * 0.058));
  return statusChromePadY + statusH + 2 * padY + chromePadBottom;
};

export const previewPhoneSafeAreaInsetBottomPx = (
  width: number,
  systemUi: PreviewPhoneSystemUi = 'ios',
): number => {
  const pad = systemUi === 'ios' ? 8 : 10;
  const pill = systemUi === 'ios' ? 5 : 4;
  return pad + pill + Math.max(6, Math.round(width * 0.014));
};

/** Portrait phone preview: no horizontal inset (matches RN `SafeAreaView` in portrait). */
export const previewPhoneSafeAreaInsetHorizontalPx = (_width: number): number => 0;

export const previewPhoneSafeAreaPadding = (
  widthPx: number,
  systemUi: PreviewPhoneSystemUi = 'ios',
): { t: number; r: number; b: number; l: number } => ({
  t: previewPhoneSafeAreaInsetTopPx(widthPx),
  r: previewPhoneSafeAreaInsetHorizontalPx(widthPx),
  b: previewPhoneSafeAreaInsetBottomPx(widthPx, systemUi),
  l: previewPhoneSafeAreaInsetHorizontalPx(widthPx),
});
