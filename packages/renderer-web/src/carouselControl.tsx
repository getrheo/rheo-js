'use client';

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import type { CarouselAdvanceOnLast } from '@getrheo/contracts/layers';

export type CarouselControls = {
  advance: (onLast: CarouselAdvanceOnLast | undefined) => void;
};

type CarouselControlContextValue = {
  register: (layerId: string, controls: CarouselControls) => () => void;
  advanceCarousel: (layerId: string, onLast: CarouselAdvanceOnLast | undefined) => void;
};

const CarouselControlContext = createContext<CarouselControlContextValue | null>(null);

export const CarouselControlProvider = ({ children }: { children: ReactNode }) => {
  const carouselsRef = useRef(new Map<string, CarouselControls>());

  const register = useCallback((layerId: string, controls: CarouselControls) => {
    carouselsRef.current.set(layerId, controls);
    return () => {
      carouselsRef.current.delete(layerId);
    };
  }, []);

  const advanceCarousel = useCallback(
    (layerId: string, onLast: CarouselAdvanceOnLast | undefined) => {
      carouselsRef.current.get(layerId)?.advance(onLast);
    },
    [],
  );

  const value = useMemo(() => ({ register, advanceCarousel }), [register, advanceCarousel]);

  return (
    <CarouselControlContext.Provider value={value}>{children}</CarouselControlContext.Provider>
  );
};

export const useCarouselControl = (): CarouselControlContextValue | null =>
  useContext(CarouselControlContext);
