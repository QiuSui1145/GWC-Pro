// ==========================================
// GWC 认证模块 - 服务端 API 版本
// 密码哈希由服务端处理，前端仅管理会话状态
// ==========================================

const API_BASE = '';
const SESSION_KEY = 'gwc_current_user';
const REMEMBER_KEY = 'gwc_remember_login';
const REMEMBER_EXPIRY = 3 * 24 * 60 * 60 * 1000; // 3天

// --- 会话管理（客户端 localStorage/sessionStorage）---

function setLoginState(username) {
  localStorage.setItem('GWC_MIRROR_SYS_ACTIVE_ID', `user_${username}`);
  sessionStorage.setItem(SESSION_KEY, username);
}

function setRememberLogin(username) {
  localStorage.setItem(REMEMBER_KEY, JSON.stringify({
    user: username,
    expires: Date.now() + REMEMBER_EXPIRY
  }));
}

function clearRememberLogin() {
  localStorage.removeItem(REMEMBER_KEY);
}

function checkRememberLogin() {
  try {
    const data = JSON.parse(localStorage.getItem(REMEMBER_KEY));
    if (data && data.user && data.expires > Date.now()) {
      return data.user;
    }
    if (data) localStorage.removeItem(REMEMBER_KEY);
  } catch {}
  return null;
}

// --- API 调用 ---

export async function registerUser(username, password) {
  if (!username || username.length < 2) return { ok: false, msg: '用户名至少2个字符' };
  if (!password || password.length < 4) return { ok: false, msg: '密码至少4个字符' };

  try {
    const resp = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password })
    });
    const data = await resp.json();
    if (data.ok) {
      setLoginState(username.trim());
    }
    return data;
  } catch (e) {
    return { ok: false, msg: '注册失败: 后端服务不可用' };
  }
}

export async function loginUser(username, password, rememberMe = false) {
  if (!username) return { ok: false, msg: '请输入用户名' };

  try {
    const resp = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password: password || '' })
    });
    const data = await resp.json();
    if (data.ok) {
      setLoginState(username.trim());
      if (rememberMe) {
        setRememberLogin(username.trim());
      } else {
        clearRememberLogin();
      }
    }
    return data;
  } catch (e) {
    return { ok: false, msg: '登录失败: 后端服务不可用' };
  }
}

export function logoutUser() {
  sessionStorage.removeItem(SESSION_KEY);
  clearRememberLogin();
  localStorage.removeItem('GWC_MIRROR_SYS_ACTIVE_ID');
}

export function getCurrentUser() {
  return sessionStorage.getItem(SESSION_KEY);
}

export function isLoggedIn() {
  return !!sessionStorage.getItem(SESSION_KEY);
}

export function checkAutoLogin() {
  if (isLoggedIn()) return true;
  const user = checkRememberLogin();
  if (user) {
    setLoginState(user);
    return true;
  }
  return false;
}

export async function changePassword(username, oldPassword, newPassword) {
  if (!newPassword || newPassword.length < 4) return { ok: false, msg: '新密码至少4个字符' };

  try {
    const resp = await fetch(`${API_BASE}/api/auth/change_password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, oldPassword, newPassword })
    });
    return await resp.json();
  } catch (e) {
    return { ok: false, msg: '修改失败: 后端服务不可用' };
  }
}

// 首次启动：创建默认 Admin 账号
export async function setupDefaultAdmin() {
  try {
    const resp = await fetch(`${API_BASE}/api/auth/setup_default`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await resp.json();
    // 只在首次创建时自动登录，不要每次都重新登录
    if (data.created) {
      setLoginState('Admin');
    }
    return data.created || false;
  } catch (e) {
    console.warn('Admin 初始化失败（后端可能未运行）:', e);
    return false;
  }
}

// 客户端密码哈希（用于 QQ Bot 密码等非登录场景）
export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex
    ? new Uint8Array(saltHex.match(/.{1,2}/g).map(b => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  const saltOut = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash, salt: saltOut };
}
