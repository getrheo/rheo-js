'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type MediaPlayerControls = {
  play: () => void;
};

type MediaPlayState = {
  seq: number;
  layerIds: string[];
};

type MediaPlaybackContextValue = {
  register: (layerId: string, controls: MediaPlayerControls) => () => void;
  playMedia: (layerIds: string[]) => void;
  playState: MediaPlayState;
};

const MediaPlaybackContext = createContext<MediaPlaybackContextValue | null>(null);

export const MediaPlaybackProvider = ({ children }: { children: ReactNode }) => {
  const playersRef = useRef(new Map<string, MediaPlayerControls>());
  const [playState, setPlayState] = useState<MediaPlayState>({ seq: 0, layerIds: [] });

  const register = useCallback((layerId: string, controls: MediaPlayerControls) => {
    playersRef.current.set(layerId, controls);
    return () => {
      playersRef.current.delete(layerId);
    };
  }, []);

  const playMedia = useCallback((layerIds: string[]) => {
    const ids = [...new Set(layerIds)];
    for (const id of ids) {
      playersRef.current.get(id)?.play();
    }
    setPlayState((prev) => ({ seq: prev.seq + 1, layerIds: ids }));
  }, []);

  const value = useMemo(
    () => ({ register, playMedia, playState }),
    [register, playMedia, playState],
  );

  return (
    <MediaPlaybackContext.Provider value={value}>{children}</MediaPlaybackContext.Provider>
  );
};

export const useMediaPlayback = (): MediaPlaybackContextValue | null =>
  useContext(MediaPlaybackContext);

/** Non-zero only when this layer was included in the latest `play_media` tap. */
export const useMediaPlaySignal = (layerId: string): number => {
  const ctx = useContext(MediaPlaybackContext);
  if (!ctx || !ctx.playState.layerIds.includes(layerId)) return 0;
  return ctx.playState.seq;
};

export const mediaAutoPlayOnMount = (layer: { autoPlay?: boolean }): boolean =>
  layer.autoPlay !== false;
