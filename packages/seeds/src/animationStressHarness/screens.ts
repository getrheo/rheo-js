import {
  ANIMATABLE_PROPERTIES,
  EASING_TOKENS,
  type AnimatableProperty,
} from '@getrheo/contracts/animations';
import type { Screen } from '@getrheo/contracts/screens';
import {
  bodyStack,
  continueBtn,
  endBtn,
  label,
  mountClip,
  restingMotion,
  unmountClip,
} from './builders.js';

/** Screen draft before linear `next` links are applied. */
type ScreenDraft = Omit<Screen, 'next'>;

const chainScreens = (screens: ScreenDraft[]): Screen[] =>
  screens.map((screen, index) => ({
    ...screen,
    next: { default: index < screens.length - 1 ? screens[index + 1]!.id : null },
  }));

const mountFromForProperty = (property: AnimatableProperty): number => {
  if (property === 'opacity') return 0;
  if (property === 'scale') return 0.85;
  if (property === 'translateX') return -28;
  return -22;
};

const propertyMountScreens = (): ScreenDraft[] =>
  ANIMATABLE_PROPERTIES.map((property) => {
    const screenId = `scr_ash_m_${property}`;
    const layers = EASING_TOKENS.map((easing) => {
      const layerId = `lyr_ash_m_${property}_${easing.replace(/-/g, '')}`;
      return label(layerId, `${property} · ${easing}`, { fontSize: 13 });
    });
    const animations = EASING_TOKENS.map((easing, index) => {
      const layerId = `lyr_ash_m_${property}_${easing.replace(/-/g, '')}`;
      return mountClip(
        `c_ash_m_${property}_${easing.replace(/-/g, '')}`,
        layerId,
        property,
        easing,
        mountFromForProperty(property),
        property === 'opacity' ? 1 : 0,
        { trigger: 'stagger', staggerIndex: index },
      );
    });
    return {
      id: screenId,
      name: `ASH · Mount ${property}`,
      regions: {
        body: bodyStack(`lyr_ash_m_${property}_b`, [
          label(`lyr_ash_m_${property}_h`, `Mount · ${property} (all easings)`, { fontWeight: 700, fontSize: 16 }),
          ...layers,
          continueBtn(`lyr_ash_m_${property}_go`),
        ]),
      },
      stagger: { stepMs: 48 },
      animations,
    } satisfies ScreenDraft;
  });

const delayMountScreen = (): ScreenDraft => {
  const delays = [0, 80, 200] as const;
  const layers = delays.map((delayMs, index) =>
    label(`lyr_ash_del_${index}`, `delayMs=${delayMs}`, { fontSize: 14 }),
  );
  const animations = delays.map((delayMs, index) =>
    mountClip(`c_ash_del_${index}`, `lyr_ash_del_${index}`, 'opacity', 'standard', 0, 1, { delayMs }),
  );
  return {
    id: 'scr_ash_delay',
    name: 'ASH · Mount delayMs',
    regions: {
      body: bodyStack('lyr_ash_del_b', [
        label('lyr_ash_del_h', 'Mount clips with staggered delayMs', { fontWeight: 700 }),
        ...layers,
        continueBtn('lyr_ash_del_go'),
      ]),
    },
    animations,
  };
};

const multiTrackMountScreen = (): ScreenDraft => ({
  id: 'scr_ash_multi_mount',
  name: 'ASH · Multi-track mount',
  regions: {
    body: bodyStack('lyr_ash_mm_b', [
      label('lyr_ash_mm_h', 'Opacity + translateY + scale on one layer', { fontWeight: 700, fontSize: 18 }),
      continueBtn('lyr_ash_mm_go'),
    ]),
  },
  animations: [
    {
      id: 'c_ash_mm',
      targetLayerId: 'lyr_ash_mm_h',
      trigger: 'mount',
      durationMs: 520,
      tracks: [
        { property: 'opacity', keyframes: [{ t: 0, value: 0, easing: 'emphasized' }, { t: 1, value: 1 }] },
        { property: 'translateY', keyframes: [{ t: 0, value: 24, easing: 'standard' }, { t: 1, value: 0 }] },
        { property: 'scale', keyframes: [{ t: 0, value: 0.9, easing: 'ease-out' }, { t: 1, value: 1 }] },
      ],
    },
    mountClip('c_ash_mm_go', 'lyr_ash_mm_go', 'opacity', 'standard', 0, 1, { delayMs: 120 }),
  ],
});

