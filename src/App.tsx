import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock, Plus, Check, Quote,
  Image as ImageIcon, Trash2, ChevronLeft, ChevronRight, X, Type,
  ListChecks, Feather, BookOpen, Hash, Search
} from 'lucide-react';

/* ==========================================================
   Warm Paper — Journal
   ========================================================== */

const C = {
  paper:     '#FDFAF1',
  cream:     '#F6EDD9',
  creamDeep: '#EEE1C5',
  ink:       '#2F1E12',
  inkMid:    '#6B533E',
  inkSoft:   '#A88B6B',
  line:      '#E5D6B8',
  accent:    '#B04B2F',
  accentSoft:'#E7A889',
  gold:      '#B8923D',
  sage:      '#87936B',
};

const WEEK = ['日','一','二','三','四','五','六'];

const QUOTES = [
  '每一天都值得被留下',
  '慢慢来，一切都来得及',
  '今天的你，也辛苦了',
  '平凡的日子，也有它的光',
  '把心事写下来，就轻了一些',
  '愿你被这个世界温柔以待',
  '岁月漫长，记得好好吃饭',
  '一寸一寸地，把日子过成自己的',
  '写下来的时光，不会被忘记',
  '晚安，祝你今夜好梦',
  '让时间替你温柔地记住这一切',
  '今天也是值得记录的一天',
  '生活的诗意，藏在琐碎里',
  '愿你内心柔软，眼里有光',
];

/* ---------- helpers ---------- */
const pad = n => String(n).padStart(2,'0');
const toStr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromStr = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const today = () => toStr(new Date());
const isFuture = s => fromStr(s) > new Date(new Date().setHours(23,59,59,999));

const uid = () => 'b_'+Math.random().toString(36).slice(2,10);
/**
 * marker.kind: 'none' | 'check' | 'number'
 */
const newBlock = (type='text', content='', marker={kind:'none'}) => ({
  id: uid(), type, content, marker, done: false,
});
const emptyEntry = date => ({
  date,
  did: [newBlock('text', '', { kind: 'check' })],
  thoughts: [newBlock('text')],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
const isEntryEmpty = e => {
  if (!e) return true;
  const hasText = arr => arr.some(b => (b.content||'').trim() || b.type==='image');
  return !hasText(e.did||[]) && !hasText(e.thoughts||[]);
};

/* 旧数据迁移 */
const migrate = raw => {
  if (!raw) return { entries:{}, meta:{ recentTags:[] } };
  const entries = {};
  Object.entries(raw.entries || {}).forEach(([k, e]) => {
    const fix = arr => (arr||[]).map(b => ({
      ...b,
      marker: b.marker || { kind: b.type==='todo' ? 'check' : 'none' },
      type: b.type === 'todo' ? 'text' : b.type,
    }));
    entries[k] = { ...e, did: fix(e.did), thoughts: fix(e.thoughts) };
  });
  return { entries, meta: raw.meta || { recentTags: [] } };
};

/* ---------- storage ---------- */
const KEY = 'diary-warm-paper-v3';

const loadAll = async () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = migrate(JSON.parse(raw));
      if (Object.keys(parsed.entries || {}).length > 0) return parsed;
    }
  } catch(e) { console.error('load error:', e); }
  return { entries: SEED_ENTRIES(), meta: { recentTags: [] } };
};

const saveAll = async (data) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch(e) { console.error('save error:', e); }
};

/* ---------- 种子数据（首次启动时注入，方便截图展示） ---------- */
/**
 * 计算相对今天的日期
 * @param daysAgo 几天前，0=今天，1=昨天
 */
const daysAgoStr = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return toStr(d);
};

/* 每篇日记的简易构造器 */
const makeBlock = (content, kind='none', done=false) => ({
  id: uid(),
  type: 'text',
  content,
  marker: { kind },
  done,
});

