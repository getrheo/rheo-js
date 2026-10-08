import { useEffect, useState } from 'react';
import { RHEO_DEFAULT_SDK_API_BASE_URL } from '@getrheo/contracts/sdk';
import { useRheoContext } from './client.js';
import { getResolvedAppUserId } from './events.js';
import {
  logCodeExposure,
  registerCodeEventTransport,
  rememberCodeResolve,
  resolveChannel,
  withCodeGet,
  type RheoChannel,
} from './channel.js';

export type UseChannelOptions = {
  channelId: string;
  /** When false, the hook does not fetch. Defaults to true. */
  enabled?: boolean;
  attempt?: number;
};

export type UseChannelResult = {
  loading: boolean;
  error: Error | null;
  channel: RheoChannel | null;
};

export const useChannel = ({
  channelId,
  enabled = true,
  attempt = 0,
}: UseChannelOptions): UseChannelResult => {
  const { config } = useRheoContext();
  const trimmed = channelId.trim();
  const [error, setError] = useState<Error | null>(null);
  const [channel, setChannel] = useState<RheoChannel | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!enabled || !trimmed) {
      setSettled(true);
      return;
    }
    let cancelled = false;
    setSettled(false);
    setError(null);
    const apiBaseUrl = config.apiBaseUrl ?? RHEO_DEFAULT_SDK_API_BASE_URL;
    const appUserId = getResolvedAppUserId(config);
    registerCodeEventTransport({
      apiBaseUrl,
      publishableKey: config.publishableKey,
      fetcher: config.fetcher,
      appUserId,
      platform: config.platform,
      locale: config.locale,
      appVersion: config.appVersion,
    });
    void resolveChannel({
      apiBaseUrl,
      publishableKey: config.publishableKey,
      channelId: trimmed,
      config,
    })
      .then((next) => {
        if (cancelled) return;
        rememberCodeResolve(trimmed, next, appUserId);
        setChannel(next);
        setSettled(true);
        if (next?.kind === 'code') void logCodeExposure(trimmed, next, appUserId);
        if (next?.kind === 'banner' && next.experiment) {
          void logCodeExposure(
            trimmed,
            withCodeGet({
              kind: 'code',
              channelId: next.channelId,
              environment: next.environment,
              assignmentVersion: next.assignmentVersion,
              experiment: next.experiment,
              variantKey: next.experiment.variantKey,
              parameters: {},
            }),
            appUserId,
          );
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setChannel(null);
        setError(err instanceof Error ? err : new Error(String(err)));
        setSettled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, config, enabled, trimmed]);

  return { loading: enabled && trimmed.length > 0 && !settled, error, channel };
};
