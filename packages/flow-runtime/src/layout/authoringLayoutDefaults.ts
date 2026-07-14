import type { CommonLayoutHeight, LayerKind, WidthValue } from '@getrheo/contracts/layers';
import {
  DEFAULT_LOADER_LINEAR_HEIGHT_PX,
  DEFAULT_PROGRESS_LINEAR_HEIGHT_PX,
} from './scalarLayoutDefaults';

export type AuthoringLayoutDefaults = {
  width: WidthValue;
  height: CommonLayoutHeight;
};

const LAYOUT_FULL_HUG: AuthoringLayoutDefaults = { width: 'full', height: 'auto' };
const LAYOUT_FULL_FILL: AuthoringLayoutDefaults = { width: 'full', height: 'fill' };
const LAYOUT_HUG_HUG: AuthoringLayoutDefaults = { width: 'auto', height: 'auto' };
const LAYOUT_FULL_FIXED_H160: AuthoringLayoutDefaults = { width: 'full', height: 160 };
// Feedback bars span their container width but use a fixed px thickness; the
// circular loader's square sizing is handled by `defaultFeedbackStyleScalars`.
const LAYOUT_PROGRESS: AuthoringLayoutDefaults = {
  width: 'full',
  height: DEFAULT_PROGRESS_LINEAR_HEIGHT_PX,
};
const LAYOUT_LOADER_LINEAR: AuthoringLayoutDefaults = {
  width: 'full',
  height: DEFAULT_LOADER_LINEAR_HEIGHT_PX,
};

/** Explicit width/height for new layers (inspector always shows a selected mode). */
export const defaultLayoutStyleForKind = (kind: LayerKind): AuthoringLayoutDefaults | null => {
  switch (kind) {
    case 'stack':
      return LAYOUT_FULL_FILL;
    case 'text':
    case 'counter':
      return LAYOUT_HUG_HUG;
    case 'hyperlink':
      return LAYOUT_HUG_HUG;
    case 'image':
    case 'lottie':
    case 'video':
      return LAYOUT_FULL_FIXED_H160;
    case 'icon':
      return { width: 24, height: 24 };
    case 'button':
    case 'back_button':
    case 'oauth_provider':
    case 'email_password_submit':
      return LAYOUT_FULL_HUG;
    case 'text_input':
    case 'scale_input':
    case 'wheel_picker':
    case 'email_password_auth':
    case 'email_password_field':
    case 'oauth_login':
      return LAYOUT_FULL_FILL;
    case 'progress':
      return LAYOUT_PROGRESS;
    case 'loader':
      return LAYOUT_LOADER_LINEAR;
    case 'checkbox':
    case 'single_choice':
    case 'multiple_choice':
      return LAYOUT_FULL_HUG;
    case 'carousel':
      return null;
    default:
      return null;
  }
};

export const mergeLayoutDefaultsIntoStyle = <T extends Record<string, unknown>>(
  kind: LayerKind,
  style: T | undefined,
): T => {
  const defaults = defaultLayoutStyleForKind(kind);
  if (!defaults) return (style ?? {}) as T;
  return { ...defaults, ...style } as unknown as T;
};
