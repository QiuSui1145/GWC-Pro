// ==========================================
// 全局 UI 反馈：按钮点击音效 + 动画速率
// ------------------------------------------
// - uiClickSound: 全局捕获阶段监听 button/a 点击，播放自定义音效
// - setAnimRate : 把视觉设置里的动画速率写入 CSS 变量（localStorage 持久化）
// ==========================================

const RATE_KEY = 'gwc_anim_rate';

// ---------- 动画速率 ----------
export function applyAnimRate(rate) {
  const r = Math.min(3, Math.max(0.25, Number(rate) || 1));
  document.documentElement.style.setProperty('--gwc-anim-rate', String(r));
  try { localStorage.setItem(RATE_KEY, String(r)); } catch {}
}

export function loadAnimRate() {
  try { return Number(localStorage.getItem(RATE_KEY)) || 1; } catch { return 1; }
}

// ---------- 按钮点击音效 ----------
let clickAudioCache = null;   // { src, el }  复用解码后的 Audio 元素
let lastPlayAt = 0;

export function playClickSound(url, volume) {
  if (!url) return;
  const now = performance.now();
  // 防抖：极快连点时只播一次（30ms 内）
  if (now - lastPlayAt < 30) return;
  lastPlayAt = now;
  try {
    if (!clickAudioCache || clickAudioCache.src !== url) {
      const el = new Audio(url);
      el.preload = 'auto';
      clickAudioCache = { src: url, el };
    }
    const { el } = clickAudioCache;
    el.volume = Math.min(1, Math.max(0, Number(volume) || 0.5));
    el.currentTime = 0;
    el.play().catch(() => {});
  } catch {}
}

// 全局监听器（挂载一次）
let listenerAttached = false;
function ensureListener(getCfg) {
  if (listenerAttached) return;
  listenerAttached = true;
  // 捕获阶段监听，保证在 stopPropagation 的处理器之前也能收到
  document.addEventListener('click', (e) => {
    const cfg = getCfg();
    if (!cfg || !cfg.enabled || !cfg.url) return;
    const t = e.target;
    if (!(t instanceof Element)) return;
    // 命中按钮类元素（button / a / [role=button] / label 包裹的开关）
    if (t.closest('button, a, [role="button"], label.gwc-clickable, .shortcut-btn')) {
      playClickSound(cfg.url, cfg.volume);
    }
  }, true);
}

// 启动全局监听；cfgGetter 返回 { enabled, url, volume }
export function initClickSound(cfgGetter) {
  ensureListener(cfgGetter);
}
