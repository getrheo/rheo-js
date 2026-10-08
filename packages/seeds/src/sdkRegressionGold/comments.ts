/** Inlined for public mirror — @rheo/platform-contracts stays private. */
export type FlowTemplateDefaultComment = {
  positionX: number;
  positionY: number;
  body: string;
};

/** Canvas layout cell size for placing screen nodes + nearby comment pins. */
export const SRG_LAYOUT = {
  colWidth: 280,
  rowHeight: 160,
  originX: 40,
  originY: 40,
  cols: 4,
} as const;

export const srgNodePosition = (index: number): { x: number; y: number } => ({
  x: SRG_LAYOUT.originX + (index % SRG_LAYOUT.cols) * SRG_LAYOUT.colWidth,
  y: SRG_LAYOUT.originY + Math.floor(index / SRG_LAYOUT.cols) * SRG_LAYOUT.rowHeight,
});

/** Comment pin slightly above-left of the matching screen node. */
export const srgCommentNear = (
  index: number,
  body: string,
): FlowTemplateDefaultComment => {
  const pos = srgNodePosition(index);
  return {
    positionX: pos.x - 8,
    positionY: pos.y - 36,
    body,
  };
};

/**
 * Ordered screen ids for the gold flow (must match chain order in the manifest).
 * Used for builderMeta layout + canvas comment placement.
 */
export const SRG_SCREEN_IDS = [
  'scr_srg_entry',
  'scr_srg_stack',
  'scr_srg_text',
  'scr_srg_icon',
  'scr_srg_image',
  'scr_srg_lottie',
  'scr_srg_video',
  'scr_srg_button',
  'scr_srg_btn_variants',
  'scr_srg_back',
  'scr_srg_progress',
  'scr_srg_loader',
  'scr_srg_counter',
  'scr_srg_single',
  'scr_srg_multi',
  'scr_srg_text_input',
  'scr_srg_scale',
  'scr_srg_wheel',
  'scr_srg_checkbox',
  'scr_srg_carousel',
  'scr_srg_hyperlink',
  'scr_srg_oauth',
  'scr_srg_email',
  'scr_srg_conditional',
  'scr_srg_stack_wrap',
  'scr_srg_choice_h',
  'scr_srg_choice_g',
  'scr_srg_wheel_date',
  'scr_srg_regions',
  'scr_srg_absolute',
  'scr_srg_done',
] as const;

