// ==========================================
// 全局脚本加载工具（带超时 + 重试 + CDN回退）
// ==========================================

const SCRIPT_TIMEOUT = 15000;

export const injectScript = (src, timeout = SCRIPT_TIMEOUT) => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve();
  const script = document.createElement('script');
  script.src = src;
  let settled = false;
  const timer = setTimeout(() => { if (!settled) { settled = true; script.remove(); reject(new Error(`脚本加载超时: ${src}`)); } }, timeout);
  script.onload = () => { if (!settled) { settled = true; clearTimeout(timer); resolve(); } };
  script.onerror = () => { if (!settled) { settled = true; clearTimeout(timer); script.remove(); reject(new Error(`脚本加载失败: ${src}`)); } };
  document.head.appendChild(script);
});

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
