import { RHEO_DEFAULT_SDK_API_BASE_URL } from '@getrheo/contracts/sdk';
import { useMemo } from 'react';
import { useRheo, type RheoConfig } from './client.js';
import { getSdkLogger } from './logging.js';
import { resolveChannel } from './channel.js';
import { resolveAllManifests } from './resolveAllManifests.js';

export type PrefetchOptions = {
  /** When omitted, uses the active `RheoProvider` config snapshot. */
  config?: RheoConfig;
};

/**
 * Warm the resolve cache for a single channel. Best-effort: resolve errors are
 * swallowed so the eventual `Flow` mount owns the authoritative error/retry UI.
 * Shares the in-flight request with a concurrent `useChannel` resolve.
 */
const prefetchChannelWithConfig = async (config: RheoConfig, channelId: string): Promise<void> => {
  const trimmed = channelId.trim();
  if (trimmed.length === 0) return;
  try {
    await resolveChannel({
      apiBaseUrl: config.apiBaseUrl ?? RHEO_DEFAULT_SDK_API_BASE_URL,
      publishableKey: config.publishableKey,
      channelId: trimmed,
      config,
    });
  } catch {
    // Best-effort prefetch.
  }
};

/** Warm the resolve cache for every assigned channel in the app. Best-effort. */
const prefetchAllWithConfig = async (config: RheoConfig): Promise<void> => {
  try {
    await resolveAllManifests({
      apiBaseUrl: config.apiBaseUrl ?? RHEO_DEFAULT_SDK_API_BASE_URL,
      publishableKey: config.publishableKey,
      config,
    });
  } catch {
    // Best-effort prefetch.
  }
};

/**
 * Snapshot of the active provider config so the standalone `prefetch` /
 * `prefetchAll` functions work outside the React tree.
 * @internal
 */
let registeredConfig: RheoConfig | null = null;

/** @internal — called by `RheoProvider`. */
export const __registerPrefetchConfig = (config: RheoConfig | null): void => {
  registeredConfig = config;
};

/** @internal — used by `RheoProvider` to run declared prefetch on mount. */
export const __prefetchChannelWithConfig = prefetchChannelWithConfig;
/** @internal — used by `RheoProvider` to run full-app prefetch on mount. */
export const __prefetchAllWithConfig = prefetchAllWithConfig;

const resolvePrefetchConfig = (fn: string, options?: PrefetchOptions): RheoConfig | null => {
  const cfg = options?.config ?? registeredConfig;
  if (!cfg) {
    getSdkLogger().debug(
      `[rheo] ${fn} called without RheoProvider mounted and no \`config\` override — ignored.`,
    );
  }
  return cfg;
};

/**
 * Imperatively warm the resolve cache for a channel. Pass `options.config` when
 * no `RheoProvider` is mounted.
 */
export const prefetch = async (channelId: string, options?: PrefetchOptions): Promise<void> => {
  const cfg = resolvePrefetchConfig('prefetch', options);
  if (!cfg) return;
  await prefetchChannelWithConfig(cfg, channelId);
};

/**
 * Imperatively warm the resolve cache for every assigned channel in the app.
 * Pass `options.config` when no `RheoProvider` is mounted.
 */
export const prefetchAll = async (options?: PrefetchOptions): Promise<void> => {
  const cfg = resolvePrefetchConfig('prefetchAll', options);
  if (!cfg) return;
  await prefetchAllWithConfig(cfg);
};

export type RheoPrefetchControls = {
  prefetch: (channelId: string) => Promise<void>;
  prefetchAll: () => Promise<void>;
};

/**
 * Hook variant of {@link prefetch} / {@link prefetchAll}, bound to the current
 * provider config from context.
 */
export const useRheoPrefetch = (): RheoPrefetchControls => {
  const config = useRheo();
  return useMemo<RheoPrefetchControls>(
    () => ({
      prefetch: (channelId: string) => prefetchChannelWithConfig(config, channelId),
      prefetchAll: () => prefetchAllWithConfig(config),
    }),
    [config],
  );
};
