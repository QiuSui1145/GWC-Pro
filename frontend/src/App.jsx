import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import {
  Settings, MessageSquare, Plus, Trash2, Send,
  RefreshCw, Volume2, VolumeX, Menu, X, Save,
  Image as ImageIcon, Sparkles, BookOpen,
  AlertCircle, CheckCircle, Info, ServerCrash, ChevronDown, Music, Edit3,
  Download, Upload, UserPlus, Smile, Archive, Database, Copy, Play, Type,
  Monitor, Mic, FileText, ArrowLeft, LogOut, Eye, User, Calendar, CheckSquare, Clock, Video, Camera,
  SkipBack, SkipForward, Pause, Repeat, Shuffle, Repeat1, GripHorizontal, Puzzle, Shield
} from 'lucide-react';
import { AppProvider } from './contexts/AppContext';
import AppCore from './AppCore';
import LoginPage from './pages/LoginPage';
import { checkAutoLogin, setupDefaultAdmin } from './utils/auth';

// ==========================================
// 全局兼容性补丁
// ==========================================
(function() {
  const _open = indexedDB.open;
  indexedDB.open = function(name, version) {
    if (name === 'Live2D_Local_Storage' && version && version < 10) {
      console.log(`[Compatibility Patch] 已拦截旧插件请求(v${version})，自动升级至 v10 以匹配系统内核。`);
      return _open.call(indexedDB, name, 10);
    }
    return _open.apply(indexedDB, arguments);
  };
})();

(function() {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        try {
            originalSetItem.call(this, key, value);
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.message.includes('quota') || e.message.includes('exceeded')) {
                console.warn(`[Core Protection] 写入 [${key}] 时触发 5MB 物理极限！执行紧急剥离...`);
                try {
                    const obj = JSON.parse(value);
                    const prune = (o) => {
                        if (typeof o === 'string' && o.startsWith('data:')) return '[媒体过大，为防爆存断档已在本地截断]';
                        if (typeof o === 'string' && o.length > 200 * 1024) return o.substring(0, 1024) + '...[超长文本截断]';
                        if (Array.isArray(o)) return o.map(prune);
                        if (typeof o === 'object' && o !== null) { const newObj = {}; for (const k in o) newObj[k] = prune(o[k]); return newObj; }
                        return o;
                    };
                    originalSetItem.call(this, key, JSON.stringify(prune(obj)));
                    if (window.$GWC && window.$GWC.showToast) window.$GWC.showToast("⚠️ 内存已达物理上限！系统已自动剥离超大图片防丢档。", "error", 6000);
                } catch (parseErr) {}
            } else { throw e; }
        }
    };
})();

// ==========================================
// 读取全局登录页配置（标题、副标题、文本框、背景图 — 全部独立存储）
// ==========================================
const LOGIN_CONFIG_CACHE_KEY = 'gwc_login_config_cache';

function loadLoginConfig() {
  return new Promise((resolve) => {
    // 从 localStorage 缓存读取
    let cached = null;
    try {
      const raw = localStorage.getItem(LOGIN_CONFIG_CACHE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch {}

    // 并行：全局登录配置 + 全局背景图
    const configPromise = fetch('/api/login-config')
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);
    const bgPromise = fetch('/api/login-bg', { method: 'GET' })
      .then(r => r.ok ? '/api/login-bg' : null)
      .catch(() => null);

    Promise.all([configPromise, bgPromise]).then(([serverCfg, bgUrl]) => {
      const cfg = { ...(cached || {}), ...(serverCfg || {}) };
      cfg.loginBgImage = bgUrl || (cached && cached.loginBgImage) || '';
      try { localStorage.setItem(LOGIN_CONFIG_CACHE_KEY, JSON.stringify(cfg)); } catch {}
      resolve(cfg);
    });
  });
}

// ==========================================
// 路由系统
// ==========================================
function AppRouter() {
  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash.slice(1);
    return hash || '/main';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      setCurrentPage(hash || '/main');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((path) => {
    const current = window.location.hash.slice(1) || '/main';
    if (current === path) return; // 防止重复导航导致无限循环
    window.location.hash = path;
    setCurrentPage(path);
  }, []);

  return { currentPage, navigate };
}

// ==========================================
// 主应用组件
// ==========================================
export default function App() {
  const router = AppRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loginConfig, setLoginConfig] = useState({});

  useEffect(() => {
    (async () => {
      // setupDefaultAdmin 在后台运行，不阻塞页面渲染
      setupDefaultAdmin().catch(() => {});
      const logged = checkAutoLogin();
      setLoggedIn(logged);
      setAuthReady(true);
      const cfg = await loadLoginConfig();
      setLoginConfig(cfg);
    })();
  }, []);

  if (!authReady) {
    return (
      <div className="h-screen w-full flex items-center justify-center" style={{ background: '#0f172a' }}>
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-wider animate-pulse" style={{ color: '#5ab4ed' }}>GWC</h1>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>正在初始化...</p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <LoginPage loginConfig={loginConfig} onLogin={() => {
        setLoggedIn(true);
        window.location.hash = '/main';
      }} />
    );
  }

  return (
    <AppProvider value={{ router }}>
      <AppCore router={router} />
    </AppProvider>
  );
}
