// ==========================================
// 全局脚本加载工具（带超时 + 重试 + CDN回退）
// ==========================================

const SCRIPT_TIMEOUT = 15000;

// 同一 src 的并发加载共享同一个 Promise，避免重复插入 script 标签
// 以及「标签已存在但仍在加载中」被误判为已就绪的竞态。
const _inflight = new Map();

export const injectScript = (src, timeout = SCRIPT_TIMEOUT) => {
  // 已加载完成的标签直接复用
  const done = document.querySelector(`script[src="${src}"][data-gwc-loaded="1"]`);
  if (done) return Promise.resolve();

  // 正在加载中的复用同一个 Promise
  if (_inflight.has(src)) return _inflight.get(src);

  const p = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true; _inflight.delete(src); script.remove();
        reject(new Error(`脚本加载超时: ${src}`));
      }
    }, timeout);
    script.onload = () => {
      if (!settled) {
        settled = true; clearTimeout(timer); _inflight.delete(src);
        script.dataset.gwcLoaded = '1';
        resolve();
      }
    };
    script.onerror = () => {
      if (!settled) {
        settled = true; clearTimeout(timer); _inflight.delete(src); script.remove();
        reject(new Error(`脚本加载失败: ${src}`));
      }
    };
    document.head.appendChild(script);
  });
  _inflight.set(src, p);
  return p;
};

export const injectScriptWithFallback = async (primarySrc, fallbackSrcs = []) => {
  const allSrcs = [primarySrc, ...fallbackSrcs];
  for (let i = 0; i < allSrcs.length; i++) {
    try { await injectScript(allSrcs[i]); return; } catch (e) { console.warn(`[CDN ${i + 1}/${allSrcs.length}] ${e.message}`); }
  }
  throw new Error(`所有CDN源均加载失败: ${primarySrc}`);
};

export const withTimeout = (promise, ms, label = '操作') => {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label}超时 (${ms / 1000}s)`)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

