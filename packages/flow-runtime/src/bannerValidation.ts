import type { z } from 'zod';
import {
  BannerManifestSchema,
  type BannerManifest,
} from '@getrheo/contracts/bannerManifest';
import type { Layer } from '@getrheo/contracts/layers';
import { walkScreen } from './layers';
import type { ManifestValidationIssue } from './validation';

const FORBIDDEN_BUTTON_ACTIONS = new Set([
  'go_to_step',
  'go_back_one_screen',
  'request_os_permission',
  'request_app_review',
]);

export const validateBannerManifest = (
  data: unknown,
):
  | { ok: true; manifest: BannerManifest }
  | { ok: false; issues: ManifestValidationIssue[] } => {
  const result = BannerManifestSchema.safeParse(data);
  if (result.success) return { ok: true, manifest: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((i: z.ZodIssue) => ({
      stepId: null,
      path: [...i.path],
      message: i.message,
      code: i.code,
    })),
  };
};

export type ValidateBannerPublishableResult = {
  ok: boolean;
  issues: ManifestValidationIssue[];
  warnings: ManifestValidationIssue[];
};

const walkBannerLayers = (manifest: BannerManifest, visit: (layer: Layer) => void): void => {
  walkScreen(manifest.rootScreen, visit);
};

export const validateBannerPublishable = (
  manifest: BannerManifest,
): ValidateBannerPublishableResult => {
  const issues: ManifestValidationIssue[] = [];
  const warnings: ManifestValidationIssue[] = [];

  let layerCount = 0;
  walkBannerLayers(manifest, (layer) => {
    layerCount += 1;
    if (layer.kind === 'button' && FORBIDDEN_BUTTON_ACTIONS.has(layer.action.kind)) {
      issues.push({
        stepId: manifest.rootScreen.id,
        path: ['rootScreen'],
        message: `button action "${layer.action.kind}" is not allowed on banners`,
        code: 'banner.forbidden_action',
      });
    }
  });

  if (layerCount === 0) {
    issues.push({
      path: ['rootScreen'],
      message: 'banner must include at least one layer',
      code: 'banner.empty',
    });
  }

  if (manifest.sizing.mode === 'fixed') {
    const { width, height } = manifest.sizing;
    const root = manifest.rootScreen;
    const w = root.regions.body?.style?.width;
    const h = root.regions.body?.style?.height;
    const fillsFrame = (value: unknown) => value === 'fill' || value === 'full';
    if (!fillsFrame(w) || !fillsFrame(h)) {
      warnings.push({
        stepId: root.id,
        path: ['rootScreen', 'regions', 'body'],
        message: 'fixed-size banners should use Fill width and height on the root body stack',
        code: 'banner.fixed_root_not_fill',
      });
    }
    if (width < 8 || height < 8) {
      issues.push({
        path: ['sizing'],
        message: 'fixed banner dimensions are too small',
        code: 'banner.sizing_too_small',
      });
    }
  }

  return { ok: issues.length === 0, issues, warnings };
};

/** Removes timeline animation clips from the banner root screen. */
export const stripBannerManifestAnimations = (manifest: BannerManifest): BannerManifest => {
  const next = structuredClone(manifest) as BannerManifest;
  const s = next.rootScreen as { animations?: unknown; stagger?: unknown };
  delete s.animations;
  delete s.stagger;
  return next;
};

const collapseLocalizedObjects = (node: unknown): void => {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const x of node) collapseLocalizedObjects(x);
    return;
  }
  if (typeof node !== 'object') return;
  const o = node as Record<string, unknown>;
  if (
    typeof o.default === 'string' &&
    Object.prototype.hasOwnProperty.call(o, 'translations')
  ) {
    delete o.translations;
  }
  for (const v of Object.values(o)) collapseLocalizedObjects(v);
};

export const collapseBannerManifestToDefaultLocaleOnly = (
  manifest: BannerManifest,
): BannerManifest => {
  const next = structuredClone(manifest) as BannerManifest;
  collapseLocalizedObjects(next);
  next.locales = [next.defaultLocale];
  return next;
};

export const collectBannerMediaIds = (manifest: BannerManifest): string[] => {
  const ids = new Set<string>();
  walkBannerLayers(manifest, (layer) => {
    if (
      (layer.kind === 'image' || layer.kind === 'lottie' || layer.kind === 'video') &&
      layer.media?.mediaAssetId
    ) {
      ids.add(layer.media.mediaAssetId);
    }
  });
  const fill = manifest.rootScreen.containerStyle?.backgroundFill;
  if (
    fill &&
    (fill.kind === 'image' || fill.kind === 'video') &&
    fill.media?.mediaAssetId
  ) {
    ids.add(fill.media.mediaAssetId);
  }
  return [...ids];
};
