import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CarouselLayer } from '@getrheo/contracts/layers';
import {
  rendererCarouselAdvanceIndex,
  rendererCarouselIndexFromScrollOffset,
  rendererCarouselLayoutModel,
  rendererCarouselPageDotsModel,
  rendererCarouselScrollOffset,
  rendererCarouselShouldCompleteOnAdvanceTap,
  rendererCarouselShouldEmitComplete,
  rendererCarouselSlideIndex,
  rendererCarouselSlideWidth,
  type RendererCarouselAlignAxis,
} from '@getrheo/renderer-core';
import {
  border,
  commonCss,
  margin,
  omitUndefinedCssProps,
  padding,
  stripCommonLayoutForInner,
  stripFlowAxesForFlexChild,
} from '../LayerRendererStyle';
import { DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX } from '@getrheo/flow-runtime/responsive/breakpoints';
import {
  resolveCarouselLayoutAtWidth,
  resolveCommonStyleAtWidth,
} from '@getrheo/flow-runtime/responsive/layerResolve';
import { SelectableWrap, type Ctx, type RenderLayer } from '../LayerRendererShared';
import { useCarouselControl } from '../carouselControl';

const carouselAlignToCss = (axis: RendererCarouselAlignAxis): CSSProperties['alignItems'] => {
  if (axis === 'start') return 'flex-start';
  if (axis === 'end') return 'flex-end';
  return 'center';
};

const PageDots = ({
  layer,
  idx,
  ctx,
}: {
  layer: CarouselLayer;
  idx: number;
  ctx: Ctx;
}) => {
  const model = rendererCarouselPageDotsModel({
    layer,
    activeIndex: idx,
    theme: ctx.theme,
    manifestTheme: ctx.manifest.theme,
  });
  if (!model.visible) return null;

  const pc = layer.pageControl;
  return (
    <div
      style={omitUndefinedCssProps({
        display: 'flex',
        gap: model.spacing,
        justifyContent: 'center',
        alignItems: 'center',
        ...padding(pc?.padding),
        ...margin(pc?.margin),
        ...border(pc?.border, ctx.manifest.theme, ctx.theme),
        boxShadow: model.containerSurface.webBoxShadow,
      })}
    >
      {model.dots.map((dot, i) => (
        <span
          key={i}
          style={omitUndefinedCssProps({
            width: dot.width,
            height: dot.height,
            borderRadius: dot.borderRadius,
            background: dot.backgroundColor,
            opacity: dot.opacity,
            transition: 'all 150ms ease-out',
            borderWidth: dot.borderWidth,
            borderColor: dot.borderColor,
            borderStyle: dot.borderWidth !== undefined ? 'solid' : undefined,
          })}
        />
      ))}
    </div>
  );
};

export const CarouselView = ({
  layer,
  ctx,
  renderLayer,
}: {
  layer: CarouselLayer;
  ctx: Ctx;
  renderLayer: RenderLayer;
}) => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const carLayout = resolveCarouselLayoutAtWidth(layer, w);
  const layout = rendererCarouselLayoutModel({
    ...layer,
    pageAlignment: carLayout.pageAlignment,
    pageSpacing: carLayout.pageSpacing,
    pagePeek: carLayout.pagePeek,
  });
  const initialIdx = rendererCarouselSlideIndex(layer, layout.slideCount);
  const [idx, setIdx] = useState(initialIdx);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const prevIdxRef = useRef(initialIdx);

  const emitComplete = () => {
    if (!ctx.interactive || !ctx.onRespond) return;
    ctx.onRespond({ kind: 'carousel' });
  };

  const maybeEmitComplete = (previousIndex: number, index: number) => {
    if (!rendererCarouselShouldEmitComplete(previousIndex, index, layout.slideCount, layout.loop)) {
      return;
    }
    emitComplete();
  };

  // `advance_carousel` buttons page this carousel by layer id (mirrors media playback).
  const carouselControl = useCarouselControl();
  useEffect(() => {
    if (!carouselControl) return;
    return carouselControl.register(layer.id, {
      advance: (onLast) => {
        if (
          rendererCarouselShouldCompleteOnAdvanceTap({
            index: idx,
            slideCount: layout.slideCount,
            loop: layout.loop,
            onLast,
          })
        ) {
          emitComplete();
          return;
        }
        const next = rendererCarouselAdvanceIndex(idx, layout.slideCount, layout.loop);
        if (next === idx) return;
        maybeEmitComplete(idx, next);
        prevIdxRef.current = next;
        setIdx(next);
      },
    });
  }, [carouselControl, layer.id, idx, layout.slideCount, layout.loop, ctx.interactive, ctx.onRespond]);

  useEffect(() => {
    if (!layer.autoAdvance) return;
    const t = setInterval(() => {
      setIdx((cur) => {
        const next = rendererCarouselAdvanceIndex(cur, layout.slideCount, layout.loop);
        maybeEmitComplete(cur, next);
        prevIdxRef.current = next;
        return next;
      });
    }, layout.autoAdvanceMs);
    return () => clearInterval(t);
  }, [layer.autoAdvance, layout.autoAdvanceMs, layout.loop, layout.slideCount]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const slideWidth = rendererCarouselSlideWidth(el.clientWidth, layout.peek);
    el.scrollTo({
      left: rendererCarouselScrollOffset(idx, slideWidth, layout.spacing),
      behavior: 'smooth',
    });
  }, [idx, layout.peek, layout.spacing]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const slideWidth = rendererCarouselSlideWidth(el.clientWidth, layout.peek);
    const next = rendererCarouselIndexFromScrollOffset(
      el.scrollLeft,
      slideWidth,
      layout.spacing,
      layout.slideCount,
    );
    if (next === null || next === idx) return;
    maybeEmitComplete(idx, next);
    prevIdxRef.current = next;
    setIdx(next);
  };

  const dotsModel = rendererCarouselPageDotsModel({
    layer,
    activeIndex: idx,
    theme: ctx.theme,
    manifestTheme: ctx.manifest.theme,
  });
  const dots = <PageDots layer={layer} idx={idx} ctx={ctx} />;
  const viewportW = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedOuter = resolveCommonStyleAtWidth(
    layer.style,
    layer.styleBreakpoints,
    viewportW,
  );

  return (
    <SelectableWrap
      layer={layer}
      ctx={ctx}
      outerStyle={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        ...commonCss(
          stripCommonLayoutForInner(
            stripFlowAxesForFlexChild(resolvedOuter, ctx.parentStackDirection),
          ),
          ctx.manifest.theme,
          ctx.theme,
          ctx.branding,
        ),
      }}
    >
      {dotsModel.position === 'top' && dots}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: carouselAlignToCss(layout.alignAxis),
          gap: layout.spacing,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          paddingLeft: layout.peek,
          paddingRight: layout.peek,
          scrollbarWidth: 'none',
        }}
      >
        {layer.slides.map((s) => (
          <div
            key={s.id}
            style={{
              flex: '0 0 100%',
              width: `calc(100% - ${layout.peek * 2}px)`,
              scrollSnapAlign: 'center',
            }}
          >
            {renderLayer(s, ctx)}
          </div>
        ))}
      </div>
      {dotsModel.position !== 'top' && dots}
    </SelectableWrap>
  );
};
