import type {
  CommonLayoutHeight,
  CommonStyle,
  Layer,
  LayerKind,
  StackLayer,
  WidthValue,
} from '@getrheo/contracts/layers';
import type { FlowManifest, Screen } from '@getrheo/contracts';
import { defaultLayoutStyleForKind } from './authoringLayoutDefaults';

const FRACTION_PRESETS = new Set(['1/2', '1/3', '2/3', '1/4', '3/4']);

export type LayoutAxis = 'width' | 'height';
export type RegionKind = 'header' | 'body' | 'footer';

export type FillChainWarning = {
  screenId: string;
  layerId: string;
  axis: LayoutAxis;
  message: string;
};

type AncestorContext = {
  layer: Layer;
  regionKind?: RegionKind;
  isRegionRoot: boolean;
};

type AxisSizingClass = 'hug' | 'fill' | 'fraction' | 'fixed';

const layerStyle = (layer: Layer): CommonStyle | undefined => {
  if (!('style' in layer)) return undefined;
  return layer.style as CommonStyle | undefined;
};

const axisValue = (layer: Layer, axis: LayoutAxis): WidthValue | CommonLayoutHeight => {
  const style = layerStyle(layer);
  const authored = axis === 'width' ? style?.width : style?.height;
  if (authored !== undefined) return authored;
  const defaults = defaultLayoutStyleForKind(layer.kind);
  if (!defaults) return 'auto';
  return axis === 'width' ? defaults.width : defaults.height;
};

const classifyAxisValue = (value: WidthValue | CommonLayoutHeight): AxisSizingClass => {
  if (value === 'auto') return 'hug';
  if (value === 'full' || value === 'fill') return 'fill';
  if (typeof value === 'number') return 'fixed';
  if (typeof value === 'string' && FRACTION_PRESETS.has(value)) return 'fraction';
  return 'hug';
};

const providesBoundedAxisSpace = (cls: AxisSizingClass): boolean =>
  cls === 'fill' || cls === 'fraction' || cls === 'fixed';

const kindLabel = (kind: LayerKind): string => {
  const map: Partial<Record<LayerKind, string>> = {
    stack: 'Stack',
    text: 'Text',
    image: 'Image',
    button: 'Button',
    back_button: 'Back button',
    single_choice: 'Single choice',
    multiple_choice: 'Multiple choice',
    carousel: 'Carousel',
    hyperlink: 'Hyperlink',
    oauth_login: 'OAuth login',
    email_password_auth: 'Email sign-in',
  };
  return map[kind] ?? kind;
};

const axisLabel = (axis: LayoutAxis): string => (axis === 'width' ? 'Width' : 'Height');

const bodyRootSatisfiesHeight = (ctx: AncestorContext): boolean =>
  ctx.isRegionRoot && ctx.regionKind === 'body';

const findBrokenAncestor = (
  layer: Layer,
  ancestors: AncestorContext[],
  axis: LayoutAxis,
): AncestorContext | null => {
  if (classifyAxisValue(axisValue(layer, axis)) !== 'fill') return null;

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const anc = ancestors[i]!;
    if (axis === 'height' && bodyRootSatisfiesHeight(anc)) return null;
    if (!providesBoundedAxisSpace(classifyAxisValue(axisValue(anc.layer, axis)))) return anc;
  }
  return null;
};

const visitLayerChildren = (layer: Layer, visit: (child: Layer) => void): void => {
  if (layer.kind === 'stack') layer.children.forEach(visit);
  else if (layer.kind === 'carousel') layer.slides.forEach(visit);
  else if (layer.kind === 'button' || layer.kind === 'back_button') layer.children.forEach(visit);
  else if (layer.kind === 'hyperlink') layer.children.forEach(visit);
  else if (layer.kind === 'single_choice' || layer.kind === 'multiple_choice') {
    layer.children.forEach(visit);
  } else if (layer.kind === 'text_input' || layer.kind === 'scale_input') {
    layer.children?.forEach(visit);
  } else if (layer.kind === 'oauth_login') layer.children.forEach(visit);
  else if (layer.kind === 'oauth_provider' && layer.variant === 'custom') {
    layer.children.forEach(visit);
  } else if (layer.kind === 'email_password_auth') layer.children.forEach(visit);
  else if (layer.kind === 'email_password_field') layer.children?.forEach(visit);
  else if (layer.kind === 'email_password_submit') layer.children.forEach(visit);
};

const walkLayerTree = (
  root: Layer,
  regionKind: RegionKind | undefined,
  isRegionRoot: boolean,
  onLayer: (layer: Layer, ancestors: AncestorContext[]) => void,
): void => {
  const visit = (layer: Layer, ancestors: AncestorContext[]): void => {
    onLayer(layer, ancestors);
    const nextAncestors: AncestorContext[] = [
      ...ancestors,
      { layer, regionKind, isRegionRoot: ancestors.length === 0 && isRegionRoot },
    ];
    visitLayerChildren(layer, (child) => visit(child, nextAncestors));
  };
  visit(root, []);
};

const warningMessage = (
  screen: Screen,
  layer: Layer,
  axis: LayoutAxis,
  blocker: AncestorContext,
): string => {
  const screenTitle = screen.name?.trim() ? `Screen "${screen.name.trim()}"` : 'Unnamed screen';
  const axisName = axisLabel(axis);
  const blockerName = kindLabel(blocker.layer.kind);
  return `${screenTitle}: ${axisName} Fill on this ${kindLabel(layer.kind)} needs every ancestor to use Fill, a fraction, or a fixed size on ${axisName.toLowerCase()}. Parent ${blockerName} uses Hug.`;
};

export const collectFillChainWarningsForScreen = (screen: Screen): FillChainWarning[] => {
  const out: FillChainWarning[] = [];
  const regions: { kind: RegionKind; root?: StackLayer }[] = [
    { kind: 'header', root: screen.regions.header },
    { kind: 'body', root: screen.regions.body },
    { kind: 'footer', root: screen.regions.footer },
  ];

  for (const { kind, root } of regions) {
    if (!root) continue;
    walkLayerTree(root, kind, true, (layer, ancestors) => {
      for (const axis of ['width', 'height'] as const) {
        const blocker = findBrokenAncestor(layer, ancestors, axis);
        if (!blocker) continue;
        out.push({
          screenId: screen.id,
          layerId: layer.id,
          axis,
          message: warningMessage(screen, layer, axis, blocker),
        });
      }
    });
  }

  return out;
};

export const collectFillChainWarnings = (manifest: FlowManifest): FillChainWarning[] =>
  manifest.screens.flatMap((screen) => collectFillChainWarningsForScreen(screen as Screen));

export const fillChainWarningForLayer = (
  warnings: FillChainWarning[],
  screenId: string,
  layerId: string,
  axis: LayoutAxis,
): FillChainWarning | undefined =>
  warnings.find((w) => w.screenId === screenId && w.layerId === layerId && w.axis === axis);

export const formatFillChainWarningsForPublish = (warnings: FillChainWarning[]): string[] =>
  warnings.map((w) => `Warning: ${w.message}`);
