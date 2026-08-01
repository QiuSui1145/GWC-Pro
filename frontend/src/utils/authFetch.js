// ==========================================
// 全局请求鉴权注入
// 给所有发往【本应用后端】的请求自动附加会话令牌：
//   - fetch  → Authorization: Bearer <token>
//   - EventSource → ?_token=<token>（SSE 无法设置请求头）
// 发往第三方（如 LLM 服务、corsproxy）的绝对 URL 一律跳过，
// 避免把本应用令牌泄露给外部，也不覆盖其自带的 Authorization。
//
// 必须在任何业务代码发起请求之前 import（见 main.jsx 首行）。
// ==========================================
import { getToken, syncCookie } from './authToken';

// 已登录用户刷新页面时补写 Cookie（供原生资源请求携带令牌）
syncCookie();

function isBackendUrl(rawUrl) {
  try {
    let url = typeof rawUrl === 'string' ? rawUrl : (rawUrl && rawUrl.url) || '';
    if (!url) return false;
    if (url.startsWith('/')) return true; // 相对路径 = 同源后端
    const u = new URL(url, window.location.href);
    if (u.origin === window.location.origin) return true;
    // 本地后端固定端口（Electron/桌宠等直连场景）
    if ((u.hostname === '127.0.0.1' || u.hostname === 'localhost') &&
        (u.port === '5201' || u.port === '')) return true;
    return false;
  } catch {
    return false;
  }
}

// ---- patch fetch ----
if (typeof window !== 'undefined' && window.fetch && !window.__gwcFetchPatched) {
  const _fetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (isBackendUrl(url)) {
        const token = getToken();
        if (token) {
          const headers = new Headers(
            (init && init.headers) ||
            (typeof input !== 'string' && input && input.headers) ||
            {}
          );
          if (!headers.has('Authorization')) {
            headers.set('Authorization', 'Bearer ' + token);
            init = { ...(init || {}), headers };
          }
        }
      }
    } catch {}
    return _fetch(input, init);
  };
  window.__gwcFetchPatched = true;
}

// ---- patch EventSource ----
if (typeof window !== 'undefined' && window.EventSource && !window.__gwcESPatched) {
  const _ES = window.EventSource;
  const Patched = function (url, config) {
    try {
      if (isBackendUrl(url)) {
        const token = getToken();
        if (token) {
          const sep = String(url).includes('?') ? '&' : '?';
          url = url + sep + '_token=' + encodeURIComponent(token);
        }
      }
    } catch {}
    return new _ES(url, config);
  };
  Patched.prototype = _ES.prototype;
  Patched.CONNECTING = 0;
  Patched.OPEN = 1;
  Patched.CLOSED = 2;
  window.EventSource = Patched;
  window.__gwcESPatched = true;
}
