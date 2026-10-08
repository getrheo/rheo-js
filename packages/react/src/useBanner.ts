import { useEffect, useMemo, useRef, useState } from 'react';
import type { BannerManifest } from '@getrheo/contracts/bannerManifest';
import type { Branding } from '@getrheo/contracts/branding';
import { BANNER_DISMISSED_EVENT, BANNER_IMPRESSION_EVENT } from '@getrheo/contracts/bannerChannelEvents';
import { useChannel } from './useChannel.js';
import { logChannelEvent, rememberCodeResolve } from './channel.js';
import { getResolvedAppUserId } from './events.js';
import { useRheoContext } from './client.js';

export type UseBannerOptions = {
  channelId: string;
  enabled?: boolean;
};

export type BannerChannelBody = {
  kind: 'banner';
  bannerId: string;
  versionId: string;
  assignmentVersion: number;
  control?: boolean;
  manifest: BannerManifest;
  mediaMap: Record<string, string>;
  branding?: Branding;
  experiment: { id: string; variantKey: string; variantId: string } | null;
};

export type UseBannerResult = {
  loading: boolean;
  error: Error | null;
  banner: BannerChannelBody | null;
  dismiss: () => void;
  dismissed: boolean;
};

const dismissStorageKey = (channelId: string, assignmentVersion: number, versionId: string) =>
  `rheo:banner-dismissed:${channelId}:${assignmentVersion}:${versionId}`;

export const useBanner = ({ channelId, enabled = true }: UseBannerOptions): UseBannerResult => {
  const { config } = useRheoContext();
  const { loading, error, channel } = useChannel({ channelId, enabled });
  const [dismissed, setDismissed] = useState(false);
  const impressedRef = useRef(false);

  const banner = useMemo((): BannerChannelBody | null => {
    if (!channel || channel.kind !== 'banner') return null;
    return channel;
  }, [channel]);

  useEffect(() => {
    if (!banner || banner.control) return;
    const key = dismissStorageKey(channelId, banner.assignmentVersion, banner.versionId);
    try {
      if (localStorage.getItem(key) === '1') setDismissed(true);
    } catch {
      /* ignore */
    }
  }, [banner, channelId]);

  useEffect(() => {
    if (!banner || banner.control || dismissed || impressedRef.current) return;
    impressedRef.current = true;
    logChannelEvent(channelId, BANNER_IMPRESSION_EVENT, {
      bannerId: banner.bannerId,
      versionId: banner.versionId,
    });
  }, [banner, channelId, dismissed]);

  useEffect(() => {
    if (!channel || channel.kind !== 'banner') return;
    rememberCodeResolve(channelId, channel, getResolvedAppUserId(config));
  }, [channel, channelId, config]);

  const dismiss = () => {
    if (!banner || banner.control) return;
    setDismissed(true);
    const key = dismissStorageKey(channelId, banner.assignmentVersion, banner.versionId);
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
    logChannelEvent(channelId, BANNER_DISMISSED_EVENT, {
      bannerId: banner.bannerId,
      versionId: banner.versionId,
    });
  };

  return { loading, error, banner, dismiss, dismissed };
};
