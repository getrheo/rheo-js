import type { CommonLayoutHeight, Padding, WidthValue } from '@getrheo/contracts/layers';

export type RendererBoxEdges = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type RendererLayoutModel = {
  padding: RendererBoxEdges;
  margin: RendererBoxEdges;
  width: WidthValue | undefined;
  height: CommonLayoutHeight | undefined;
  position: 'absolute' | undefined;
  inset: RendererBoxEdges | undefined;
  zIndex: number | undefined;
};

export const boxEdges = (value: Padding | undefined): RendererBoxEdges => ({
  top: value?.t ?? 0,
  right: value?.r ?? 0,
  bottom: value?.b ?? 0,
  left: value?.l ?? 0,
});

export const boxEdgesOrUndefined = (value: Padding | undefined): RendererBoxEdges | undefined =>
  value === undefined ? undefined : boxEdges(value);

export const rendererLayoutModel = (style: {
  padding?: Padding;
  margin?: Padding;
  width?: WidthValue;
  height?: CommonLayoutHeight;
  position?: 'absolute';
  inset?: Padding;
  zIndex?: number;
} | undefined): RendererLayoutModel => ({
  padding: boxEdges(style?.padding),
  margin: boxEdges(style?.margin),
  width: style?.width,
  height: style?.height,
  position: style?.position,
  inset: style?.position === 'absolute' ? boxEdges(style?.inset) : undefined,
  zIndex: style?.zIndex,
});
