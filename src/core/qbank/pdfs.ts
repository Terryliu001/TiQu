/**
 * 题册：15 份预置 PDF 试卷（取自北邮《工科数学分析》《数学分析》真题）。
 * 通过 `?url` 引入：普通构建下是静态资源；单文件离线构建下会被内联为 data URL，
 * 因此两种形态都能 fetch 成 File 载入工作台。
 */
import gkUp2025Mid from '../../assets/bank/gk-up-2025-mid.pdf?url';
import gkUp2024Final from '../../assets/bank/gk-up-2024-final.pdf?url';
import gkDown2025Mid from '../../assets/bank/gk-down-2025-mid.pdf?url';
import gkDown2024Mid from '../../assets/bank/gk-down-2024-mid.pdf?url';
import gkDown2024Final from '../../assets/bank/gk-down-2024-final.pdf?url';
import gkDown2024FinalA from '../../assets/bank/gk-down-2024-final-a.pdf?url';
import gkDown2011Final from '../../assets/bank/gk-down-2011-final.pdf?url';
import gkDown2010Final from '../../assets/bank/gk-down-2010-final.pdf?url';
import maUp2019Mid from '../../assets/bank/ma-up-2019-mid.pdf?url';
import maUp2020Mid from '../../assets/bank/ma-up-2020-mid.pdf?url';
import maUp2024Mid from '../../assets/bank/ma-up-2024-mid.pdf?url';
import maUp2022Final from '../../assets/bank/ma-up-2022-final.pdf?url';
import maDown2022Mid from '../../assets/bank/ma-down-2022-mid.pdf?url';
import maDown2024Mid from '../../assets/bank/ma-down-2024-mid.pdf?url';
import maDown2025Mid from '../../assets/bank/ma-down-2025-mid.pdf?url';

export interface PresetPdf {
  id: string;
  title: string;
  meta: string;
  tag: '工科' | '数学分析';
  fileName: string;
  url: string;
}

export const PRESET_PDFS: PresetPdf[] = [
  { id: 'gk-up-2025-mid', title: '工科数学分析（上）', meta: '2025–2026 · 期中', tag: '工科', fileName: '工科数学分析（上）2025-2026 期中.pdf', url: gkUp2025Mid },
  { id: 'gk-up-2024-final', title: '工科数学分析（上）', meta: '2024–2025 · 期末 A卷', tag: '工科', fileName: '工科数学分析（上）2024-2025 期末 A卷.pdf', url: gkUp2024Final },
  { id: 'gk-down-2025-mid', title: '工科数学分析（下）', meta: '2025–2026 · 期中', tag: '工科', fileName: '工科数学分析（下）2025-2026 期中.pdf', url: gkDown2025Mid },
  { id: 'gk-down-2024-mid', title: '工科数学分析（下）', meta: '2024–2025 · 期中 A卷', tag: '工科', fileName: '工科数学分析（下）2024-2025 期中 A卷.pdf', url: gkDown2024Mid },
  { id: 'gk-down-2024-final', title: '工科数学分析（下）', meta: '2024–2025 · 期末', tag: '工科', fileName: '工科数学分析（下）2024-2025 期末.pdf', url: gkDown2024Final },
  { id: 'gk-down-2024-final-a', title: '工科数学分析（下）', meta: '2024–2025 · 期末 A卷', tag: '工科', fileName: '工科数学分析（下）2024-2025 期末 A卷.pdf', url: gkDown2024FinalA },
  { id: 'gk-down-2011-final', title: '工科数学分析（下）', meta: '2011–2012 · 期末 B卷', tag: '工科', fileName: '工科数学分析（下）2011-2012 期末 B卷.pdf', url: gkDown2011Final },
  { id: 'gk-down-2010-final', title: '工科数学分析（下）', meta: '2010–2011 · 期末 A卷', tag: '工科', fileName: '工科数学分析（下）2010-2011 期末 A卷.pdf', url: gkDown2010Final },
  { id: 'ma-up-2019-mid', title: '数学分析（上）', meta: '2019–2020 · 期中', tag: '数学分析', fileName: '数学分析（上）2019-2020 期中.pdf', url: maUp2019Mid },
  { id: 'ma-up-2020-mid', title: '数学分析（上）', meta: '2020–2021 · 期中', tag: '数学分析', fileName: '数学分析（上）2020-2021 期中.pdf', url: maUp2020Mid },
  { id: 'ma-up-2024-mid', title: '数学分析（上）', meta: '2024–2025 · 期中', tag: '数学分析', fileName: '数学分析（上）2024-2025 期中.pdf', url: maUp2024Mid },
  { id: 'ma-up-2022-final', title: '数学分析（上）', meta: '2022–2023 · 期末', tag: '数学分析', fileName: '数学分析（上）2022-2023 期末.pdf', url: maUp2022Final },
  { id: 'ma-down-2022-mid', title: '数学分析（下）', meta: '2022–2023 · 期中', tag: '数学分析', fileName: '数学分析（下）2022-2023 期中.pdf', url: maDown2022Mid },
  { id: 'ma-down-2024-mid', title: '数学分析（下）', meta: '2024–2025 · 期中', tag: '数学分析', fileName: '数学分析（下）2024-2025 期中.pdf', url: maDown2024Mid },
  { id: 'ma-down-2025-mid', title: '数学分析（下）', meta: '2025–2026 · 期中', tag: '数学分析', fileName: '数学分析（下）2025-2026 期中.pdf', url: maDown2025Mid },
];