const staggerScreens = (): ScreenDraft[] => {
  const denseLabels = Array.from({ length: 8 }, (_, index) =>
    label(`lyr_ash_sg_d_${index}`, `Item ${index + 1}`, { fontSize: 12 }),
  );
  const denseAnims = Array.from({ length: 8 }, (_, index) =>
    mountClip(`c_ash_sg_d_${index}`, `lyr_ash_sg_d_${index}`, 'opacity', 'emphasized', 0, 1, {
      trigger: 'stagger',
      staggerIndex: index,
    }),
  );
  return [
    {
      id: 'scr_ash_stagger',
      name: 'ASH · Stagger fade+slide',
      regions: {
        body: bodyStack('lyr_ash_sg_b', [
          label('lyr_ash_sg_h', 'Stagger · opacity + translateY', { fontWeight: 700 }),
          label('lyr_ash_sg_a', 'Row A'),
          label('lyr_ash_sg_b2', 'Row B'),
          continueBtn('lyr_ash_sg_go'),
        ]),
      },
      stagger: { stepMs: 72 },
      animations: [
        mountClip('c_ash_sg_h', 'lyr_ash_sg_h', 'opacity', 'standard', 0, 1, { trigger: 'stagger', staggerIndex: 0 }),
        {
          id: 'c_ash_sg_a',
          targetLayerId: 'lyr_ash_sg_a',
          trigger: 'stagger',
          staggerIndex: 1,
          durationMs: 320,
          tracks: [
            { property: 'opacity', keyframes: [{ t: 0, value: 0, easing: 'emphasized' }, { t: 1, value: 1 }] },
            { property: 'translateY', keyframes: [{ t: 0, value: 16, easing: 'emphasized' }, { t: 1, value: 0 }] },
          ],
        },
        {
          id: 'c_ash_sg_b2',
          targetLayerId: 'lyr_ash_sg_b2',
          trigger: 'stagger',
          staggerIndex: 2,
          durationMs: 320,
          tracks: [
            { property: 'opacity', keyframes: [{ t: 0, value: 0, easing: 'emphasized' }, { t: 1, value: 1 }] },
            { property: 'translateY', keyframes: [{ t: 0, value: 16, easing: 'emphasized' }, { t: 1, value: 0 }] },
          ],
        },
        mountClip('c_ash_sg_go', 'lyr_ash_sg_go', 'opacity', 'standard', 0, 1, { trigger: 'stagger', staggerIndex: 3 }),
      ],
    },
    {
      id: 'scr_ash_stagger_dense',
      name: 'ASH · Stagger dense grid',
      regions: {
        body: bodyStack('lyr_ash_sg_d_b', [
          label('lyr_ash_sg_d_h', '8 siblings · stepMs=40', { fontWeight: 700 }),
          ...denseLabels,
          continueBtn('lyr_ash_sg_d_go'),
        ]),
      },
      stagger: { stepMs: 40 },
      animations: [
        ...denseAnims,
        mountClip('c_ash_sg_d_go', 'lyr_ash_sg_d_go', 'opacity', 'standard', 0, 1, {
          trigger: 'stagger',
          staggerIndex: 8,
        }),
      ],
    },
  ];
};

