import type { CarouselLayer } from '@getrheo/contracts/layers';
import type { Theme } from '@getrheo/contracts/manifest';
import { resolveThemedColor } from '@getrheo/flow-runtime';
import { boxEdges, boxEdgesOrUndefined, type RendererBoxEdges } from './spacingModel';
import { rendererSurfaceModel } from './surfaceModel';
import type { RendererPalette } from './typographyModel';

export type RendererCarouselAlignAxis = 'start' | 'center' | 'end';

export const rendererCarouselSlideIndex = (
  layer: Pick<CarouselLayer, 'openOn'>,
  slideCount: number,
): number => {
  if (slideCount <= 0) return 0;
  return Math.max(0, Math.min(layer.openOn ?? 0, slideCount - 1));
};

export type RendererCarouselLayoutModel = {
  peek: number;
  spacing: number;
  alignAxis: RendererCarouselAlignAxis;
  autoAdvanceMs: number;
  loop: boolean;
  slideCount: number;
};

export const rendererCarouselLayoutModel = (layer: CarouselLayer): RendererCarouselLayoutModel => {
  const alignAxis: RendererCarouselAlignAxis =
    layer.pageAlignment === 'top'
      ? 'start'
      : layer.pageAlignment === 'bottom'
        ? 'end'
        : 'center';
  return {
    peek: layer.pagePeek ?? 0,
    spacing: layer.pageSpacing ?? 0,
    alignAxis,
    autoAdvanceMs: layer.autoAdvanceMs ?? 4000,
    loop: layer.loop ?? false,
    slideCount: layer.slides.length,
  };
};

export const rendererCarouselSlideWidth = (containerWidth: number, peek: number): number =>
  Math.max(0, containerWidth - peek * 2);

export type RendererCarouselPageDotModel = {
  active: boolean;
  width: number;
  height: number;
  backgroundColor: string;
  opacity: number;
  borderWidth: number | undefined;
  borderColor: string | undefined;
  borderRadius: number;
};

export type RendererCarouselPageDotsModel = {
  visible: boolean;
  position: 'top' | 'bottom';
  spacing: number;
  padding: RendererBoxEdges;
  margin: RendererBoxEdges;
  containerSurface: ReturnType<typeof rendererSurfaceModel>;
  dots: RendererCarouselPageDotModel[];
};

export const rendererCarouselPageDotsModel = ({
  layer,
  activeIndex,
  theme,
  manifestTheme,
}: {
  layer: CarouselLayer;
  activeIndex: number;
  theme: RendererPalette;
  manifestTheme: Theme | undefined;
}): RendererCarouselPageDotsModel => {
  const pc = layer.pageControl;
  if (!pc) {
    return {
      visible: false,
      position: 'bottom',
      spacing: 6,
      padding: boxEdgesOrUndefined(undefined) ?? boxEdges(undefined),
      margin: boxEdgesOrUndefined(undefined) ?? boxEdges(undefined),
      containerSurface: rendererSurfaceModel({
        style: undefined,
        theme: manifestTheme,
        palette: theme,
      }),
      dots: [],
    };
  }

  const ind = pc.indicators ?? {};
  const defaultColor =
    (resolveThemedColor(manifestTheme, theme, ind.defaultColor) as string | undefined) ??
    '#52525b';
  const activeColor =
    (resolveThemedColor(manifestTheme, theme, ind.activeColor) as string | undefined) ??
    '#fafafa';
  const w = ind.width ?? 6;
  const h = ind.height ?? 6;
  const aw = ind.activeWidth ?? w;
  const ah = ind.activeHeight ?? h;

  const dots = layer.slides.map((_, i) => {
    const active = i === activeIndex;
    const dotHeight = active ? ah : h;
    const dotBorder = active ? ind.activeBorder ?? ind.border : ind.border;
    return {
      active,
      width: active ? aw : w,
      height: dotHeight,
      backgroundColor: active ? activeColor : defaultColor,
      opacity: active ? ind.activeOpacity ?? 1 : ind.defaultOpacity ?? 1,
      borderWidth: dotBorder?.width,
      borderColor: resolveThemedColor(manifestTheme, theme, dotBorder?.color),
      borderRadius: Math.max(dotHeight, 1),
    };
  });

  return {
    visible: true,
    position: pc.position,
    spacing: pc.spacing ?? 6,
    padding: boxEdgesOrUndefined(pc.padding) ?? boxEdges(undefined),
    margin: boxEdgesOrUndefined(pc.margin) ?? boxEdges(undefined),
    containerSurface: rendererSurfaceModel({
      style: { border: pc.border, shadow: pc.shadow },
      theme: manifestTheme,
      palette: theme,
    }),
    dots,
  };
};

export const rendererCarouselIndexFromScrollOffset = (
  offset: number,
  slideWidth: number,
  spacing: number,
  slideCount: number,
): number | null => {
  if (slideWidth <= 0 || slideCount <= 0) return null;
  const next = Math.round(offset / (slideWidth + spacing));
  if (next < 0 || next >= slideCount) return null;
  return next;
};

export const rendererCarouselScrollOffset = (
  index: number,
  slideWidth: number,
  spacing: number,
): number => index * (slideWidth + spacing);

/** Swipe-only carousels: emit flow completion when the user lands on the last slide. */
export const rendererCarouselShouldEmitComplete = (
  previousIndex: number,
  index: number,
  slideCount: number,
  loop: boolean,
): boolean => {
  if (loop || slideCount <= 1) return false;
  const last = slideCount - 1;
  return index === last && previousIndex < last;
};

export const rendererCarouselAdvanceIndex = (
  index: number,
  slideCount: number,
  loop: boolean,
): number => {
  if (index + 1 < slideCount) return index + 1;
  return loop ? 0 : index;
};
