import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { LAYER_KINDS, type LayerKind } from '@getrheo/contracts/layers';

export type SwiftUiGradientClipCoverage = 'integration' | 'none';

export type GradientClipKindCoverage = {
  rn: boolean;
  flutter: boolean;
  swiftui: SwiftUiGradientClipCoverage;
};

export type GradientClipWidgetCoverage = {
  kinds: Record<LayerKind, GradientClipKindCoverage>;
  totals: {
    kindCount: number;
    rnTrue: number;
    flutterTrue: number;
    swiftuiIntegration: number;
    swiftuiNone: number;
  };
};

/** Auth child layers — rendered by parent; no independent outer-chrome widget test. */
export const GRADIENT_CLIP_PARENT_RENDERED_KINDS: readonly LayerKind[] = [
  'oauth_provider',
  'email_password_field',
  'email_password_submit',
];

const parentRenderedSet = new Set<LayerKind>(GRADIENT_CLIP_PARENT_RENDERED_KINDS);

const RN_VIEW_TO_KIND: Record<string, LayerKind> = {
  StackView: 'stack',
  TextView: 'text',
  HyperlinkView: 'hyperlink',
  ButtonView: 'button',
  BackButtonView: 'back_button',
  CounterView: 'counter',
  ProgressView: 'progress',
  LoaderView: 'loader',
  CarouselView: 'carousel',
  SingleChoiceView: 'single_choice',
  MultipleChoiceView: 'multiple_choice',
  CheckboxView: 'checkbox',
  TextInputView: 'text_input',
  ScaleInputView: 'scale_input',
  ImageView: 'image',
  IconView: 'icon',
  LottieLayerView: 'lottie',
  VideoLayerView: 'video',
  OAuthLoginView: 'oauth_login',
  EmailPasswordAuthView: 'email_password_auth',
};

const SWIFTUI_MARK_TO_KINDS: Record<string, LayerKind[]> = {
  StackLayerView: ['stack'],
  CarouselLayerView: ['carousel'],
  'SingleChoiceLayerView + ProgressLayerView': ['single_choice', 'progress'],
  ButtonLayerView: ['button'],
  OAuthLoginView: ['oauth_login'],
  ImageLayerView: ['image'],
  TextLayerView: ['text'],
  HyperlinkLayerView: ['hyperlink'],
  LoaderLayerView: ['loader'],
  CounterLayerView: ['counter'],
  EmailPasswordAuthView: ['email_password_auth'],
  LottieLayerView: ['lottie'],
  TextInputLayerView: ['text_input'],
  ScaleInputLayerView: ['scale_input'],
  CheckboxLayerView: ['checkbox'],
  VideoLayerView: ['video'],
  IconLayerView: ['icon'],
  BackButtonLayerView: ['back_button'],
  MultipleChoiceLayerView: ['multiple_choice'],
};

