// ==========================================================
// 主题（浅色 / 深色 / 跟随系统）
// 主题必须在 React 挂载前就应用，否则会先闪一帧浅色再变深色，
// 因此这里不依赖 React 状态，直接操作 <html data-theme>。
// ==========================================================

const THEME_KEY = 'gwc_theme_mode'; // 'light' | 'dark' | 'system'

export const getThemeMode = () => {
  try { return localStorage.getItem(THEME_KEY) || 'system'; } catch { return 'system'; }
};

export const prefersDark = () => {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
};

/** 依据当前模式解析出实际生效的主题 */
export const resolveTheme = (mode = getThemeMode()) =>
  mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode;

/** 应用主题到 <html>，返回实际生效的主题 */
export const applyTheme = (mode = getThemeMode()) => {
  const actual = resolveTheme(mode);
  try {
    document.documentElement.setAttribute('data-theme', actual);
    // 让浏览器原生控件（滚动条、下拉框）也跟随
    document.documentElement.style.colorScheme = actual;
  } catch {}
  return actual;
};

export const setThemeMode = (mode) => {
  try { localStorage.setItem(THEME_KEY, mode); } catch {}
  return applyTheme(mode);
};

/**
 * 监听系统主题变化。仅在「跟随系统」模式下才实际切换，
 * 返回取消监听的函数。
 */
export const watchSystemTheme = (onChange) => {
  let mql;
  try { mql = window.matchMedia('(prefers-color-scheme: dark)'); } catch { return () => {}; }
  const handler = () => {
    if (getThemeMode() === 'system') {
      const actual = applyTheme('system');
      if (onChange) onChange(actual);
    }
  };
  // Safari 14 以下只有 addListener
  if (mql.addEventListener) mql.addEventListener('change', handler);
  else if (mql.addListener) mql.addListener(handler);
  return () => {
    if (mql.removeEventListener) mql.removeEventListener('change', handler);
    else if (mql.removeListener) mql.removeListener(handler);
  };
};

// 模块加载即应用一次，避免首屏闪烁
applyTheme();
