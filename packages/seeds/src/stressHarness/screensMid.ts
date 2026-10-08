import { bodyStack, tx, cta } from './builders.js';
import {
  DEFAULT_THEMED_FOREGROUND,
  OS_PERMISSION_OUTCOME_CONTINUE,
  OS_PERMISSION_OUTCOME_END,
  PRIMARY_FILLED_LABEL,
} from '@getrheo/contracts/layers';

export const stressHarnessScreensMid = [
      {
        id: 'scr_sh_scale',
        name: 'Stress · Scale',
        regions: {
          body: bodyStack('lyr_sh_sc_b', [
            tx('lyr_sh_sc_h', 'Intensity (1–10)'),
            {
              id: 'lyr_sh_sc',
              kind: 'scale_input',
              fieldKey: 'sh_level',
              min: 1,
              max: 10,
              step: 1,
              defaultValue: 5,
              minLabel: { default: 'Low' },
              maxLabel: { default: 'High' },
            },
            cta('lyr_sh_sc_go'),
          ]),
        },
        next: { default: 'dec_sh_level' },
      },
      {
        id: 'scr_sh_lv_hi',
        name: 'Stress · Level high',
        regions: {
          body: bodyStack('lyr_sh_lh_b', [tx('lyr_sh_lh_t', 'Level ≥ 5'), cta('lyr_sh_lh_go')]),
        },
        next: { default: 'scr_sh_email' },
      },
      {
        id: 'scr_sh_lv_lo',
        name: 'Stress · Level low',
        regions: {
          body: bodyStack('lyr_sh_ll_b', [tx('lyr_sh_ll_t', 'Level < 5'), cta('lyr_sh_ll_go')]),
        },
        next: { default: 'scr_sh_email' },
      },
      {
        id: 'scr_sh_email',
        name: 'Stress · Email',
        regions: {
          body: bodyStack('lyr_sh_em_b', [
            {
              id: 'lyr_sh_em',
              kind: 'text_input',
              name: 'Email',
              fieldKey: 'sh_email',
              classification: 'safe',
              inputType: 'email',
              placeholder: { default: 'you@example.com' },
            },
            cta('lyr_sh_em_go'),
          ]),
        },
        next: { default: 'scr_sh_promo' },
      },
      {
        id: 'scr_sh_promo',
        name: 'Stress · Promo code',
        regions: {
          body: bodyStack('lyr_sh_pr_b', [
            {
              id: 'lyr_sh_pr',
              kind: 'text_input',
              name: 'Promo',
              fieldKey: 'sh_promo',
              classification: 'safe',
              placeholder: { default: 'Try typing VIP' },
            },
            cta('lyr_sh_pr_go'),
          ]),
        },
        next: { default: 'dec_sh_combo' },
      },
      {
        id: 'scr_sh_cb_y',
        name: 'Stress · Combo true',
        regions: {
          body: bodyStack('lyr_sh_cy2_b', [
            tx('lyr_sh_cy2_t', 'Complex decision matched'),
            cta('lyr_sh_cy2_go'),
          ]),
        },
        next: { default: 'scr_sh_nav_a' },
      },
      {
        id: 'scr_sh_cb_n',
        name: 'Stress · Combo false',
        regions: {
          body: bodyStack('lyr_sh_cn2_b', [tx('lyr_sh_cn2_t', 'Combo did not match'), cta('lyr_sh_cn2_go')]),
        },
        next: { default: 'scr_sh_nav_a' },
      },
      {
        id: 'scr_sh_nav_a',
        name: 'Stress · Nav A',
        regions: {
          body: bodyStack('lyr_sh_n1_b', [tx('lyr_sh_n1_t', 'Nav stack · screen A'), cta('lyr_sh_n1_go')]),
        },
        next: { default: 'scr_sh_nav_b' },
      },
      {
        id: 'scr_sh_nav_b',
        name: 'Stress · Nav B (back)',
        regions: {
          header: bodyStack('lyr_sh_n2_hdr', [
            {
              id: 'lyr_sh_n2_back',
              kind: 'back_button',
              variant: 'ghost',
              fallbackScreenId: 'scr_sh_nav_a',
              children: [{ id: 'lyr_sh_n2_bi', kind: 'icon', family: 'ionicons', iconName: 'arrow-back-outline', style: { color: DEFAULT_THEMED_FOREGROUND } }],
            },
          ]),
          body: bodyStack('lyr_sh_n2_b', [
            tx('lyr_sh_n2_t', 'Header back_button + fallback'),
            cta('lyr_sh_n2_go'),
          ]),
        },
        next: { default: 'scr_sh_nav_c' },
      },
      {
        id: 'scr_sh_nav_c',
        name: 'Stress · Nav C',
        regions: {
          body: bodyStack('lyr_sh_n3_b', [
            tx('lyr_sh_n3_t', 'go_back_one_screen + jump'),
            {
              id: 'lyr_sh_n3_back',
              kind: 'button',
              variant: 'secondary',
              action: { kind: 'go_back_one_screen', fallbackScreenId: 'scr_sh_nav_a' },
              children: [{ id: 'lyr_sh_n3_bt', kind: 'text', text: { default: 'Back one' }, style: { color: DEFAULT_THEMED_FOREGROUND } }],
            },
            {
              id: 'lyr_sh_n3_fw',
              kind: 'button',
              variant: 'primary',
              action: { kind: 'continue' },
              children: [{ id: 'lyr_sh_n3_fw_t', kind: 'text', text: { default: 'Forward' }, style: { color: PRIMARY_FILLED_LABEL } }],
            },
          ]),
        },
        next: { default: 'scr_sh_nav_d' },
      },
      {
        id: 'scr_sh_nav_d',
        name: 'Stress · Nav D (go_to)',
        regions: {
          body: bodyStack('lyr_sh_n4_b', [
            tx('lyr_sh_n4_t', 'Jump to permission screen'),
            {
              id: 'lyr_sh_n4_jump',
              kind: 'button',
              variant: 'primary',
              action: { kind: 'go_to_step', screenId: 'scr_sh_perm' },
              children: [{ id: 'lyr_sh_n4_jt', kind: 'text', text: { default: 'Go to permission' }, style: { color: PRIMARY_FILLED_LABEL } }],
            },
          ]),
        },
        next: { default: 'scr_sh_perm' },
      },
      {
        id: 'scr_sh_perm',
        name: 'Stress · Permission',
        regions: {
          body: bodyStack('lyr_sh_pm_b', [
            tx('lyr_sh_pm_t', 'Notifications permission (sim may no-op)'),
            {
              id: 'lyr_sh_pm_btn',
              kind: 'button',
              variant: 'primary',
              action: {
                kind: 'request_os_permission',
                permissionKey: 'notifications',
                outcomes: {
                  granted: OS_PERMISSION_OUTCOME_CONTINUE,
                  denied: 'scr_sh_perm_denied',
                  blocked: OS_PERMISSION_OUTCOME_END,
                },
              },
              children: [{ id: 'lyr_sh_pm_bx', kind: 'text', text: { default: 'Request' }, style: { color: PRIMARY_FILLED_LABEL } }],
            },
          ]),
        },
        next: { default: 'scr_sh_after_perm' },
      },
      {
        id: 'scr_sh_after_perm',
        name: 'Stress · After permission',
        regions: {
          body: bodyStack('lyr_sh_ap_b', [
            tx('lyr_sh_ap_t', 'Granted path (or default next)'),
            cta('lyr_sh_ap_go'),
          ]),
        },
        next: { default: 'scr_sh_oauth' },
      },
      {
        id: 'scr_sh_perm_denied',
        name: 'Stress · Permission denied',
        regions: {
          body: bodyStack('lyr_sh_pd_b', [
            tx('lyr_sh_pd_t', 'Denied — continue to OAuth'),
            cta('lyr_sh_pd_go'),
          ]),
        },
        next: { default: 'scr_sh_oauth' },
      },
];