const RN_GRADIENT_CLIP_DESCRIBE =
  /describe\('(\w+(?:LayerView|View)?) brand gradient overflow clip'/g;

const FLUTTER_GRADIENT_CLIP_TEST =
  /testWidgets\('([^']*(?:gradient|ClipRRect)[^']*)'/g;

const FLUTTER_KIND_IN_TEST = /'kind':\s*'([a-z_]+)'/g;

const SWIFTUI_MARK = /\/\/ MARK: - (.+?) chain/g;

const readUtf8 = (filePath: string): string =>
  existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';

const scanRnGradientClipKinds = (repoRoot: string): Set<LayerKind> => {
  const found = new Set<LayerKind>();
  const rnLayersDir = path.join(
    repoRoot,
    'packages/sdks/react-native-core/src/ui/layers',
  );
  const files = [
    path.join(rnLayersDir, 'layoutLayers.test.tsx'),
    path.join(rnLayersDir, 'actionLayers.test.tsx'),
    path.join(rnLayersDir, 'feedbackLayers.test.tsx'),
    path.join(rnLayersDir, 'carouselLayers.test.tsx'),
    path.join(rnLayersDir, 'choiceLayers.test.tsx'),
    path.join(rnLayersDir, 'inputLayers.test.tsx'),
    path.join(rnLayersDir, 'mediaLayers.test.tsx'),
    path.join(rnLayersDir, 'auth/OAuthLoginView.test.tsx'),
    path.join(rnLayersDir, 'auth/EmailPasswordAuthView.test.tsx'),
  ];

  for (const file of files) {
    const source = readUtf8(file);
    for (const match of source.matchAll(RN_GRADIENT_CLIP_DESCRIBE)) {
      const kind = RN_VIEW_TO_KIND[match[1] ?? ''];
      if (kind) found.add(kind);
    }
  }

  return found;
};

const scanFlutterGradientClipKinds = (repoRoot: string): Set<LayerKind> => {
  const found = new Set<LayerKind>();
  const file = path.join(
    repoRoot,
    'packages/sdks/flutter/packages/rheo_flutter/test/rendering_parity_test.dart',
  );
  const source = readUtf8(file);

  for (const testMatch of source.matchAll(FLUTTER_GRADIENT_CLIP_TEST)) {
    const testName = testMatch[1] ?? '';
    if (!/gradient|ClipRRect/i.test(testName)) continue;

    const start = testMatch.index ?? 0;
    const end = source.indexOf('});', start);
    const block = end === -1 ? source.slice(start) : source.slice(start, end + 3);

    if (!/ClipRRect/.test(block)) continue;

    if (/gradient background layer wraps chrome in ClipRRect/.test(testName)) {
      found.add('stack');
      continue;
    }

    for (const kindMatch of block.matchAll(FLUTTER_KIND_IN_TEST)) {
      const kind = kindMatch[1] as LayerKind;
      if ((LAYER_KINDS as readonly string[]).includes(kind)) found.add(kind);
    }

    const nameKind = testName.match(/^(\w+(?:_\w+)*) layer with/i)?.[1]?.replace(/-/g, '_');
    if (nameKind && (LAYER_KINDS as readonly string[]).includes(nameKind)) {
      found.add(nameKind as LayerKind);
    }
  }

  return found;
};

const scanSwiftUiGradientClipKinds = (repoRoot: string): Set<LayerKind> => {
  const found = new Set<LayerKind>();
  const file = path.join(
    repoRoot,
    'packages/sdks/swiftui/Tests/RheoSwiftUITests/OuterChromeGradientClipIntegrationTests.swift',
  );
  const source = readUtf8(file);

  for (const match of source.matchAll(SWIFTUI_MARK)) {
    const markLabel = match[1]?.replace(/\s*\(IMP-\d+(?:–\d+)?\)\s*$/, '').trim() ?? '';
    const kinds = SWIFTUI_MARK_TO_KINDS[markLabel];
    if (kinds) {
      for (const kind of kinds) found.add(kind);
    }
  }

  return found;
};

export const buildGradientClipWidgetCoverage = (
  repoRoot: string,
): GradientClipWidgetCoverage => {
  const rnFound = scanRnGradientClipKinds(repoRoot);
  const flutterFound = scanFlutterGradientClipKinds(repoRoot);
  const swiftuiFound = scanSwiftUiGradientClipKinds(repoRoot);

  const kinds = {} as Record<LayerKind, GradientClipKindCoverage>;

  for (const kind of LAYER_KINDS) {
    const parentRendered = parentRenderedSet.has(kind);
    kinds[kind] = {
      rn: parentRendered || rnFound.has(kind),
      flutter: parentRendered || flutterFound.has(kind),
      swiftui: swiftuiFound.has(kind) ? 'integration' : 'none',
    };
  }

  const entries = Object.values(kinds);

  return {
    kinds,
    totals: {
      kindCount: LAYER_KINDS.length,
      rnTrue: entries.filter((row) => row.rn).length,
      flutterTrue: entries.filter((row) => row.flutter).length,
      swiftuiIntegration: entries.filter((row) => row.swiftui === 'integration').length,
      swiftuiNone: entries.filter((row) => row.swiftui === 'none').length,
    },
  };
};
