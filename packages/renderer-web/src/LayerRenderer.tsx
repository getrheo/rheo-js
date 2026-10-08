import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { Branding } from '@getrheo/contracts/branding';
import type { Screen } from '@getrheo/contracts/screens';
import {
  type ButtonAction,
  type Layer,
} from '@getrheo/contracts/layers';
import { resolveCommonStyleAtWidth } from '@getrheo/flow-runtime/responsive/layerResolve';
import type { InterpolationContext } from '@getrheo/flow-runtime/interpolateTemplate';
import {
  brandingWebFontFacesCss,
  resolveWebRootFontFamilyCss,
} from '@getrheo/renderer-core';
import type { StepResponse } from '@getrheo/flow-runtime/stateMachine';
import { DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX } from '@getrheo/flow-runtime/responsive/breakpoints';
import { resolveScreenContainerStyleAtWidth } from '@getrheo/flow-runtime/responsive/screenContainerResolve';
import { previewPhoneSafeAreaPadding } from '@getrheo/flow-runtime/responsive/previewSafeAreaInsets';
import { resolveEffectiveScreenShellPadding } from '@getrheo/flow-runtime/responsive/screenShellInsets';
import {
  ScreenInputDraftProvider,
  ScreenCheckboxAckProvider,
} from '@getrheo/flow-ui-state';
import {
  MotionPlaybackProvider,
  type MotionPlaybackMode,
} from './motionPlayback';
import { MediaPlaybackProvider } from './mediaPlayback';
import { CarouselControlProvider } from './carouselControl';
import { MotionShell, RestingMotionKeyframesOnce, RestingShell } from './LayerRendererMotion';
import type { PhoneSystemUi } from './PhoneFrame';
import {
  previewPhoneSafeAreaInsetBottomPx,
  previewPhoneSafeAreaInsetTopPx,
} from './PhoneFrame';
import {
  type Ctx,
  type InspectorStylePreview,
} from './LayerRendererShared';
import {
  BackButtonView,
  ButtonView,
} from './layers/actionLayers';
import { EmailPasswordAuthSimView, OAuthLoginSimView } from './layers/authLayers';
import { CarouselView } from './layers/carouselLayers';
import { ConditionalView } from './layers/conditionalLayers';
import { MultipleChoiceView, SingleChoiceView } from './layers/choiceLayers';
import { CounterView, LoaderView, ProgressView } from './layers/feedbackLayers';
import { CheckboxView, ScaleInputView, TextInputView, WheelPickerView } from './layers/inputLayers';
import {
  AddressInputView,
  DateTimeInputView,
  NumberStepperView,
  PhoneInputView,
} from './layers/formPatternLayers';
import { HyperlinkView, StackView, TextView } from './layers/layoutLayers';
import { IconView, ImageView, LottieView, VideoView } from './layers/mediaLayers';
import {
  commonCss,
  containerStyle,
  flowChildLayoutCss,
  mergeDefinedCss,
  padding,
  wrapperLayoutCssFromResolvedCommon,
} from './LayerRendererStyle';
import { resolveShellColorFillCss, ScreenShellBackdrop } from './screenBackground';

export type { InspectorStylePreview } from './LayerRendererShared';