const unmountScreens = (): ScreenDraft[] => [
  {
    id: 'scr_ash_unmount_opacity',
    name: 'ASH · Unmount opacity',
    regions: {
      body: bodyStack('lyr_ash_uo_b', [
        label('lyr_ash_uo_t', 'Fades out on navigate', { fontSize: 18 }),
        continueBtn('lyr_ash_uo_go'),
      ]),
    },
    animations: [
      mountClip('c_ash_uo_m', 'lyr_ash_uo_t', 'opacity', 'ease-out', 0, 1),
      unmountClip('c_ash_uo_u', 'lyr_ash_uo_t', [
        { property: 'opacity', keyframes: [{ t: 0, value: 1, easing: 'ease-in' }, { t: 1, value: 0 }] },
      ]),
    ],
  },
  {
    id: 'scr_ash_unmount_combo',
    name: 'ASH · Unmount multi-track',
    regions: {
      body: bodyStack('lyr_ash_uc_b', [
        label('lyr_ash_uc_t', 'Opacity + translateX exit', { fontSize: 18 }),
        continueBtn('lyr_ash_uc_go'),
      ]),
    },
    animations: [
      mountClip('c_ash_uc_m', 'lyr_ash_uc_t', 'opacity', 'standard', 0, 1),
      unmountClip('c_ash_uc_u', 'lyr_ash_uc_t', [
        { property: 'opacity', keyframes: [{ t: 0, value: 1 }, { t: 1, value: 0, easing: 'ease-in' }] },
        { property: 'translateX', keyframes: [{ t: 0, value: 0, easing: 'ease-in' }, { t: 1, value: -20 }] },
      ]),
    ],
  },
  {
    id: 'scr_ash_mount_unmount',
    name: 'ASH · Mount + unmount same layer',
    regions: {
      body: bodyStack('lyr_ash_mu_b', [
        label('lyr_ash_mu_hero', 'Dual clips on one target', { fontSize: 18, fontWeight: 600 }),
        continueBtn('lyr_ash_mu_go'),
      ]),
    },
    animations: [
      {
        id: 'c_ash_mu_m',
        targetLayerId: 'lyr_ash_mu_hero',
        trigger: 'mount',
        durationMs: 480,
        tracks: [
          { property: 'opacity', keyframes: [{ t: 0, value: 0 }, { t: 1, value: 1 }] },
          { property: 'scale', keyframes: [{ t: 0, value: 0.88, easing: 'ease-in-out' }, { t: 1, value: 1 }] },
        ],
      },
      unmountClip('c_ash_mu_u', 'lyr_ash_mu_hero', [
        { property: 'opacity', keyframes: [{ t: 0, value: 1 }, { t: 1, value: 0 }] },
        { property: 'translateX', keyframes: [{ t: 0, value: 0, easing: 'ease-in' }, { t: 1, value: -14 }] },
      ]),
    ],
  },
];

const restingMotionScreen = (
  id: string,
  name: string,
  layerId: string,
  motion: ReturnType<typeof restingMotion>,
  caption: string,
): ScreenDraft => ({
  id,
  name,
  regions: {
    body: bodyStack(`${layerId}_body`, [
      {
        id: layerId,
        kind: 'stack',
        direction: 'vertical',
        gap: 6,
        restingMotions: [{ id: `rm_${layerId}`, ...motion }],
        style: {
          padding: { t: 12, r: 12, b: 12, l: 12 },
          radius: 10,
          background: { light: '#f4f4f5', dark: '#27272a' },
        },
        children: [label(`${layerId}_t`, caption, { fontWeight: 600 })],
      },
      continueBtn(`lyr_${layerId}_go`),
    ]),
  },
});

