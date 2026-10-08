import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useLayoutEffect, useState } from 'react';
import type { Layer, RestingMotion } from '@getrheo/contracts/layers';
import {
  layerRestingMotionEntries,
  restingMotionStyleAtTime,
  restingMotionWebStyle,
  RESTING_MOTION_KEYFRAMES_CSS,
} from '@getrheo/flow-runtime/restingMotion';
import { motionStyleFromSample, useLayerMotion, useMotionController } from './motionPlayback';

/**
 * Keeps a `height: fill` layer stretching through the (optional) motion/resting
 * wrapper divs. Without this the animated wrapper hugs its content and the inner
 * element (e.g. a button's pressable area) collapses to content height while the
 * surrounding flow shell still stretches.
 */
const fillThroughStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  alignSelf: 'stretch',
  display: 'flex',
  flexDirection: 'column',
};

export const MotionShell = ({
  layerId,
  children,
  fill,
}: {
  layerId: string;
  children: ReactNode;
  fill?: boolean;
}) => {
  const sample = useLayerMotion(layerId);
  if (!sample) return <>{children}</>;
  return (
    <div
      style={{
        ...(fill ? fillThroughStyle : {}),
        ...motionStyleFromSample(sample),
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  );
};

const SingleRestingShell = ({
  layerId,
  cfg,
  children,
  fill,
}: {
  layerId: string;
  cfg: RestingMotion;
  children: ReactNode;
  fill?: boolean;
}) => {
  const controller = useMotionController();
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    if (!cfg) {
      setStyle(null);
      return;
    }
    if (!controller) {
      setStyle(restingMotionWebStyle(cfg));
      return;
    }
    const apply = (t: number) => {
      setStyle(restingMotionStyleAtTime(controller.screen, layerId, cfg, t));
    };
    apply(controller.getTime());
    return controller.subscribe(apply);
  }, [cfg, controller, layerId]);

  if (!cfg || !style) return <>{children}</>;
  return <div style={{ ...(fill ? fillThroughStyle : {}), ...style }}>{children}</div>;
};

export const RestingShell = ({
  layer,
  children,
  fill,
}: {
  layer: Layer;
  children: ReactNode;
  fill?: boolean;
}) => {
  const entries = layerRestingMotionEntries(layer);

  if (entries.length === 0) return <>{children}</>;

  return entries.reduceRight<ReactNode>((acc, entry) => {
    const { id: _rid, ...cfg } = entry;
    return (
      <SingleRestingShell key={entry.id} layerId={layer.id} cfg={cfg} fill={fill}>
        {acc}
      </SingleRestingShell>
    );
  }, children);
};

export const RestingMotionKeyframesOnce = () => {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'rheo-resting-motion-keyframes';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = RESTING_MOTION_KEYFRAMES_CSS;
    document.head.appendChild(el);
  }, []);
  return null;
};
