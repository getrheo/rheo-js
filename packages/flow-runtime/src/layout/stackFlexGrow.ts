import type { CommonLayoutHeight } from '@getrheo/contracts/layers';

/** Whether a stack should grow on the parent stack main axis (web/RN StackView parity with SwiftUI). */
export const stackMainAxisFillHeight = (
  height: CommonLayoutHeight | undefined,
): boolean => height === 'fill' || height === 'full';
