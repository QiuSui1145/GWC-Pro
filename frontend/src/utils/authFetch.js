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

// ---- patch XMLHttpRequest ----
// PIXI.js / Live2D 等第三方库使用 XHR 加载模型文件，不走 fetch，
// 必须在 open/send 层注入 Authorization 头（cookie 在部分浏览器环境下不可靠）。
if (typeof window !== 'undefined' && window.XMLHttpRequest && !window.__gwcXhrPatched) {
  const XHR = window.XMLHttpRequest;
  const _open = XHR.prototype.open;
  const _send = XHR.prototype.send;
  XHR.prototype.open = function (method, url, ...rest) {
    this.__gwcUrl = typeof url === 'string' ? url : String(url || '');
    this.__gwcMethod = method;
    return _open.call(this, method, url, ...rest);
  };
  XHR.prototype.send = function (...args) {
    try {
      const url = this.__gwcUrl || '';
      if (isBackendUrl(url)) {
        const token = getToken();
        if (token) {
          this.setRequestHeader('Authorization', 'Bearer ' + token);
        }
      }
    } catch {}
    return _send.apply(this, args);
  };
  window.__gwcXhrPatched = true;
}

// ---- patch HTMLImageElement / HTMLAudioElement src ----
// 浏览器原生 <img>/<audio>/CSS url() 加载完全不走 JS 网络 API，
// 无法设请求头，只能在 URL 上挂 ?_token= 查询参数。
if (typeof window !== 'undefined' && !window.__gwcMediaPatched) {
  const _imgSrcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  const _audioSrcDesc = Object.getOwnPropertyDescriptor(HTMLAudioElement.prototype, 'src');

  function patchSrcSetter(proto, desc, tag) {
    if (!desc || !desc.set) return;
    const _set = desc.set;
    Object.defineProperty(proto, 'src', {
      get: desc.get,
      set: function (url) {
        try {
          if (typeof url === 'string' && isBackendUrl(url) && url.includes('/api/')) {
            const token = getToken();
            if (token && !url.includes('_token=')) {
              const sep = url.includes('?') ? '&' : '?';
              url = url + sep + '_token=' + encodeURIComponent(token);
            }
          }
        } catch {}
        return _set.call(this, url);
      },
      configurable: true,
      enumerable: true,
    });
  }

  if (_imgSrcDesc) patchSrcSetter(HTMLImageElement.prototype, _imgSrcDesc, 'IMG');
  if (_audioSrcDesc) patchSrcSetter(HTMLAudioElement.prototype, _audioSrcDesc, 'AUDIO');
  window.__gwcMediaPatched = true;
}