const restingMotionScreens = (): ScreenDraft[] => [
  restingMotionScreen('scr_ash_rm_translate', 'ASH · Resting translate', 'lyr_ash_rm_tr', restingMotion('translate', {
    translatePeakXPercent: 12,
    translatePeakYPercent: -8,
    translateSpringBack: true,
    loop: true,
  }), 'Translate · spring-back loop'),
  restingMotionScreen('scr_ash_rm_bounce', 'ASH · Resting bounce', 'lyr_ash_rm_bn', restingMotion('bounce', {
    bounceAmplitudePx: 14,
    loop: true,
    durationMs: 2800,
  }), 'Bounce · amplitude 14px'),
  restingMotionScreen('scr_ash_rm_scale_up', 'ASH · Resting scale up', 'lyr_ash_rm_su', restingMotion('scale', {
    scaleDirection: 'up',
    scalePercent: 18,
    scaleSpringBack: true,
    scalePatternDurationMs: 900,
  }), 'Scale up · spring-back'),
  restingMotionScreen('scr_ash_rm_scale_down', 'ASH · Resting scale down', 'lyr_ash_rm_sd', restingMotion('scale', {
    scaleDirection: 'down',
    scalePercent: 12,
    scaleSpringBack: false,
    loop: true,
  }), 'Scale down · hold peak'),
  restingMotionScreen('scr_ash_rm_pulse', 'ASH · Resting pulse', 'lyr_ash_rm_pl', restingMotion('pulse', {
    pulseMinOpacity: 0.45,
    intensity: 1.1,
    loop: true,
  }), 'Pulse · custom min opacity'),
  restingMotionScreen('scr_ash_rm_rotate', 'ASH · Resting rotate', 'lyr_ash_rm_rt', restingMotion('rotate', {
    rotateMaxDeg: 12,
    rotateDirection: 'clockwise',
    rotateSpringBack: true,
    loop: true,
  }), 'Rotate · clockwise spring'),
  {
    id: 'scr_ash_rm_timeline',
    name: 'ASH · Resting timeline offsets',
    regions: {
      body: bodyStack('lyr_ash_rm_tl_body', [
        {
          id: 'lyr_ash_rm_tl_a',
          kind: 'stack',
          direction: 'vertical',
          restingMotions: [
            {
              id: 'rm_tl_a',
              preset: 'pulse',
              loop: true,
              delayMsAfterMountEnd: 200,
              durationMs: 3000,
            },
          ],
          children: [label('lyr_ash_rm_tl_a_t', 'delayMsAfterMountEnd=200')],
        },
        {
          id: 'lyr_ash_rm_tl_b_layer',
          kind: 'stack',
          direction: 'vertical',
          restingMotions: [
            {
              id: 'rm_tl_b',
              preset: 'bounce',
              loop: true,
              timelineStartMs: 400,
              durationMs: 3200,
              bounceAmplitudePx: 8,
            },
          ],
          children: [label('lyr_ash_rm_tl_b_t', 'timelineStartMs=400')],
        },
        continueBtn('lyr_ash_rm_tl_go'),
      ]),
    },
    animations: [
      mountClip('c_ash_rm_tl_a', 'lyr_ash_rm_tl_a', 'opacity', 'standard', 0, 1),
      mountClip('c_ash_rm_tl_b', 'lyr_ash_rm_tl_b_layer', 'opacity', 'standard', 0, 1, { delayMs: 100 }),
    ],
  },
  {
    id: 'scr_ash_rm_multi',
    name: 'ASH · Resting multi-segment',
    regions: {
      body: bodyStack('lyr_ash_rm_ms_b', [
        {
          id: 'lyr_ash_rm_ms_card',
          kind: 'stack',
          direction: 'vertical',
          restingMotions: [
            { id: 'rm_ms_pulse', preset: 'pulse', loop: true, durationMs: 2000, intensity: 0.9 },
            { id: 'rm_ms_bounce', preset: 'bounce', loop: true, timelineStartMs: 600, bounceAmplitudePx: 6 },
          ],
          style: {
            padding: { t: 14, r: 14, b: 14, l: 14 },
            radius: 12,
            background: { light: '#eef2ff', dark: '#1e1b4b' },
          },
          children: [label('lyr_ash_rm_ms_t', 'pulse then bounce on timeline')],
        },
        continueBtn('lyr_ash_rm_ms_go'),
      ]),
    },
  },
];

const entryScreen = (): ScreenDraft => ({
  id: 'scr_ash_entry',
  name: 'ASH · Entry',
  regions: {
    body: bodyStack('lyr_ash_entry_b', [
      label('lyr_ash_entry_h', 'Animation stress harness', { fontSize: 22, fontWeight: 700 }),
      label('lyr_ash_entry_p', 'Mount / stagger / unmount clips, all properties & easings, resting motions.'),
      continueBtn('lyr_ash_entry_go'),
    ]),
  },
  animations: [mountClip('c_ash_entry', 'lyr_ash_entry_h', 'opacity', 'emphasized', 0, 1)],
});

const doneScreen = (): ScreenDraft => ({
  id: 'scr_ash_done',
  name: 'ASH · Complete',
  regions: {
    body: bodyStack('lyr_ash_done_b', [
      label('lyr_ash_done_t', 'Animation harness complete', { fontSize: 20, fontWeight: 700 }),
      endBtn('lyr_ash_done_end'),
    ]),
  },
  animations: [mountClip('c_ash_done', 'lyr_ash_done_t', 'opacity', 'emphasized', 0, 1)],
});

/** Exhaustive animation permutation gallery — one concern per screen where possible. */
export const animationStressHarnessScreens = (): Screen[] => {
  const core: ScreenDraft[] = [
    entryScreen(),
    ...propertyMountScreens(),
    delayMountScreen(),
    multiTrackMountScreen(),
    ...staggerScreens(),
    ...unmountScreens(),
    ...restingMotionScreens(),
    doneScreen(),
  ];
  return chainScreens(core);
};