export type LayerRendererProps = {
  manifest: FlowManifest;
  screen: Screen;
  locale?: string;
  mode: 'static' | 'interactive';
  onRespond?: (r: StepResponse) => void;
  onAction?: (a: ButtonAction, meta?: { layerId: string }) => void;
  selectedLayerId?: string | null;
  selectedLayerIds?: readonly string[];
  findMatchLayerIds?: readonly string[];
  onSelectLayer?: (id: string | null) => void;
  mediaMap?: Record<string, string>;
  theme?: 'light' | 'dark';
  /**
   * When set, flow layer styles are resolved for this logical width (CSS px),
   * including `styleBreakpoints` mobile-first merge. Defaults in the sim to
   * ~phone width when omitted.
   */
  previewWidthPx?: number;
  /**
   * When true, draw subtle "Header", "Body", "Footer" labels and dashed
   * outlines around each region so authors can see the layout primitives.
   * Off by default — runtime SDKs always render without chrome.
   */
  showRegionLabels?: boolean;
  /** When set, Text layers substitute `{{ … }}` tokens from flow responses and `custom.*` from the host. */
  interpolationContext?: InterpolationContext;
  /**
   * Animation playback mode. `preview` plays mount animations once;
   * `paused` snaps to settled values without animating; `scrub` is for
   * the editor timeline.
   */
  motionMode?: MotionPlaybackMode;
  /** When `motionMode === 'scrub'`, current time in ms from screen mount. */
  motionScrubTimeMs?: number;
  /**
   * While `motionMode === 'preview'`, called with the clock time (ms) each frame
   * so hosts (e.g. editor timeline) can mirror the scrubber during replay.
   */
  onMotionPreviewTimeMs?: (ms: number) => void;
  /** Bumping this restarts the mount animations from t=0. */
  motionResetKey?: string | number;
  /**
   * When `motionMode === 'preview'`, start the clock from this time (ms). Default 0.
   */
  motionPreviewStartMs?: number;
  /** Fires when preview playback reaches the end of the motion timeline. */
  onMotionPreviewPlaybackComplete?: () => void;
  /**
   * When true, the renderer sizes to its content height instead of stretching
   * the body region to fill a fixed parent (no `flex: 1` body column).
   * Use for thumbnails or compact previews.
   */
  intrinsicHeight?: boolean;
  /**
   * Softer choice-option defaults and aligned chrome for catalog thumbnails
   * (add-component presets). Does not affect flow simulator screens.
   */
  thumbnailChrome?: boolean;
  /**
   * When true, pad the flow content with top/bottom safe-area-like insets in the web sim
   * (`max(env(safe-area-inset-*), preview top/bottom)`). Prefer {@link PhoneFrame} with
   * `insetSafeArea` on the screen for dashboard previews; use this only for standalone
   * renders without the phone chrome overlay.
   */
  simulateSafeArea?: boolean;
  /** Pass the same `systemUi` as {@link PhoneFrame} so bottom inset matches the home pill. */
  previewSafeAreaSystemUi?: PhoneSystemUi;
  /**
   * Builder / preview: invoked when a {@link HyperlinkLayer} is activated.
   * Does not open a browser tab; hosts typically show a disclaimer modal.
   */
  onHyperlinkPreview?: (info: { href: string; label: string }) => void;
  /** Runtime: fired after a hyperlink URL is opened in a new tab. */
  onExternalLink?: (info: { layerId: string; href: string }) => void;
  /**
   * Builder: reflects inspector tabs (checkbox unchecked/checked; choice option
   * stack default/selected) on the canvas without mutating draft or manifest.
   */
  inspectorStylePreview?: InspectorStylePreview | null;
  /** App branding (gradient presets). Optional — sim resolves `$brandGradient:` when set. */
  branding?: Branding;
  /** Rheo dashboard previews: static video poster, no in-browser audio. */
  authoringPreview?: boolean;
  /** Flow canvas thumbnails: shell video shows a static poster frame only. */
  canvasPosterVideo?: boolean;
  /**
   * Variables `conditional` layer cases read. `responses` defaults to
   * {@link LayerRendererProps.interpolationContext}; `platform` to `unknown`.
   */
  conditionalEval?: {
    platform?: string;
    sdkAttributes?: Record<string, unknown>;
    responses?: Record<string, unknown>;
  };
  /**
   * Builder canvas: pin a `conditional` layer (by id) to a case id or `'else'`
   * so authors can edit an inactive branch. Runtime previews leave this unset.
   */
  conditionalCasePreview?: Record<string, string>;
};

