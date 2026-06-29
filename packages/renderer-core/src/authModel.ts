import type {
  EmailPasswordAuthLayer,
  EmailPasswordAuthMode,
  EmailPasswordSlot,
  OAuthLoginLayer,
  OAuthLoginPreset,
} from '@getrheo/contracts/layers';
import {
  validateEmailPasswordAuthFields,
  type ValidateEmailPasswordAuthResult,
} from '@getrheo/flow-runtime/emailPasswordAuthValidation';
import type { RendererPalette } from './typographyModel';

const OAUTH_BODY_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif';
const OAUTH_APPLE_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';

export type RendererOAuthPresetBrandModel = {
  backgroundColor: string;
  labelColor: string;
  iconColor: string;
  borderColor: string;
  borderWidth: number;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  webBoxShadow?: string;
};

export const rendererOAuthPresetBrandModel = (
  preset: OAuthLoginPreset,
  theme: RendererPalette,
): RendererOAuthPresetBrandModel => {
  if (preset === 'google') {
    const fill = '#4285F4';
    if (theme === 'dark') {
      return {
        backgroundColor: '#ffffff',
        labelColor: fill,
        iconColor: fill,
        borderColor: '#d1d5db',
        borderWidth: 1,
        fontFamily: OAUTH_BODY_FONT,
        fontWeight: 600,
        fontSize: 14,
        lineHeight: 1.25,
        webBoxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      };
    }
    return {
      backgroundColor: fill,
      labelColor: '#ffffff',
      iconColor: '#ffffff',
      borderColor: fill,
      borderWidth: 1,
      fontFamily: OAUTH_BODY_FONT,
      fontWeight: 600,
      fontSize: 14,
      lineHeight: 1.25,
      webBoxShadow: '0 1px 2px rgba(0,0,0,0.12)',
    };
  }
  if (preset === 'apple') {
    if (theme === 'dark') {
      return {
        backgroundColor: '#ffffff',
        labelColor: '#000000',
        iconColor: '#000000',
        borderColor: '#d1d5db',
        borderWidth: 1,
        fontFamily: OAUTH_APPLE_FONT,
        fontWeight: 600,
        fontSize: 16,
        lineHeight: 1.25,
      };
    }
    return {
      backgroundColor: '#000000',
      labelColor: '#ffffff',
      iconColor: '#ffffff',
      borderColor: '#000000',
      borderWidth: 1,
      fontFamily: OAUTH_APPLE_FONT,
      fontWeight: 600,
      fontSize: 16,
      lineHeight: 1.25,
    };
  }
  return {
    backgroundColor: '#24292f',
    labelColor: '#ffffff',
    iconColor: '#ffffff',
    borderColor: '#24292f',
    borderWidth: 1,
    fontFamily: OAUTH_BODY_FONT,
    fontWeight: 600,
    fontSize: 14,
    lineHeight: 1.25,
  };
};

export type RendererOAuthAlignAxis = 'start' | 'center' | 'end' | 'stretch';

export const rendererOAuthLoginAlignAxis = (
  align: OAuthLoginLayer['align'] | undefined,
): RendererOAuthAlignAxis => {
  if (align === 'center') return 'center';
  if (align === 'end') return 'end';
  if (align === 'stretch') return 'stretch';
  return 'start';
};

export type RendererOAuthRowInteractionModel = {
  disabled: boolean;
  busy: boolean;
};

export const rendererOAuthRowInteractionModel = ({
  interactive,
  pendingRowKey,
  rowKey,
  staticPicker = false,
}: {
  interactive: boolean;
  pendingRowKey: string | null;
  rowKey: string;
  /** When true, rows stay enabled for layer picking (builder sim). */
  staticPicker?: boolean;
}): RendererOAuthRowInteractionModel => ({
  disabled: pendingRowKey !== null || (!staticPicker && !interactive),
  busy: pendingRowKey === rowKey,
});

export type RendererEmailPasswordValues = {
  email: string;
  password: string;
  confirm: string;
};

export type RendererEmailPasswordAuthModel = {
  mode: EmailPasswordAuthMode;
  minPasswordLength: number;
  values: RendererEmailPasswordValues;
  validation: ValidateEmailPasswordAuthResult;
  canSubmit: boolean;
};

export const rendererEmailPasswordAuthModel = (
  layer: Pick<EmailPasswordAuthLayer, 'mode' | 'minPasswordLength'>,
  values: RendererEmailPasswordValues,
): RendererEmailPasswordAuthModel => {
  const minPasswordLength = layer.minPasswordLength ?? 8;
  const validation = validateEmailPasswordAuthFields({
    mode: layer.mode,
    email: values.email,
    password: values.password,
    confirmPassword: values.confirm,
    minPasswordLength,
  });
  return {
    mode: layer.mode,
    minPasswordLength,
    values,
    validation,
    canSubmit: validation.ok,
  };
};

export const rendererEmailPasswordFieldInputType = (
  slot: EmailPasswordSlot,
): 'email' | 'password' | 'text' => {
  if (slot === 'email') return 'email';
  if (slot === 'password' || slot === 'confirm') return 'password';
  return 'text';
};

export type RendererEmailPasswordSimInputColors = {
  background: string;
  border: string;
};

export const rendererEmailPasswordSimInputColors = (
  theme: RendererPalette,
): RendererEmailPasswordSimInputColors => ({
  background: theme === 'dark' ? '#18181b' : '#fafafa',
  border: theme === 'dark' ? '#27272a' : '#e4e4e7',
});
