import { DEFAULT_THEMED_FOREGROUND, PRIMARY_FILLED_LABEL } from '@getrheo/contracts/layers';
import { FlowManifestSchema, MANIFEST_SCHEMA_VERSION, type FlowManifest } from '@getrheo/contracts/manifest';

/**
 * Linear onboarding manifest used for analytics / ClickHouse funnel fixtures.
 * Screen ids must stay aligned with `experiment-funnel-ch.ts` and `customer-profile-demo-ch.ts`.
 */
export const buildWelcomeLinearManifest = (flowId: string): FlowManifest =>
  FlowManifestSchema.parse({
    flowId,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    version: 1,
    defaultLocale: 'en',
    locales: ['en'],
    entryScreenId: 'scr_welcome',
    screens: [
      {
        id: 'scr_welcome',
        name: 'Welcome',
        regions: {
          body: {
            id: 'lyr_welcome_body',
            kind: 'stack',
            direction: 'vertical',
            gap: 12,
            style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
            children: [
              {
                id: 'lyr_welcome_title',
                kind: 'text',
                text: { default: 'Welcome to Rheo' },
                style: { fontSize: 24, fontWeight: 700, color: DEFAULT_THEMED_FOREGROUND },
              },
              {
                id: 'lyr_welcome_cta',
                kind: 'button',
                variant: 'primary',
                action: { kind: 'continue' },
                direction: 'horizontal',
                align: 'center',
                distribution: 'center',
                children: [
                  {
                    id: 'lyr_welcome_cta_text',
                    kind: 'text',
                    text: { default: "Let's go" },
                    style: { color: PRIMARY_FILLED_LABEL },
                  },
                ],
              },
            ],
          },
        },
        next: { default: 'scr_goal' },
      },
      {
        id: 'scr_goal',
        name: 'Goal',
        regions: {
          body: {
            id: 'lyr_goal_body',
            kind: 'stack',
            direction: 'vertical',
            gap: 12,
            style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
            children: [
              {
                id: 'lyr_goal_title',
                kind: 'text',
                text: { default: 'What is your goal?' },
                style: { fontSize: 20, fontWeight: 600, color: DEFAULT_THEMED_FOREGROUND },
              },
              {
                id: 'lyr_goal_input',
                kind: 'single_choice',
                fieldKey: 'goal',
                children: [
                  {
                    id: 'lyr_goal_opt_fitness',
                    kind: 'stack',
                    direction: 'horizontal',
                    align: 'center',
                    gap: 8,
                    children: [
                      {
                        id: 'lyr_goal_opt_fitness_text',
                        kind: 'text',
                        text: { default: 'Fitness' },
                        style: { color: DEFAULT_THEMED_FOREGROUND },
                      },
                    ],
                  },
                  {
                    id: 'lyr_goal_opt_mind',
                    kind: 'stack',
                    direction: 'horizontal',
                    align: 'center',
                    gap: 8,
                    children: [
                      {
                        id: 'lyr_goal_opt_mind_text',
                        kind: 'text',
                        text: { default: 'Mindfulness' },
                        style: { color: DEFAULT_THEMED_FOREGROUND },
                      },
                    ],
                  },
                  {
                    id: 'lyr_goal_opt_prod',
                    kind: 'stack',
                    direction: 'horizontal',
                    align: 'center',
                    gap: 8,
                    children: [
                      {
                        id: 'lyr_goal_opt_prod_text',
                        kind: 'text',
                        text: { default: 'Productivity' },
                        style: { color: DEFAULT_THEMED_FOREGROUND },
                      },
                    ],
                  },
                ],
                optionBindings: [
                  { optionId: 'fitness', rootLayerId: 'lyr_goal_opt_fitness' },
                  { optionId: 'mindfulness', rootLayerId: 'lyr_goal_opt_mind' },
                  { optionId: 'productivity', rootLayerId: 'lyr_goal_opt_prod' },
                ],
                branching: { enabled: false, conditions: [] },
              },
            ],
          },
        },
        next: { default: 'scr_color' },
      },
      {
        id: 'scr_color',
        name: 'Your color',
        regions: {
          body: {
            id: 'lyr_color_body',
            kind: 'stack',
            direction: 'vertical',
            gap: 12,
            style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
            children: [
              {
                id: 'lyr_color_title',
                kind: 'text',
                text: { default: 'What is your favorite color?' },
                style: { fontSize: 20, fontWeight: 600, color: DEFAULT_THEMED_FOREGROUND },
              },
              {
                id: 'lyr_color_input',
                kind: 'text_input',
                name: 'Favorite color',
                fieldKey: 'favorite_color',
                classification: 'safe',
                placeholder: { default: 'e.g. Blue' },
              },
              {
                id: 'lyr_color_continue',
                kind: 'button',
                variant: 'primary',
                action: { kind: 'continue' },
                direction: 'horizontal',
                align: 'center',
                distribution: 'center',
                children: [
                  {
                    id: 'lyr_color_continue_t',
                    kind: 'text',
                    text: { default: 'Continue' },
                    style: { color: PRIMARY_FILLED_LABEL },
                  },
                ],
              },
            ],
          },
        },
        next: { default: 'scr_notes' },
      },
      {
        id: 'scr_notes',
        name: 'Private note',
        regions: {
          body: {
            id: 'lyr_notes_body',
            kind: 'stack',
            direction: 'vertical',
            gap: 12,
            style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
            children: [
              {
                id: 'lyr_notes_title',
                kind: 'text',
                text: { default: 'Anything else we should know?' },
                style: { fontSize: 20, fontWeight: 600, color: DEFAULT_THEMED_FOREGROUND },
              },
              {
                id: 'lyr_notes_input',
                kind: 'text_input',
                name: 'Sensitive note',
                fieldKey: 'internal_note',
                classification: 'sensitive',
                placeholder: { default: 'Optional' },
              },
              {
                id: 'lyr_notes_continue',
                kind: 'button',
                variant: 'primary',
                action: { kind: 'continue' },
                direction: 'horizontal',
                align: 'center',
                distribution: 'center',
                children: [
                  {
                    id: 'lyr_notes_continue_t',
                    kind: 'text',
                    text: { default: 'Continue' },
                    style: { color: PRIMARY_FILLED_LABEL },
                  },
                ],
              },
            ],
          },
        },
        next: { default: 'scr_done' },
      },
      {
        id: 'scr_done',
        name: 'Done',
        regions: {
          body: {
            id: 'lyr_done_body',
            kind: 'stack',
            direction: 'vertical',
            gap: 12,
            style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
            children: [
              {
                id: 'lyr_done_title',
                kind: 'text',
                text: { default: 'You are all set' },
                style: { fontSize: 24, fontWeight: 700, color: DEFAULT_THEMED_FOREGROUND },
              },
              {
                id: 'lyr_done_cta',
                kind: 'button',
                variant: 'primary',
                action: { kind: 'continue' },
                direction: 'horizontal',
                align: 'center',
                distribution: 'center',
                children: [
                  {
                    id: 'lyr_done_cta_text',
                    kind: 'text',
                    text: { default: 'Finish' },
                    style: { color: PRIMARY_FILLED_LABEL },
                  },
                ],
              },
            ],
          },
        },
        next: { default: null },
      },
    ],
    decisionNodes: [],
    externalSurfaceNodes: [],
    sdkAttributeKeys: [],
  });