const renderLayerContent = (layer: Layer, ctx: Ctx): ReactNode => {
  switch (layer.kind) {
    case 'stack':
      return <StackView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'text':
      return <TextView layer={layer} ctx={ctx} />;
    case 'hyperlink':
      return <HyperlinkView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'image':
      return <ImageView layer={layer} ctx={ctx} />;
    case 'lottie':
      return <LottieView layer={layer} ctx={ctx} />;
    case 'video':
      return <VideoView layer={layer} ctx={ctx} />;
    case 'icon':
      return <IconView layer={layer} ctx={ctx} />;
    case 'button':
      return <ButtonView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'back_button':
      return <BackButtonView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'progress':
      return <ProgressView layer={layer} ctx={ctx} />;
    case 'loader':
      return <LoaderView layer={layer} ctx={ctx} />;
    case 'counter':
      return <CounterView layer={layer} ctx={ctx} />;
    case 'checkbox':
      return <CheckboxView layer={layer} ctx={ctx} />;
    case 'single_choice':
      return <SingleChoiceView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'multiple_choice':
      return <MultipleChoiceView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'text_input':
      return <TextInputView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'scale_input':
      return <ScaleInputView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'wheel_picker':
      return <WheelPickerView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'date_time_input':
      return <DateTimeInputView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'number_stepper':
      return <NumberStepperView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'number_stepper_button':
    case 'number_stepper_value':
      return null;
    case 'phone_input':
      return <PhoneInputView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'address_input':
      return <AddressInputView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'oauth_provider':
      return null;
    case 'oauth_login':
      return <OAuthLoginSimView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'email_password_field':
    case 'email_password_submit':
      return null;
    case 'email_password_auth':
      return <EmailPasswordAuthSimView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'carousel':
      return <CarouselView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
    case 'conditional':
      return <ConditionalView layer={layer} ctx={ctx} renderLayer={renderLayer} />;
  }
};

const renderLayer = (layer: Layer, ctx: Ctx): ReactNode => {
  // Only stacks consume `isRegionRoot`. Strip it before recursing into any
  // non-stack so it never leaks into nested layers (e.g. carousel slides).
  if (layer.kind !== 'stack' && ctx.isRegionRoot) {
    ctx = { ...ctx, isRegionRoot: false, regionKind: undefined };
  }
  const viewportW = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolved =
    'style' in layer
      ? resolveCommonStyleAtWidth(
          layer.style,
          'styleBreakpoints' in layer ? layer.styleBreakpoints : undefined,
          viewportW,
        )
      : undefined;
  // Responsive banners size to content. A `height: full` region root must not
  // get the phone fill-shell (`flex: 1; min-height: 0; height: 100%`) or the
  // stack pins to the chrome min-height and children (e.g. a 160px image) paint
  // outside the screen background.
  const skipFillShell =
    ctx.intrinsicRegionLayout === true && ctx.isRegionRoot === true;
  const shellStyle: CSSProperties = {
    ...wrapperLayoutCssFromResolvedCommon(resolved),
    ...(skipFillShell
      ? {}
      : flowChildLayoutCss(resolved, ctx.parentStackDirection, ctx.parentStackAlign)),
  };
  const heightFill =
    !skipFillShell && (resolved?.height === 'fill' || resolved?.height === 'full');
  const content = (
    <MotionShell layerId={layer.id} fill={heightFill}>
      <RestingShell layer={layer} fill={heightFill}>
        {renderLayerContent(layer, ctx)}
      </RestingShell>
    </MotionShell>
  );
  if (Object.keys(shellStyle).length === 0) return content;
  const inner =
    heightFill ? (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {content}
      </div>
    ) : (
      content
    );
  return (
    <div data-layer-shell={layer.id} style={shellStyle}>
      {inner}
    </div>
  );
};

const LayerView = ({ layer, ctx }: { layer: Layer; ctx: Ctx }) => renderLayer(layer, ctx);
import { BodyRegion, regionWrapStyle, RegionLabelRow } from './LayerRendererRegions.js';


