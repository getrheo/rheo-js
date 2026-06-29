import type { FlowManifest } from '@getrheo/contracts/manifest';
import { MANIFEST_SCHEMA_VERSION } from '@getrheo/contracts/manifest';
import { DEFAULT_THEMED_FOREGROUND, PRIMARY_FILLED_LABEL } from '@getrheo/contracts/layers';

export const validFlow = (): FlowManifest => ({
  flowId: '00000000-0000-0000-0000-000000000001',
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  version: 1,
  defaultLocale: 'en',
  locales: ['en', 'fr'],
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
              text: { default: 'Welcome', translations: { fr: 'Bienvenue' } },
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
              ],
              optionBindings: [
                { optionId: 'fitness', rootLayerId: 'lyr_goal_opt_fitness' },
                { optionId: 'mindfulness', rootLayerId: 'lyr_goal_opt_mind' },
              ],
              branching: {
                enabled: true,
                conditions: [{ choiceId: 'mindfulness', goTo: 'scr_name' }],
              },
            },
          ],
        },
      },
      next: { default: 'scr_name' },
    },
    {
      id: 'scr_name',
      name: 'Name',
      regions: {
        body: {
          id: 'lyr_name_body',
          kind: 'stack',
          direction: 'vertical',
          gap: 12,
          style: { padding: { t: 16, r: 16, b: 16, l: 16 } },
          children: [
            {
              id: 'lyr_name_title',
              kind: 'text',
              text: { default: 'What is your name?' },
              style: { fontSize: 20, fontWeight: 600, color: DEFAULT_THEMED_FOREGROUND },
            },
            {
              id: 'lyr_name_input',
              kind: 'text_input',
              fieldKey: 'first_name',
              classification: 'safe',
              placeholder: { default: 'Your name' },
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
              id: 'lyr_done_link',
              kind: 'hyperlink',
              href: 'https://example.com',
              direction: 'horizontal',
              gap: 4,
              align: 'center',
              children: [
                {
                  id: 'lyr_done_link_text',
                  kind: 'text',
                  text: { default: 'Learn more' },
                  style: { fontSize: 14, color: DEFAULT_THEMED_FOREGROUND },
                },
              ],
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