const SCREEN_COMMENTS: Record<(typeof SRG_SCREEN_IDS)[number], string> = {
  scr_srg_entry: `SRG · START (scr_srg_entry)

PURPOSE
Gold-standard SDK regression walkthrough. Prefer this flow over the layer stress harness when validating expected visual/behavioral outcomes.

PASS
- All four SDKs can open and advance from this screen
- Light and dark themes both readable

FAIL
- Crash on mount, missing Continue, or unreadable copy`,

  scr_srg_stack: `SRG · stack (scr_srg_stack)

SUCCESS CRITERIA
- Three colored rows vertical with ~16px gaps
- Full width children
- distribution=start (flush top)

FAIL IF
- Gaps collapse, rows overlap, or width shrink-wraps incorrectly`,

  scr_srg_text: `SRG · text (scr_srg_text)

SUCCESS CRITERIA
- Authored fontSize/weight/align/lineHeight honored
- Explicit colors (no inheritance surprises on native)
- Dark mode flips themed colors

FAIL IF
- System Dynamic Type overrides break layout badly
- Missing color falls back to invisible text`,

  scr_srg_icon: `SRG · icon (scr_srg_icon)

SUCCESS CRITERIA
- 24×24 and 40×40 boxes respected
- Glyph centered; color #6366f1 on small icon

FAIL IF
- Icons ignore size, clip, or use wrong family glyph`,

  scr_srg_image: `SRG · image (scr_srg_image)

SUCCESS CRITERIA
- 160×100 box, radius 12, cover fit
- Missing media → stable placeholder (no crash)

FAIL IF
- Distorted aspect, zero-size, or hard crash without asset`,

  scr_srg_lottie: `SRG · lottie (scr_srg_lottie)

SUCCESS CRITERIA
- 96×96 looping animation; layout stable on start
- Missing asset does not block Continue

FAIL IF
- Layout jump, freeze, or crash without Lottie JSON`,

  scr_srg_video: `SRG · video (scr_srg_video)

SUCCESS CRITERIA
- 200×112 muted loop; radius 8
- No audio output

FAIL IF
- Loud autoplay, wrong aspect, or navigation freeze`,

  scr_srg_button: `SRG · button (scr_srg_button)

SUCCESS CRITERIA
- Rheo chrome (not stock Material/Cupertino)
- Press scale feedback
- continue advances graph

FAIL IF
- Platform default button styling or dead tap`,

  scr_srg_btn_variants: `SRG · button variants (scr_srg_btn_variants)

SUCCESS CRITERIA
- Every variant renders with distinct chrome
- primary/destructive labels stay light on fill
- action=none buttons do not advance

FAIL IF
- Variants look identical or labels unreadable in dark mode`,

  scr_srg_back: `SRG · back_button (scr_srg_back)

SUCCESS CRITERIA
- Lives in HEADER region
- Tap returns one screen in history
- Ghost variant + arrow icon

FAIL IF
- Body placement, no-op tap, or double-pop`,

  scr_srg_progress: `SRG · progress (scr_srg_progress)

SUCCESS CRITERIA
- Height 8, full width, indigo fill
- Track light/dark tokens

FAIL IF
- Default OS ProgressView chrome or wrong height`,

  scr_srg_loader: `SRG · loader (scr_srg_loader)

SUCCESS CRITERIA
- Linear + circular both animate
- Linear completion does NOT auto-advance

FAIL IF
- Stuck spinner or unexpected auto-navigation`,

  scr_srg_counter: `SRG · counter (scr_srg_counter)

SUCCESS CRITERIA
- Number → 99; time mm:ss → ~01:30
- Authored typography

FAIL IF
- Jumps to end instantly or wrong time format`,

  scr_srg_single: `SRG · single_choice (scr_srg_single)

SUCCESS CRITERIA
- Exclusive selection + selectedStyle chrome
- fieldKey srg_single_pick

FAIL IF
- Multi-select behavior or missing selected chrome`,

  scr_srg_multi: `SRG · multiple_choice (scr_srg_multi)

SUCCESS CRITERIA
- Both tags can stay selected
- Deselect works

FAIL IF
- Forced single-select or lost state on scroll`,

  scr_srg_text_input: `SRG · text_input (scr_srg_text_input)

SUCCESS CRITERIA
- Outer style owns chrome; fieldStyle typography only
- Keyboard does not permanently cover Continue

FAIL IF
- Padding/radius on wrong style bag or unreadable placeholder`,

  scr_srg_scale: `SRG · scale_input (scr_srg_scale)

SUCCESS CRITERIA
- Default 5; Low/High labels; range 1–10

FAIL IF
- Wrong default, missing labels, or non-interactive`,

  scr_srg_wheel: `SRG · wheel_picker options (scr_srg_wheel)

SUCCESS CRITERIA
- Small/Medium/Large; default Medium
- String optionId captured

FAIL IF
- Crash on fling or empty wheel`,

  scr_srg_checkbox: `SRG · checkbox (scr_srg_checkbox)

SUCCESS CRITERIA
- Toggle boolean fieldKey srg_agree
- Rheo row chrome readable

FAIL IF
- Stock-only control with broken hit target`,

  scr_srg_carousel: `SRG · carousel (scr_srg_carousel)

SUCCESS CRITERIA
- Swipe pages; pagePeek≈12; loop wraps
- Stable height

FAIL IF
- No peek, broken loop, or vertical layout collapse`,

  scr_srg_hyperlink: `SRG · hyperlink (scr_srg_hyperlink)

SUCCESS CRITERIA
- Underlined Rheo link opens https://getrheo.io
- Host browser / in-app browser

FAIL IF
- Dead link or stock TextButton look`,

  scr_srg_oauth: `SRG · oauth (scr_srg_oauth)

SUCCESS CRITERIA
- Preset GitHub/Google + custom row (icon+label)
- Gap 8; host provider wiring optional for visual QA

FAIL IF
- Nested oauth_provider invalid outside oauth_login
- Custom row missing children`,

  scr_srg_email: `SRG · email_password_auth (scr_srg_email)

SUCCESS CRITERIA
- email + password fields + submit nested correctly
- Sign in uses primary filled label

FAIL IF
- Orphan field/submit outside auth parent
- Broken keyboard avoidance`,

  scr_srg_conditional: `SRG · conditional (scr_srg_conditional)

SUCCESS CRITERIA
- Exactly one branch visible (iOS vs else)
- No wrapper chrome; no empty gap for hidden branch

FAIL IF
- Both branches visible or wrong platform branch`,

  scr_srg_stack_wrap: `SRG · stack wrap (scr_srg_stack_wrap)

SUCCESS CRITERIA
- Six chips wrap on 390px; gap 8

FAIL IF
- Overflow clipped without wrap or huge vertical gaps`,

  scr_srg_choice_h: `SRG · choice horizontal (scr_srg_choice_h)

SUCCESS CRITERIA
- H-A / H-B on one row when width allows
- Exclusive select

FAIL IF
- Forced vertical layout ignoring direction`,

  scr_srg_choice_g: `SRG · choice grid (scr_srg_choice_g)

SUCCESS CRITERIA
- 2×2 grid; even gaps; exclusive select

FAIL IF
- Broken columns or uneven cell widths`,

  scr_srg_wheel_date: `SRG · wheel date (scr_srg_wheel_date)

SUCCESS CRITERIA
- Year 2000–2005; default 2002; string value

FAIL IF
- Wrong datePart or out-of-range years`,

  scr_srg_regions: `SRG · regions (scr_srg_regions)

SUCCESS CRITERIA
- Header progress + body QA + footer label
- insetSafeArea respected
- Footer not covered permanently by body

FAIL IF
- Regions merge into one scroll or safe-area ignored`,

  scr_srg_absolute: `SRG · absolute (scr_srg_absolute)

SUCCESS CRITERIA
- Overlay card floats top-right over base
- zIndex above base; shadow approximate OK

FAIL IF
- Absolute ignored or applied on region root (invalid)`,

  scr_srg_done: `SRG · DONE (scr_srg_done)

SUCCESS CRITERIA
- end_flow terminates session cleanly on all SDKs
- No orphan loading state after End flow

REPORT
File bugs with: screen id, SDK, theme, viewport width, expected vs actual, screenshots`,
};

/** Overview pin near the entry screen plus one pin per screen. */
export const buildSdkRegressionGoldComments = (): FlowTemplateDefaultComment[] => {
  const overview: FlowTemplateDefaultComment = {
    positionX: 8,
    positionY: 8,
    body: `SDK REGRESSION GOLD — HOW TO QA

1. Seed via pnpm --filter @rheo/api db:seed
2. Open "Seed · SDK regression gold" in the dashboard builder
3. Run the same flow on Web sim, React Native, Flutter, SwiftUI
4. For each screen: read on-device TEST / EXPECTED, then this canvas pin
5. Mark pass/fail per screen; capture light + dark at 390px (spot-check 800px)

RELATED
- Layer stress harness = broader coverage / edge cases
- Animation stress harness = motion clips
- This flow = instructional gold standard with explicit success criteria

PASS RULE
A screen passes only when EXPECTED matches on all four SDKs.`,
  };

  const perScreen = SRG_SCREEN_IDS.map((id, index) =>
    srgCommentNear(index, SCREEN_COMMENTS[id]),
  );

  return [overview, ...perScreen];
};
