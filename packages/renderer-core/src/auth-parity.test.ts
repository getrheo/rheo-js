import { describe, expect, it } from 'vitest';
import { OAUTH_LOGIN_PRESETS } from '@getrheo/contracts/layers';
import type { EmailPasswordAuthLayer } from '@getrheo/contracts/layers';
import {
  rendererEmailPasswordAuthModel,
  rendererEmailPasswordFieldInputType,
  rendererOAuthPresetBrandModel,
  rendererOAuthRowInteractionModel,
} from './authModel';

describe('renderer-core auth parity', () => {
  describe('rendererOAuthPresetBrandModel', () => {
    it.each(
      OAUTH_LOGIN_PRESETS.flatMap((preset) =>
        (['light', 'dark'] as const).map((theme) => ({ preset, theme })),
      ),
    )('returns stable brand tokens for $preset / $theme', ({ preset, theme }) => {
      const model = rendererOAuthPresetBrandModel(preset, theme);
      expect(model.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(model.labelColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(model.iconColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(model.fontWeight).toBeGreaterThan(0);
      expect(model.fontSize).toBeGreaterThan(0);
    });

    it('google light uses blue fill with white label and icon', () => {
      const model = rendererOAuthPresetBrandModel('google', 'light');
      expect(model).toMatchObject({
        backgroundColor: '#4285F4',
        labelColor: '#ffffff',
        iconColor: '#ffffff',
        webBoxShadow: '0 1px 2px rgba(0,0,0,0.12)',
      });
    });

    it('google dark uses white fill with blue label and icon', () => {
      const model = rendererOAuthPresetBrandModel('google', 'dark');
      expect(model).toMatchObject({
        backgroundColor: '#ffffff',
        labelColor: '#4285F4',
        iconColor: '#4285F4',
      });
    });

    it('apple presets use SF Pro stack', () => {
      const model = rendererOAuthPresetBrandModel('apple', 'light');
      expect(model.fontFamily).toContain('SF Pro Text');
      expect(model.fontSize).toBe(16);
    });
  });

  describe('rendererOAuthRowInteractionModel', () => {
    it('disables all rows when another row is pending', () => {
      expect(
        rendererOAuthRowInteractionModel({
          interactive: true,
          pendingRowKey: 'a',
          rowKey: 'b',
        }),
      ).toEqual({ disabled: true, busy: false });
    });

    it('marks busy row', () => {
      expect(
        rendererOAuthRowInteractionModel({
          interactive: true,
          pendingRowKey: 'a',
          rowKey: 'a',
        }),
      ).toEqual({ disabled: true, busy: true });
    });

    it('allows interaction in static picker when not interactive', () => {
      expect(
        rendererOAuthRowInteractionModel({
          interactive: false,
          pendingRowKey: null,
          rowKey: 'a',
          staticPicker: true,
        }),
      ).toEqual({ disabled: false, busy: false });
    });
  });

  describe('rendererEmailPasswordAuthModel', () => {
    const layer: Pick<EmailPasswordAuthLayer, 'mode' | 'minPasswordLength'> = {
      mode: 'sign_up',
      minPasswordLength: 8,
    };

    it('rejects invalid email', () => {
      const model = rendererEmailPasswordAuthModel(layer, {
        email: 'bad',
        password: 'password1',
        confirm: 'password1',
      });
      expect(model.canSubmit).toBe(false);
      expect(model.validation.ok).toBe(false);
      if (!model.validation.ok) {
        expect(model.validation.message).toContain('valid email');
      }
    });

    it('rejects short password', () => {
      const model = rendererEmailPasswordAuthModel(layer, {
        email: 'a@example.com',
        password: 'short',
        confirm: 'short',
      });
      expect(model.canSubmit).toBe(false);
    });

    it('rejects sign_up password mismatch', () => {
      const model = rendererEmailPasswordAuthModel(layer, {
        email: 'a@example.com',
        password: 'password1',
        confirm: 'password2',
      });
      expect(model.canSubmit).toBe(false);
      if (!model.validation.ok) {
        expect(model.validation.message).toContain('match');
      }
    });

    it('accepts valid sign_up payload', () => {
      const model = rendererEmailPasswordAuthModel(layer, {
        email: 'a@example.com',
        password: 'password1',
        confirm: 'password1',
      });
      expect(model.canSubmit).toBe(true);
      expect(model.validation.ok).toBe(true);
    });
  });

  describe('rendererEmailPasswordFieldInputType', () => {
    it('maps slots to html input types', () => {
      expect(rendererEmailPasswordFieldInputType('email')).toBe('email');
      expect(rendererEmailPasswordFieldInputType('password')).toBe('password');
      expect(rendererEmailPasswordFieldInputType('confirm')).toBe('password');
    });
  });
});
