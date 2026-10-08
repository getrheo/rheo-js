export const stressHarnessDecisionNodes = [
      {
        id: 'dec_sh_intersect',
        name: 'Topics ∩ {A,B}',
        cases: [
          {
            id: 'dec_sh_intersect_case_0',
            name: 'Group 1',
            expression: {
              kind: 'predicate',
              variable: { kind: 'field', fieldKey: 'sh_topics' },
              predicate: { type: 'multi', pred: { op: 'intersects', optionIds: ['tag_a', 'tag_b'] } },
            },
            next: 'scr_sh_m_hit',
          },
        ],
        elseNext: 'scr_sh_m_miss',
      },
      {
        id: 'dec_sh_contains',
        name: 'Topics ⊇ {A,B,C}',
        cases: [
          {
            id: 'dec_sh_contains_case_0',
            name: 'Group 1',
            expression: {
              kind: 'predicate',
              variable: { kind: 'field', fieldKey: 'sh_topics' },
              predicate: { type: 'multi', pred: { op: 'contains_all', optionIds: ['tag_a', 'tag_b', 'tag_c'] } },
            },
            next: 'scr_sh_ca_y',
          },
        ],
        elseNext: 'scr_sh_ca_n',
      },
      {
        id: 'dec_sh_subset',
        name: 'Packs ⊆ {A,B}',
        cases: [
          {
            id: 'dec_sh_subset_case_0',
            name: 'Group 1',
            expression: {
              kind: 'predicate',
              variable: { kind: 'field', fieldKey: 'sh_pack' },
              predicate: { type: 'multi', pred: { op: 'subset_of', optionIds: ['pack_a', 'pack_b'] } },
            },
            next: 'scr_sh_ss_y',
          },
        ],
        elseNext: 'scr_sh_ss_n',
      },
      {
        id: 'dec_sh_level',
        name: 'Level ≥ 5',
        cases: [
          {
            id: 'dec_sh_level_case_0',
            name: 'Group 1',
            expression: {
              kind: 'predicate',
              variable: { kind: 'field', fieldKey: 'sh_level' },
              predicate: { type: 'number', pred: { op: 'gte', value: 5 } },
            },
            next: 'scr_sh_lv_hi',
          },
        ],
        elseNext: 'scr_sh_lv_lo',
      },
      {
        id: 'dec_sh_combo',
        name: 'Promo ∧ (level ∨ platform)',
        cases: [
          {
            id: 'dec_sh_combo_case_0',
            name: 'Group 1',
            expression: {
              kind: 'group',
              op: 'and',
              children: [
                {
                  kind: 'predicate',
                  variable: { kind: 'field', fieldKey: 'sh_promo' },
                  predicate: { type: 'string', pred: { op: 'contains', value: 'VIP' } },
                },
                {
                  kind: 'group',
                  op: 'or',
                  children: [
                    {
                      kind: 'predicate',
                      variable: { kind: 'field', fieldKey: 'sh_level' },
                      predicate: { type: 'number', pred: { op: 'gte', value: 7 } },
                    },
                    {
                      kind: 'predicate',
                      variable: { kind: 'builtin', name: 'platform' },
                      predicate: { type: 'string', pred: { op: 'eq', value: 'web' } },
                    },
                  ],
                },
              ],
            },
            next: 'scr_sh_cb_y',
          },
        ],
        elseNext: 'scr_sh_cb_n',
      },
      {
        id: 'dec_sh_locale',
        name: 'Locale es',
        cases: [
          {
            id: 'dec_sh_locale_case_0',
            name: 'Group 1',
            expression: {
              kind: 'predicate',
              variable: { kind: 'builtin', name: 'locale' },
              predicate: { type: 'string', pred: { op: 'eq', value: 'es' } },
            },
            next: 'scr_sh_loc_es',
          },
        ],
        elseNext: 'scr_sh_loc_en',
      },
      {
        id: 'dec_sh_tier',
        name: 'Premium tier',
        cases: [
          {
            id: 'dec_sh_tier_case_0',
            name: 'Group 1',
            expression: {
              kind: 'predicate',
              variable: { kind: 'field', fieldKey: 'sh_tier' },
              predicate: { type: 'choice', pred: { op: 'eq', optionId: 'premium' } },
            },
            next: 'scr_sh_tier_p',
          },
        ],
        elseNext: 'scr_sh_tier_s',
      },
      {
        id: 'dec_sh_plan',
        name: 'Enterprise plan',
        cases: [
          {
            id: 'dec_sh_plan_case_0',
            name: 'Group 1',
            expression: {
              kind: 'predicate',
              variable: { kind: 'sdk', key: 'plan' },
              predicate: { type: 'string', pred: { op: 'eq', value: 'enterprise' } },
            },
            next: 'scr_sh_plan_ent',
          },
        ],
        elseNext: 'scr_sh_plan_basic',
      },
];