const SEED_ENTRIES = () => {
  const entries = {};

  // 今天
  entries[daysAgoStr(0)] = {
    date: daysAgoStr(0),
    did: [
      makeBlock('体验并测试两款新的 AI 效率工具', 'check', true),
      makeBlock('小程序第一版意见修改', 'check', true),
      makeBlock('晚上去打一小时网球', 'check', false),
      makeBlock('买猫粮', 'check', false),
    ],
    thoughts: [
      makeBlock('很多时候设计的瓶颈不在于技法，而在于眼界。今天试用新工具时，越发觉得现在的技术真的是在给创造力松绑。只要有好的审美和清晰的逻辑，工具能帮你省去大部分的纯体力活。'),
      makeBlock('晚上收拾屋子，顺便断舍离扔掉一批旧衣服。生活和做界面一样，留白才能凸显重点。'),
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // 昨天
  entries[daysAgoStr(1)] = {
    date: daysAgoStr(1),
    did: [
      makeBlock('提交项目的视觉二稿 发客户', 'check', true),
      makeBlock('研究 Tauri，想把日记app打包成桌面版', 'check', true),
      makeBlock('整理户外装备', 'check', true),
    ],
    thoughts: [
      makeBlock('客户的反馈比预期要顺利。其实前期多花点时间对齐需求和视觉基调，后期的沟通成本真的会大幅度降低。不要怕前期麻烦。'),
      makeBlock('晚上出门骑车兜了一圈，风吹着非常舒服。脱离屏幕，重新去感受真实的物理世界，是对抗数字焦虑最有效的方法。'),
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // 5天前
  entries[daysAgoStr(5)] = {
    date: daysAgoStr(5),
    did: [
      makeBlock('下午和以前的同事喝咖啡聊聊近况', 'check', true),
      makeBlock('安排五一徒步的路线规划', 'check', true),
    ],
    thoughts: [
      makeBlock('下午聊到了关于职业发展的事，其实无论是在大厂里卷，还是出来做点自己的事情，底层逻辑没有变，核心竞争力永远是“解决复杂问题的能力”和“稳定的情绪”。'),
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // 10天前
  entries[daysAgoStr(10)] = {
    date: daysAgoStr(10),
    did: [
      makeBlock('陪猫去医院打疫苗', 'check', true),
      makeBlock('咖啡店项目 v1 交付', 'check', true),
    ],
    thoughts: [
      makeBlock('猫在诊室里瑟瑟发抖。原来我们都一样——在熟悉的地方张牙舞爪，在陌生的地方瑟瑟发抖。'),
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // 18天前
  entries[daysAgoStr(18)] = {
    date: daysAgoStr(18),
    did: [
      makeBlock('开始学 Claude Code', 'check', true),
      makeBlock('整理这一年接的私活清单', 'check', true),
    ],
    thoughts: [
      makeBlock('这一年居然接了 11 个私活，比我以为的多很多。我们对自己的评价，常常比真实情况更苛刻。'),
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return entries;
};

/* ---------- global style ---------- */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Noto+Serif+SC:wght@400;500;600;700&family=Noto+Sans+SC:wght@300;400;500&family=Caveat:wght@500;600&display=swap');
    /* 阿里巴巴普惠体（免费商用）官方CDN */
    @font-face {
      font-family: 'Alibaba PuHuiTi';
      font-weight: 400;
      font-display: swap;
      src: url('https://puhuiti.oss-cn-hangzhou.aliyuncs.com/AlibabaPuHuiTi-3/AlibabaPuHuiTi-3-55-Regular/AlibabaPuHuiTi-3-55-Regular.woff2') format('woff2');
    }
    @font-face {
      font-family: 'Alibaba PuHuiTi';
      font-weight: 500;
      font-display: swap;
      src: url('https://puhuiti.oss-cn-hangzhou.aliyuncs.com/AlibabaPuHuiTi-3/AlibabaPuHuiTi-3-65-Medium/AlibabaPuHuiTi-3-65-Medium.woff2') format('woff2');
    }

    .font-display { font-family: 'Fraunces','Noto Serif SC',serif; font-variation-settings:"opsz" 48,"SOFT" 100; letter-spacing:-0.01em; }
    .font-serif   { font-family: 'Fraunces','Noto Serif SC',serif; }
    .font-sans    { font-family: 'Noto Sans SC','Inter',system-ui,sans-serif; }
    .font-hand    { font-family: 'Caveat',cursive; }
    /* 正文字体：苹方优先 → 阿里巴巴普惠体备胎 → 系统兜底 */
    .font-body    { font-family: 'PingFang SC', 'Alibaba PuHuiTi', 'Noto Sans SC', 'Helvetica Neue', Helvetica, Arial, sans-serif; letter-spacing: 0.01em; }

    .paper {
      background-color: ${C.paper};
      background-image:
        radial-gradient(ellipse at 12% 8%,  rgba(176,75,47,.04) 0%, transparent 55%),
        radial-gradient(ellipse at 92% 88%, rgba(184,146,61,.05) 0%, transparent 55%),
        repeating-linear-gradient(90deg, rgba(47,30,18,.012) 0 1px, transparent 1px 3px);
    }
    .paper-deep {
      background-color: ${C.cream};
      background-image:
        radial-gradient(ellipse at 50% 0%, rgba(184,146,61,.08) 0%, transparent 60%);
    }

    .editable:empty::before { content: attr(data-ph); color: ${C.inkSoft}; pointer-events:none; }
    .editable:focus { outline: none; }

    .dot-ink { background-color: ${C.accent}; }
    .hover-reveal > .reveal { opacity: 0; transition: opacity .15s ease; }
    .hover-reveal:hover > .reveal { opacity: 1; }

    .fade-in { animation: fadeIn .4s ease both; }
    @keyframes fadeIn { from { opacity:0; transform: translateY(4px);} to {opacity:1; transform:none;} }

    .grain::after {
      content:''; position: absolute; inset:0; pointer-events:none; opacity:.08; mix-blend-mode: multiply;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>");
    }

    .chip {
      border: 1px solid ${C.line};
      background: ${C.paper};
      color: ${C.inkMid};
      transition: all .15s ease;
    }
    .chip:hover { border-color: ${C.accentSoft}; color: ${C.accent}; }
    .chip-active { background: ${C.accent}; color: #fff; border-color: ${C.accent}; }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }

    /* ===== Sleeping Cat animations ===== */
    @keyframes catBreath { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.06); } }
    @keyframes catTail   { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-8deg); } }
    @keyframes zFloat {
      0%   { transform: translate(0,0) rotate(-6deg); opacity: 0; }
      15%  { opacity: .9; }
      80%  { opacity: .5; }
      100% { transform: translate(14px,-24px) rotate(8deg); opacity: 0; }
    }
    @keyframes earTwitch {
      0%, 92%, 100% { transform: rotate(0deg); }
      94% { transform: rotate(-6deg); }
      96% { transform: rotate(4deg); }
    }
    .cat-body  { transform-origin: center bottom; animation: catBreath 3.8s ease-in-out infinite; }
    .cat-tail  { transform-origin: 100% 100%;     animation: catTail 4.5s ease-in-out infinite; }
    .cat-ear-l { transform-origin: center bottom; animation: earTwitch 6s ease-in-out infinite; }
    .cat-z1    { animation: zFloat 4s ease-in-out infinite; animation-delay: 0s; }
    .cat-z2    { animation: zFloat 4s ease-in-out infinite; animation-delay: 1.3s; }
    .cat-z3    { animation: zFloat 4s ease-in-out infinite; animation-delay: 2.6s; }
  `}</style>
);

/* =================================================
   Rotating Quote
   ================================================= */
function RotatingQuote() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(prev => (prev + 1) % QUOTES.length);
        setVisible(true);
      }, 500);
    }, 6000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="font-hand text-[14px]"
          style={{ color: C.accent, opacity: visible ? 0.85 : 0, transition: 'opacity 500ms ease' }}>
      — {QUOTES[idx]}
    </span>
  );
}

/* =================================================
   Sleeping Cat — 白橘奶牛睡觉款
   ================================================= */
function SleepingCat() {
  return (
    <div className="relative w-full flex flex-col items-center pt-6 pb-2 select-none">
      <svg width="170" height="100" viewBox="0 0 170 100" fill="none" xmlns="http://www.w3.org/2000/svg"
           style={{ filter: `drop-shadow(0 3px 10px ${C.ink}1a)` }}>
        {/* Zzz */}
        <g style={{ fill: C.accent, fontFamily: 'Caveat, cursive', fontSize: 14, fontWeight: 600 }}>
          <text className="cat-z1" x="118" y="28">z</text>
          <text className="cat-z2" x="124" y="20" style={{ fontSize: 11 }}>z</text>
          <text className="cat-z3" x="130" y="14" style={{ fontSize: 9 }}>z</text>
        </g>

        {/* pillow */}
        <ellipse cx="82" cy="88" rx="64" ry="7" fill={C.creamDeep} opacity="0.75"/>
        <path d="M 22 85 Q 30 78 40 80 L 130 80 Q 138 78 142 85 Q 140 90 82 91 Q 24 90 22 85 Z"
              fill={C.creamDeep} stroke={C.line} strokeWidth="1"/>
        <path d="M 40 82 Q 82 86 130 82" stroke={C.inkSoft} strokeWidth="0.6"
              strokeDasharray="2 3" opacity="0.5" fill="none"/>

        {/* Tail: 橙白环 */}
        <g className="cat-tail">
          <path d="M 126 70 Q 148 62 152 46 Q 150 42 146 44 Q 144 58 124 64 Z"
                fill="#FAF4E6" stroke="#D9C9A8" strokeWidth="0.6"/>
          <ellipse cx="134" cy="66" rx="3.5" ry="2.5" fill="#E89548" opacity="0.85" transform="rotate(-15 134 66)"/>
          <ellipse cx="142" cy="60" rx="3" ry="2.2" fill="#E89548" opacity="0.9" transform="rotate(-35 142 60)"/>
          <ellipse cx="147" cy="53" rx="2.5" ry="2" fill="#D87B32" opacity="0.9" transform="rotate(-55 147 53)"/>
          <ellipse cx="150" cy="47" rx="2.2" ry="1.8" fill="#C86828" opacity="0.95" transform="rotate(-70 150 47)"/>
          <circle cx="150" cy="45" r="2" fill="#B85820"/>
        </g>

        {/* Body: 白 + 背上橙 */}
        <g className="cat-body">
          <path d="M 40 78 Q 30 70 40 58 Q 50 46 80 48 Q 120 50 128 65 Q 132 76 120 80 Z"
                fill="#FAF4E6" stroke="#D9C9A8" strokeWidth="0.8"/>
          <path d="M 55 72 Q 80 78 115 73 Q 110 78 82 79 Q 55 78 55 72 Z" fill="#FFFFFF" opacity="0.7"/>
          <path d="M 58 54 Q 72 48 90 50 Q 100 52 95 57 Q 80 56 62 59 Q 56 58 58 54 Z"
                fill="#E89548" opacity="0.75"/>
          <path d="M 68 52 Q 80 50 88 52 Q 85 54 78 54 Q 72 54 68 52 Z"
                fill="#C86828" opacity="0.4"/>
          <path d="M 72 60 Q 74 58 76 60" stroke="#D9C9A8" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.5"/>
          <path d="M 100 62 Q 102 60 104 62" stroke="#D9C9A8" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.5"/>
        </g>

        {/* Head: 白脸 + 橙小帽 */}
        <g>
          <path className="cat-ear-l" d="M 32 58 L 28 47 L 41 54 Z" fill="#E89548"/>
          <path d="M 47 54 L 50 43 L 55 56 Z" fill="#E89548"/>
          <ellipse cx="44" cy="66" rx="16" ry="13" fill="#FAF4E6" stroke="#D9C9A8" strokeWidth="0.6"/>
          <path d="M 32 58 Q 36 54 44 54 Q 52 54 56 58 Q 54 62 50 63 Q 44 62 38 63 Q 34 62 32 58 Z"
                fill="#E89548"/>
          <path d="M 34 62 Q 44 64 54 62 Q 52 64 44 65 Q 36 64 34 62 Z"
                fill="#D87B32" opacity="0.4"/>
          <ellipse cx="41" cy="67" rx="2.5" ry="3.5" fill="#E89548" opacity="0.85" transform="rotate(-15 41 67)"/>
          <path d="M 34 54 L 33 48 L 38 52 Z" fill="#F4B8A0" opacity="0.85"/>
          <path d="M 49 52 L 51 45 L 53 54 Z" fill="#F4B8A0" opacity="0.75"/>
          <path d="M 37 65 Q 40 67.5 43 65" stroke="#4A2E1A" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
          <path d="M 47 65 Q 50 67.5 53 65" stroke="#4A2E1A" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
          <ellipse cx="34" cy="72" rx="2.2" ry="1.3" fill="#F4B8A0" opacity="0.5"/>
          <ellipse cx="54" cy="72" rx="2.2" ry="1.3" fill="#F4B8A0" opacity="0.5"/>
          <path d="M 44 70.5 L 42.5 72.5 L 45.5 72.5 Z" fill="#D88A6E"/>
          <path d="M 44 72.5 Q 42 74.5 40 73.5" stroke="#4A2E1A" strokeWidth="0.9" strokeLinecap="round" fill="none"/>
          <path d="M 44 72.5 Q 46 74.5 48 73.5" stroke="#4A2E1A" strokeWidth="0.9" strokeLinecap="round" fill="none"/>
          <path d="M 32 70 L 26 69" stroke="#8B6F4E" strokeWidth="0.5" opacity="0.7"/>
          <path d="M 32 72 L 26 73" stroke="#8B6F4E" strokeWidth="0.5" opacity="0.7"/>
          <path d="M 56 70 L 62 69" stroke="#8B6F4E" strokeWidth="0.5" opacity="0.7"/>
          <path d="M 56 72 L 62 73" stroke="#8B6F4E" strokeWidth="0.5" opacity="0.7"/>
        </g>

        <ellipse cx="54" cy="78" rx="6" ry="3" fill="#FAF4E6" stroke="#D9C9A8" strokeWidth="0.6"/>
        <ellipse cx="66" cy="78" rx="6" ry="3" fill="#FAF4E6" stroke="#D9C9A8" strokeWidth="0.6"/>
        <circle cx="54" cy="79" r="0.8" fill="#E7A889" opacity="0.7"/>
        <circle cx="66" cy="79" r="0.8" fill="#E7A889" opacity="0.7"/>
      </svg>

      <div className="font-hand mt-1 text-[13px]" style={{ color: C.accent, opacity: 0.8 }}>
        shhh… 它睡着了
      </div>
    </div>
  );
}

/* =================================================
   Marker — 每行前置标记：无/勾选/序号/emoji
   ================================================= */
function Marker({ block, numberIndex, simpleMode, onUpdate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  // simpleMode 下强制为 check
  const kind = simpleMode ? 'check' : (block.marker?.kind || 'none');

  const setKind = (k) => {
    onUpdate({ marker: { kind: k }, done: k==='check' ? !!block.done : false });
    setMenuOpen(false);
  };

  return (
    <div className="relative flex items-start justify-center shrink-0"
         style={{ width: 28, height: 26, paddingTop: 4 }}>
      {kind === 'none' && (
        <button
          onClick={()=>setMenuOpen(v=>!v)}
          className="reveal w-5 h-5 rounded flex items-center justify-center transition hover:bg-black/5"
          style={{ color: C.inkSoft }}
          title="添加前置标记"
        >
          <Plus size={13}/>
        </button>
      )}

      {kind === 'check' && (
        <button
          onClick={()=>onUpdate({ done: !block.done })}
          className="w-[17px] h-[17px] rounded-[5px] border flex items-center justify-center transition hover:scale-105"
          style={{
            borderColor: block.done ? C.accent : C.inkSoft,
            background: block.done ? C.accent : 'transparent',
            marginTop: 2,
          }}
          title={simpleMode ? '点击完成' : '双击移除标记'}
          onDoubleClick={simpleMode ? undefined : ()=>setKind('none')}
        >
          {block.done && <Check size={11} color="#fff" strokeWidth={3}/>}
        </button>
      )}

      {kind === 'number' && (
        <button
          onDoubleClick={()=>setKind('none')}
          className="font-display leading-none"
          style={{
            color: C.accent,
            fontWeight: 500,
            fontSize: 14.5,
            marginTop: 5,
          }}
          title="双击移除标记"
        >
          {String(numberIndex).padStart(2,'0')}
        </button>
      )}

      {menuOpen && !simpleMode && (
        <div className="absolute left-0 top-7 z-20 flex items-center gap-0.5 p-1 rounded-lg fade-in"
             style={{ background: C.paper, border:`1px solid ${C.line}`, boxShadow:`0 4px 16px -6px ${C.ink}33` }}>
          <button onClick={()=>setKind('check')}
                  className="w-7 h-7 rounded flex items-center justify-center hover:bg-black/5 transition"
                  style={{ color: C.inkMid }} title="复选框">
            <Check size={13}/>
          </button>
          <button onClick={()=>setKind('number')}
                  className="w-7 h-7 rounded flex items-center justify-center hover:bg-black/5 transition"
                  style={{ color: C.inkMid }} title="序号">
            <Hash size={13}/>
          </button>
          <button onClick={()=>setMenuOpen(false)}
                  className="w-7 h-7 rounded flex items-center justify-center hover:bg-black/5 transition"
                  style={{ color: C.inkSoft }}>
            <X size={12}/>
          </button>
        </div>
      )}
    </div>
  );
}

/* =================================================
   Block editor
   ================================================= */
function BlockEditor({ blocks, onChange, placeholder, simpleMode=false }) {
  /**
   * update 规则：
   * - 普通字段变更（content/done）：只改当前行
   * - marker 变更：把当前行之后、所有原marker与当前行"原marker"一致的连续/非连续行，
   *   也刷成同样的新 marker（kind+value）
   *   但遇到"与原marker不一致"的行就停止刷新（保护用户手动改过的中断点）
   */
  const update = (id, patch) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0) { onChange(blocks); return; }

    const current = blocks[idx];
    const isMarkerChange = 'marker' in patch;

    // 非 marker 变更：照常只改当前行
    if (!isMarkerChange) {
      onChange(blocks.map(b => b.id === id ? { ...b, ...patch } : b));
      return;
    }

    // marker 变更：级联刷新下方同类标记
    const oldKind = current.marker?.kind || 'none';
    const oldValue = current.marker?.value;
    const newMarker = patch.marker;

    const next = blocks.map((b, i) => {
      // 当前行：应用完整 patch
      if (i === idx) return { ...b, ...patch };
      // 不是当前行，且在当前行下方
      if (i > idx) {
        const bKind = b.marker?.kind || 'none';
        // 匹配：kind 一致
        const matches = bKind === oldKind;
        if (matches) {
          // 刷成新marker；done 保持原样
          return { ...b, marker: newMarker };
        }
      }
      return b;
    });

    onChange(next);
  };

  const remove = (id) => {
    const next = blocks.filter(b => b.id !== id);
    onChange(next.length ? next : [newBlock('text')]);
  };

  /* 关键：Enter 时自动继承上一行的标记 */
  const insertAfter = (id) => {
    const idx = blocks.findIndex(b => b.id===id);
    const prev = blocks[idx];
    const next = [...blocks];
    let inheritedMarker;
    if (simpleMode) {
      inheritedMarker = { kind: 'check' };
    } else {
      inheritedMarker = prev.marker && prev.marker.kind !== 'none'
        ? { kind: prev.marker.kind, value: prev.marker.value }
        : { kind: 'none' };
    }
    next.splice(idx+1, 0, newBlock('text', '', inheritedMarker));
    onChange(next);
    return next[idx+1].id;
  };

  /* 计算序号：只统计本段内 number 型 */
  const numberIndices = {};
  let runningIndex = 0;
  blocks.forEach(b => {
    if (b.marker?.kind === 'number') {
      runningIndex++;
      numberIndices[b.id] = runningIndex;
    } else {
      runningIndex = 0; // 中断则序号重置（比如插入了普通文字）
    }
  });
  // 更合理的规则：序号连续段独立递增。我们改用连续段落的方式：
  // 重新跑一遍
  Object.keys(numberIndices).forEach(k => delete numberIndices[k]);
  let curr = 0;
  for (let i=0; i<blocks.length; i++) {
    if (blocks[i].marker?.kind === 'number') {
      curr++;
      numberIndices[blocks[i].id] = curr;
    } else {
      curr = 0;
    }
  }

  return (
    <div className="space-y-0">
      {blocks.map((b) => (
        <Block
          key={b.id}
          block={b}
          numberIndex={numberIndices[b.id] || 1}
          placeholder={placeholder}
          simpleMode={simpleMode}
          onUpdate={(p)=>update(b.id,p)}
          onRemove={()=>remove(b.id)}
          onEnter={()=>insertAfter(b.id)}
          onClearMarker={()=>update(b.id, { marker: { kind: 'none' }, done: false })}
        />
      ))}
    </div>
  );
}

function Block({ block, numberIndex, placeholder, simpleMode, onUpdate, onRemove, onEnter, onClearMarker }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== (block.content||'')) {
      ref.current.innerText = block.content || '';
    }
  }, [block.id]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter();
      // 让新行聚焦 —— 下一tick通过DOM找
      setTimeout(() => {
        const all = document.querySelectorAll('[data-editable-block]');
        let found = false;
        all.forEach(el => {
          if (found) return;
          if (el === ref.current) { found = true; return; }
        });
        // 简化：找当前元素的下一个 editable
        const parent = ref.current?.closest('.block-row');
        const nextRow = parent?.nextElementSibling;
        const nextEditable = nextRow?.querySelector('[contenteditable]');
        if (nextEditable) nextEditable.focus();
      }, 0);
    }
    if (e.key === 'Backspace' && !(ref.current.innerText || '').replace(/[\s\u200b\u00a0]/g, '')) {      e.preventDefault();
      // simpleMode下所有行都是check，空内容直接删
      if (simpleMode) {
        onRemove();
      } else if (block.marker && block.marker.kind !== 'none') {
        // 普通模式：先清标记，再删行
        onClearMarker();
      } else {
        onRemove();
      }
    }
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate({ content: reader.result });
    reader.readAsDataURL(file);
  };

  const isCheckDone = block.marker?.kind === 'check' && block.done;

  return (
    <div className="group hover-reveal block-row relative flex items-start gap-2 px-1 py-[3px]"
         style={{ color: C.ink }}>
      {block.type !== 'image' && block.type !== 'quote' && (
        <Marker block={block} numberIndex={numberIndex} simpleMode={simpleMode} onUpdate={onUpdate}/>
      )}

      <div className="flex-1 min-w-0">
        {block.type === 'text' && (
          <div
            ref={ref}
            data-editable-block
            contentEditable
            suppressContentEditableWarning
            data-ph={placeholder}
            className="editable font-body text-[16.5px]"
            style={{
              lineHeight: 1.65,
              color: isCheckDone ? C.inkSoft : C.ink,
              textDecoration: isCheckDone ? 'line-through' : 'none',
              textDecorationColor: C.inkSoft,
            }}
            onInput={(e)=>onUpdate({ content: e.currentTarget.innerText })}
            onKeyDown={handleKey}
          />
        )}

        {block.type === 'quote' && (
          <div className="pl-4 py-0.5" style={{ borderLeft: `3px solid ${C.gold}` }}>
            <div
              ref={ref}
              data-editable-block
              contentEditable
              suppressContentEditableWarning
              data-ph="引用或摘抄…"
              className="editable font-body text-[15.5px]"
              style={{ color: C.inkMid, lineHeight: 1.65 }}
              onInput={(e)=>onUpdate({ content: e.currentTarget.innerText })}
              onKeyDown={handleKey}
            />
          </div>
        )}

        {block.type === 'image' && (
          <div className="py-1">
            {block.content ? (
              <div className="relative inline-block max-w-full">
                <img src={block.content} alt="" className="max-w-full max-h-[360px] rounded"
                     style={{ boxShadow: `0 2px 20px -8px ${C.ink}33` }}/>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer font-sans text-sm transition"
                     style={{ background: C.creamDeep, color: C.inkMid }}>
                <ImageIcon size={15}/> 选择图片
                <input type="file" accept="image/*" className="hidden" onChange={handleImage}/>
              </label>
            )}
          </div>
        )}
      </div>

      <div className="reveal mt-1">
        <button onClick={onRemove} title="删除"
                className="p-1 rounded hover:bg-black/5 transition" style={{ color: C.inkSoft }}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

/* =================================================
   Mini calendar — 有日记的日期用赭红底/白字，一眼可辨
   ================================================= */
function MiniCalendar({ cal, setCal, entries, currentDate, setDate }) {
  const first = new Date(cal.y, cal.m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(cal.y, cal.m+1, 0).getDate();
  const cells = [];
  for (let i=0; i<startDay; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);

  const navM = (n) => {
    const d = new Date(cal.y, cal.m+n, 1);
    setCal({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="font-serif text-[15px]" style={{ color: C.ink }}>
          <span className="font-display" style={{ fontSize: 20 }}>{cal.y}</span>
          <span className="mx-1.5" style={{ color: C.inkSoft }}>·</span>
          <span>{cal.m+1}月</span>
        </div>
        <div className="flex gap-0.5">
          <button onClick={()=>navM(-1)} className="p-1 rounded hover:bg-black/5" style={{ color: C.inkMid }}>
            <ChevronLeft size={15}/>
          </button>
          <button onClick={()=>navM(1)} className="p-1 rounded hover:bg-black/5" style={{ color: C.inkMid }}>
            <ChevronRight size={15}/>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1.5 text-center font-sans">
        {WEEK.map(w => (
          <div key={w} className="text-[10px] pb-1" style={{ color: C.inkSoft, letterSpacing: '0.1em' }}>{w}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i}/>;
          const s = `${cal.y}-${pad(cal.m+1)}-${pad(d)}`;
          const has = entries[s] && !isEntryEmpty(entries[s]);
          const isToday = s === today();
          const isSel = s === currentDate;
          const future = isFuture(s);

          // 颜色决策：选中 > 有日记 > 今天 > 普通
          let bg = 'transparent';
          let color = future ? C.inkSoft+'55' : C.ink;
          let ring = 'none';

          if (isSel) {
            bg = C.ink;
            color = C.paper;
          } else if (has) {
            // 有日记：赭红底 + 白字（最明显）
            bg = C.accent;
            color = '#fff';
          } else if (isToday) {
            bg = 'transparent';
            ring = `1.5px solid ${C.accent}`;
            color = C.accent;
          }

          return (
            <button
              key={s}
              onClick={()=>!future && setDate(s)}
              disabled={future}
              className="relative mx-auto w-7 h-7 rounded-full flex items-center justify-center text-[12.5px] font-serif transition"
              style={{
                background: bg,
                color: color,
                border: ring,
                fontWeight: isToday || isSel || has ? 600 : 400,
                cursor: future ? 'not-allowed' : 'pointer',
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =================================================
   Sidebar — 导航高度加大
   ================================================= */
function Sidebar({ view, setView, calState, entries, currentDate, setDate, searchQuery, setSearchQuery }) {
  const navs = [
    { id:'write',    label:'书写',    icon: Feather },
    { id:'timeline', label:'时间轴',  icon: Clock },
  ];

  const onSearchChange = (val) => {
    setSearchQuery(val);
    if (val.trim()) setView('search');
    else if (view === 'search') setView('write');
  };

  const onSearchFocus = () => {
    if (searchQuery.trim()) setView('search');
  };

  return (
    <aside className="w-[300px] shrink-0 h-screen sticky top-0 overflow-y-auto border-r flex flex-col"
           style={{ borderColor: C.line, background: C.cream }}>
      <div className="py-8 px-6 flex-1">
        {/* brand */}
        <div className="mb-5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
               style={{ background: C.ink, color: C.paper }}>
            <BookOpen size={15} />
          </div>
          <div>
            <div className="font-display text-[19px] leading-none" style={{ color: C.ink }}>墨记</div>
            <div className="font-hand text-[13px] -mt-0.5" style={{ color: C.accent }}>a warm journal</div>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="mb-6 relative">
          <Search size={13} style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: C.inkSoft,
            pointerEvents: 'none',
          }}/>
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onFocus={onSearchFocus}
            placeholder="搜索日记..."
            className="w-full font-sans text-[13px] outline-none transition"
            style={{
              background: C.paper,
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              padding: '7px 28px 7px 30px',
              color: C.ink,
            }}
            onFocusCapture={e => e.currentTarget.style.borderColor = C.accentSoft}
            onBlurCapture={e => e.currentTarget.style.borderColor = C.line}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                padding: 3,
                borderRadius: 4,
                color: C.inkSoft,
              }}
              className="hover:bg-black/5"
              title="清除"
            >
              <X size={12}/>
            </button>
          )}
        </div>

        {/* nav — 更高更舒展 */}
        <div className="space-y-1 mb-7">
          {navs.map(({ id, label, icon:Ico }) => (
            <button
              key={id}
              onClick={()=>setView(id)}
              className="w-full flex items-center gap-3 px-3 rounded-lg font-sans text-[14px] transition"
              style={{
                height: 40,
                background: view===id ? C.paper : 'transparent',
                color: view===id ? C.ink : C.inkMid,
                fontWeight: view===id ? 500 : 400,
                boxShadow: view===id ? `0 1px 0 ${C.line}` : 'none',
              }}
              onMouseEnter={e=>{ if(view!==id) e.currentTarget.style.background = C.creamDeep+'66'; }}
              onMouseLeave={e=>{ if(view!==id) e.currentTarget.style.background = 'transparent'; }}
            >
              <Ico size={17}/> {label}
            </button>
          ))}
        </div>

        {/* calendar */}
        <div className="mb-7 pb-7 border-b" style={{ borderColor: C.line }}>
          <MiniCalendar
            cal={calState.cal}
            setCal={calState.setCal}
            entries={entries}
            currentDate={currentDate}
            setDate={(d)=>{ setDate(d); setView('write'); }}
          />
        </div>
      </div>

      <div className="px-6 pb-6 pt-2 shrink-0">
        <SleepingCat/>
      </div>
    </aside>
  );
}

/* =================================================
   Write view
   ================================================= */
function WriteView({ date, entry, onChange }) {
  const update = (patch) => onChange({ ...entry, ...patch });
  const d = fromStr(date);
  const dayNum = d.getDate();
  const monthLabel = `${d.getMonth()+1}月`;
  const weekday = `星期${WEEK[d.getDay()]}`;
  const year = d.getFullYear();

  return (
    <div className="flex-1 min-h-screen flex justify-center py-12 px-10 paper grain relative">
      <div className="w-full max-w-[680px] fade-in">
        <header className="mb-10">
          <div className="flex items-end gap-5">
            <div className="font-display leading-none" style={{ fontSize: 92, color: C.ink, fontWeight: 500 }}>
              {dayNum}
            </div>
            <div className="pb-2.5">
              <div className="font-display leading-tight" style={{ fontSize: 22, color: C.ink }}>
                {monthLabel}
              </div>
              <div className="font-sans text-[12.5px] mt-1 tracking-[0.14em]" style={{ color: C.inkSoft }}>
                {year} · {weekday.toUpperCase()}
              </div>
            </div>
            {date === today() && (
              <div className="pb-3 ml-auto font-hand text-[18px]" style={{ color: C.accent }}>
                今天 · today
              </div>
            )}
          </div>
          <div className="mt-6 h-[1px]" style={{ background: `linear-gradient(to right, ${C.line}, transparent)` }}/>
        </header>

        {/* 01 今日事项 */}
        <section className="mb-9">
          <h2 className="flex items-center gap-2 mb-3 font-body" style={{ color: C.ink }}>
            <span style={{ color: C.accent, fontFamily:'Caveat', fontSize: 22 }}>01</span>
            <span className="text-[17px] font-medium">今日事项</span>
            <span className="font-sans text-[11px] ml-1" style={{ color: C.inkSoft }}>一条一事，完成了打个勾</span>
          </h2>
          <BlockEditor
            blocks={entry.did}
            onChange={(b)=>update({ did: b })}
            placeholder="写下一条待办…"
            simpleMode={true}
          />
        </section>

        {/* 02 今日思考 */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 mb-3 font-body" style={{ color: C.ink }}>
            <span style={{ color: C.accent, fontFamily:'Caveat', fontSize: 22 }}>02</span>
            <span className="text-[17px] font-medium">今日思考</span>
            <span className="font-sans text-[11px] ml-1" style={{ color: C.inkSoft }}>可以慢慢写，长一点也没关系</span>
          </h2>
          <BlockEditor
            blocks={entry.thoughts}
            onChange={(b)=>update({ thoughts: b })}
            placeholder="想到了什么？观察、感悟、疑问…"
          />
        </section>

        <footer className="pt-6 border-t flex items-center justify-between font-sans text-[11px]"
                style={{ borderColor: C.line, color: C.inkSoft }}>
          <span>自动保存于本地</span>
          <RotatingQuote/>
        </footer>
      </div>
    </div>
  );
}

/* =================================================
   Search view — 关键词高亮 + 结果列表
   ================================================= */
function SearchView({ entries, query, setDate, setView }) {
  const q = (query || '').trim().toLowerCase();

  // 汇总所有匹配
  const results = [];
  if (q) {
    Object.values(entries).forEach(e => {
      if (isEntryEmpty(e)) return;
      const didMatches = (e.did||[])
        .filter(b => b.content && b.type!=='image')
        .filter(b => b.content.toLowerCase().includes(q))
        .map(b => ({ section:'事项', content: b.content, done: b.done, marker: b.marker }));
      const thoughtMatches = (e.thoughts||[])
        .filter(b => b.content && b.type!=='image')
        .filter(b => b.content.toLowerCase().includes(q))
        .map(b => ({ section:'思考', content: b.content }));
      if (didMatches.length || thoughtMatches.length) {
        results.push({ date: e.date, matches: [...didMatches, ...thoughtMatches] });
      }
    });
    results.sort((a,b)=> b.date.localeCompare(a.date));
  }

  // 高亮函数
  const highlight = (text) => {
    if (!q) return text;
    const lower = text.toLowerCase();
    const parts = [];
    let i = 0;
    while (i < text.length) {
      const idx = lower.indexOf(q, i);
      if (idx === -1) { parts.push(text.slice(i)); break; }
      if (idx > i) parts.push(text.slice(i, idx));
      parts.push(
        <mark key={idx} style={{ background: C.accent, color: '#fff', padding: '0 2px', borderRadius: 2 }}>
          {text.slice(idx, idx+q.length)}
        </mark>
      );
      i = idx + q.length;
    }
    return parts;
  };

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <div className="flex-1 min-h-screen py-12 px-10 paper grain relative">
      <div className="max-w-[720px] mx-auto fade-in">
        <header className="mb-8">
          <h1 className="font-display text-[42px] leading-none" style={{ color: C.ink, fontWeight: 500 }}>
            搜索
          </h1>
          {q ? (
            <div className="font-sans text-[13px] mt-2" style={{ color: C.inkSoft }}>
              共在 {results.length} 天里找到 {totalMatches} 条结果
            </div>
          ) : (
            <div className="font-hand text-[18px] mt-1" style={{ color: C.accent }}>
              type to find anything
            </div>
          )}
        </header>

        {!q && (
          <div className="py-16 text-center font-serif" style={{ color: C.inkSoft }}>
            <Search size={30} className="mx-auto mb-3" style={{ opacity: 0.5 }}/>
            <div>在左上角输入关键词，开始搜索你的日记</div>
          </div>
        )}

        {q && results.length === 0 && (
          <div className="py-16 text-center font-serif" style={{ color: C.inkSoft }}>
            没有找到包含 <span style={{ color: C.accent }}>"{query}"</span> 的日记
          </div>
        )}

        {q && results.length > 0 && (
          <div className="space-y-6">
            {results.map(r => {
              const d = fromStr(r.date);
              return (
                <article key={r.date}
                         onClick={()=>{ setDate(r.date); setView('write'); }}
                         className="p-5 rounded-lg cursor-pointer transition hover:translate-y-[-1px]"
                         style={{ background: C.paper, border:`1px solid ${C.line}` }}>
                  <div className="flex items-baseline gap-3 mb-3 pb-2 border-b" style={{ borderColor: C.line }}>
                    <span className="font-display text-[22px]" style={{ color: C.ink }}>
                      {d.getMonth()+1}.{d.getDate()}
                    </span>
                    <span className="font-sans text-[11px] tracking-[0.1em]" style={{ color: C.inkSoft }}>
                      {d.getFullYear()} · 星期{WEEK[d.getDay()]}
                    </span>
                    <span className="ml-auto font-sans text-[11px]" style={{ color: C.accent }}>
                      {r.matches.length} 条匹配
                    </span>
                  </div>
                  <div className="space-y-2">
                    {r.matches.map((m, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="font-sans text-[10px] tracking-[0.12em] mt-[5px] shrink-0 px-1.5 py-0.5 rounded"
                              style={{ color: C.inkSoft, background: C.creamDeep }}>
                          {m.section}
                        </span>
                        <p className={`font-serif text-[14.5px] leading-[1.7] flex-1 ${m.done ? 'line-through' : ''}`}
                           style={{ color: m.done ? C.inkSoft : C.ink }}>
                          {highlight(m.content)}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* =================================================
   Timeline view
   ================================================= */
function TimelineView({ entries, setDate, setView }) {
  const all = Object.values(entries)
    .filter(e => !isEntryEmpty(e))
    .sort((a,b) => b.date.localeCompare(a.date));

  const preview = (blocks) => {
    const texts = (blocks||[]).filter(b => b.type!=='image')
                        .map(b => b.content).filter(Boolean);
    return texts.join('  ·  ').slice(0, 140);
  };

  return (
    <div className="flex-1 min-h-screen py-12 px-10 paper grain relative">
      <div className="max-w-[720px] mx-auto fade-in">
        <header className="mb-10">
          <h1 className="font-display text-[42px] leading-none" style={{ color: C.ink, fontWeight: 500 }}>
            时间轴
          </h1>
          <div className="font-hand text-[18px] mt-1" style={{ color: C.accent }}>
            all the days
          </div>
          <div className="font-sans text-[12px] mt-4" style={{ color: C.inkSoft }}>
            共 {all.length} 篇日记
          </div>
        </header>

        {all.length === 0 ? (
          <div className="py-20 text-center font-serif" style={{ color: C.inkSoft }}>
            <BookOpen size={32} className="mx-auto mb-3" style={{ color: C.inkSoft, opacity: 0.5 }}/>
            还没有日记，从今天开始写一篇吧。
          </div>
        ) : (
          // 时间轴常量：
          //   日期栏宽 72px, 右边距 24px (gap-6)，所以线/点位置 = 72 + 24/2 - 0.5 = 83.5 ≈ 84
          //   小圆点直径 8，居中在 84 → 圆点 left = 84-4 = 80
          <div className="relative">
            {/* 贯穿竖线 */}
            <div className="absolute top-2 bottom-2 w-[1px]"
                 style={{ left: 84, background: C.line }}/>
            {all.map(e => {
              const d = fromStr(e.date);
              return (
                <article key={e.date}
                         className="relative flex items-start mb-9 group cursor-pointer"
                         onClick={()=>{ setDate(e.date); setView('write'); }}>
                  {/* 日期栏 */}
                  <div className="text-right pt-1 shrink-0"
                       style={{ width: 72, marginRight: 24 }}>
                    <div className="font-display text-[32px] leading-none" style={{ color: C.ink }}>
                      {d.getDate()}
                    </div>
                    <div className="font-sans text-[10.5px] mt-1 tracking-[0.1em]" style={{ color: C.inkSoft }}>
                      {d.getFullYear()}.{pad(d.getMonth()+1)}
                    </div>
                    <div className="font-hand text-[14px] mt-0.5" style={{ color: C.accent }}>
                      星期{WEEK[d.getDay()]}
                    </div>
                  </div>

                  {/* 小圆点（与竖线对齐，中心在 left:84） */}
                  <div className="absolute rounded-full"
                       style={{
                         left: 80,
                         top: 14,
                         width: 9,
                         height: 9,
                         background: C.accent,
                         boxShadow: `0 0 0 3px ${C.paper}`,
                       }}/>

                  {/* 内容区 */}
                  <div className="flex-1 pl-8 pb-2 transition group-hover:translate-x-0.5"
                       style={{ minWidth: 0 }}>
                    {(e.did||[]).some(b=>b.content) && (
                      <div className="mb-2">
                        <div className="font-sans text-[10px] tracking-[0.14em] mb-1" style={{ color: C.inkSoft }}>
                          事项
                        </div>
                        <p className="font-body text-[14.5px] leading-[1.75]" style={{ color: C.ink }}>
                          {preview(e.did)}
                        </p>
                      </div>
                    )}
                    {(e.thoughts||[]).some(b=>b.content) && (
                      <div className="mb-2">
                        <div className="font-sans text-[10px] tracking-[0.14em] mb-1" style={{ color: C.inkSoft }}>
                          思考
                        </div>
                        <p className="font-body text-[14.5px] leading-[1.75]" style={{ color: C.inkMid }}>
                          {preview(e.thoughts)}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* =================================================
   Root
   ================================================= */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState({});
  const [currentDate, setCurrentDate] = useState(today());
  const [view, setView] = useState('write');
  const [searchQuery, setSearchQuery] = useState('');
  const [cal, setCal] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const timer = useRef(null);

  useEffect(() => {
    (async () => {
      const data = await loadAll();
      setEntries(data.entries || {});
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback((ent) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveAll({ entries: ent }), 400);
  }, []);

  const currentEntry = entries[currentDate] || emptyEntry(currentDate);

  const updateEntry = (next) => {
    const e = { ...next, updatedAt: Date.now() };
    const nextEntries = { ...entries, [currentDate]: e };
    setEntries(nextEntries);
    persist(nextEntries);
  };

  if (!loaded) {
    return (
      <div className="paper-deep min-h-screen flex items-center justify-center">
        <GlobalStyle/>
        <div className="font-hand text-[22px]" style={{ color: C.accent }}>翻开日记…</div>
      </div>
    );
  }

  return (
    <div className="paper-deep min-h-screen flex font-sans" style={{ color: C.ink }}>
      <GlobalStyle/>
      <Sidebar
        view={view}
        setView={setView}
        calState={{ cal, setCal }}
        entries={entries}
        currentDate={currentDate}
        setDate={setCurrentDate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      {view === 'write'    && <WriteView date={currentDate} entry={currentEntry} onChange={updateEntry}/>}
      {view === 'timeline' && <TimelineView entries={entries} setDate={setCurrentDate} setView={setView}/>}
      {view === 'search'   && <SearchView entries={entries} query={searchQuery}
                                          setDate={(d)=>{ setCurrentDate(d); setSearchQuery(''); }}
                                          setView={setView}/>}
    </div>
  );
}
