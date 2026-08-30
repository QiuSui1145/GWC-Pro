// ==========================================
// GWC 会话令牌存取
// token 由后端登录/注册时签发（HMAC 签名 + 过期时间）。
// - 未勾选“记住登录”：仅存 sessionStorage（关闭标签页即失效）
// - 勾选“记住登录”：额外存 localStorage（持久，随 token 自身过期）
// ==========================================

const TOKEN_KEY = 'gwc_token';

// 令牌同时写入 Cookie：<img>/<audio>/CSS url()/XHR（如 pixi-live2d 加载模型）
// 等原生资源请求无法设置 Authorization 头，只能靠同源 Cookie 自动携带。
// SameSite=Lax 使跨站的 POST/PUT/DELETE 不带 Cookie，避免 CSRF。
function writeCookie(token, remember) {
  try {
    // 记住登录：Cookie 有效期设为极长（约 100 年），实际由手动退出登录清除
    const maxAge = remember ? `; max-age=${100 * 365 * 24 * 60 * 60}` : '';
    document.cookie = `${TOKEN_KEY}=${token}; path=/${maxAge}; SameSite=Lax`;
  } catch {}
}

function deleteCookie() {
  try {
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  } catch {}
}

export function setToken(token, remember = false) {
  if (!token) return;
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    if (remember) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
  writeCookie(token, remember);
}

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
  deleteCookie();
}

// 页面加载时：若 storage 中已有令牌（此前已登录），补写 Cookie，
// 确保刷新后 img/audio/xhr 等资源请求也能携带令牌。
export function syncCookie() {
  const t = getToken();
  if (t) {
    let remember = false;
    try { remember = !!localStorage.getItem(TOKEN_KEY); } catch {}
    writeCookie(t, remember);
  }
}