export const LayerRenderer = ({
  manifest,
  screen,
  locale = 'en',
  mode,
  onRespond,
  onAction,
  selectedLayerId,
  selectedLayerIds,
  findMatchLayerIds,
  onSelectLayer,
  mediaMap,
  theme = 'dark',
  showRegionLabels = false,
  interpolationContext,
  motionMode = 'preview',
  motionScrubTimeMs = 0,
  onMotionPreviewTimeMs,
  motionResetKey,
  motionPreviewStartMs = 0,
  onMotionPreviewPlaybackComplete,
  previewWidthPx,
  intrinsicHeight = false,
  thumbnailChrome = false,
  simulateSafeArea: simulateSafeAreaProp,
  previewSafeAreaSystemUi = 'ios',
  onHyperlinkPreview,
  onExternalLink,
  inspectorStylePreview = null,
  branding,
  authoringPreview = false,
  canvasPosterVideo = false,
  conditionalEval,
  conditionalCasePreview,
}: LayerRendererProps) => {
  const ctx: Ctx = {
    manifest,
    screen,
    locale,
    interactive: mode === 'interactive',
    mediaMap,
    selectedLayerId,
    selectedLayerIds,
    findMatchLayerIds,
    onSelectLayer,
    onRespond,
    onAction,
    onHyperlinkPreview,
    onExternalLink,
    theme,
    interpolationContext,
    previewWidthPx,
    intrinsicRegionLayout: intrinsicHeight ? true : undefined,
    thumbnailChrome: thumbnailChrome ? true : undefined,
    inspectorStylePreview,
    branding,
    authoringPreview: authoringPreview ? true : undefined,
    conditionalEval,
    conditionalCasePreview,
  };
  const handleBgClick = () => {
    if (onSelectLayer) onSelectLayer(null);
  };
  const viewportW = previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedScreenChrome = resolveScreenContainerStyleAtWidth(
    screen.containerStyle,
    screen.containerStyleBreakpoints,
    viewportW,
  );
  const shellFill = resolvedScreenChrome?.backgroundFill;
  const shellColorCss =
    shellFill?.kind === 'color'
      ? resolveShellColorFillCss(shellFill, manifest.theme, theme, branding)
      : {};
  // Color paints on the in-flow shell so auto-height banners get a real
  // background box. Image/video still need the absolute media layer.
  const showAbsoluteShellBackdrop = shellFill != null && shellFill.kind !== 'color';
  const fontFaceCss = brandingWebFontFacesCss(branding);
  const effectiveShellPadding = resolveEffectiveScreenShellPadding({
    manual: resolvedScreenChrome?.padding,
    insetSafeArea: resolvedScreenChrome?.insetSafeArea,
    safeAreaInsets: previewPhoneSafeAreaPadding(
      viewportW,
      previewSafeAreaSystemUi ?? 'ios',
    ),
  });
  // Margin on the outer shell; padding applies to foreground regions only so shell
  // media backdrops stay edge-to-edge under the PhoneFrame status bar overlay.
  const shellMarginLayout = {
    margin: resolvedScreenChrome?.margin,
  };
  const baseOuterShell = mergeDefinedCss(
    mergeDefinedCss(
      containerStyle(theme, intrinsicHeight),
      commonCss(shellMarginLayout, manifest.theme, theme, branding),
    ),
    {
      ...(shellFill ? { position: 'relative' as const } : {}),
      ...(shellColorCss.background
        ? shellColorCss
        : showAbsoluteShellBackdrop
          ? { background: 'transparent' as const }
          : {}),
    },
  );
  const rootFont = resolveWebRootFontFamilyCss(manifest.theme);
  const outerShellStyle = rootFont ? { ...baseOuterShell, fontFamily: rootFont } : baseOuterShell;

  const simulateSafeArea = simulateSafeAreaProp === true;
  const shellPaddingCss = padding(effectiveShellPadding);
  const shellPaddingActive =
    effectiveShellPadding != null &&
    ((effectiveShellPadding.t ?? 0) > 0 ||
      (effectiveShellPadding.r ?? 0) > 0 ||
      (effectiveShellPadding.b ?? 0) > 0 ||
      (effectiveShellPadding.l ?? 0) > 0);

  const regionForegroundStyle = useMemo((): CSSProperties | undefined => {
    const top = previewPhoneSafeAreaInsetTopPx(viewportW);
    const bottom = previewPhoneSafeAreaInsetBottomPx(viewportW, previewSafeAreaSystemUi);
    const safeAreaPadding = simulateSafeArea
      ? {
          paddingTop: `max(env(safe-area-inset-top, 0px), ${top}px)`,
          paddingBottom: `max(env(safe-area-inset-bottom, 0px), ${bottom}px)`,
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }
      : {};
    const foregroundBase: CSSProperties = {
      position: 'relative',
      // `ScreenShellBackdrop` is `position: absolute; z-index: 0` and paints above
      // in-flow flex children without an explicit foreground stacking context.
      zIndex: shellFill ? 1 : undefined,
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      ...shellPaddingCss,
      ...safeAreaPadding,
    };

    // Intrinsic-height hosts skip the bounded flex column unless shell chrome
    // needs a stacking context or padding. Do not set minHeight: 0 — that
    // collapses content in auto-height banners.
    if (intrinsicHeight) {
      if (!shellFill && !shellPaddingActive && !simulateSafeArea) return undefined;
      return { ...foregroundBase, flexGrow: 0, flexShrink: 0 };
    }

    // Full-height phone previews need a bounded flex column for header/body/footer Fill
    // chains. Safe-area padding is optional; the flex wrapper is not (canvas + dialog parity).
    return {
      ...foregroundBase,
      flex: 1,
      minHeight: 0,
      minWidth: 0,
    };
  }, [
    intrinsicHeight,
    simulateSafeArea,
    shellFill,
    shellPaddingActive,
    viewportW,
    previewSafeAreaSystemUi,
    shellPaddingCss,
  ]);

  const regionContent = (
    <>
        {screen.regions.header && (
          <div style={regionWrapStyle('header', theme, showRegionLabels, intrinsicHeight)}>
            {showRegionLabels && <RegionLabelRow label="Header" theme={theme} />}
            <LayerView
              layer={screen.regions.header}
              ctx={{ ...ctx, isRegionRoot: true, regionKind: 'header' }}
            />
          </div>
        )}
        {showRegionLabels ? (
          <BodyRegion
            LayerView={LayerView}
            bodyLayer={screen.regions.body}
            ctx={ctx}
            theme={theme}
            showLabels
            intrinsicHeight={intrinsicHeight}
          />
        ) : (
          <div style={regionWrapStyle('body', theme, false, intrinsicHeight)}>
            <LayerView
              layer={screen.regions.body}
              ctx={{ ...ctx, isRegionRoot: true, regionKind: 'body' }}
            />
          </div>
        )}
        {screen.regions.footer && (
          <div style={regionWrapStyle('footer', theme, showRegionLabels, intrinsicHeight)}>
            {showRegionLabels && <RegionLabelRow label="Footer" theme={theme} />}
            <LayerView
              layer={screen.regions.footer}
              ctx={{ ...ctx, isRegionRoot: true, regionKind: 'footer' }}
            />
          </div>
        )}
    </>
  );

  return (
    <ScreenCheckboxAckProvider screen={screen}>
      <ScreenInputDraftProvider screen={screen}>
        <MotionPlaybackProvider
        screen={screen}
        mode={motionMode}
        resetKey={motionResetKey ?? screen.id}
        scrubTimeMs={motionScrubTimeMs}
        previewStartMs={motionPreviewStartMs}
        onPreviewTimeMs={onMotionPreviewTimeMs}
        onPreviewPlaybackComplete={onMotionPreviewPlaybackComplete}
      >
        <MediaPlaybackProvider>
        <CarouselControlProvider>
        <RestingMotionKeyframesOnce />
        <div
        onClick={onSelectLayer ? handleBgClick : undefined}
        style={outerShellStyle}
      >
        {showAbsoluteShellBackdrop ? (
          <ScreenShellBackdrop
            screen={screen}
            theme={manifest.theme}
            palette={theme}
            branding={branding}
            mediaMap={mediaMap}
            previewWidthPx={viewportW}
            canvasPosterMode={canvasPosterVideo || authoringPreview}
            interactive={mode === 'interactive'}
            onRespond={onRespond}
          />
        ) : null}
        {fontFaceCss ? (
          <style
            // Scoped to this subtree; @font-face is global in CSS but keyed by family name.
            dangerouslySetInnerHTML={{ __html: fontFaceCss }}
          />
        ) : null}
        {regionForegroundStyle ? (
          <div style={regionForegroundStyle}>{regionContent}</div>
        ) : (
          regionContent
        )}
      </div>
        </CarouselControlProvider>
        </MediaPlaybackProvider>
      </MotionPlaybackProvider>
    </ScreenInputDraftProvider>
    </ScreenCheckboxAckProvider>
  );
};
