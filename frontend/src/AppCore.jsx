import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings, MessageSquare, Plus, Trash2, Send,
  RefreshCw, Volume2, VolumeX, Menu, X, Save,
  Image as ImageIcon, Sparkles, BookOpen,
  AlertCircle, CheckCircle, Info, ServerCrash, ChevronDown, Music, Edit3,
  Download, Upload, UserPlus, Smile, Archive, Database, Copy, Play, Type,
  Monitor, Mic, FileText, ArrowLeft, LogOut, Eye, User, Calendar, CheckSquare, Clock, Video, Camera,
  SkipBack, SkipForward, Pause, Repeat, Shuffle, Repeat1, GripHorizontal, Puzzle, Shield, Lock, Brain, Square
} from 'lucide-react';
function OCPanel({ taskId, setOcTaskId, settings, setSettings, visible, setOcVisible }) {
  const [collapsed, setCollapsed] = useState(false);
  const [ocOutput, setOcOutput] = useState([]);
  const [ocStatus, setOcStatus] = useState('connecting');
  const panelRef = useRef(null);
  const dragData = useRef({ x: 0, y: 0 });

  // 过滤 emoji
  function stripEmoji(s) { return (s||'').replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{2934}\u{2935}\u{3030}\u{303D}\u{3297}\u{3299}\u{FE0F}\u{200D}]/gu, '').replace(/[\u{00A9}\u{00AE}\u{2122}\u{2139}\u{2320}-\u{23F3}\u{24C2}]/gu, '') }

  useEffect(() => {
    if (!taskId) return;
    setOcStatus('connecting'); setOcOutput([]);
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/opencode/poll/${taskId}`);
        const d = await r.json();
        if (d.error && !d.lines) { setOcStatus('error'); clearInterval(poll); return }
        if (d.lines?.length > 0) {
          for (const line of d.lines) {
            try {
              const e = JSON.parse(line);
              if (e.type === 'step_start') setOcOutput(p => [...p.slice(-3), { t: 'step' }]);
              else if (e.type === 'text' && e.part?.text) {
                const clean = stripEmoji(e.part.text);
                if (!clean.trim()) continue;
                setOcOutput(p => { const last = p[p.length-1]; if (last?.t==='text') { const c=[...p]; c[c.length-1]={t:'text',text:last.text+clean};return c } return [...p.slice(-5),{t:'text',text:clean}] });
              }
              else if (e.type === 'tool_use') setOcOutput(p => [...p.slice(-3), { t: 'tool', name: e.part?.tool || e.part?.name || '?' }]);
            } catch(err) {}
          }
        }
        if (d.done) { clearInterval(poll); setOcStatus('done') }
      } catch(err) {}
    }, 500);
    return () => clearInterval(poll);
  }, [taskId]);

  const onDown = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
    const r = panelRef.current.getBoundingClientRect();
    const ox = e.clientX - r.left, oy = e.clientY - r.top;
    const move = (ev) => { const el = panelRef.current; if (el) { el.style.left = (ev.clientX - ox) + 'px'; el.style.top = (ev.clientY - oy) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto' } };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    e.preventDefault();
  };

  if (!visible || !taskId) return null;

  const isDone = ocStatus === 'done', isErr = ocStatus === 'error';
  return (
    <div ref={panelRef} onMouseDown={onDown} className="oc-panel"
      style={{ position: 'fixed', bottom: '80px', left: '20px', width: '360px', maxHeight: collapsed ? '36px' : '320px',
        background: 'rgba(10,12,20,0.85)', backdropFilter: 'blur(16px)', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.08)', zIndex: 2000, display: 'flex', flexDirection: 'column',
        pointerEvents: 'auto', fontSize: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', overflow: 'hidden', transition: 'max-height 0.2s' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)', flexShrink: 0, cursor: 'move', userSelect: 'none' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isDone ? '#4f8' : isErr ? '#f44' : '#8bf', boxShadow: `0 0 6px ${isDone ? '#4f8' : isErr ? '#f44' : '#8bf'}` }} />
        <span style={{ color: isDone ? '#8f8' : isErr ? '#f88' : '#ddd', fontWeight: 600, fontSize: '12px', letterSpacing: '0.5px' }}>Working</span>
        {ocOutput.length > 0 && <span style={{ color: '#555', fontSize: '10px' }}>{ocOutput.length} 项</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
          <button onClick={() => setCollapsed(!collapsed)} style={hdrBtn}>{collapsed ? '▸' : '▾'}</button>
          <button onClick={() => { setOcTaskId(null); setOcVisible(false); setSettings(s => ({...s, workMode: false})) }} style={hdrBtn}>✕</button>
        </div>
      </div>
      {/* Body */}
      {!collapsed && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px', maxHeight: '270px', fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#aaa', lineHeight: 1.5 }}>
          {ocOutput.map((item, i) => (
            <div key={i} style={{ marginBottom: '3px', padding: '2px 6px', borderRadius: '4px', borderLeft: item.t === 'tool' ? '2px solid #fa0' : item.t === 'done' ? '2px solid #8f8' : '', background: item.t === 'tool' ? 'rgba(255,170,0,0.06)' : '' }}>
              {item.t === 'text' && <span style={{ color: '#ccc', whiteSpace: 'pre-wrap' }}>{item.text}</span>}
              {item.t === 'step' && <span style={{ color: '#8bf', fontSize: '10px' }}>○ 思考</span>}
              {item.t === 'tool' && <span style={{ color: '#fb0', fontSize: '10px' }}>⚙ {item.name}</span>}
              {item.t === 'done' && <span style={{ color: '#8c8', fontSize: '10px' }}>✓</span>}
            </div>
          ))}
          {ocOutput.length === 0 && !isDone && <span style={{ color: '#444' }}>等待 opencode...</span>}
          {isDone && ocOutput.length === 0 && <span style={{ color: '#666' }}>无输出</span>}
        </div>
      )}
    </div>
  );
}

const hdrBtn = { background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '11px', padding: '1px 3px' };
import { AppProvider } from './contexts/AppContext';
import SettingsPage from './pages/SettingsPage';
import SaveLoadPage from './pages/SaveLoadPage';
import LogPage from './pages/LogPage';
import TitlePage from './pages/TitlePage';
import ChatPage from './pages/ChatPage';
import { BUNDLED_MODS } from './bundled_mods';
import { logoutUser, getCurrentUser, hashPassword } from './utils/auth';
import AccountTab from './components/settings/AccountTab';
import LoginCustomizeTab from './components/settings/LoginCustomizeTab';
import KnowledgeBaseTab from './components/settings/KnowledgeBaseTab';
import SkillsConsoleTab from './components/settings/SkillsConsoleTab';
import QQBotTab from './components/settings/QQBotTab';
import LoginPreviewAdjust from './components/settings/LoginPreviewAdjust';

// ==========================================
// 🛡️ 兼容性补丁：自动劫持并升级所有旧插件的数据库版本请求
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

// ==========================================
// 🛡️ 原生级融合：全局防爆存与自动降级清理拦截器
// ==========================================
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

// --- 全局脚本加载工具（带超时 + 重试 + CDN回退） ---
const SCRIPT_TIMEOUT = 15000; // 单脚本加载超时 15s

const injectScript = (src, timeout = SCRIPT_TIMEOUT) => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve();
  const script = document.createElement('script');
  script.src = src;
  let settled = false;
  const timer = setTimeout(() => { if (!settled) { settled = true; script.remove(); reject(new Error(`脚本加载超时: ${src}`)); } }, timeout);
  script.onload = () => { if (!settled) { settled = true; clearTimeout(timer); resolve(); } };
  script.onerror = () => { if (!settled) { settled = true; clearTimeout(timer); script.remove(); reject(new Error(`脚本加载失败: ${src}`)); } };
  document.head.appendChild(script);
});

// 带回退的脚本加载：尝试主CDN，失败后自动切备用CDN
const injectScriptWithFallback = async (primarySrc, fallbackSrcs = []) => {
  const allSrcs = [primarySrc, ...fallbackSrcs];
  for (let i = 0; i < allSrcs.length; i++) {
    try { await injectScript(allSrcs[i]); return; } catch (e) { console.warn(`[CDN ${i + 1}/${allSrcs.length}] ${e.message}`); }
  }
  throw new Error(`所有CDN源均加载失败: ${primarySrc}`);
};

// 通用 Promise 超时包装
const withTimeout = (promise, ms, label = '操作') => {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label}超时 (${ms / 1000}s)`)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

// ✨ 数据存储层：服务端 API（替代 IndexedDB）
import {
  getActiveMirrorId,
  saveCoreData, loadCoreData, loadBatchCoreData,
  saveMultiModelToDB, loadModelsListFromDB, getMultiModelFromDB, deleteMultiModelFromDB, loadModelFilesFromDB,
  saveBGMToDB, loadBGMFromDB, deleteBGMFromDB,
  saveImageToDB, loadImageFromDB,
  saveBgItemToDB, loadBgListFromDB, deleteBgItemFromDB,
  saveModToDB, loadModsFromDB, deleteModFromDB,
  blobToBase64
} from './utils/db';

// --- 默认设置 ---
const DEFAULT_SETTINGS = {
  openaiBaseUrl: '', openaiApiKey: '', aiModel: 'gpt-3.5-turbo', aiTemperature: 0.7, apiProfiles: [],
  customSystemPrompt: '你是一个可爱的虚拟助手，请用简短、生动、带有一点二次元风格的语言回答我的问题。',
  worldviewText: '', worldviewProfiles: [],
  userName: '我', aiName: '对象', characterList: [], activeSkillPacks: [], activeKbPacks: [], enableSkills: true, ttsEnabled: false,
  ttsUrlTemplate: 'http://127.0.0.1:9880/tts?text={text}&text_lang={lang}&ref_audio_path={ref_audio}&prompt_text={ref_text}&prompt_lang={ref_lang}',
  ttsLanguage: 'zh', ttsVolume: 1.0, bgmVolume: 0.3, bgmMode: 'sequential', enableBgmToast: false,
  // ✨ 新增手机端模式开关状态与缩放比例
  ttsMobileMode: false, enableMobileUI: false, mobileUIScale: 1.0,
  storySpriteScale: 1.0, storySpriteX: 0, storySpriteY: 0,
  live2dScale: 0.2, live2dX: 0, live2dY: 0, titleLive2dScale: 0.2, titleLive2dX: 0, titleLive2dY: 0,
  live2dResolution: window.devicePixelRatio || 1, // ✨ 新增：模型渲染分辨率精度
  corsProxyType: 'none', customCorsProxyUrl: 'https://corsproxy.io/?', enablePlotOptions: false, enableStreaming: true, typingSpeed: 40, vnLinesPerPage: 4, dialogOpacity: 0.6, settingsOpacity: 0.95, currentBgId: null, currentBgmId: null, currentExpressionId: null, currentModelId: null,
  dialogFontFamily: '"Microsoft YaHei", sans-serif', dialogTextColor: '#ffffff', dialogThemeColor: '#000000', dialogPositionY: 0, dialogLineHeight: 1.8,
  enableClickExpression: true, enableNoLive2DMode: false, enableBridge: true, mainTitleText: 'GWC', mainTitleColor: '#e0f2fe', mainTitleFont: 'serif', mainTitleX: 0, mainTitleY: 0, subTitleText: '- GalGame Web Chat -', subTitleColor: '#dbeafe', subTitleFont: 'sans-serif', subTitleX: 0, subTitleY: 0, titleBgOffsetX: 0, titleBgOffsetY: 0, plotApiMode: 'shared', plotBaseUrl: '', plotApiKey: '', plotModel: 'gpt-3.5-turbo', hideTitleLive2d: false, ttsRefAudio: '', ttsRefText: '', ttsRefLang: 'zh', enableTranslation: false, displayLanguage: 'zh', ttsSentencePause: 0, ttsPlaybackRate: 1.0, workMode: false,
  // OpenCode 配置
  opencodeBaseUrl: '', opencodeApiKey: '', opencodeModel: '', opencodeUseChatModel: true, opencodeUseFreeModel: false, opencodeProjectPath: '',
  modelConfigs: {}, enableMemory: false, memoryInterval: 150, enableAutoSave: false, autoSaveInterval: 5, enableProactiveChat: false, proactiveMinInterval: 3, proactiveMaxInterval: 10, enableProactiveScreenshot: false, vnAutoPage: true, hideInfoToasts: false, enableFaceTracking: false, enableCameraPreview: false, faceTrackingMode: 'full', ttsFastMode: true, showTitleBgmPlayer: true,
  shortcuts: { save: true, load: true, quickSave: true, quickLoad: true, skip: true, bg: true, model: true, expression: true, memo: true, workMode: true, faceTracking: true, hideModel: true, bgm: true, plot: true, tts: true, log: true },
  enableVoiceInput: false, voiceInputKey: 'ctrlright', voiceInputLang: 'zh-CN',
  enableAutoChatBackup: true, autoChatBackupInterval: 10,
  bgmOffsetX: 0, bgmOffsetY: 0,
  // 登录页定制
  loginPageTitle: 'GWC', loginPageTitleColor: '#5ab4ed', loginPageTitleFont: 'serif', loginPageTitleX: 0, loginPageTitleY: 0,
  loginPageSubTitle: 'GalGame Web Chat Engine', loginPageSubTitleColor: 'rgba(255,255,255,0.4)', loginPageSubTitleFont: 'sans-serif', loginPageSubTitleX: 0, loginPageSubTitleY: 0,
  loginBgImage: '', loginBgOffsetX: 0, loginBgOffsetY: 0,
  loginTextBoxes: [],

  // 知识库 (Knowledge Base)
  enableKnowledgeBase: false,
  kbEmbeddingBaseUrl: '', kbEmbeddingApiKey: '', kbEmbeddingModel: 'text-embedding-3-small', kbEmbeddingDimensions: 1536,
  kbRerankEnabled: false, kbRerankBaseUrl: '', kbRerankApiKey: '', kbRerankModel: '',
  kbTopK: 5, kbRerankTopK: 3,

  // QQ 机器人 (OneBot V11)
  enableQQBot: false,
  qqBotWsMode: 'forward',
  qqBotWsUrl: 'ws://127.0.0.1:3001',
  qqBotReverseWsHost: '0.0.0.0',
  qqBotReverseWsPort: 6700,
  qqBotToken: '',
  qqBotAdminQQ: '',
  qqBotPrivateWhitelistEnabled: false,
  qqBotPrivateWhitelist: '',
  qqBotGroupWhitelistEnabled: false,
  qqBotGroupWhitelist: '',
  qqBotPersona: '',
  qqBotContextLength: 20,
  qqBotActiveReplyRate: 5,
  qqBotApiBaseUrl: '',
  qqBotApiKey: '',
  qqBotApiModel: 'gpt-3.5-turbo',
  qqBotApiTemperature: 0.7,
  qqBotSessions: {},
  qqBotContextGroups: {},
  qqBotCharCards: [],
  qqBotApiProfiles: [],
  qqBotPasswordHash: '',
  qqBotSegmentedReply: true,
  qqBotAdminList: '',
  qqBotCommandPrefix: '#',
  qqBotEnableImage: false,
  qqBotEnableVoice: false,
};

const SHORTCUT_DEFS = [
  { id: 'save', label: '保存 (S)' }, { id: 'load', label: '读取 (L)' },
  { id: 'quickSave', label: '快存 (QS)' }, { id: 'quickLoad', label: '快读 (QL)' },
  { id: 'skip', label: '跳过 (SKIP)' }, { id: 'bg', label: '背景切换' },
  { id: 'model', label: '模型切换' }, { id: 'expression', label: '表情切换' },
  { id: 'memo', label: '备忘/日程' }, { id: 'workMode', label: '工作模式' },
  { id: 'faceTracking', label: '实时面捕' }, { id: 'hideModel', label: '模型显隐' },
  { id: 'bgm', label: 'BGM 控制' }, { id: 'plot', label: '推演选项' },
  { id: 'tts', label: 'Auto(TTS)' }, { id: 'log', label: 'Log 记录' }
];

const hexToRgba = (hex, alpha) => {
  let r = 0, g = 0, b = 0;
  if (hex && hex.length === 4) { r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16); }
  else if (hex && hex.length === 7) { r = parseInt(hex.substring(1, 3), 16); g = parseInt(hex.substring(3, 5), 16); b = parseInt(hex.substring(5, 7), 16); }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const SettingToggle = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[#ba3f42] font-bold flex items-center gap-1"><span className="text-sm">✱</span> {label}</label>
    <div className="flex bg-[#e8decb] rounded-full p-1 w-max shadow-inner">
      <button onClick={() => onChange(true)} className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all ${value ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-white/50'}`}>ON</button>
      <button onClick={() => onChange(false)} className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all ${!value ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-white/50'}`}>OFF</button>
    </div>
  </div>
);

const SettingSlider = ({ label, value, min, max, step, suffix = '', onChange }) => (
  <div className="flex flex-col gap-2 w-full">
    <div className="flex justify-between text-[#ba3f42] font-bold">
      <label className="flex items-center gap-1"><span className="text-sm">✱</span> {label}</label>
      <span className="text-[#4a4036] bg-[#e8decb] px-2 py-0.5 rounded text-sm">{value}{suffix}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full h-2 bg-[#d9c5b2] rounded-lg appearance-none cursor-pointer accent-[#ba3f42]" />
  </div>
);

const SettingSectionTitle = ({ title, extra }) => (
  <div className="flex flex-wrap items-center gap-4 mb-6">
    <h3 className="text-lg font-black text-[#ba3f42] tracking-widest whitespace-nowrap">{title}</h3>
    <div className="hidden sm:block flex-1 border-b-2 border-dashed border-[#e6d5b8] min-w-[20px]"></div>
    {extra && <div className="shrink-0 flex items-center gap-2">{extra}</div>}
  </div>
);

const TypewriterPreview = ({ speed, text, textStyle }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed(''); let i = 0;
    const timer = setInterval(() => { setDisplayed(text.slice(0, i + 1)); i++; if (i >= text.length) clearInterval(timer); }, speed);
    return () => clearInterval(timer);
  }, [speed, text]);
  return (
    <div style={textStyle} className="whitespace-pre-wrap flex-1 break-words">
      {displayed}<span className="inline-block w-2.5 h-5 ml-1 bg-white/70 animate-pulse align-middle rounded-sm"></span>
    </div>
  );
};


export default function AppCore({ router }) {
  const { currentPage, navigate } = router;
  const [appMode, setAppMode] = useState('title');
  const [localTitleBgImage, setLocalTitleBgImage] = useState('');

  // ✨ 核心大迁徙：加入数据库唤醒锁与空壳状态
  const [isCoreLoading, setIsCoreLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [memos, setMemos] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [saveSlots, setSaveSlots] = useState({});
  const [quickSaveData, setQuickSaveData] = useState(null);
  const [autoSaveData, setAutoSaveData] = useState(null);

  // ✨ 预加载插件 API 客户端（与数据加载并行，不阻塞任何流程）
  useEffect(() => {
    if (!document.getElementById('gwc-api-client')) {
      const s = document.createElement('script');
      s.id = 'gwc-api-client';
      s.src = '/app/mods/_gwc_api_client.js?v=' + Date.now();
      s.onerror = () => console.warn('[GWC] API客户端预加载失败');
      document.head.appendChild(s);
    }
  }, []);

  // ✨ 异步潜入 IndexedDB 黑盒捞取数据（批量读取，大幅加速启动）
  useEffect(() => {
    const loadEverything = async () => {
      try {
        // 批量读取核心数据 + 媒体列表（单次 HTTP 请求，省去 4 个独立请求）
        const CORE_KEYS = ['live2d_settings_v35', 'live2d_sessions_v35', 'live2d_saves_v35', 'live2d_quicksave_v35', 'live2d_autosave_v35', 'live2d_memos_v35'];
        const batch = await loadBatchCoreData(CORE_KEYS, true);
        let savedSettings = batch['live2d_settings_v35'] || null;
        let savedSessions = batch['live2d_sessions_v35'] || null;
        let savedSlots = batch['live2d_saves_v35'] || null;
        let savedQS = batch['live2d_quicksave_v35'] || null;
        let savedAS = batch['live2d_autosave_v35'] || null;
        let savedMemos = batch['live2d_memos_v35'] || null;

        // ✨ 当前镜像无数据时，记录警告
        if (!savedSettings) {
          console.warn(`[数据] 当前镜像 [${getActiveMirrorId()}] 无设置数据，将使用默认值`);
        }

        // ✨ 数据完整性检测：仅在服务端可达但数据为空时才警告（排除服务端未启动的情况）
        try {
          const serverReachable = Object.keys(batch).length > 0 || savedSettings !== null;
          if (serverReachable) {
            const lastFingerprint = localStorage.getItem('gwc_data_fingerprint');
            if (lastFingerprint) {
              const fp = JSON.parse(lastFingerprint);
              const currentSessionCount = Array.isArray(savedSessions) ? savedSessions.length : 0;
              const currentSettingsKeys = savedSettings ? Object.keys(savedSettings).length : 0;
              if (fp.sessions > 0 && currentSessionCount === 0 && currentSettingsKeys === 0) {
                console.warn('[数据完整性] 检测到服务端数据异常丢失！');
                setTimeout(() => {
                  if (window.$GWC && window.$GWC.showToast) {
                    window.$GWC.showToast("⚠️ 检测到数据异常丢失！建议从备份恢复数据。", "error", 10000);
                  }
                }, 2000);
              }
            }
          }
        } catch {}

        // ✨ 阻断污染：仅当处于默认主系统时，才允许从旧版 LocalStorage 继承进度数据
        const isDefaultMirror = getActiveMirrorId() === 'user_Admin';

        let s = savedSettings, se = savedSessions, sl = savedSlots, q = savedQS, a = savedAS, m = savedMemos;

        if (!s) { const o = localStorage.getItem('live2d_settings_v34') || localStorage.getItem('live2d_settings_v33'); if(o) s = JSON.parse(o); }
        if (!se && isDefaultMirror) { const o = localStorage.getItem('live2d_sessions_v34'); if(o) se = JSON.parse(o); }
        if (!sl && isDefaultMirror) { const o = localStorage.getItem('live2d_saves_v34'); if(o) sl = JSON.parse(o); }
        if (!q && isDefaultMirror) { const o = localStorage.getItem('live2d_quicksave_v34'); if(o) q = JSON.parse(o); }
        if (!a && isDefaultMirror) { const o = localStorage.getItem('live2d_autosave_v34'); if(o) a = JSON.parse(o); }
        if (!m && isDefaultMirror) { const o = localStorage.getItem('live2d_memos_v34'); if(o) m = JSON.parse(o); }

        if (s) {
            if (s.currentModelId === undefined) s.currentModelId = null;
            if (s.dialogLineHeight === undefined) s.dialogLineHeight = 1.8;
            s.enableBridge = true; // 强制开启桥接，确保桌宠通讯正常
            setSettings({ ...DEFAULT_SETTINGS, ...s });
        }
        if (se && se.length > 0) {
          setSessions(se);
          const savedActiveId = localStorage.getItem('live2d_active_session_v34');
          setActiveSessionId(savedActiveId && se.some(s => s.id === savedActiveId) ? savedActiveId : se[0].id);
        }
        else { const newS = { id: Date.now().toString(), title: '新剧情', messages: [], memorySummary: '' }; setSessions([newS]); setActiveSessionId(newS.id); }
        if (sl) setSaveSlots(sl);
        if (q) setQuickSaveData(q);
        if (a) setAutoSaveData(a);
        if (m) setMemos(m);

        // ✨ 直接从批量响应中提取媒体列表（省去 4 个独立 API 请求）
        const mid = getActiveMirrorId();
        const API = '';
        if (batch['_bgm']) {
          setBgmList(batch['_bgm'].map(item => ({ ...item, url: `${API}/api/userdata/${mid}/bgm/${item.id}/file` })));
        }
        if (batch['_bg_images']) {
          setBgList(batch['_bg_images'].map(item => ({ ...item, url: `${API}/api/userdata/${mid}/bg_images/${item.id}/file` })));
        }
        if (batch['_models']) {
          setModelsList(batch['_models']);
        }
        if (batch['_mods']) {
          setModsList(batch['_mods']);
        }

        // ✨ 保存数据指纹，用于下次启动时检测数据完整性
        try {
          const fingerprint = {
            sessions: Array.isArray(se) ? se.length : 0,
            settingsKeys: s ? Object.keys(s).length : 0,
            timestamp: Date.now()
          };
          localStorage.setItem('gwc_data_fingerprint', JSON.stringify(fingerprint));
        } catch {}
      } catch(e) { console.error("唤醒失败", e); } finally { setIsCoreLoading(false); }
    };
    loadEverything();
  }, []);

  // ✨ 启动时立即预加载 Live2D 引擎脚本（与 IDB 读取并行，不阻塞渲染）
  useEffect(() => {
    const backupModule = window.module; const backupExports = window.exports; window.module = undefined; window.exports = undefined;
    const p1 = injectScriptWithFallback('/app/vendor/pixi.min.js?v=2').catch(() => {});
    const p2 = (async () => {
      const offlineCore = await loadCoreData('offline_cubism_core_js');
      if (offlineCore) { const s = document.createElement('script'); s.textContent = offlineCore; document.head.appendChild(s); }
      else { await injectScriptWithFallback('/app/vendor/Live2DCubismCore.js?v=2').catch(() => {}); }
    })();
    Promise.all([p1, p2]).then(async () => {
      await injectScriptWithFallback('/app/vendor/live2d.min.js?v=2').catch(() => {});
      await injectScriptWithFallback('/app/vendor/pixi-live2d-display.min.js?v=2').catch(() => {});
    }).finally(() => {
      if (backupModule !== undefined) window.module = backupModule;
      if (backupExports !== undefined) window.exports = backupExports;
    });
  }, []);

  // ✨ 数据变动实时写入黑盒（跳过首次加载时的无变化写回，省 6 个 PUT 请求）
  const initialLoadDoneRef = useRef(false);
  useEffect(() => { if (!isCoreLoading) initialLoadDoneRef.current = true; }, [isCoreLoading]);
  useEffect(() => { if (initialLoadDoneRef.current) saveCoreData('live2d_settings_v35', settings); }, [settings]);
  useEffect(() => { if (initialLoadDoneRef.current) saveCoreData('live2d_sessions_v35', sessions); }, [sessions]);
  useEffect(() => { if (initialLoadDoneRef.current) saveCoreData('live2d_saves_v35', saveSlots); }, [saveSlots]);
  useEffect(() => { if (initialLoadDoneRef.current) saveCoreData('live2d_quicksave_v35', quickSaveData); }, [quickSaveData]);
  useEffect(() => { if (initialLoadDoneRef.current) saveCoreData('live2d_autosave_v35', autoSaveData); }, [autoSaveData]);
  useEffect(() => { if (initialLoadDoneRef.current) saveCoreData('live2d_memos_v35', memos); }, [memos]);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [newMemoText, setNewMemoText] = useState('');
  const [newMemoDate, setNewMemoDate] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('visual'); 
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ocTaskId, setOcTaskId] = useState(null);
  const [ocVisible, setOcVisible] = useState(true);
  const isLoadingRef = useRef(false); // ✨ 新增：底层并发锁，防止重复触发请求导致闪烁
  const [isCompressingMemory, setIsCompressingMemory] = useState(false); 
  
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [availableModels, setAvailableModels] = useState(['gpt-3.5-turbo', 'gpt-4o', 'gemini-pro', 'claude-3-opus']);
  const [live2dStatus, setLive2dStatus] = useState('初始化中...');
  const [modelReloadTrigger, setModelReloadTrigger] = useState(0);
// ✨ 核心大迁徙修复：当底层数据库(IDB)把设置唤醒完毕后，强制“踢”一脚触发模型重载！
  useEffect(() => {
    if (!isCoreLoading) {
      setModelReloadTrigger(prev => prev + 1);
    }
  }, [isCoreLoading]);

  const [suggestedReplies, setSuggestedReplies] = useState([]);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [storySummary, setStorySummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false); 

 const [isFaceTrackingLoading, setIsFaceTrackingLoading] = useState(false);

  // ✨ 原生扩展 API 状态
  const [pluginTitleButtons, setPluginTitleButtons] = useState([]);
  const [activePluginUI, setActivePluginUI] = useState(null);
  const [pluginDialog, setPluginDialog] = useState({ visible: false, speaker: '', text: '', spriteUrl: '', bgUrl: '', typing: false });

  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [backupProgress, setBackupProgress] = useState({ visible: false, percent: 0, text: '' }); 
  const [vnPage, setVnPage] = useState(0);

  const [bgmList, setBgmList] = useState([]);
  const [currentBgmIndex, setCurrentBgmIndex] = useState(-1);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [bgmToast, setBgmToast] = useState({ visible: false, name: '' });

  const [bgList, setBgList] = useState([]);
  const [isBgMenuOpen, setIsBgMenuOpen] = useState(false);
  

  const [modelsList, setModelsList] = useState([]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  const [skillPacksList, setSkillPacksList] = useState([]);
  const [expandedSkillPack, setExpandedSkillPack] = useState(null);

  const [expressions, setExpressions] = useState([]);
  const [isExpressionMenuOpen, setIsExpressionMenuOpen] = useState(false);

  const [isSaveLoadUIOpen, setIsSaveLoadUIOpen] = useState(false);
  const [slMode, setSlMode] = useState('save'); 
  const [slPage, setSlPage] = useState(1); 
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editSaveName, setEditSaveName] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, text: '', onConfirm: null, onCancel: null, confirmText: '', cancelText: '', thirdButton: null });

  // Bot panel state
  const [isBotPanelOpen, setIsBotPanelOpen] = useState(false);
  const [botPasswordVerified, setBotPasswordVerified] = useState(false);
  const [botPasswordInput, setBotPasswordInput] = useState('');
  const [botPasswordError, setBotPasswordError] = useState('');
  const [botPasswordAttempts, setBotPasswordAttempts] = useState(0);
  const [botPasswordLockoutUntil, setBotPasswordLockoutUntil] = useState(0);

  const [visualAdjustMode, setVisualAdjustMode] = useState(null);
  const [workMode, setWorkMode] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isBgmMenuOpen, setIsBgmMenuOpen] = useState(false);

  // ✨ 插件列表状态
  const [modsList, setModsList] = useState([]);

  // ✨ 原生级融合：沉浸模式状态与虚拟键盘自适应
  const [isImmersive, setIsImmersive] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const modelRef = useRef(null);
  const activeAudioRef = useRef(null);
  const bgmAudioRef = useRef(new Audio());
  const vnTextContainerRef = useRef(null);
  const logEndRef = useRef(null);
  const enqueueTTSRef = useRef(null); // ✨ 用于桥接模式访问延迟定义的enqueueTTS
  const toastTimeoutRef = useRef(null);
  const bgmToastTimeoutRef = useRef(null); 
  const editInputRef = useRef(null); 
  const fileInputRef = useRef(null); 
  const wheelTimeoutRef = useRef(null);
  
  // 维护给全局插件的 API
  const gwcApiRef = useRef({});

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    // 隐藏非报错弹窗
    if (settings.hideInfoToasts && type !== 'error') return;
    setToast({ visible: true, message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => { setToast(prev => ({ ...prev, visible: false })); }, duration);
  }, [settings.hideInfoToasts]);

  // ✨ 路由同步：appMode ↔ hash（防循环：用 ref 追踪来源）
  const routeSyncSource = useRef(null);
  useEffect(() => {
    if (routeSyncSource.current === 'hash') { routeSyncSource.current = null; return; }
    if (appMode === 'title' && currentPage !== '/main' && currentPage !== '') {
      routeSyncSource.current = 'mode';
      navigate('/main');
    } else if (appMode === 'game' && currentPage !== '/chat') {
      routeSyncSource.current = 'mode';
      navigate('/chat');
    }
  }, [appMode]);

  useEffect(() => {
    if (routeSyncSource.current === 'mode') { routeSyncSource.current = null; return; }
    if (currentPage === '/main' && appMode !== 'title') {
      routeSyncSource.current = 'hash';
      setAppMode('title');
    } else if (currentPage === '/chat' && appMode !== 'game') {
      routeSyncSource.current = 'hash';
      setAppMode('game');
    }
  }, [currentPage]);

  // ✨ 路由触发剧情模式
  useEffect(() => {
    if ((currentPage === '/story' || currentPage === '/storyide') && window.$GWC && activePluginUI !== 'story_mode_dlc') {
      const timer = setTimeout(() => {
        window.$GWC.setPluginUI('story_mode_dlc');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentPage, activePluginUI]);

  // ✨ 核心修复：将依赖 showToast 的 Hook 移至声明下方，彻底解决初始化死区 (TDZ) 报错
  useEffect(() => {
      if (window.visualViewport) {
          const resizeHandler = () => document.body.style.height = window.visualViewport.height + 'px';
          window.visualViewport.addEventListener('resize', resizeHandler);
          return () => window.visualViewport.removeEventListener('resize', resizeHandler);
      }
  }, []);

  useEffect(() => {
      let lastTapTime = 0;
      const handleInteraction = (e) => {
          if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.z-\\[9999\\]') || e.target.closest('.pointer-events-auto')) return;
          const currentTime = new Date().getTime(); const tapLength = currentTime - lastTapTime;
          if (tapLength < 300 && tapLength > 0) { setIsImmersive(prev => !prev); e.preventDefault(); showToast("🌟 沉浸模式切换 (双击空白处恢复)", "info", 2000); }
          lastTapTime = currentTime;
      };
      document.addEventListener('touchend', handleInteraction, { passive: false });
      document.addEventListener('dblclick', handleInteraction);
      return () => { document.removeEventListener('touchend', handleInteraction); document.removeEventListener('dblclick', handleInteraction); };
  }, [showToast]);

  // ✨ GWC Plugin Core API 挂载
  useEffect(() => {
    gwcApiRef.current = {
        version: '4.1.0',
        getSettings: () => settings,
        updateSettings: (newSettings) => setSettings(s => ({...s, ...newSettings})),
        getSessions: () => sessions,
        updateSessions: setSessions,
        getActiveSessionId: () => activeSessionId,
        showToast,
        triggerSendMessage: (text, hidden) => {
            window.dispatchEvent(new CustomEvent('plugin-send-msg', { detail: { text, hidden } }));
        },
        registerTitleButton: (id, label, onClick) => {
            setPluginTitleButtons(prev => {
                if (prev.find(b => b.id === id)) return prev;
                return [...prev, {id, label, onClick}];
            });
        },
        setPluginUI: (uiName) => {
            setActivePluginUI(uiName);
            if (uiName) setAppMode('game');
        },
        getActivePluginUI: () => activePluginUI,
        updatePluginDialog: (data) => setPluginDialog(prev => ({...prev, ...data})),
        on: (eventName, callback) => window.addEventListener(eventName, callback),
        off: (eventName, callback) => window.removeEventListener(eventName, callback)
    };
    window.$GWC = gwcApiRef.current;
  }, [settings, sessions, activeSessionId, showToast, activePluginUI]);

  // ✨ 初始化 Mod 插件（内置 + 用户上传）
  useEffect(() => {
    const initMods = async () => {
        try {
            // 1. 加载已存储的插件状态（优先从批量响应获取，省 1 个请求）
            const list = modsList.length > 0 ? modsList : (await loadModsFromDB() || []);

            // 2. 将内置插件合并到列表（首次运行时自动注册为启用）
            const existingIds = new Set(list.map(m => m.id));
            BUNDLED_MODS.forEach(mod => {
                if (!existingIds.has(mod.id)) {
                    list.push({
                        id: mod.id,
                        name: `🏷️ ${mod.name}`,
                        code: '',
                        enabled: true,
                        installDate: '内置',
                        bundled: true
                    });
                }
            });

            setModsList(list);

            // 2.5. 确保 API 客户端已加载（启动时已并行预加载，此处仅做兜底检查）
            if (!window.__GWC_API && !document.getElementById('gwc-api-client')) {
                const apiScript = document.createElement('script');
                apiScript.id = 'gwc-api-client';
                apiScript.src = '/app/mods/_gwc_api_client.js?v=' + Date.now();
                document.head.appendChild(apiScript);
                await new Promise(resolve => { apiScript.onload = resolve; apiScript.onerror = resolve; });
            }

            // 3. 注入启用的内置插件（通过 script src 加载）
            list.forEach(mod => {
                if (mod.bundled && mod.enabled) {
                    const tagId = `bundled-mod-${mod.id}`;
                    if (!document.getElementById(tagId)) {
                        const script = document.createElement('script');
                        script.id = tagId;
                        const fileName = BUNDLED_MODS.find(b => b.id === mod.id)?.fileName;
                        if (fileName) {
                            script.src = `/app/mods/${encodeURIComponent(fileName)}?v=${Date.now()}`;
                            script.onerror = () => console.warn(`[Bundled Mod] 加载失败: ${mod.name}`);
                            document.head.appendChild(script);
                        }
                    }
                }
            });

            // 4. 执行用户上传的插件（内置插件已通过 script src 加载）
            list.forEach(mod => {
                if (mod.enabled && !mod.bundled) {
                    try {
                        const script = document.createElement('script');
                        script.textContent = `(function() { try { ${mod.code} } catch(e) { console.error('Mod Error [${mod.name}]:', e); } })();`;
                        document.head.appendChild(script);
                        console.log(`[Plugin] Mod Loaded: ${mod.name}`);
                    } catch (e) { console.error(`Mod Execution Error [${mod.name}]:`, e); }
                }
            });
        } catch (e) {
            console.error("加载插件失败:", e);
        }
    };
    initMods();
  }, []);

  // ✨ 加载 Skill 包列表
  const fetchSkillPacks = useCallback(async () => {
    try {
      const uid = getActiveMirrorId();
      const res = await fetch(`/api/skills/packs?user_id=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data = await res.json();
        setSkillPacksList(data.packs || []);
      }
    } catch (e) { /* 技能引擎离线时静默降级 */ }
  }, []);

  useEffect(() => {
    fetchSkillPacks();
  }, [fetchSkillPacks]);

  const handleNextBgm = useCallback(() => {
    if (bgmList.length === 0) return;
    let next = (currentBgmIndex + 1) % bgmList.length;
    if (settings.bgmMode === 'random') {
        if (bgmList.length > 1) {
            next = Math.floor(Math.random() * bgmList.length);
            if (next === currentBgmIndex) next = (next + 1) % bgmList.length;
        } else { next = 0; }
    }
    setCurrentBgmIndex(next);
    if (!isBgmPlaying) setIsBgmPlaying(true);
  }, [bgmList, currentBgmIndex, settings.bgmMode, isBgmPlaying]);

  const handlePrevBgm = useCallback(() => {
    if (bgmList.length === 0) return;
    let prev = (currentBgmIndex - 1 + bgmList.length) % bgmList.length;
    setCurrentBgmIndex(prev);
    if (!isBgmPlaying) setIsBgmPlaying(true);
  }, [bgmList, currentBgmIndex, isBgmPlaying]);

  const toggleBgmMode = useCallback(() => {
    const modes = ['sequential', 'random', 'loop'];
    const nextMode = modes[(modes.indexOf(settings.bgmMode) + 1) % modes.length];
    setSettings(s => ({ ...s, bgmMode: nextMode }));
  }, [settings.bgmMode]);

  const [bgmOffset, setBgmOffset] = useState({ x: 0, y: 0 });
  useEffect(() => { setBgmOffset({ x: settings.bgmOffsetX || 0, y: settings.bgmOffsetY || 0 }); }, [settings.bgmOffsetX, settings.bgmOffsetY]);
  const isDraggingBgm = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  const handleBgmPointerDown = (e) => {
    isDraggingBgm.current = true;
    dragStart.current = { x: e.clientX ?? e.touches[0].clientX, y: e.clientY ?? e.touches[0].clientY };
    offsetStart.current = { ...bgmOffset };
  };

  const handleBgmPointerMove = useCallback((e) => {
    if (!isDraggingBgm.current) return;
    const clientX = e.clientX ?? e.touches[0].clientX;
    const clientY = e.clientY ?? e.touches[0].clientY;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    setBgmOffset({ x: offsetStart.current.x + dx, y: offsetStart.current.y + dy });
  }, []);

  const handleBgmPointerUp = useCallback(() => {
    isDraggingBgm.current = false;
    setBgmOffset(prev => {
      setSettings(s => ({ ...s, bgmOffsetX: prev.x, bgmOffsetY: prev.y }));
      return prev;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleBgmPointerMove);
    window.addEventListener('mouseup', handleBgmPointerUp);
    window.addEventListener('touchmove', handleBgmPointerMove, { passive: false });
    window.addEventListener('touchend', handleBgmPointerUp);
    return () => {
        window.removeEventListener('mousemove', handleBgmPointerMove);
        window.removeEventListener('mouseup', handleBgmPointerUp);
        window.removeEventListener('touchmove', handleBgmPointerMove);
        window.removeEventListener('touchend', handleBgmPointerUp);
    };
  }, [handleBgmPointerMove, handleBgmPointerUp]);

  const ttsTaskQueueRef = useRef([]);
  const ttsTimeoutRef = useRef(null); 
  const isPlayingTTSRef = useRef(false);

  const ttsVolRef = useRef(settings.ttsVolume);
  const ttsRateRef = useRef(settings.ttsPlaybackRate);
  useEffect(() => { ttsVolRef.current = settings.ttsVolume; }, [settings.ttsVolume]);
  useEffect(() => { ttsRateRef.current = settings.ttsPlaybackRate; }, [settings.ttsPlaybackRate]);
  const ttsPauseRef = useRef(settings.ttsSentencePause);
  useEffect(() => { ttsPauseRef.current = settings.ttsSentencePause; }, [settings.ttsSentencePause]);

  const videoRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const faceRigRef = useRef(null);
  const faceTrackingTickerRef = useRef(null);
  
  const enableFaceTrackingRef = useRef(settings.enableFaceTracking);
  useEffect(() => { enableFaceTrackingRef.current = settings.enableFaceTracking; }, [settings.enableFaceTracking]);

  const faceTrackingModeRef = useRef(settings.faceTrackingMode);
  useEffect(() => { faceTrackingModeRef.current = settings.faceTrackingMode; }, [settings.faceTrackingMode]);

  useEffect(() => {
    if (settings.enableFaceTracking && modelRef.current) {
        modelRef.current.focus(0, 0);
        if (modelRef.current.faceRigPrev) modelRef.current.faceRigPrev = {};
    }
  }, [settings.enableFaceTracking]);

  const getFormatBaseUrl = () => { let baseUrl = settings.openaiBaseUrl.trim(); if (baseUrl && !/^https?:\/\//i.test(baseUrl)) baseUrl = 'https://' + baseUrl; baseUrl = baseUrl.replace(/\/$/, ''); if (baseUrl.endsWith('/v1')) baseUrl = baseUrl.slice(0, -3); return baseUrl; };
  const buildProxyUrl = (targetUrl) => { if (settings.corsProxyType === 'corsproxy') return `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`; if (settings.corsProxyType === 'codetabs') return `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`; if (settings.corsProxyType === 'fringezone') return `https://cors-proxy.fringe.zone/${targetUrl}`; if (settings.corsProxyType === 'custom' && settings.customCorsProxyUrl) return `${settings.customCorsProxyUrl}${encodeURIComponent(targetUrl)}`; return targetUrl; };

  // ================= Bridge 客户端：轮询后端队列，转发请求到真实 LLM =================
  const processBridgeTask = useCallback(async (task) => {
    const { task_id, messages } = task;
    try {
      // RAG 技能检索注入
      let enrichedMessages = [...messages];
      try {
        const lastUser = [...messages].reverse().find(m => m.role === 'user');
        if (lastUser && settings.enableSkills !== false) {
          const query = typeof lastUser.content === 'string' ? lastUser.content : JSON.stringify(lastUser.content);
          let skillData = null;
          if (settings.enableKnowledgeBase) {
            const kbRes = await fetch('/api/kb/retrieve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                q: query,
                top_k: settings.kbTopK || 5,
                packs: (settings.activeKbPacks || []).join(','),
                rerank: settings.kbRerankEnabled || false,
                embedding_base_url: settings.kbEmbeddingBaseUrl || settings.openaiBaseUrl,
                embedding_api_key: settings.kbEmbeddingApiKey || settings.openaiApiKey,
                embedding_model: settings.kbEmbeddingModel || 'text-embedding-3-small',
                embedding_dimensions: settings.kbEmbeddingDimensions || 1536,
                rerank_base_url: settings.kbRerankBaseUrl || '',
                rerank_api_key: settings.kbRerankApiKey || '',
                rerank_model: settings.kbRerankModel || ''
              })
            });
            if (kbRes.ok) skillData = await kbRes.json();
          } else {
            const packsParam = settings.activeSkillPacks?.length > 0 ? `&packs=${encodeURIComponent(settings.activeSkillPacks.join(","))}` : '';
            const skillRes = await fetch(`/api/skills/retrieve?q=${encodeURIComponent(query)}&top_k=3${packsParam}&user_id=${encodeURIComponent(getActiveMirrorId())}`);
            if (skillRes.ok) skillData = await skillRes.json();
          }
          if (skillData) {
            let extra = '';
            if (skillData.core_rules) extra += `\n\n【核心技能设定】\n${skillData.core_rules}`;
            if (skillData.results) extra += `\n\n【相关知识检索】\n${skillData.results}`;
            if (extra) {
              const sysIdx = enrichedMessages.findIndex(m => m.role === 'system');
              if (sysIdx >= 0) enrichedMessages[sysIdx] = { ...enrichedMessages[sysIdx], content: enrichedMessages[sysIdx].content + extra };
              else enrichedMessages.unshift({ role: 'system', content: extra.trim() });
            }
          }
        }
      } catch(e) { /* 技能引擎离线时静默降级 */ }

      let fetchUrl;
      let fetchHeaders = { 'Content-Type': 'application/json' };
      let fetchPayload;
      const rawBaseUrl = getFormatBaseUrl();

      if (settings.corsProxyType === 'none' && rawBaseUrl) {
        fetchUrl = 'http://127.0.0.1:5201/v1/chat/completions';
        fetchPayload = { model: settings.aiModel || 'gpt-3.5-turbo', messages: enrichedMessages, stream: true, temperature: settings.aiTemperature, api_base: rawBaseUrl, api_key: settings.openaiApiKey || '' };
      } else {
        fetchUrl = buildProxyUrl(`${rawBaseUrl}/v1/chat/completions`);
        if (settings.openaiApiKey) fetchHeaders['Authorization'] = `Bearer ${settings.openaiApiKey}`;
        fetchPayload = { model: settings.aiModel || 'gpt-3.5-turbo', messages: enrichedMessages, stream: true, temperature: settings.aiTemperature };
      }
      const res = await fetch(fetchUrl, { method: 'POST', headers: fetchHeaders, body: JSON.stringify(fetchPayload) });
      if (!res.ok) { await fetch('/api/bridge/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id, error: `LLM 请求失败: ${res.status}` }) }); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullResponse = '';
      // ✨ 桥接TTS切片状态
      let ttsBuffer = '';
      let processedVoiceLength = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                await fetch('/api/bridge/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id, chunk: content }) });

                // ✨ 实时TTS切片（与triggerSendMessage一致的逻辑）
                const cleanForTTS = fullResponse.replace(/<ADD_MEMO>[\s\S]*?(?:<\/ADD_MEMO>|$)/gi, '');
                if (settings.enableTranslation) {
                  const match = cleanForTTS.match(/<VOICE>([\s\S]*?)(?:<\/VOICE>|$)/i);
                  if (match) {
                    const newChunk = match[1].slice(processedVoiceLength);
                    ttsBuffer += newChunk;
                    processedVoiceLength = match[1].length;
                  }
                } else {
                  const newChunk = cleanForTTS.slice(processedVoiceLength);
                  ttsBuffer += newChunk;
                  processedVoiceLength = cleanForTTS.length;
                }
                const splitRegex = settings.ttsFastMode ? /^([\s\S]*?[。！？\.\!\?\n，,、~～]+)/ : /^([\s\S]*?[。！？\.\!\?\n]+)/;
                let matchPunc;
                while ((matchPunc = ttsBuffer.match(splitRegex))) {
                  const chunk = matchPunc[1];
                  if (chunk.trim()) enqueueTTSRef.current?.(chunk.trim());
                  ttsBuffer = ttsBuffer.slice(chunk.length);
                }
              }
            } catch(e) {}
          }
        }
      }
      // ✨ 流式结束：推送剩余TTS + 同步到前端Log
      if (ttsBuffer.trim()) enqueueTTSRef.current?.(ttsBuffer.trim());
      await fetch('/api/bridge/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id, done: true }) });

      // ✨ 将桌宠消息同步到前端Log面板
      if (activeSessionId && fullResponse) {
        const bridgeUserMsg = messages.filter(m => m.role === 'user').pop();
        const userText = bridgeUserMsg ? (typeof bridgeUserMsg.content === 'string' ? bridgeUserMsg.content : JSON.stringify(bridgeUserMsg.content)) : '';
        // 清理AI回复：剥离ADD_MEMO，同声传译模式提取TEXT标签
        let cleanResponse = fullResponse.replace(/<ADD_MEMO>[\s\S]*?(?:<\/ADD_MEMO>|$)/gi, '').trim();
        if (settings.enableTranslation) {
          cleanResponse = (cleanResponse.match(/<TEXT>([\s\S]*?)(?:<\/TEXT>|$)/i)?.[1] || cleanResponse).trim();
        }
        if (userText || cleanResponse) {
          // 使用函数式更新避免依赖 sessions 状态
          setSessions(prev => {
            const session = prev.find(s => s.id === activeSessionId);
            if (!session) return prev;
            const newMessages = [...(session.messages || [])];
            if (userText) newMessages.push({ role: 'user', content: userText });
            if (cleanResponse) newMessages.push({ role: 'assistant', content: cleanResponse });
            return prev.map(s => s.id === activeSessionId ? { ...s, messages: newMessages } : s);
          });
        }
      }
    } catch(e) {
      await fetch('/api/bridge/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id, error: e.message }) }).catch(() => {});
    }
  }, [settings.openaiBaseUrl, settings.openaiApiKey, settings.aiModel, settings.aiTemperature, settings.ttsFastMode, settings.enableTranslation, settings.ttsEnabled, activeSessionId]);

  useEffect(() => {
    if (!settings.enableBridge) return;
    let active = true;
    const poll = async () => {
      while (active) {
        try {
          const res = await fetch('/api/bridge/pull');
          if (!active) break;
          const task = await res.json();
          if (task.task_id) processBridgeTask(task);
        } catch(e) { if (active) await new Promise(r => setTimeout(r, 2000)); }
      }
    };
    poll();
    return () => { active = false; };
  }, [settings.enableBridge, processBridgeTask]);

  // ✨ 桌宠聊天框 TTS 转发轮询：从后端取回桌宠回复文本，触发前端 TTS 合成
  useEffect(() => {
    let active = true;
    const poll = async () => {
      while (active) {
        try {
          const res = await fetch('/api/tts_from_pet/poll');
          if (!active) break;
          const data = await res.json();
          if (data.text && data.text.trim()) {
            enqueueTTSRef.current?.(data.text.trim());
          }
        } catch(e) { if (active) await new Promise(r => setTimeout(r, 2000)); }
      }
    };
    poll();
    return () => { active = false; };
  }, []);

  const nextProactiveTimeRef = useRef(Date.now() + 999999999);
  
  const resetProactiveTimer = useCallback(() => {
    if (!settings.enableProactiveChat) return;
    const min = Math.min(settings.proactiveMinInterval, settings.proactiveMaxInterval);
    const max = Math.max(settings.proactiveMinInterval, settings.proactiveMaxInterval);
    const randomDelay = Math.floor(Math.random() * ((max - min) * 60000 + 1)) + (min * 60000);
    nextProactiveTimeRef.current = Date.now() + randomDelay;
  }, [settings.enableProactiveChat, settings.proactiveMinInterval, settings.proactiveMaxInterval]);

  const currentModelConfig = settings.currentModelId && settings.modelConfigs?.[settings.currentModelId] 
      ? settings.modelConfigs[settings.currentModelId] 
      : { 
          scale: settings.live2dScale ?? 0.2, x: settings.live2dX ?? 0, y: settings.live2dY ?? 0, 
          titleScale: settings.titleLive2dScale ?? 0.2, titleX: settings.titleLive2dX ?? 0, titleY: settings.titleLive2dY ?? 0 
        };

  const updateModelConfig = (key, value) => {
      if (settings.currentModelId) {
          setSettings(s => ({
              ...s,
              modelConfigs: { ...s.modelConfigs, [s.currentModelId]: { ...(s.modelConfigs[s.currentModelId] || { scale: s.live2dScale ?? 0.2, x: s.live2dX ?? 0, y: s.live2dY ?? 0, titleScale: s.titleLive2dScale ?? 0.2, titleX: s.titleLive2dX ?? 0, titleY: s.titleLive2dY ?? 0 }), [key]: value } }
          }));
      } else {
          const fallbackKeyMap = { scale: 'live2dScale', x: 'live2dX', y: 'live2dY', titleScale: 'titleLive2dScale', titleX: 'titleLive2dX', titleY: 'titleLive2dY' };
          setSettings(s => ({ ...s, [fallbackKeyMap[key]]: value }));
      }
  };

  const handleCopyMessage = (text) => {
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); showToast('已复制对话文本', 'success', 2000); } 
    catch (err) { showToast('复制失败，请手动选择复制', 'error'); }
    document.body.removeChild(textArea);
  };

  const startFaceTracking = useCallback(async () => {
    if (!videoRef.current) return;
    setIsFaceTrackingLoading(true);
    try {
        setLive2dStatus('加载面部捕捉库...');
        await injectScript('/app/vendor/mediapipe/camera_utils.js?v=2');
        await injectScript('/app/vendor/mediapipe/face_mesh.js?v=2');
        await injectScript('/app/vendor/kalidokit.umd.js?v=2');

        if (!window.FaceMesh || !window.Camera || !window.Kalidokit) {
            throw new Error("面部捕捉依赖核心库拉取失败，请检查网络连接");
        }

        const faceMesh = new window.FaceMesh({
            locateFile: (file) => `/app/vendor/mediapipe/${file}`
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults((results) => {
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                const faceLandmarks = results.multiFaceLandmarks[0];
                const riggedFace = window.Kalidokit.Face.solve(faceLandmarks, {
                    runtime: "mediapipe",
                    video: videoRef.current
                });
                faceRigRef.current = riggedFace;
            } else {
                faceRigRef.current = null;
            }
        });

        faceMeshRef.current = faceMesh;

        // 使用原生 getUserMedia 替代 Camera 以增加兼容性
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
                videoRef.current.play();
                const sendFrames = async () => {
                    if (faceMeshRef.current && videoRef.current && settings.enableFaceTracking) {
                        try {
                            await faceMeshRef.current.send({ image: videoRef.current });
                        } catch (e) { }
                        requestAnimationFrame(sendFrames);
                    }
                };
                sendFrames();
            };
        } else {
             throw new Error("浏览器不支持摄像头 API");
        }
        
        setLive2dStatus('');
        setIsFaceTrackingLoading(false);
        showToast("📸 摄像头实时面捕已就绪", "success");

    } catch (err) {
        setIsFaceTrackingLoading(false);
        setSettings(s => ({...s, enableFaceTracking: false}));
        showToast("摄像头捕捉启动遭遇异常：" + err.message, "error");
        setLive2dStatus('');
    }
  }, [showToast, settings.enableFaceTracking]);

  const stopFaceTracking = useCallback(() => {
    if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }
    faceRigRef.current = null;
  }, []);

  useEffect(() => {
    if (settings.enableFaceTracking) {
        startFaceTracking();
    } else {
        stopFaceTracking();
    }
  }, [settings.enableFaceTracking, startFaceTracking, stopFaceTracking]);

  useEffect(() => {
    return () => { stopFaceTracking(); };
  }, [stopFaceTracking]);


  // ✨ 核心大迁徙修复：等待黑盒数据唤醒后，再加载媒体并精准恢复上次播放的 BGM
  useEffect(() => {
    if (isCoreLoading) return; // 拦截开机的空状态，等待真实 settings 就绪

    // 标题背景（始终加载，不在批量响应中）
    loadImageFromDB('titleBgImage').then(img => { if (img) setLocalTitleBgImage(img); }).catch(console.error);

    // 媒体列表：仅在批量响应未包含时才单独请求（批量已包含则跳过，省 3 个请求）
    if (modelsList.length === 0) loadModelsListFromDB().then(list => { if (list) setModelsList(list); }).catch(console.error);
    if (bgList.length === 0) loadBgListFromDB().then(list => { if (list) setBgList(list); }).catch(console.error);

    if (bgmList.length === 0) {
      loadBGMFromDB().then(list => {
        if (list && list.length > 0) {
          setBgmList(list);
          if (settings.currentBgmId) {
            const idx = list.findIndex(b => b.id === settings.currentBgmId);
            setCurrentBgmIndex(idx !== -1 ? idx : 0);
          } else {
            setCurrentBgmIndex(0);
          }
        }
      }).catch(console.error);
    } else {
      // BGM 已从批量响应加载，只需恢复播放索引
      if (settings.currentBgmId) {
        const idx = bgmList.findIndex(b => b.id === settings.currentBgmId);
        if (idx !== -1) setCurrentBgmIndex(idx);
      }
    }
  }, [isCoreLoading]); // 依赖黑盒加载状态
  
  useEffect(() => { if (activeSessionId) { localStorage.setItem('live2d_active_session_v34', activeSessionId); setStorySummary(''); } }, [activeSessionId]);
  useEffect(() => { if (isLogOpen && logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [sessions, activeSessionId, isLogOpen]);

  useEffect(() => { bgmAudioRef.current.volume = settings.bgmVolume; }, [settings.bgmVolume]);

  useEffect(() => {
    if (currentBgmIndex >= 0 && bgmList[currentBgmIndex]) {
      const bgmItem = bgmList[currentBgmIndex]; const url = bgmItem.url || '';
      bgmAudioRef.current.src = url; bgmAudioRef.current.loop = settings.bgmMode === 'loop'; setSettings(s => ({ ...s, currentBgmId: bgmItem.id }));
      
      if (isBgmPlaying) {
         bgmAudioRef.current.play().catch(e => console.warn("BGM Background play deferred:", e.message));
      }
      
      if (settings.enableBgmToast) {
        setBgmToast({ visible: true, name: bgmItem.name });
        if (bgmToastTimeoutRef.current) clearTimeout(bgmToastTimeoutRef.current);
        bgmToastTimeoutRef.current = setTimeout(() => { setBgmToast(prev => ({ ...prev, visible: false })); }, 3000);
      }

      if ('mediaSession' in navigator) {
         navigator.mediaSession.metadata = new window.MediaMetadata({ title: bgmItem.name, artist: 'GalGame Web Chat' });
         navigator.mediaSession.setActionHandler('previoustrack', handlePrevBgm);
         navigator.mediaSession.setActionHandler('nexttrack', handleNextBgm);
         navigator.mediaSession.setActionHandler('play', () => { bgmAudioRef.current.play(); setIsBgmPlaying(true); });
         navigator.mediaSession.setActionHandler('pause', () => { bgmAudioRef.current.pause(); setIsBgmPlaying(false); });
      }
    }
  }, [currentBgmIndex, settings.bgmMode, bgmList, handlePrevBgm, handleNextBgm]);

  useEffect(() => {
    const audio = bgmAudioRef.current;
    const handleEnded = () => {
      if (settings.bgmMode === 'loop') return; 
      if (settings.bgmMode === 'random') {
        let next = Math.floor(Math.random() * bgmList.length); if (bgmList.length > 1 && next === currentBgmIndex) next = (next + 1) % bgmList.length; setCurrentBgmIndex(next);
      } else if (settings.bgmMode === 'sequential') { setCurrentBgmIndex((currentBgmIndex + 1) % bgmList.length); }
    };
    audio.addEventListener('ended', handleEnded); return () => audio.removeEventListener('ended', handleEnded);
  }, [bgmList, currentBgmIndex, settings.bgmMode]);

  const toggleBgm = () => {
    if (bgmList.length === 0) return showToast("暂无音乐，请先在设置中上传 BGM", "info");
    if (isBgmPlaying) { bgmAudioRef.current.pause(); setIsBgmPlaying(false); } 
    else { bgmAudioRef.current.play().catch(e => console.warn("播放被拦截:", e)); setIsBgmPlaying(true); }
  };

  const handleBgmUpload = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return; showToast(`正在导入 ${files.length} 首音乐...`); let added = 0;
    const mid = getActiveMirrorId();
    for (let file of files) {
      const id = `${mid}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const bgmItem = { id, name: file.name, blob: file };
      try {
        await saveBGMToDB(bgmItem);
        const url = `/api/userdata/${mid}/bgm/${id}/file`;
        setBgmList(prev => [...prev, { id, name: file.name, url }]);
        added++;
      } catch (err) { console.error('BGM上传失败:', err); }
    }
    if (currentBgmIndex === -1 && added > 0) setCurrentBgmIndex(0);
    if (added > 0) showToast(`成功导入 ${added} 首音乐`, "success");
    else showToast("BGM上传失败，请检查后端是否运行", "error");
    e.target.value = '';
  };

  const removeBgm = async (id) => {
    await deleteBGMFromDB(id); const updated = bgmList.filter(b => b.id !== id); setBgmList(updated);
    if (updated.length === 0) { bgmAudioRef.current.pause(); setIsBgmPlaying(false); setCurrentBgmIndex(-1); setSettings(s => ({...s, currentBgmId: null})); } 
    else if (bgmList[currentBgmIndex]?.id === id) setCurrentBgmIndex(0);
  };

  const handleBgUpload = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return; showToast(`正在处理 ${files.length} 张背景...`); let added = 0;
    for (let file of files) {
      try {
        const id = `${getActiveMirrorId()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const bgItem = { id, name: file.name, file };
        await saveBgItemToDB(bgItem);
        const url = `/api/userdata/${getActiveMirrorId()}/bg_images/${id}/file`;
        setBgList(prev => [...prev, { id, name: file.name, url }]);
        added++;
      } catch (err) { console.error('背景上传失败:', err); }
    }
    if (!settings.currentBgId && added > 0) setSettings(prev => ({ ...prev, currentBgId: bgList.length > 0 ? bgList[0].id : null }));
    if (added > 0) showToast(`成功导入 ${added} 张背景图`, "success");
    else showToast("背景上传失败，请检查后端是否运行", "error");
    e.target.value = '';
  };

  const removeBg = async (id) => {
    await deleteBgItemFromDB(id); const updated = bgList.filter(b => b.id !== id); setBgList(updated);
    if (settings.currentBgId === id) setSettings(prev => ({ ...prev, currentBgId: updated.length > 0 ? updated[0].id : null }));
  };

  const handleTitleBgUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      await saveImageToDB('titleBgImage', file);
      const mid = getActiveMirrorId();
      setLocalTitleBgImage(`/api/userdata/${mid}/app_image/titleBgImage`);
      showToast("主标题背景保存成功", "success");
    } catch (err) { showToast("保存失败：" + err.message, "error"); }
    e.target.value = '';
  };

 const clearTitleBgImage = async () => { await saveImageToDB('titleBgImage', null); setLocalTitleBgImage(''); showToast("已清除主标题背景", "info"); };

  // ✨ Mod 插件上传处理器 (原生融合支持多文件并发装载)
  const handleModUpload = async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      
      showToast(`📦 正在安全挂载 ${files.length} 个插件，请稍候...`, "info", 5000);
      let successCount = 0;
      let newMods = [];

      for (let file of files) {
          if (!file.name.toLowerCase().endsWith('.js') && !file.name.toLowerCase().endsWith('.txt')) continue;
          try {
              const text = await file.text();
              const modItem = {
                  id: Date.now().toString() + Math.random().toString().slice(2,6),
                  name: file.name.replace(/\.txt$/i, '.js'),
                  code: text,
                  enabled: true,
                  installDate: new Date().toLocaleString()
              };
              await saveModToDB(modItem);
              newMods.push(modItem);
              successCount++;
          } catch (err) { console.error("插件导入失败:", file.name, err); }
      }
      
      if (successCount > 0) {
          setModsList(prev => [...prev, ...newMods]);
          showToast(`✅ 成功将 ${successCount} 个插件烧录至系统！即将执行热重载...`, "success", 4000);
          setTimeout(() => window.location.reload(), 2000);
      } else {
          showToast("未导入任何合法格式的插件 (.js 或 .txt)", "error");
      }
      e.target.value = '';
  };

  const toggleModEnabled = async (id, currentStatus) => {
      const updatedList = modsList.map(m => m.id === id ? { ...m, enabled: !currentStatus } : m);
      setModsList(updatedList);
      const modToUpdate = updatedList.find(m => m.id === id);
      if (modToUpdate) await saveModToDB(modToUpdate);
      showToast("模组状态已更新，刷新页面后生效", "info");
  };

  const removeMod = async (id) => {
      const mod = modsList.find(m => m.id === id);
      if (mod && mod.bundled) {
          showToast("内置插件无法卸载，仅可停用", "error");
          return;
      }
      await deleteModFromDB(id);
      setModsList(prev => prev.filter(m => m.id !== id));
      showToast("模组已彻底卸载", "success");
  };

  const handleAddMemo = () => {
    if (!newMemoText.trim()) return; const newMemo = { id: Date.now().toString(), text: newMemoText.trim(), date: newMemoDate, isDone: false, hasReminded: false };
    setMemos([newMemo, ...memos]); setNewMemoText(''); setNewMemoDate(''); showToast("已添加日程！AI将在系统时钟到达时主动提示。", "success");
  };
  const toggleMemoDone = (id) => setMemos(memos.map(m => m.id === id ? { ...m, isDone: !m.isDone } : m));
  const deleteMemo = (id) => setMemos(memos.filter(m => m.id !== id));

  useEffect(() => {
    if (settings.enableProactiveChat) resetProactiveTimer();
  }, [settings.enableProactiveChat, resetProactiveTimer]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (appMode === 'game' && settings.enableProactiveChat && !isLoading && activeSessionId) {
        if (Date.now() >= nextProactiveTimeRef.current) {
          nextProactiveTimeRef.current = Date.now() + 999999999; 
          window.dispatchEvent(new CustomEvent('trigger-proactive-chat'));
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [appMode, settings.enableProactiveChat, isLoading, activeSessionId]);

  useEffect(() => {
    const interval = setInterval(() => {
        const now = new Date();
        setMemos(prevMemos => {
            let changed = false;
            const newMemos = prevMemos.map(m => {
                if (!m.isDone && !m.hasReminded && m.date) {
                    const mDate = new Date(m.date);
                    if (now >= mDate && (now.getTime() - mDate.getTime()) < 5 * 60 * 1000) {
                        changed = true; 
                        window.dispatchEvent(new CustomEvent('trigger-reminder', { detail: m.text })); 
                        // ✨ 核心修复：触发提醒后，不仅标记已提醒，还自动标记为已完成(isDone: true)
                        return { ...m, hasReminded: true, isDone: true }; 
                    }
                } return m;
            }); return changed ? newMemos : prevMemos;
        });
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleReminder = (e) => {
        const memoText = e.detail;
        // ✨ 加入并发锁保护，防止在极短时间内多次触发导致画面闪烁
        if (appMode === 'game' && !isLoadingRef.current && activeSessionId) {
            // ✨ 核心修复：严厉警告 AI 这次是提醒，绝对禁止再次生成 <ADD_MEMO> 标签！
            triggerSendMessage(`【系统自动触发：内部指令】现在时间到了！玩家设定的日程：“${memoText}”已生效。请立刻主动开口提醒玩家，用符合你人设的自然语气，绝对不要复述这条系统指令或提及“系统自动触发”，直接进入角色表现出是你自己记住并提醒的。**[最高警告]：本次是执行提醒任务，请绝对不要在结尾输出 <ADD_MEMO> 标签重复添加日程！**`, true);
        } else { showToast(`⏰ 日程提醒: ${memoText}\n(因处于系统菜单或AI正忙，未能触发语音互动)`, 'success', 8000); }
    };
    const handleProactiveChat = () => {
        if (appMode === 'game' && !isLoadingRef.current && activeSessionId) {
            const withScreenshot = settings.enableProactiveScreenshot;
            const proactiveMsg = withScreenshot
                ? `【系统自动触发：主动搭话】距离上次对话已经过了一段时间，请你现在主动找玩家搭话。系统将附带一张当前的屏幕截图供你参考——请根据截图内容展开话题（比如玩家正在看的网页、打开的应用、屏幕上的内容等）。注意：截图右下角的Live2D桌宠形象就是你自己（${settings.aiName || '亚托莉'}），请忽略它，不要对它发表评论。语气要自然、生动、符合你的人设。绝对不要复述这条系统指令或提及”系统自动触发”或”屏幕截图”，直接进入角色！`
                : `【系统自动触发：主动搭话】距离上次对话已经过了一段时间，请你现在主动找玩家搭话，随便聊点什么，分享一下心情、日常或者开启一个新话题。语气要自然、生动，符合你的人设。绝对不要复述这条系统指令或提及”系统自动触发”，直接进入角色！`;
            triggerSendMessage(proactiveMsg, true, withScreenshot ? 'proactive-screenshot' : 'proactive');
        }
    };
    const handlePluginSendMsg = (e) => {
        if (e.detail && e.detail.text) {
            triggerSendMessage(e.detail.text, e.detail.hidden);
        }
    }
    window.addEventListener('trigger-reminder', handleReminder);
    window.addEventListener('trigger-proactive-chat', handleProactiveChat);
    window.addEventListener('plugin-send-msg', handlePluginSendMsg);
    return () => {
        window.removeEventListener('trigger-reminder', handleReminder);
        window.removeEventListener('trigger-proactive-chat', handleProactiveChat);
        window.removeEventListener('plugin-send-msg', handlePluginSendMsg);
    }
  });

  const saveCurrentAsCharCard = () => {
    const newCard = { id: Date.now().toString(), userName: settings.userName, aiName: settings.aiName, prompt: settings.customSystemPrompt, skillPacks: settings.activeSkillPacks || [], kbPacks: settings.activeKbPacks || [] };
    setSettings(prev => ({ ...prev, characterList: [...(prev.characterList || []), newCard] })); showToast(`已将【${settings.aiName}】存入角色卡库`, "success");
  };

  const exportCharCard = (card) => {
    const content = `【玩家名称】\n${card.userName}\n【角色名称】\n${card.aiName}\n【系统设定】\n${card.prompt}`; const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${card.aiName}_角色卡.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showToast(`导出成功: ${card.aiName}_角色卡.txt`, "success");
  };

  const importCharCard = (e) => {
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result; const playerMatch = text.match(/【玩家名称】\n([\s\S]*?)(?=\n【|$)/); const charMatch = text.match(/【角色名称】\n([\s\S]*?)(?=\n【|$)/); const promptMatch = text.match(/【系统设定】\n([\s\S]*?)(?=\n【|$)/);
      if (!charMatch && !promptMatch) { showToast("解析失败，请确保txt文件包含【角色名称】和【系统设定】等标准标签", "error"); return; }
      const newCard = { id: Date.now().toString(), userName: playerMatch ? playerMatch[1].trim() : '我', aiName: charMatch ? charMatch[1].trim() : '对象', prompt: promptMatch ? promptMatch[1].trim() : '', skillPacks: [], kbPacks: [] };
      setSettings(prev => ({ ...prev, characterList: [...(prev.characterList || []), newCard] })); showToast(`成功导入角色卡：${newCard.aiName}`, "success");
    }; reader.readAsText(file); e.target.value = '';
  };

  const deleteCharCard = (id) => { setSettings(prev => ({ ...prev, characterList: prev.characterList.filter(c => c.id !== id) })); };

  const updateCharCardSkillPacks = (cardId, newSkillPacks) => {
    setSettings(prev => ({
      ...prev,
      characterList: prev.characterList.map(c => c.id === cardId ? { ...c, skillPacks: newSkillPacks } : c),
      activeSkillPacks: prev.characterList.find(c => c.id === cardId && c.aiName === prev.aiName) ? newSkillPacks : prev.activeSkillPacks
    }));
  };

  const updateCharCardKbPacks = (cardId, newKbPacks) => {
    setSettings(prev => ({
      ...prev,
      characterList: prev.characterList.map(c => c.id === cardId ? { ...c, kbPacks: newKbPacks } : c),
      activeKbPacks: prev.characterList.find(c => c.id === cardId && c.aiName === prev.aiName) ? newKbPacks : prev.activeKbPacks
    }));
  };

  const toggleSkillFile = async (filePath, currentState, scope) => {
    try {
      await fetch('/admin/api/skills/toggle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: [{ path: filePath, enabled: !currentState, scope: scope || 'public' }], user_id: getActiveMirrorId() })
      });
      fetchSkillPacks();
    } catch (e) { showToast('技能引擎离线', 'error'); }
  };

  const toggleSkillPack = async (packName, currentState) => {
    try {
      await fetch('/admin/api/skills/toggle_pack', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: packName, enabled: !currentState, user_id: getActiveMirrorId() })
      });
      fetchSkillPacks();
    } catch (e) { showToast('技能引擎离线', 'error'); }
  };

  // ✨ 核心重构：世界观预设的完整增删改查
  const saveWorldviewProfile = () => { const name = prompt("请输入世界观配置名称：", "新世界观"); if(name) { setSettings(prev => ({ ...prev, worldviewProfiles: [...(prev.worldviewProfiles || []), { id: Date.now().toString(), name: name.trim(), text: settings.worldviewText }] })); showToast("世界观保存成功", "success"); } };
  const applyWorldviewProfile = (profile) => { setSettings(prev => ({ ...prev, worldviewText: profile.text })); showToast(`已加载世界观: ${profile.name}`, "success"); };
 const renameWorldviewProfile = (id, oldName) => { const newName = prompt("请输入新的世界观名称：", oldName); if(newName && newName.trim()) { setSettings(prev => ({ ...prev, worldviewProfiles: prev.worldviewProfiles.map(p => p.id === id ? { ...p, name: newName.trim() } : p) })); } };
  const deleteWorldviewProfile = (id) => { setSettings(prev => ({ ...prev, worldviewProfiles: prev.worldviewProfiles.filter(p => p.id !== id) })); };
  
  // ✨ 新增：世界观导出功能
  const exportWorldviewProfile = (profile) => { const content = `【世界观名称】\n${profile.name}\n【世界观设定】\n${profile.text}`; const blob = new Blob([content], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${profile.name}_世界观.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showToast(`导出成功: ${profile.name}_世界观.txt`, "success"); };
  
  // ✨ 核心重构：API 配置的完整增删改查
  const saveApiProfile = () => { const name = prompt("请输入模型配置名称：", "新配置"); if(name) { setSettings(prev => ({ ...prev, apiProfiles: [...(prev.apiProfiles || []), { id: Date.now().toString(), name: name.trim(), baseUrl: settings.openaiBaseUrl, apiKey: settings.openaiApiKey, model: settings.aiModel, temp: settings.aiTemperature }] })); showToast("API配置保存成功", "success"); } };
  const applyApiProfile = (profile) => { setSettings(prev => ({ ...prev, openaiBaseUrl: profile.baseUrl, openaiApiKey: profile.apiKey, aiModel: profile.model, aiTemperature: profile.temp })); showToast(`已加载API配置: ${profile.name}`, "success"); };
  const renameApiProfile = (id, oldName) => { const newName = prompt("请输入新的配置名称：", oldName); if(newName && newName.trim()) { setSettings(prev => ({ ...prev, apiProfiles: prev.apiProfiles.map(p => p.id === id ? { ...p, name: newName.trim() } : p) })); } };
  const deleteApiProfile = (id) => { setSettings(prev => ({ ...prev, apiProfiles: prev.apiProfiles.filter(p => p.id !== id) })); };

  const switchCharacter = (card) => {
    if (activeSession?.messages?.length > 0) {
      let targetId = 1; while (saveSlots[targetId] && targetId <= 100) targetId++;
      if (targetId <= 100) {
        const newSave = { id: targetId, title: `[${settings.aiName}] 自动存档`, date: new Date().toLocaleString(), messages: activeSession.messages || [] };
        setSaveSlots(prev => ({ ...prev, [targetId]: newSave })); showToast(`前段对话已自动存至 No.${String(targetId).padStart(3, '0')}`, 'info');
      }
    }
    setSettings(prev => ({ ...prev, userName: card.userName, aiName: card.aiName, customSystemPrompt: card.prompt, activeSkillPacks: card.skillPacks || [], activeKbPacks: card.kbPacks || [] }));
    createNewSession(); setIsSettingsOpen(false); showToast(`✅ 已切换至角色: ${card.aiName}，全新剧情已就绪`, 'success');
  };

  // ✨ --- 修复重构的 handleExportBackup 功能 ---
  // 修复 Invalid string length 崩溃报错 (打包 JSON 时自动拦截并丢弃造成内存溢出的巨型图片和音乐Base64代码)
  
  // ✨ 核心修复 1：在点击的第一毫秒，瞬间抢夺用户手势令牌，弹出原生另存为窗口
  const getFileHandle = async (defaultFilename) => {
      if (!window.showSaveFilePicker) return null; 
      try {
          return await window.showSaveFilePicker({
              suggestedName: defaultFilename,
              types: [{ description: 'GWC 数据备份包', accept: {'application/zip': ['.zip']} }]
          });
      } catch (err) {
          if (err.name === 'AbortError') throw new Error('ABORT_BY_USER'); 
          console.warn("原生另存为API调用失败，将降级为传统下载:", err);
          return null;
      }
  };

  // ✨ 核心修复 2：拿到令牌后，再执行耗时操作，并通过回调更新进度条
  const finalizeZipSave = async (zip, fileHandle, defaultFilename, successMsg) => {
      setBackupProgress({ visible: true, percent: 0, text: '正在初始化压缩引擎...' });
      try {
          // 利用 onUpdate 回调实时获取底层 JSZip 的封装进度
          const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" }, (metadata) => {
              setBackupProgress({ visible: true, percent: metadata.percent.toFixed(1), text: `正在封装 ZIP 数据卷...` });
          });
          
          setBackupProgress({ visible: true, percent: 100, text: '正在写入磁盘...' });

          if (fileHandle) {
              const writable = await fileHandle.createWritable();
              await writable.write(zipBlob);
              await writable.close();
              showToast(`✅ ${successMsg}`, "success", 5000);
          } else {
              const url = URL.createObjectURL(zipBlob); 
              const a = document.createElement('a'); 
              a.href = url; a.download = defaultFilename;
              document.body.appendChild(a); a.click(); document.body.removeChild(a); 
              setTimeout(() => URL.revokeObjectURL(url), 20000); 
              showToast(`✅ ${successMsg} (已降级调用传统下载)`, "success", 5000);
          }
      } catch (err) { showToast(`打包崩溃: ${err.message}`, "error", 8000); }
      finally { setTimeout(() => setBackupProgress({ visible: false, percent: 0, text: '' }), 1500); }
  };

  // 1. 导出全量系统备份
  const handleExportFullBackup = async () => {
    const defaultFilename = `GWC_全量系统备份_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.zip`;
    let fileHandle = null;
    
    // 瞬间截获点击动作，弹出另存为窗口
    try { fileHandle = await getFileHandle(defaultFilename); } 
    catch (e) { if (e.message === 'ABORT_BY_USER') { showToast("已取消保存", "info"); return; } }

    setBackupProgress({ visible: true, percent: 10, text: '正在从服务端提取数据...' });
    try {
      await injectScript('/app/vendor/jszip.min.js?v=2');
      const zip = new window.JSZip();
      const mid = getActiveMirrorId();
      const API = '';
      const exportData = { backupType: 'full', stores: {} };

      // 获取所有用户列表
      const usersResp = await fetch(`${API}/api/auth/users/list`);
      const usersData = usersResp.ok ? await usersResp.json() : { users: [] };
      const allUsers = (usersData.users || []).map(u => `user_${u.id}`);
      // 确保当前用户在列表中
      if (!allUsers.includes(mid)) allUsers.push(mid);

      setBackupProgress({ visible: true, percent: 5, text: `正在备份 ${allUsers.length} 个用户的数据...` });

      // 辅助函数：导出单个用户的数据
      const exportUser = async (userId, progressBase, progressRange) => {
        const CORE_KEYS = ['live2d_settings_v35', 'live2d_sessions_v35', 'live2d_saves_v35', 'live2d_quicksave_v35', 'live2d_autosave_v35', 'live2d_memos_v35'];
        const userResult = { core_data: [], bgm_files: [], bg_images: [], live2d_models: [], app_mods: [] };

        // 核心数据
        const batchResp = await fetch(`${API}/api/userdata/${userId}/batch?keys=${CORE_KEYS.join(',')}`);
        const batch = batchResp.ok ? await batchResp.json() : {};
        userResult.core_data = CORE_KEYS.map(k => ({ key: `${userId}_${k}`, value: batch[k] || null })).filter(e => e.value !== null);

        // BGM
        const bgmList = await fetch(`${API}/api/userdata/${userId}/bgm`).then(r => r.ok ? r.json() : []).catch(() => []);
        for (const bgm of (bgmList || [])) {
            try {
                const buf = await fetch(`${API}/api/userdata/${userId}/bgm/${bgm.id}/file`).then(r => r.arrayBuffer());
                const safeName = (bgm.name || 'audio.mp3').replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const blobPath = `bgm/${bgm.id}_${safeName}`;
                zip.file(blobPath, buf);
                userResult.bgm_files.push({ key: bgm.id, value: { id: bgm.id, name: bgm.name, blob: { __isZipBlob: true, path: blobPath, type: 'audio/mpeg' } } });
            } catch(e) {}
        }

        // 背景图
        const bgList = await fetch(`${API}/api/userdata/${userId}/bg_images`).then(r => r.ok ? r.json() : []).catch(() => []);
        for (const bg of (bgList || [])) {
            try {
                const buf = await fetch(`${API}/api/userdata/${userId}/bg_images/${bg.id}/file`).then(r => r.arrayBuffer());
                const ext = (bg.name || '.png').match(/\.[^.]+$/)?.[0] || '.png';
                const blobPath = `bgs/${bg.id}${ext}`;
                zip.file(blobPath, buf);
                userResult.bg_images.push({ key: bg.id, value: { id: bg.id, name: bg.name, dataUrl: { __isZipTxt: true, path: blobPath } } });
            } catch(e) {}
        }

        // 标题背景
        try {
            const titleBgBuf = await fetch(`${API}/api/userdata/${userId}/app_image/titleBgImage`).then(r => r.ok ? r.arrayBuffer() : null);
            if (titleBgBuf) zip.file(`assets/${userId}_titleBgImage.png`, titleBgBuf);
        } catch(e) {}

        // 模型
        const modelsList = await fetch(`${API}/api/userdata/${userId}/models`).then(r => r.ok ? r.json() : []).catch(() => []);
        for (const model of (modelsList || [])) {
            try {
                const manifest = await fetch(`${API}/api/userdata/${userId}/models/${model.id}`).then(r => r.json());
                const processedFiles = [];
                for (const filePath of (manifest.files || [])) {
                    const fileBuf = await fetch(`${API}/api/userdata/${userId}/models/${model.id}/files/${encodeURI(filePath)}`).then(r => r.arrayBuffer());
                    const safeName = filePath.replace(/[^a-zA-Z0-9.\-_\/]/g, '_');
                    const blobPath = `models/${model.id}/${safeName}`;
                    zip.file(blobPath, fileBuf);
                    processedFiles.push({ path: filePath, blob: { __isZipBlob: true, path: blobPath, type: 'application/octet-stream' } });
                }
                userResult.live2d_models.push({ key: model.id, value: { id: model.id, name: model.name, files: processedFiles } });
            } catch(e) {}
        }

        // Mods
        const modsList = await fetch(`${API}/api/userdata/${userId}/mods`).then(r => r.ok ? r.json() : []).catch(() => []);
        userResult.app_mods = (modsList || []).map(m => ({ key: m.id, value: m }));

        // 插件数据
        for (const pluginName of ['sprite_sets', 'mirrors', 'video_bg']) {
            try {
                const items = await fetch(`${API}/api/userdata/${mid}/plugins/${pluginName}`).then(r => r.ok ? r.json() : []).catch(() => []);
                if (pluginName === 'sprite_sets') {
                    for (const set of (items || [])) {
                        const processedSet = { ...set, sprites: [] };
                        for (let i = 0; i < (set.sprites || []).length; i++) {
                            const sp = set.sprites[i];
                            try {
                                const blobUrl = `${API}/api/userdata/${mid}/plugins/${pluginName}/${set.id}/blob`;
                                const buf = await fetch(blobUrl).then(r => r.ok ? r.arrayBuffer() : null);
                                if (buf) {
                                    const txtPath = `sprites/${set.id}_${i}.png`;
                                    zip.file(txtPath, buf);
                                    processedSet.sprites.push({ name: sp.name, dataUrl: { __isZipTxt: true, path: txtPath } });
                                }
                            } catch(e) {}
                        }
                        if (!exportData.spriteDb) exportData.spriteDb = [];
                        exportData.spriteDb.push(processedSet);
                    }
                } else if (pluginName === 'mirrors') {
                    if (!exportData.mirrorsDb) exportData.mirrorsDb = { mirrors: [], config: [] };
                    exportData.mirrorsDb.mirrors.push(...(items || []));
                } else if (pluginName === 'video_bg') {
                    if (!exportData.videosDb) exportData.videosDb = [];
                    for (const item of (items || [])) {
                        try {
                            const blobUrl = `${API}/api/userdata/${mid}/plugins/${pluginName}/${item.id}/blob`;
                            const buf = await fetch(blobUrl).then(r => r.ok ? r.arrayBuffer() : null);
                            if (buf) {
                                const blobPath = `videos/${item.id}.mp4`;
                                zip.file(blobPath, buf);
                                exportData.videosDb.push({ key: item.id, value: { __isZipBlob: true, path: blobPath, type: 'video/mp4' } });
                            }
                        } catch(e) {}
                    }
                }
            } catch(e) {}
        }

        return userResult;
      };

      // 导出所有用户的数据
      const CORE_KEYS = ['live2d_settings_v35', 'live2d_sessions_v35', 'live2d_saves_v35', 'live2d_quicksave_v35', 'live2d_autosave_v35', 'live2d_memos_v35'];
      exportData.stores = { core_data: [], bgm_files: [], bg_images: [], live2d_models: [], app_mods: [] };
      zip.folder("bgm"); zip.folder("bgs"); zip.folder("models"); zip.folder("sprites"); zip.folder("videos");

      for (let i = 0; i < allUsers.length; i++) {
          const userId = allUsers[i];
          const pct = Math.round(5 + (i / allUsers.length) * 55);
          setBackupProgress({ visible: true, percent: pct, text: `正在备份用户 [${userId}] (${i + 1}/${allUsers.length})...` });
          const userData = await exportUser(userId, pct, Math.round(55 / allUsers.length));
          // 合并到总数据
          exportData.stores.core_data.push(...userData.core_data);
          exportData.stores.bgm_files.push(...userData.bgm_files);
          exportData.stores.bg_images.push(...userData.bg_images);
          exportData.stores.live2d_models.push(...userData.live2d_models);
          exportData.stores.app_mods.push(...userData.app_mods);
      }

      setBackupProgress({ visible: true, percent: 60, text: '正在提取用户账号...' });

      // 8. 用户账号
      exportData.authDb = { user_accounts: allUsers.map(u => ({ id: u.replace('user_', '') })) };

      setBackupProgress({ visible: true, percent: 70, text: '正在提取服务端配置...' });
      try {
          const resp = await fetch(`${API}/api/server-data/export`);
          if (resp.ok) {
              const json = await resp.json();
              if (json.ok && json.data) exportData.serverData = json.data;
          }
      } catch(e) {}

      // 10. 读取全局登录配置和背景图
      try {
          const [cfgResp, bgResp] = await Promise.all([
              fetch(`${API}/api/login-config`),
              fetch(`${API}/api/login-bg`)
          ]);
          if (cfgResp.ok) exportData.globalLoginConfig = await cfgResp.json();
          if (bgResp.ok) {
              const bgBuffer = await bgResp.arrayBuffer();
              zip.file('global/login_bg.png', bgBuffer);
          }
      } catch(e) {}

      zip.file("database.json", JSON.stringify(exportData));

      // ✨ 进度达到一半，交由写入器接管剩余合并任务
      setBackupProgress({ visible: true, percent: 50, text: '准备封卷...' });
      await finalizeZipSave(zip, fileHandle, defaultFilename, "全局全量 ZIP 备份导出完成！");
    } catch (err) {
        showToast(`导出失败: ${err.message}`, "error");
        setBackupProgress({ visible: false, percent: 0, text: '' });
    }
  };

  // 2. 仅导出当前活跃镜像的独立备份包
  // 4. 智能恢复引擎 (通过服务端 API 恢复)
  const handleSmartImportBackup = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setBackupProgress({ visible: true, percent: 10, text: '正在解析 ZIP 数据卷...' });
    try {
      await injectScript('/app/vendor/jszip.min.js?v=2');
      const zip = await window.JSZip.loadAsync(file);
      const dbJsonFile = zip.file("database.json"); if (!dbJsonFile) throw new Error("缺失 database.json");

      const parsedData = JSON.parse(await dbJsonFile.async("text"));
      const mid = getActiveMirrorId();
      const API = '';

      setBackupProgress({ visible: true, percent: 20, text: '正在恢复核心数据...' });

      // 1. 恢复核心数据 (core_data)
      if (parsedData.stores && parsedData.stores.core_data) {
          for (const item of parsedData.stores.core_data) {
              let key = item.key || '';
              // 去掉镜像前缀，提取纯键名
              const keyParts = key.split('_');
              const suffix = key.replace(/^[^_]+_/, ''); // user_Admin_live2d_settings_v35 -> live2d_settings_v35
              if (suffix && item.value) {
                  await fetch(`${API}/api/userdata/${mid}/core/${suffix}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(item.value)
                  }).catch(() => {});
              }
          }
      }

      // 2. 恢复 BGM
      setBackupProgress({ visible: true, percent: 30, text: '正在恢复 BGM...' });
      if (parsedData.stores && parsedData.stores.bgm_files) {
          for (const item of parsedData.stores.bgm_files) {
              const val = item.value;
              if (val.blob && val.blob.__isZipBlob) {
                  const zipEntry = zip.file(val.blob.path);
                  if (zipEntry) {
                      const buf = await zipEntry.async('arraybuffer');
                      const blob = new Blob([buf], { type: val.blob.type || 'audio/mpeg' });
                      const formData = new FormData();
                      formData.append('file', blob, val.name || 'audio.mp3');
                      formData.append('id', val.id || item.key);
                      formData.append('name', val.name || 'audio.mp3');
                      await fetch(`${API}/api/userdata/${mid}/bgm`, { method: 'POST', body: formData }).catch(() => {});
                  }
              }
          }
      }

      // 3. 恢复背景图
      setBackupProgress({ visible: true, percent: 40, text: '正在恢复背景图...' });
      if (parsedData.stores && parsedData.stores.bg_images) {
          for (const item of parsedData.stores.bg_images) {
              const val = item.value;
              let dataUrl = val.dataUrl;
              if (dataUrl && dataUrl.__isZipTxt) {
                  const zipEntry = zip.file(dataUrl.path);
                  if (zipEntry) dataUrl = await zipEntry.async('text');
              }
              if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
                  const blob = await (await fetch(dataUrl)).blob();
                  const formData = new FormData();
                  formData.append('file', blob, val.name || 'bg.png');
                  formData.append('id', val.id || item.key);
                  formData.append('name', val.name || 'bg.png');
                  await fetch(`${API}/api/userdata/${mid}/bg_images`, { method: 'POST', body: formData }).catch(() => {});
              }
          }
      }

      // 4. 恢复模型
      setBackupProgress({ visible: true, percent: 50, text: '正在恢复模型...' });
      if (parsedData.stores && parsedData.stores.live2d_models) {
          for (const item of parsedData.stores.live2d_models) {
              const val = item.value;
              if (val.files && val.files.length > 0) {
                  const formData = new FormData();
                  formData.append('id', val.id || item.key);
                  formData.append('name', val.name || 'model');
                  for (const f of val.files) {
                      if (f.blob && f.blob.__isZipBlob) {
                          const zipEntry = zip.file(f.blob.path);
                          if (zipEntry) {
                              const buf = await zipEntry.async('arraybuffer');
                              const blob = new Blob([buf], { type: f.blob.type || 'application/octet-stream' });
                              formData.append('files', blob, f.path || 'file');
                          }
                      }
                  }
                  await fetch(`${API}/api/userdata/${mid}/models`, { method: 'POST', body: formData }).catch(() => {});
              }
          }
      }

      // 5. 恢复插件 Mods
      if (parsedData.stores && parsedData.stores.app_mods) {
          for (const item of parsedData.stores.app_mods) {
              if (item.value && item.value.id) {
                  await fetch(`${API}/api/userdata/${mid}/mods/${item.value.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(item.value)
                  }).catch(() => {});
              }
          }
      }

      // 6. 恢复插件数据 (sprite_sets, mirrors, video_bg)
      setBackupProgress({ visible: true, percent: 60, text: '正在恢复插件数据...' });
      if (parsedData.spriteDb) {
          for (const set of parsedData.spriteDb) {
              const setData = { ...set, sprites: [] };
              for (let i = 0; i < (set.sprites || []).length; i++) {
                  const sp = set.sprites[i];
                  if (sp.dataUrl && sp.dataUrl.__isZipTxt) {
                      const zipEntry = zip.file(sp.dataUrl.path);
                      if (zipEntry) {
                          const dataUrl = await zipEntry.async('text');
                          const blob = await (await fetch(dataUrl)).blob();
                          await fetch(`${API}/api/userdata/${mid}/plugins/sprite_sets/${set.id}/blob`, {
                              method: 'POST',
                              body: (() => { const fd = new FormData(); fd.append('file', blob, `sprite_${i}.png`); return fd; })()
                          }).catch(() => {});
                      }
                  }
                  setData.sprites.push({ name: sp.name });
              }
              await fetch(`${API}/api/userdata/${mid}/plugins/sprite_sets/${set.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(setData)
              }).catch(() => {});
          }
      }
      if (parsedData.mirrorsDb && parsedData.mirrorsDb.mirrors) {
          for (const m of parsedData.mirrorsDb.mirrors) {
              await fetch(`${API}/api/userdata/${mid}/plugins/mirrors/${m.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(m)
              }).catch(() => {});
          }
      }
      const videoData = parsedData.videosDb || parsedData.videoData || [];
      for (const item of videoData) {
          if (item.value && item.value.__isZipBlob) {
              const zipEntry = zip.file(item.value.path);
              if (zipEntry) {
                  const buf = await zipEntry.async('arraybuffer');
                  const blob = new Blob([buf], { type: item.value.type || 'video/mp4' });
                  await fetch(`${API}/api/userdata/${mid}/plugins/video_bg/${item.key}/blob`, {
                      method: 'POST',
                      body: (() => { const fd = new FormData(); fd.append('file', blob, 'video.mp4'); return fd; })()
                  }).catch(() => {});
              }
          }
      }

      // 7. 恢复服务端数据
      if (parsedData.serverData) {
          setBackupProgress({ visible: true, percent: 80, text: '正在恢复服务端配置...' });
          await fetch(`${API}/api/server-data/import`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsedData.serverData)
          }).catch(() => {});
      }

      // 8. 恢复全局登录配置和背景图
      setBackupProgress({ visible: true, percent: 90, text: '正在恢复登录页配置...' });
      if (parsedData.globalLoginConfig) {
          await fetch(`${API}/api/login-config`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsedData.globalLoginConfig)
          }).catch(() => {});
      }
      const loginBgEntry = zip.file('global/login_bg.png');
      if (loginBgEntry) {
          const bgBuffer = await loginBgEntry.async('arraybuffer');
          const bgBlob = new Blob([bgBuffer], { type: 'image/png' });
          const formData = new FormData();
          formData.append('file', bgBlob, 'login_bg.png');
          await fetch(`${API}/api/login-bg`, { method: 'POST', body: formData }).catch(() => {});
      }

      setBackupProgress({ visible: true, percent: 100, text: '挂载完成，准备重启...' });
      showToast("🎉 数据恢复成功！系统即将重启...", "success", 5000);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
        showToast(`恢复失败: ${err.message}`, "error");
        setBackupProgress({ visible: false, percent: 0, text: '' });
    }
    e.target.value = ''; 
  };
  const handleFactoryReset = async () => {
    setConfirmDialog({ isOpen: false, text: '', onConfirm: null });
    try {
      const mid = getActiveMirrorId();
      await fetch(`/api/userdata/${mid}/all`, { method: 'DELETE' });
    } catch (e) {}
    localStorage.clear();
    window.location.reload();
  };
  const handleSecondResetClick = () => { setConfirmDialog({ isOpen: true, text: '【最终确认】\n此操作绝对不可逆！\n\n您的所有模型、剧情、音乐和背景即将灰飞烟灭！真的要恢复出厂设置吗？', onConfirm: handleFactoryReset }); };
  const handleFirstResetClick = () => { setConfirmDialog({ isOpen: true, text: '警告：您即将清空所有系统数据！\n（包含所有存档、模型缓存、背景图、BGM、角色卡和系统设置）\n\n确定要继续吗？', onConfirm: handleSecondResetClick }); };

  // 老版本备份迁移
  const handleLegacyMigration = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!file.name.endsWith('.zip')) { showToast('请选择 ZIP 格式的备份文件', 'error'); e.target.value = ''; return; }
    setBackupProgress({ visible: true, percent: 5, text: '正在解析 ZIP 文件...' });
    try {
      if (!window.JSZip) {
        await new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = '/app/vendor/jszip.min.js'; s.onload = resolve; s.onerror = reject; document.head.appendChild(s); });
      }
      const zip = await window.JSZip.loadAsync(file);
      const dbFile = zip.file('database.json');
      if (!dbFile) throw new Error('备份文件格式错误：缺少 database.json');
      const parsed = JSON.parse(await dbFile.async('text'));
      const API = '';
      const stores = parsed.stores || {};

      // 检测所有镜像 ID 和名称
      const mirrorMap = new Map(); // id -> name
      if (stores.core_data) {
        for (const item of stores.core_data) {
          const key = item.key || '';
          const match = key.match(/^(.+?)_live2d_/);
          if (match && !mirrorMap.has(match[1])) mirrorMap.set(match[1], match[1]);
        }
      }
      // 用 mirrorsDb 中的名称覆盖
      if (parsed.mirrorsDb?.mirrors) {
        for (const m of parsed.mirrorsDb.mirrors) {
          if (mirrorMap.has(m.id)) mirrorMap.set(m.id, m.name || m.id);
        }
      }
      const mirrors = Array.from(mirrorMap.keys());
      if (mirrors.length === 0) throw new Error('备份中未找到任何镜像数据');

      // 提示用户选择模式
      const mirrorNames = mirrors.map(id => `  • ${mirrorMap.get(id)} (${id})`).join('\n');
      const mode = window.confirm(
        `检测到 ${mirrors.length} 个镜像：\n${mirrorNames}\n\n` +
        `【确定】= 为每个镜像创建独立用户账号（推荐）\n` +
        `【取消】= 只恢复第一个镜像到当前用户`
      );

      const currentMid = getActiveMirrorId();

      if (!mode) {
        // 模式 A：只恢复第一个镜像到当前用户
        const firstMid = mirrors[0];
        setBackupProgress({ visible: true, percent: 10, text: `正在恢复 [${mirrorMap.get(firstMid)}] 到当前用户...` });
        await importMirrorData(zip, stores, firstMid, currentMid, API, parsed);
        setBackupProgress({ visible: true, percent: 100, text: '迁移完成！' });
        showToast(`已将 [${mirrorMap.get(firstMid)}] 的数据恢复到当前用户。即将刷新...`, 'success', 5000);
      } else {
        // 模式 B：为每个镜像创建独立用户账号
        let created = 0;
        for (let i = 0; i < mirrors.length; i++) {
          const mirrorId = mirrors[i];
          const mirrorName = mirrorMap.get(mirrorId);
          const pct = Math.round(5 + (i / mirrors.length) * 85);
          setBackupProgress({ visible: true, percent: pct, text: `正在创建用户 [${mirrorName}] (${i + 1}/${mirrors.length})...` });

          // 注册无密码账号（用户名 = 镜像名称，去除特殊字符）
          const safeName = mirrorName.replace(/[^\w一-鿿]/g, '_').substring(0, 20) || `user_${i}`;
          const userId = `user_${safeName}`;
          await fetch(`${API}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: safeName, no_password: true })
          }).catch(() => {});

          // 导入数据到该用户目录
          await importMirrorData(zip, stores, mirrorId, userId, API, parsed);
          created++;
        }
        // 将第一个镜像的数据也复制到当前用户
        if (mirrors.length > 0) {
          setBackupProgress({ visible: true, percent: 90, text: '正在恢复当前用户数据...' });
          await importMirrorData(zip, stores, mirrors[0], currentMid, API, parsed);
        }
        setBackupProgress({ visible: true, percent: 100, text: '迁移完成！' });
        showToast(`迁移完成！已创建 ${created} 个用户账号。首次登录需设置密码。即将刷新...`, 'success', 5000);
      }
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      showToast('迁移失败: ' + err.message, 'error');
      setBackupProgress({ visible: false, percent: 0, text: '' });
    }
    e.target.value = '';
  };

  // 迁移辅助函数：将单个镜像的数据导入到目标用户
  const importMirrorData = async (zip, stores, sourceMid, targetMid, API, parsed) => {
    // 1. 核心数据
    if (stores.core_data) {
      const suffixes = ['live2d_settings_v35', 'live2d_sessions_v35', 'live2d_saves_v35', 'live2d_quicksave_v35', 'live2d_autosave_v35', 'live2d_memos_v35'];
      for (const suffix of suffixes) {
        const item = stores.core_data.find(i => i.key === `${sourceMid}_${suffix}`);
        if (item && item.value) {
          await fetch(`${API}/api/userdata/${targetMid}/core/${suffix}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.value)
          }).catch(() => {});
        }
      }
    }
    // 2. BGM
    if (stores.bgm_files) {
      for (const item of stores.bgm_files) {
        const val = item.value;
        if (!(val.id || item.key || '').startsWith(sourceMid)) continue;
        if (val.blob && val.blob.__isZipBlob) {
          const entry = zip.file(val.blob.path);
          if (entry) {
            const buf = await entry.async('arraybuffer');
            const fd = new FormData();
            fd.append('file', new Blob([buf], { type: val.blob.type || 'audio/mpeg' }), val.name || 'audio.mp3');
            fd.append('id', val.id || item.key);
            fd.append('name', val.name || 'audio.mp3');
            await fetch(`${API}/api/userdata/${targetMid}/bgm`, { method: 'POST', body: fd }).catch(() => {});
          }
        }
      }
    }
    // 3. 背景图
    if (stores.bg_images) {
      for (const item of stores.bg_images) {
        const val = item.value;
        if (!(val.id || item.key || '').startsWith(sourceMid)) continue;
        let dataUrl = val.dataUrl;
        if (dataUrl && dataUrl.__isZipTxt) { const entry = zip.file(dataUrl.path); if (entry) dataUrl = await entry.async('text'); }
        if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
          const blob = await (await fetch(dataUrl)).blob();
          const fd = new FormData();
          fd.append('file', blob, val.name || 'bg.png');
          fd.append('id', val.id || item.key);
          fd.append('name', val.name || 'bg.png');
          await fetch(`${API}/api/userdata/${targetMid}/bg_images`, { method: 'POST', body: fd }).catch(() => {});
        }
      }
    }
    // 4. 标题背景
    if (stores.app_settings) {
      for (const item of stores.app_settings) {
        if (item.key === `${sourceMid}_titleBgImage` && typeof item.value === 'string' && item.value.startsWith('data:')) {
          const blob = await (await fetch(item.value)).blob();
          const fd = new FormData(); fd.append('file', blob, 'titleBgImage.png');
          await fetch(`${API}/api/userdata/${targetMid}/app_image/titleBgImage`, { method: 'POST', body: fd }).catch(() => {});
        }
      }
    }
    // 5. 模型
    if (stores.live2d_models) {
      for (const item of stores.live2d_models) {
        const val = item.value;
        if (!(val.id || item.key || '').startsWith(sourceMid) && !(val.id || item.key || '').match(/^\d+$/)) continue;
        if (val.files && val.files.length > 0) {
          const uploadedPaths = [];
          for (let fi = 0; fi < val.files.length; fi++) {
            const f = val.files[fi];
            if (f.blob && f.blob.__isZipBlob) {
              const entry = zip.file(f.blob.path);
              if (entry) {
                const buf = await entry.async('arraybuffer');
                const blob = new Blob([buf], { type: f.blob.type || 'application/octet-stream' });
                const fd = new FormData();
                fd.append('file', blob, f.path || `file_${fi}`);
                fd.append('model_id', val.id || item.key);
                fd.append('path', f.path || `file_${fi}`);
                await fetch(`${API}/api/userdata/${targetMid}/models/file`, { method: 'POST', body: fd }).catch(() => {});
                uploadedPaths.push(f.path || `file_${fi}`);
              }
            }
          }
          if (uploadedPaths.length > 0) {
            await fetch(`${API}/api/userdata/${targetMid}/models`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: val.id || item.key, name: val.name || 'model', files: uploadedPaths })
            }).catch(() => {});
          }
        }
      }
    }
  };

  const currentBgItem = bgList.find(b => b.id === settings.currentBgId);
  const activeBgUrl = appMode === 'title' ? (localTitleBgImage || '/app/bg.png') : (currentBgItem ? (currentBgItem.url || currentBgItem.dataUrl || '/app/bg.png') : '/app/bg.png');
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const latestMessage = activeSession?.messages?.[activeSession.messages.length - 1];

  const triggerShortcut = (id, defaultAction, e) => {
      if (typeof window.triggerShortcut === 'function') {
          window.triggerShortcut(id, defaultAction, e);
      } else if (typeof defaultAction === 'function') {
          defaultAction(e);
      }
  };

  // ✨ 核心扩容：新增 title_text 和 title_bg 调整模式
  const handleEnterVisualAdjust = (mode) => {
    if (mode === 'model' || mode === 'dialog' || mode === 'story_model') { 
        if (appMode === 'title') { setAppMode('game'); showToast('已自动切换至游戏界面以进行排版预览', 'info'); } 
    } 
    else if (mode === 'title_model' || mode === 'title_text' || mode === 'title_bg') { 
        if (appMode === 'game') { setAppMode('title'); showToast('已自动切换至主标题界面以进行排版预览', 'info'); } 
    }
    setVisualAdjustMode(mode);
  };

  useEffect(() => {
    if (!settings.enableAutoSave || appMode !== 'game' || !activeSession || activeSession.messages.length === 0) return;
    const intervalId = setInterval(() => {
      const data = { date: new Date().toLocaleString(), messages: activeSession.messages, title: `[${settings.aiName}] 自动存档 (Auto Save)` };
      setAutoSaveData(data); showToast('🔄 已自动保存游戏进度至 AUTO 槽位', 'info', 2000);
    }, settings.autoSaveInterval * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [settings.enableAutoSave, settings.autoSaveInterval, appMode, activeSession, showToast, settings.aiName]);

  // ✨ 聊天数据自动备份（默认开启，每10分钟备份一次到 userdata/auto_backup/）
  useEffect(() => {
    if (!settings.enableAutoChatBackup || isCoreLoading) return;
    const intervalMs = (settings.autoChatBackupInterval || 10) * 60 * 1000;
    const intervalId = setInterval(async () => {
      try {
        const mid = getActiveMirrorId();
        const content = {
          settings, sessions, saveSlots, quickSaveData, autoSaveData, memos,
          timestamp: new Date().toISOString()
        };
        await fetch('/api/auto-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mirror_id: mid, content })
        });
      } catch (e) { console.warn('[自动备份] 失败:', e.message); }
    }, intervalMs);
    return () => clearInterval(intervalId);
  }, [settings.enableAutoChatBackup, settings.autoChatBackupInterval, isCoreLoading, settings, sessions, saveSlots, quickSaveData, autoSaveData, memos]);

  const handleAutoSaveSButton = () => {
    let targetId = 1; while (saveSlots[targetId] && targetId <= 100) targetId++;
    if (targetId > 100) { showToast('存档已满，请手动覆盖历史存档。', 'error'); setSlMode('save'); setIsSaveLoadUIOpen(true); return; }
    let defaultTitle = `[${settings.aiName}] 存档`; const newSave = { id: targetId, title: defaultTitle, date: new Date().toLocaleString(), messages: activeSession.messages || [] };
    setSaveSlots(prev => ({ ...prev, [targetId]: newSave })); setSlPage(Math.ceil(targetId / 10)); setSlMode('save'); setIsSaveLoadUIOpen(true); setEditingSlotId(targetId); setEditSaveName(defaultTitle);
  };

  const handleQuickSave = () => { const data = { date: new Date().toLocaleString(), messages: activeSession?.messages || [], title: `[${settings.aiName}] 快捷系统存档 (Quick Save)` }; setQuickSaveData(data); showToast('✨ 已完成快捷保存 (Quick Save)', 'success'); };

  const handleQuickLoad = () => {
    if (!quickSaveData) { showToast('当前没有快捷存档数据！', 'error'); return; }
    setConfirmDialog({ isOpen: true, text: '确定要读取快捷存档吗？\n当前未保存的对话进度将会丢失！', onConfirm: () => { updateSessionMessages(activeSessionId, quickSaveData.messages, '读取的剧情'); setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); setIsSaveLoadUIOpen(false); setAppMode('game'); showToast('已成功加载快捷存档', 'success'); } });
  };

  const handleAutoLoad = () => {
    if (!autoSaveData) { showToast('当前没有自动存档数据！', 'error'); return; }
    setConfirmDialog({ isOpen: true, text: '确定要读取自动存档吗？\n当前未保存的对话进度将会丢失！', onConfirm: () => { updateSessionMessages(activeSessionId, autoSaveData.messages, '读取的剧情'); setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); setIsSaveLoadUIOpen(false); setAppMode('game'); showToast('已成功恢复自动存档进度', 'success'); } });
  };

  const handleSlotClick = (slotId) => {
    if (editingSlotId === slotId) return; 
    if (slMode === 'save') {
      let defaultTitle = `[${settings.aiName}] 存档`;
      if (saveSlots[slotId]) {
        setConfirmDialog({ isOpen: true, text: `确定要覆盖 No.${String(slotId).padStart(3, '0')} 存档吗？`, onConfirm: () => { const newSave = { id: slotId, title: defaultTitle, date: new Date().toLocaleString(), messages: activeSession.messages || [] }; setSaveSlots(prev => ({ ...prev, [slotId]: newSave })); setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); setEditingSlotId(slotId); setEditSaveName(defaultTitle); } });
      } else {
        const newSave = { id: slotId, title: defaultTitle, date: new Date().toLocaleString(), messages: activeSession.messages || [] }; setSaveSlots(prev => ({ ...prev, [slotId]: newSave })); setEditingSlotId(slotId); setEditSaveName(defaultTitle);
      }
    } else {
      const data = saveSlots[slotId]; if (!data) return; 
      setConfirmDialog({ isOpen: true, text: `确定要读取 No.${String(slotId).padStart(3, '0')} 的进度吗？\n当前未保存的对话将会丢失！`, onConfirm: () => { updateSessionMessages(activeSessionId, data.messages, data.title); setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); setIsSaveLoadUIOpen(false); setAppMode('game'); showToast('已成功加载进度', 'success'); } });
    }
  };

  const handleSaveNameConfirm = () => { if (editingSlotId !== null && saveSlots[editingSlotId]) { setSaveSlots(prev => ({ ...prev, [editingSlotId]: { ...prev[editingSlotId], title: editSaveName.trim() || `[${settings.aiName}] 存档` } })); } setEditingSlotId(null); };

  useEffect(() => { if (editingSlotId && editInputRef.current) { editInputRef.current.focus(); editInputRef.current.select(); } }, [editingSlotId]);

  const getPages = useCallback((text) => {
    if (!text) return [""];
    const paragraphs = text.split('\n'); const pages = []; let currentPage = ""; let currentLines = 0; const charsPerLine = 35; 
    for (const p of paragraphs) {
      const pLines = Math.max(1, Math.ceil(p.length / charsPerLine));
      if (currentLines > 0 && currentLines + pLines > settings.vnLinesPerPage) { pages.push(currentPage); currentPage = p; currentLines = pLines; } 
      else { currentPage += (currentPage ? '\n' : '') + p; currentLines += pLines; }
    }
    if (currentPage) pages.push(currentPage); return pages;
  }, [settings.vnLinesPerPage]);

  const pages = latestMessage ? getPages(latestMessage.content) : [""];
  const currentDisplay = pages[vnPage] || pages[pages.length - 1] || "";
  const hasNextPage = vnPage < pages.length - 1;

  const handleDialogClick = () => { if (hasNextPage) setVnPage(prev => prev + 1); };

  const handleWheel = useCallback((e) => {
    if (wheelTimeoutRef.current) return;
    const isScrollingDown = e.deltaY > 0; const isScrollingUp = e.deltaY < 0;
    if (isScrollingDown && hasNextPage) { setVnPage(p => p + 1); } else if (isScrollingUp && vnPage > 0) { setVnPage(p => p - 1); }
    wheelTimeoutRef.current = setTimeout(() => { wheelTimeoutRef.current = null; }, 250); 
  }, [hasNextPage, vnPage]);

 const handleSkip = useCallback((e) => { e.stopPropagation(); if (pages.length > 0) { setVnPage(pages.length - 1); } }, [pages.length]);

  useEffect(() => { if (vnTextContainerRef.current) vnTextContainerRef.current.scrollTop = vnTextContainerRef.current.scrollHeight; }, [currentDisplay]);

  // ✨ 核心修复：在打字机流式输出时，强制翻页跟随，解决长文本被截断显示不全的问题
  useEffect(() => {
    if (settings.vnAutoPage && latestMessage?.isStreaming && pages.length > 0) {
        setVnPage(Math.max(0, pages.length - 1));
    }
  }, [pages.length, latestMessage?.isStreaming, settings.vnAutoPage]);
  // ✨ --- 修复替换的 loadScripts 功能 ---
  // 修复 Could not find Cubism 4 runtime 报错 (支持离线引擎导入与热加载)
  const loadScripts = async () => {
    if (window.PIXI && window.PIXI.live2d) return true;
    const backupModule = window.module; const backupExports = window.exports; window.module = undefined; window.exports = undefined;
    try {
      // 阶段1：pixi.js 和 cubism core 并行加载（互相无依赖）
      const cubismCoreReady = (async () => {
        const offlineCore = await loadCoreData('offline_cubism_core_js');
        if (offlineCore) {
          const inlineScript = document.createElement('script'); inlineScript.textContent = offlineCore; document.head.appendChild(inlineScript);
        } else {
          await injectScriptWithFallback('/app/vendor/Live2DCubismCore.js?v=2');
        }
      })();

      await Promise.all([
        injectScriptWithFallback('/app/vendor/pixi.min.js?v=2'),
        cubismCoreReady
      ]);

      // 阶段2：live2d 基础库和 pixi-live2d-display 并行加载（都依赖 cubism core，已就绪）
      await Promise.all([
        injectScriptWithFallback('/app/vendor/live2d.min.js?v=2'),
        injectScriptWithFallback('/app/vendor/pixi-live2d-display.min.js?v=2')
      ]);

      // 等待 pixi-live2d-display 完成 UMD 初始化并挂载到 PIXI.live2d
      for (let i = 0; i < 50; i++) {
        if (window.PIXI && window.PIXI.live2d && window.PIXI.live2d.Live2DModel) return true;
        await new Promise(r => setTimeout(r, 100));
      }
      return !!(window.PIXI && window.PIXI.live2d && window.PIXI.live2d.Live2DModel);
    } catch (error) { setLive2dStatus('引擎库加载失败: ' + error.message); return false; } finally { if (backupModule !== undefined) window.module = backupModule; if (backupExports !== undefined) window.exports = backupExports; }
  };
  useEffect(() => {
    let isMounted = true;
    const initLive2D = async () => {
      setLive2dStatus('检查本地模型...'); let modelUrl = null;
      if (settings.currentModelId) {
         const multiModel = await getMultiModelFromDB(settings.currentModelId);
         if (multiModel && multiModel.files && multiModel.files.length > 0) {
           // 从 manifest 中找到 model3.json 或 model.json 文件
           const modelFile = multiModel.files.find(f => /\.model3?\.json$/i.test(f));
           if (modelFile) {
             modelUrl = `${multiModel.baseUrl}/${encodeURI(modelFile)}`;
           }
         }
      }
      if (!modelUrl) return setLive2dStatus('未检测到模型，请在系统设置(⚙)中导入模型');

      setLive2dStatus('加载引擎中...'); const scriptsLoaded = await loadScripts(); if (!scriptsLoaded || !isMounted) return;
      if (!window.PIXI || !window.PIXI.live2d || !window.PIXI.live2d.Live2DModel) return setLive2dStatus('Live2D 插件未就绪，请刷新页面重试');
      setLive2dStatus('加载模型中...');

      const targetRes = parseFloat(settings.live2dResolution) || window.devicePixelRatio || 1;
      if (!appRef.current) {
          appRef.current = new window.PIXI.Application({ view: canvasRef.current, transparent: true, autoDensity: true, resizeTo: containerRef.current, backgroundAlpha: 0, resolution: targetRes });
      } else if (appRef.current.renderer.resolution !== targetRes) {
          appRef.current.renderer.resolution = targetRes;
          appRef.current.resize();
      }
      const app = appRef.current;
      window.__pixiApp = app; // 暴露给设置页面用于强制重绘

      if (modelRef.current) {
          if (faceTrackingTickerRef.current) app.ticker.remove(faceTrackingTickerRef.current);
          app.stage.removeChild(modelRef.current);
          modelRef.current.destroy({ children: true, texture: true, baseTexture: true });
          modelRef.current = null;
      }

      try {
        const Live2DModel = window.PIXI.live2d.Live2DModel;
        const model = await withTimeout(Live2DModel.from(modelUrl), 30000, 'Live2D模型加载');
        if (!isMounted) { model.destroy(); return; }
        
        if (model.internalModel && model.internalModel.focusController) {
           const originalFocusUpdate = model.internalModel.focusController.update;
           model.internalModel.focusController.update = function(dt) {
               if (enableFaceTrackingRef.current && faceTrackingModeRef.current === 'full') return;
               originalFocusUpdate.call(this, dt);
           };
        }

        app.stage.addChild(model); modelRef.current = model; updateModelTransform(); setLive2dStatus(''); 
        
        if (faceTrackingTickerRef.current) app.ticker.remove(faceTrackingTickerRef.current);
        const faceTrackingTicker = () => {
            if (!enableFaceTrackingRef.current || !modelRef.current) return;
            const rig = faceRigRef.current;
            const core = modelRef.current.internalModel.coreModel;
            if (!core) return;
            
            const setParam = (id, value) => {
                if (core.setParameterValueById) core.setParameterValueById(id, value);
                else if (core.setParamFloat) core.setParamFloat(id, value);
            };

            const lerp = (a, b, t) => a + (b - a) * t;
            const lerpFactor = 0.5; 

            if (!modelRef.current.faceRigPrev) modelRef.current.faceRigPrev = {};
            const prev = modelRef.current.faceRigPrev;

            const updateParam = (id, val, weight = 1) => {
                let target = val * weight;
                if (prev[id] === undefined) prev[id] = target;
                prev[id] = lerp(prev[id], target, lerpFactor);
                setParam(id, prev[id]);
            };

            if (rig) {
                if (faceTrackingModeRef.current === 'full') {
                    updateParam('ParamAngleX', rig.head.degrees.y, 1);
                    updateParam('ParamAngleY', rig.head.degrees.x, 1);
                    updateParam('ParamAngleZ', rig.head.degrees.z, 1);
                    updateParam('ParamBodyAngleX', rig.head.degrees.y, 0.3);
                    updateParam('ParamBodyAngleY', rig.head.degrees.x, 0.3);
                    updateParam('ParamBodyAngleZ', rig.head.degrees.z, 0.3);
                    if (rig.pupil) {
                        updateParam('ParamEyeBallX', rig.pupil.x, 1);
                        updateParam('ParamEyeBallY', rig.pupil.y, 1);
                    }
                }
                updateParam('ParamEyeLOpen', rig.eye.l, 1);
                updateParam('ParamEyeROpen', rig.eye.r, 1);
                updateParam('ParamMouthOpenY', rig.mouth.y, 1);
                updateParam('ParamMouthForm', rig.mouth.x, 1);
            }
        };
        app.ticker.add(faceTrackingTicker);
        faceTrackingTickerRef.current = faceTrackingTicker;

        const rawExps = model.internalModel?.settings?.expressions || model.internalModel?.settings?.FileReferences?.Expressions || [];
        const expList = rawExps.map((e, idx) => { let cleanName = e.Name || e.name || e.File || e.file || `表情 ${idx + 1}`; cleanName = cleanName.split('/').pop().replace(/\.exp3?\.json$/i, ''); return { id: e.Name || e.name || idx, name: cleanName }; });
        setExpressions(expList);
        if (settings.currentExpressionId !== null && settings.currentExpressionId !== undefined) { try { model.expression(settings.currentExpressionId); } catch(e) {} }
        
        const handleMouseMove = (event) => { 
            if (!modelRef.current) return; 
            if (enableFaceTrackingRef.current && faceTrackingModeRef.current === 'full') return; 
            modelRef.current.focus(event.clientX, event.clientY); 
        }; 
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (faceTrackingTickerRef.current && appRef.current) {
                appRef.current.ticker.remove(faceTrackingTickerRef.current);
            }
        };

      } catch (error) { setLive2dStatus(`本地模型加载失败: ${error.message}`); }
    };
    initLive2D(); return () => { isMounted = false; };
  }, [modelReloadTrigger]);

  const updateModelTransform = useCallback(() => {
    if (modelRef.current && containerRef.current) {
      const model = modelRef.current; const containerWidth = containerRef.current.clientWidth; const containerHeight = containerRef.current.clientHeight;
      const isTitle = appMode === 'title'; const scale = isTitle ? currentModelConfig.titleScale : currentModelConfig.scale; const x = isTitle ? currentModelConfig.titleX : currentModelConfig.x; const y = isTitle ? currentModelConfig.titleY : currentModelConfig.y;
      model.scale.set(scale); model.x = (containerWidth / 2) - (model.width / 2) + parseFloat(x); model.y = (containerHeight / 2) - (model.height / 2) + parseFloat(y);
      model.visible = isTitle ? !settings.hideTitleLive2d : !settings.hideLive2dModel;
    }
  }, [appMode, currentModelConfig, settings.hideTitleLive2d, settings.hideLive2dModel]);

  useEffect(() => { updateModelTransform(); }, [updateModelTransform]);
  useEffect(() => { const handleResize = () => updateModelTransform(); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, [updateModelTransform]);

  const handleModelContainerClick = useCallback(() => {
    if (appMode === 'title' || visualAdjustMode) return; 
    if (settings.enableClickExpression && expressions.length > 0 && modelRef.current) { const randomExp = expressions[Math.floor(Math.random() * expressions.length)]; try { modelRef.current.expression(randomExp.id); setSettings(s => ({...s, currentExpressionId: randomExp.id})); } catch(e) {} }
  }, [settings.enableClickExpression, expressions, appMode, visualAdjustMode]);

  const handleResetFocus = () => {
    if (modelRef.current) {
      modelRef.current.focus(0, 0); 
      if (modelRef.current.faceRigPrev) modelRef.current.faceRigPrev = {}; 
      showToast("✨ 模型视线与头部已强制居中复位", "success");
    }
  };

 const handleModelUpload = async (e) => {
    const fileList = Array.from(e.target.files); if (!fileList.length) return;
    const hasJson = fileList.some(f => f.name.match(/\.model3?\.json$/i)); if (!hasJson) return showToast("错误：所选文件夹中不包含 model.json 或 model3.json 模型配置文件！", "error");
    
    // ✨ 核心修复：移除中文拦截，将所有中文根目录名在底层安全替换为 model_root，彻底解决跨平台乱码崩溃问题
    const originalFolderName = fileList[0].webkitRelativePath.split('/')[0] || '未命名模型';
    const folderName = originalFolderName;
    
    showToast("正在导入模型，请稍候...", "info"); const modelId = `${getActiveMirrorId()}_${Date.now().toString()}`;
    const processedFiles = fileList.map(f => {
        let safePath = f.webkitRelativePath || f.name;
        // 将可能包含中文/特殊字符的外层根目录统一转译为安全的 model_root
        safePath = safePath.replace(new RegExp('^' + originalFolderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'model_root');
        return { blob: f, path: safePath };
    });
    
   const newModel = { id: modelId, name: folderName, files: processedFiles };
    try {
      await saveMultiModelToDB(newModel); setModelsList(prev => [...prev, { id: modelId, name: folderName }]); showToast(`模型 [${folderName}] 导入成功！`, "success");
      if (!settings.currentModelId) { setSettings(s => ({ ...s, currentModelId: modelId })); setModelReloadTrigger(prev => prev + 1); }
    } catch(err) { showToast(`模型保存失败: ${err.message}`, "error"); } e.target.value = '';
  };

  // ✨ 原生级融合：处理 ZIP 模型包与离线引擎烧录
  const handleZipModelUpload = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      showToast("📦 正在解析并解压 ZIP 模型包...", "info", 8000);
      try {
          await injectScript('/app/vendor/jszip.min.js?v=2');
          const zip = await window.JSZip.loadAsync(file); const files = []; let modelName = file.name.replace(/\.zip$/i, '').replace(/\.txt$/i, ''); 
          const promises = [];
          zip.forEach((relativePath, zipEntry) => {
              if (!zipEntry.dir) promises.push(zipEntry.async("blob").then(blob => { files.push({ path: relativePath, blob: new File([blob], relativePath.split('/').pop(), { type: blob.type || 'application/octet-stream' }) }); }));
          });
          await Promise.all(promises);
          if (!files.some(f => f.path.match(/\.model3?\.json$/i))) throw new Error("压缩包内未找到 .model3.json");
          
          const modelId = `${getActiveMirrorId()}_${Date.now().toString()}`;
          const newModel = { id: modelId, name: modelName + " (ZIP)", files: files };
          await saveMultiModelToDB(newModel); setModelsList(prev => [...prev, { id: modelId, name: newModel.name }]); 
          showToast(`🎉 模型 [${modelName}] 导入成功！`, "success", 5000);
          if (!settings.currentModelId) { setSettings(s => ({ ...s, currentModelId: modelId })); setModelReloadTrigger(prev => prev + 1); }
      } catch (err) { showToast("ZIP 导入失败: " + err.message, "error"); }
      e.target.value = '';
  };

  const handleOfflineEngineUpload = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const text = await file.text();
      if (text.includes('Live2D') || text.includes('Cubism')) {
          await saveCoreData('offline_cubism_core_js', text);
          showToast("✅ 离线引擎核心已永久烧录！即将强制重启...", "success", 4000);
          setTimeout(() => window.location.reload(), 2000);
      } else { showToast("❌ 文件格式不符", "error"); }
      e.target.value = '';
  };
  
  const handleFullscreen = () => { document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.(); };

  const switchModel = (id) => {
    // 切换到 Live2D 模型时，通过 settings 禁用立绘模式
    setSettings(s => ({...s, currentModelId: id, spriteDlcEnabled: false, spriteDlcActiveId: null}));
    setModelReloadTrigger(prev => prev + 1);
    setIsModelMenuOpen(false);
    showToast("正在切换模型...", "info");
  };
  const removeModel = async (id) => { await deleteMultiModelFromDB(id); const updated = modelsList.filter(m => m.id !== id); setModelsList(updated); if (settings.currentModelId === id) { setSettings(s => ({...s, currentModelId: updated.length > 0 ? updated[0].id : null})); setModelReloadTrigger(prev => prev + 1); } };
  const createNewSession = () => { const newSession = { id: Date.now().toString(), title: '新剧情', messages: [], memorySummary: '' }; setSessions(prev => [newSession, ...prev]); setActiveSessionId(newSession.id); };
  const deleteSession = (e, id) => { e.stopPropagation(); const updated = sessions.filter(s => s.id !== id); setSessions(updated); if (activeSessionId === id) setActiveSessionId(updated.length > 0 ? updated[0].id : null); if (updated.length === 0) createNewSession(); };
  const renameSession = (id, newTitle) => { setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s)); };

  const triggerMemoryCompression = async (sessionId, sessionMessages, currentSummary) => {
    if (isCompressingMemory) return; setIsCompressingMemory(true); showToast("🧠 上下文已达上限，正在后台提取记忆档案...", "info", 5000);
    const keepCount = Math.min(sessionMessages.length - 1, 20); const messagesToCompress = sessionMessages.slice(0, sessionMessages.length - keepCount);
    try {
        let rawBaseUrl = settings.openaiBaseUrl.trim(); if (rawBaseUrl && !/^https?:\/\//i.test(rawBaseUrl)) rawBaseUrl = 'https://' + rawBaseUrl; rawBaseUrl = rawBaseUrl.replace(/\/$/, ''); if (rawBaseUrl.endsWith('/v1')) rawBaseUrl = rawBaseUrl.slice(0, -3);
        const historyText = messagesToCompress.map(m => `${m.role === 'user' ? settings.userName : settings.aiName}: ${m.content}`).join('\n');
        const prompt = `你是一个记忆提取助手。请根据以下历史对话，提取并更新我们之间的【关键人物关系、已发生的重要事件、双方设定的细节】。如果之前已有记忆总结，请将其与新的对话内容完美融合，生成一份最新的、连贯的、结构清晰的长期记忆档案。\n\n【旧的记忆档案】\n${currentSummary || '无'}\n\n【近期新增对话】\n${historyText}\n\n请直接输出最新的记忆总结内容文本（尽量控制在500字以内），不要输出任何前缀、寒暄或Markdown代码块标签。`;
        let fetchUrl, fetchHeaders = { 'Content-Type': 'application/json' }, fetchBody;
        if (settings.corsProxyType === 'none' && rawBaseUrl) { fetchUrl = 'http://127.0.0.1:5201/v1/chat/completions'; fetchBody = { model: settings.aiModel, messages: [{ role: 'user', content: prompt }], stream: false, api_base: rawBaseUrl, api_key: settings.openaiApiKey || '' }; } else { fetchUrl = buildProxyUrl(`${rawBaseUrl}/v1/chat/completions`); if (settings.openaiApiKey) fetchHeaders['Authorization'] = `Bearer ${settings.openaiApiKey}`; fetchBody = { model: settings.aiModel, messages: [{ role: 'user', content: prompt }], stream: false }; }
        const response = await fetch(fetchUrl, { method: 'POST', headers: fetchHeaders, body: JSON.stringify(fetchBody) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json(); let newSummary = data.choices?.[0]?.message?.content || data.message || ""; newSummary = newSummary.trim();
        if (newSummary) {
            setSessions(prev => prev.map(s => { if (s.id === sessionId) { const remainingMessages = s.messages.filter(m => !messagesToCompress.includes(m)); return { ...s, memorySummary: newSummary, messages: remainingMessages }; } return s; }));
            showToast("✨ 记忆归档完成！长文本上下文已无缝替换为高浓度长期记忆。", "success");
        }
    } catch (err) { console.error("记忆压缩失败:", err); showToast("⚠️ 记忆压缩失败，将暂不清理上下文。", "error"); } finally { setIsCompressingMemory(false); }
  };

 const generatePlotOptions = async (messages) => {
      if (!messages || messages.length === 0) return; setIsGeneratingReplies(true); setSuggestedReplies([]);
      try {
        const isIndependent = settings.plotApiMode === 'independent'; let rawBaseUrl = isIndependent ? settings.plotBaseUrl.trim() : settings.openaiBaseUrl.trim(); let apiKey = isIndependent ? settings.plotApiKey.trim() : settings.openaiApiKey.trim(); let aiModel = isIndependent ? settings.plotModel.trim() : settings.aiModel.trim();
        if (!rawBaseUrl) throw new Error("API 地址未配置，无法生成选项"); if (rawBaseUrl && !/^https?:\/\//i.test(rawBaseUrl)) rawBaseUrl = 'https://' + rawBaseUrl; rawBaseUrl = rawBaseUrl.replace(/\/$/, ''); if (rawBaseUrl.endsWith('/v1')) rawBaseUrl = rawBaseUrl.slice(0, -3);
        let fetchUrl2 = buildProxyUrl(`${rawBaseUrl}/v1/chat/completions`); const historyText = messages.slice(-6).map(m => `${m.role === 'user' ? settings.userName : settings.aiName}: ${m.content}`).join('\n');
        const systemPrompt = "你是一个视觉小说(VN)游戏的选项生成器。请根据给定的对话历史，严格输出一个包含3个回复选项的JSON数组（仅包含字符串，不要任何其他解释，不要Markdown标记）。";
        const userPrompt = `为玩家（“${settings.userName}”）生成3个简短、符合语境且能够引导不同剧情走向的回复选项（比如包含温柔、吐槽、疑问等不同情绪）。\n\n对话历史：\n${historyText}\n\n请严格输出JSON数组格式，例如：["选项1", "选项2", "选项3"]`;
        let fetchHeaders2 = { 'Content-Type': 'application/json' }, fetchBody2;
        if (settings.corsProxyType === 'none' && rawBaseUrl) { fetchUrl2 = 'http://127.0.0.1:5201/v1/chat/completions'; fetchBody2 = { model: aiModel, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], stream: false, temperature: settings.aiTemperature || 0.7, api_base: rawBaseUrl, api_key: apiKey || '' }; } else { fetchUrl2 = buildProxyUrl(`${rawBaseUrl}/v1/chat/completions`); if (apiKey) fetchHeaders2['Authorization'] = `Bearer ${apiKey}`; fetchBody2 = { model: aiModel, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], stream: false, temperature: settings.aiTemperature || 0.7 }; }
        const response = await fetch(fetchUrl2, { method: 'POST', headers: fetchHeaders2, body: JSON.stringify(fetchBody2) });
        if (!response.ok) throw new Error(`HTTP ${response.status} 错误`);
        const data = await response.json();
        
        let textContent = data.choices?.[0]?.message?.content || data.message || ""; 
        // ✨ 核心修复：强力正则装甲，无视大模型加戏的任何废话，暴力抠出 [ ] 数组结构
        const arrayMatch = textContent.match(/\[\s*[\s\S]*\s*\]/);
        
        if (arrayMatch) {
            try {
                const replies = JSON.parse(arrayMatch[0]); 
                if (Array.isArray(replies)) setSuggestedReplies(replies.slice(0, 3));
            } catch (parseErr) {
                // ✨ 终极防丢兜底：如果大模型不听话用了单引号或多余逗号导致 JSON.parse 崩溃，直接用正则硬抠字符串强制显示
                const fallbackMatch = arrayMatch[0].match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g) || arrayMatch[0].match(/'([^'\\]*(?:\\.[^'\\]*)*)'/g);
                if (fallbackMatch) {
                    const replies = fallbackMatch.map(s => s.replace(/(^['"]|['"]$)/g, '').replace(/\\"/g, '"'));
                    setSuggestedReplies(replies.slice(0, 3));
                } else {
                    console.warn("选项推演底层解析完全失败:", textContent);
                }
            }
        } else {
            console.warn("选项推演解析失败，未找到数组结构:", textContent);
        }
      } catch (e) { console.warn("选项推演解析出错:", e); } finally { setIsGeneratingReplies(false); }
    };

  const fetchOpenAIModels = async () => {
    if (!settings.openaiBaseUrl) return showToast("请先输入接口地址 (Base URL)", "error"); setIsFetchingModels(true);
    try {
      const rawBaseUrl = getFormatBaseUrl();
      let fetchUrl3, fetchParams = {};
      if (settings.corsProxyType === 'none' && rawBaseUrl) {
        fetchUrl3 = `http://127.0.0.1:5201/v1/models?api_base=${encodeURIComponent(rawBaseUrl)}&api_key=${encodeURIComponent(settings.openaiApiKey || '')}`;
      } else {
        fetchUrl3 = buildProxyUrl(`${rawBaseUrl}/v1/models`);
        fetchParams.headers = { 'Content-Type': 'application/json' }; if (settings.openaiApiKey) fetchParams.headers['Authorization'] = `Bearer ${settings.openaiApiKey}`;
      }
      const response = await fetch(fetchUrl3, fetchParams); if (!response.ok) throw new Error(`HTTP 错误 ${response.status}`); const responseText = await response.text(); let data;
      try { data = JSON.parse(responseText); } catch (parseError) { throw new Error('此接口未提供合法的模型列表。\n👉 无需强制刷新！请直接在"模型名称"框内手动输入即可聊天。'); }
      if (data && data.data && Array.isArray(data.data)) { const models = data.data.map(m => m.id).sort(); setAvailableModels(models); if (models.length > 0 && !models.includes(settings.aiModel)) setSettings(prev => ({ ...prev, aiModel: models[0] })); showToast(`成功获取 ${models.length} 个模型！`, 'success'); } else { throw new Error('格式异常'); }
    } catch (error) { showToast(`获取失败, 请确认服务畅通。\n${error.message}`, 'error', 8000); } finally { setIsFetchingModels(false); }
  };

  const processAudioQueue = useCallback(() => {
    if (isPlayingTTSRef.current || ttsTaskQueueRef.current.length === 0) return;
    
    isPlayingTTSRef.current = true;
    const currentTask = ttsTaskQueueRef.current.shift();
    
    activeAudioRef.current = currentTask.audioObj;
    activeAudioRef.current.volume = ttsVolRef.current;
    activeAudioRef.current.playbackRate = ttsRateRef.current || 1.0; 
    
    activeAudioRef.current.onended = () => { 
      if (ttsPauseRef.current > 0) { 
        ttsTimeoutRef.current = setTimeout(() => { isPlayingTTSRef.current = false; processAudioQueue(); }, ttsPauseRef.current); 
      } else { 
        isPlayingTTSRef.current = false; processAudioQueue(); 
      } 
    };

    activeAudioRef.current.onerror = (e) => {
      console.warn("TTS 音频流错误，可能后端推理异常或连接断开:", e);
      isPlayingTTSRef.current = false; processAudioQueue();
    };

    const playPromise = activeAudioRef.current.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => { 
          console.warn("TTS 播放被浏览器拦截或失败:", e); 
          isPlayingTTSRef.current = false; processAudioQueue(); 
        });
    }
  }, []);

  const enqueueTTS = useCallback((text) => {
    if (!settings.ttsEnabled || !settings.ttsUrlTemplate || !text.trim()) return;
    try {
      let url = settings.ttsUrlTemplate
          .replace('{text}', encodeURIComponent(text.trim()))
          .replace('{lang}', settings.ttsLanguage);

      if (settings.ttsMobileMode) {
          // ✨ 手机端模式：利用正则彻底将 URL 中的本地参考音频参数剥离，强迫后端使用 start.py 的默认配置
          url = url.replace(/([&?])ref_audio_path=\{ref_audio\}/g, '')
                   .replace(/([&?])prompt_text=\{ref_text\}/g, '')
                   .replace(/([&?])prompt_lang=\{ref_lang\}/g, '')
                   .replace(/\?&/, '?').replace(/&$/, '');
      } else {
          // 电脑端模式：按原样带入本地客户端填写的参考音频
          url = url.replace('{ref_audio}', encodeURIComponent(settings.ttsRefAudio || ''))
                   .replace('{ref_text}', encodeURIComponent(settings.ttsRefText || ''))
                   .replace('{ref_lang}', settings.ttsRefLang || 'zh');
      }
      
      const preloader = new window.Audio();
      preloader.preload = 'auto';
      preloader.src = url;
      preloader.load(); 

      ttsTaskQueueRef.current.push({ text, url, audioObj: preloader });
      processAudioQueue();
    } catch (error) {}
  }, [settings, processAudioQueue]);
  useEffect(() => { enqueueTTSRef.current = enqueueTTS; }, [enqueueTTS]);

 const clearTTSQueue = useCallback(() => {
    ttsTaskQueueRef.current.forEach(task => { 
        if (task.audioObj) { task.audioObj.pause(); task.audioObj.removeAttribute('src'); task.audioObj.load(); } 
    });
    ttsTaskQueueRef.current = [];
    if (activeAudioRef.current) { activeAudioRef.current.pause(); activeAudioRef.current.removeAttribute('src'); activeAudioRef.current.load(); activeAudioRef.current = null; }
    isPlayingTTSRef.current = false; if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current); 
  }, []);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return;
    let newFiles = [];
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = ev => res(ev.target.result); r.readAsDataURL(file); });
            newFiles.push({ type: 'image', name: file.name, data: dataUrl });
        } else {
            const text = await file.text();
            newFiles.push({ type: 'document', name: file.name, data: text });
        }
    }
    setSelectedFiles(prev => [...prev, ...newFiles]); e.target.value = '';
  };

  const triggerSendMessage = async (overrideText = null, isHidden = false, proactiveMode = '') => {
    const targetText = overrideText !== null ? overrideText : (inputValue.trim() || (selectedFiles.length > 0 ? '请查看附件' : ''));
    if (!targetText && selectedFiles.length === 0) return;
    // ✨ 加入底层并发锁，防止重复触发
    if (!activeSessionId || isLoadingRef.current) return;

    // ✨ 主动搭话 + 屏幕捕捉：先截图再发送
    if (proactiveMode === 'proactive-screenshot') {
      let screenshotBase64 = null;
      try {
        const captureRes = await fetch('/api/screenshot/capture');
        const captureData = await captureRes.json();
        if (captureData.image) screenshotBase64 = captureData.image;
      } catch (e) { /* screenshot failed, continue without it */ }

      if (screenshotBase64) {
        // 异步截图完成，重新调用自身（不带 proactive 标志，避免递归）
        setTimeout(() => {
          setSelectedFiles([{ type: 'image', name: 'screenshot.png', data: screenshotBase64 }]);
          triggerSendMessage(overrideText || targetText, true, '');
        }, 100);
        return;
      }
      // 截图失败，降级为普通主动搭话
    }
    
    isLoadingRef.current = true;
    setIsLoading(true);

    const userMessage = { role: 'user', content: targetText, files: isHidden ? [] : selectedFiles };
    if (overrideText === null) { setInputValue(''); setSelectedFiles([]); setSuggestedReplies([]); setVnPage(0); }
    clearTTSQueue();

    const currentHistory = activeSession?.messages || [];
    const uiMessages = isHidden ? [...currentHistory] : [...currentHistory, userMessage];
    const apiRequestHistory = isHidden ? [...currentHistory, userMessage] : [...currentHistory, userMessage];

    updateSessionMessages(activeSessionId, [...uiMessages, { role: 'assistant', content: '', isStreaming: settings.enableStreaming }], (uiMessages.length === 0 && overrideText === null) ? userMessage.content.slice(0, 15) : undefined);
    
    try {
      // ✨ OpenCode 工作模式
      if (settings.workMode) {
        setIsLoading(false); isLoadingRef.current = false;
        updateSessionMessages(activeSessionId, uiMessages, `💻 ${targetText.slice(0, 20)}`);

        // 后台启动 OpenCode
        (async () => {
          try {
            const persona = settings.customSystemPrompt || '';
            const ocRes = await fetch('/api/opencode/run', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: targetText, model: settings.opencodeUseChatModel ? '' : (settings.opencodeUseFreeModel ? '' : settings.opencodeModel), persona, project_path: settings.opencodeProjectPath || '' })
            });
            const ocData = await ocRes.json();
            if (ocData.error) { setOcTaskId(null); return; }
            setOcTaskId(ocData.task_id);

            // OCPanel 轮询显示进度，完成后自动总结
            const taskId = ocData.task_id;
            const checkDone = setInterval(async () => {
              try {
                const cr = await fetch(`/api/opencode/poll/${taskId}`);
                const cd = await cr.json();
                if (cd.done) {
                  clearInterval(checkDone);
                  // 获取全部输出
                  const allRes = await fetch(`/api/opencode/stream/${taskId}`);
                  const allData = await allRes.json();
                  const allText = (allData.lines || []).map(l => {
                    try { const e = JSON.parse(l); return e.part?.text || e.text || '' } catch(_) { return '' }
                  }).filter(Boolean).join('');

                  // 总是在主聊天框输出总结
                  const summaryPrompt = `[任务完成]\n${allText.substring(0, 2000)}\n\n用${settings.aiName || '角色'}的口吻简短总结（2-3句），必须保持角色风格。${settings.enableTranslation ? '注意：你需要按当前对话的同声传译模式输出 <VOICE>和<TEXT>标签，严格遵循翻译模式规则。' : ''}`;
                  try {
                    let headers = { 'Content-Type': 'application/json' };
                    const baseUrl = getFormatBaseUrl();
                    if (baseUrl && settings.openaiApiKey) {
                      let r, fetchBody3;
                      if (settings.corsProxyType === 'none') {
                        r = await fetch('http://127.0.0.1:5201/v1/chat/completions', { method: 'POST', headers, body: JSON.stringify({ model: settings.aiModel, messages: [{ role: 'user', content: summaryPrompt }], stream: false, temperature: settings.aiTemperature || 0.7, api_base: baseUrl, api_key: settings.openaiApiKey || '' }) });
                      } else {
                        if (settings.openaiApiKey) headers['Authorization'] = `Bearer ${settings.openaiApiKey}`;
                        r = await fetch(`${baseUrl}/v1/chat/completions`, { method: 'POST', headers, body: JSON.stringify({ model: settings.aiModel, messages: [{ role: 'user', content: summaryPrompt }], stream: false, temperature: settings.aiTemperature || 0.7 }) });
                      }
                      if (r.ok) { const d = await r.json(); const reply = d.choices?.[0]?.message?.content; if (reply) {
                        const latestMsgs = activeSession?.messages || [];
                        let displayContent = reply; let voiceContent = reply;
                        if (settings.enableTranslation) { displayContent = (reply.match(/<TEXT>([\s\S]*?)(?:<\/TEXT>|$)/i)?.[1] || reply).trim(); voiceContent = (reply.match(/<VOICE>([\s\S]*?)(?:<\/VOICE>|$)/i)?.[1] || reply).trim(); }
                        updateSessionMessages(activeSessionId, [...latestMsgs, { role: 'assistant', content: displayContent }]);
                        if (settings.ttsEnabled) { enqueueTTS(voiceContent); }
                      }}
                    } else { // API not configured, show raw output
                      const short = allText.substring(0, 500) || '(无输出)';
                      const latestMsgs = activeSession?.messages || [];
                      updateSessionMessages(activeSessionId, [...latestMsgs, { role: 'assistant', content: `💻 OpenCode 完成\n${short}` }]);
                    }
                  } catch(e) {}
                }
              } catch(e) {}
            }, 1000);
          } catch(e) {
            updateSessionMessages(activeSessionId, [...uiMessages, { role: 'assistant', content: `⚠️ OpenCode 失败: ${e.message}` }]);
          }
        })();

        return;
      }

      let fetchUrl;
      let fetchBody;
      let fetchHeaders = { 'Content-Type': 'application/json' };
      const rawBaseUrl = getFormatBaseUrl();

      const langMap = { 'zh': '中文', 'ja': '日文', 'en': '英文', 'ko': '韩文' }; const dispLangStr = langMap[settings.displayLanguage] || settings.displayLanguage; const voiceLangStr = langMap[settings.ttsLanguage] || settings.ttsLanguage;

      let finalSystemPrompt = settings.customSystemPrompt;
      // RAG 技能检索注入
      try {
        if (settings.enableSkills === false) {
          // 技能引擎已关闭，跳过 RAG 检索
        } else if (settings.enableKnowledgeBase) {
          const kbRes = await fetch('/api/kb/retrieve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: targetText,
              top_k: settings.kbTopK || 5,
              packs: (settings.activeKbPacks || []).join(','),
              rerank: settings.kbRerankEnabled || false,
              embedding_base_url: settings.kbEmbeddingBaseUrl || settings.openaiBaseUrl,
              embedding_api_key: settings.kbEmbeddingApiKey || settings.openaiApiKey,
              embedding_model: settings.kbEmbeddingModel || 'text-embedding-3-small',
              embedding_dimensions: settings.kbEmbeddingDimensions || 1536,
              rerank_base_url: settings.kbRerankBaseUrl || '',
              rerank_api_key: settings.kbRerankApiKey || '',
              rerank_model: settings.kbRerankModel || ''
            })
          });
          if (kbRes.ok) {
            const kbData = await kbRes.json();
            if (kbData.core_rules) finalSystemPrompt += `\n\n【核心技能设定】\n${kbData.core_rules}`;
            if (kbData.results) finalSystemPrompt += `\n\n【相关知识检索】\n${kbData.results}`;
          }
        } else {
          const packsParam = settings.activeSkillPacks?.length > 0 ? `&packs=${encodeURIComponent(settings.activeSkillPacks.join(","))}` : '';
          const skillRes = await fetch(`/api/skills/retrieve?q=${encodeURIComponent(targetText)}&top_k=3${packsParam}&user_id=${encodeURIComponent(getActiveMirrorId())}`);
          if (skillRes.ok) {
            const skillData = await skillRes.json();
            if (skillData.core_rules) finalSystemPrompt += `\n\n【核心技能设定】\n${skillData.core_rules}`;
            if (skillData.results) finalSystemPrompt += `\n\n【相关知识检索】\n${skillData.results}`;
          }
        }
      } catch(e) { /* 技能引擎离线时静默降级 */ }
      if (settings.worldviewText) { finalSystemPrompt += `\n\n【世界观与背景设定】\n${settings.worldviewText}`; }
      const now = new Date();
      const yyyy = now.getFullYear(); const mm = String(now.getMonth() + 1).padStart(2, '0'); const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0'); const min = String(now.getMinutes()).padStart(2, '0'); const ss = String(now.getSeconds()).padStart(2, '0');
      const timeString = `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;

      let systemStatusInjection = `\n\n【系统实时状态】\n当前现实时间：${timeString}\n`;
      const activeMemos = memos.filter(m => !m.isDone);
      if (activeMemos.length > 0) { systemStatusInjection += `玩家当前的备忘录/日程安排如下：\n${activeMemos.map(m => `- ${m.date ? '['+new Date(m.date).toLocaleString()+'] ' : ''}${m.text}`).join('\n')}\n(请作为智能助手在对话中适时提醒，或者结合这些日程进行合理互动。)\n`; }
      if (activeSession?.memorySummary) { systemStatusInjection += `\n【长期记忆档案(重要前情提要)】\n${activeSession.memorySummary}\n(请牢记以上你们之前对话总结的设定与重要事件)\n`; }
      
      systemStatusInjection += `\n【自动日程管理指令 (最高优先级)】\n如果玩家在对话中明确要求你“几分钟/几小时后提醒我”或安排未来某个时间的日程，你必须用自然的语气答应下来。并且，**必须在你回复内容的最末尾，另起一行输出以下隐藏 JSON 标签格式**，系统会拦截它为你定闹钟：\n<ADD_MEMO>{"time": "YYYY/MM/DD HH:mm:ss", "text": "要提醒的简短事项"}</ADD_MEMO>\n注意：请根据当前时间(${timeString})精准计算出目标时间。绝不要向玩家透露这个标签和这套机制！`;

      finalSystemPrompt += systemStatusInjection;
      
      if (settings.workMode) { finalSystemPrompt += `\n\n【系统最高指令：工作/编程模式已开启】\n请你完全无视前文中关于“简短回答”、“字数限制”、“二次元口癖”等娱乐性要求。请以极其专业、详尽的态度解答问题。如果涉及代码编写，请务必输出完整且包含注释的完整代码块，绝对不要因为长度而截断或省略！`; }
      if (settings.enableTranslation) { finalSystemPrompt += `\n\n【重要强制指令】已开启同声传译模式！你必须严格输出两种语言版本，格式必须为：\n<VOICE>此处填写${voiceLangStr}版本的回复，用于语音合成</VOICE>\n<TEXT>此处填写${dispLangStr}版本的回复，用于屏幕显示</TEXT>\n绝不要输出任何多余的字符或Markdown。`; }
      
      const apiMessages = [{ role: 'system', content: finalSystemPrompt }, ...apiRequestHistory.map(m => { 
        if (m.files && m.files.length > 0 && m.role === 'user') { 
            let contentArray = [{ type: 'text', text: m.content }];
            let docText = "";
            m.files.forEach(f => {
                if (f.type === 'image') contentArray.push({ type: 'image_url', image_url: { url: f.data } });
                else docText += `\n--- 附件文档: ${f.name} ---\n${f.data}\n`;
            });
            if (docText) contentArray[0].text += `\n\n【用户提供的附件文档内容】：${docText}`;
            return { role: m.role, content: contentArray }; 
        } 
        return { role: m.role, content: m.content }; 
      })];
      if (settings.corsProxyType === 'none' && rawBaseUrl) {
        fetchUrl = 'http://127.0.0.1:5201/v1/chat/completions';
        fetchBody = { model: settings.aiModel, messages: apiMessages, stream: settings.enableStreaming, temperature: settings.aiTemperature || 0.7, api_base: rawBaseUrl, api_key: settings.openaiApiKey || '' };
      } else {
        fetchUrl = buildProxyUrl(`${rawBaseUrl}/v1/chat/completions`);
        if (settings.openaiApiKey) fetchHeaders['Authorization'] = `Bearer ${settings.openaiApiKey}`;
        fetchBody = { model: settings.aiModel, messages: apiMessages, stream: settings.enableStreaming, temperature: settings.aiTemperature || 0.7 };
      }

      const response = await fetch(fetchUrl, { method: 'POST', headers: fetchHeaders, body: JSON.stringify(fetchBody) });
      if (!response.ok) throw new Error(`HTTP ${response.status} 错误`);

      if (settings.enableStreaming) {
        let networkDone = false, networkError = null, fullContentBuffer = "", displayedContent = ""; 
        let ttsBuffer = ""; 
        let processedVoiceLength = 0; 
        const effectiveSpeed = settings.workMode ? Math.max(5, settings.typingSpeed / 3) : settings.typingSpeed;

        const typeInterval = setInterval(() => {
          let effectiveBuffer = fullContentBuffer;
          const memoIdx = effectiveBuffer.indexOf('<ADD_MEMO');
          if (memoIdx !== -1) {
              effectiveBuffer = effectiveBuffer.substring(0, memoIdx);
          }

          let targetDisplayText = effectiveBuffer;
          if (settings.enableTranslation) {
             const match = effectiveBuffer.match(/<TEXT>([\s\S]*?)(?:<\/TEXT>|$)/i);
             if (match) targetDisplayText = match[1]; else if (effectiveBuffer.length > 30 && !/<VOICE>/i.test(effectiveBuffer) && !/<TEXT>/i.test(effectiveBuffer)) { targetDisplayText = effectiveBuffer; } else { targetDisplayText = ""; }
          }
          if (displayedContent.length < targetDisplayText.length) {
            displayedContent += targetDisplayText[displayedContent.length]; updateSessionMessages(activeSessionId, [...uiMessages, { role: 'assistant', content: displayedContent, isStreaming: true }]);
          } else if (networkDone) {
            clearInterval(typeInterval); isLoadingRef.current = false; setIsLoading(false);
            if (networkError) { showToast(`API错误: ${networkError.message}`, "error"); updateSessionMessages(activeSessionId, [...uiMessages, { role: 'assistant', content: displayedContent ? displayedContent + `\n[${networkError.message}]` : `[${networkError.message}]`, isError: true }]); }
            else {
              const finalMessages = [...uiMessages, { role: 'assistant', content: targetDisplayText.trim() || displayedContent }]; updateSessionMessages(activeSessionId, finalMessages);
              // 推送 AI 回复文本到桌宠聊天框（流式模式）
              fetch('/api/pet_chat/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_msg: userMessage.content?.substring(0, 200) || '', ai_msg: targetDisplayText.trim() || displayedContent }) }).catch(() => {});
              if (settings.enablePlotOptions) generatePlotOptions(finalMessages);
              if (settings.enableMemory && finalMessages.length >= settings.memoryInterval) { triggerMemoryCompression(activeSessionId, finalMessages, activeSession?.memorySummary); }
            }
          }
        }, effectiveSpeed);

        try {
          const reader = response.body.getReader(); const decoder = new TextDecoder('utf-8'); let done = false, tempBuffer = "";
          while (!done) {
            const { value, done: readerDone } = await reader.read(); done = readerDone;
            if (value) {
              tempBuffer += decoder.decode(value, { stream: true }); const lines = tempBuffer.split('\n'); tempBuffer = lines.pop();
              for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
                  try { 
                    const data = JSON.parse(trimmedLine.slice(6));
                    if (data.error) {
                      networkError = new Error(data.error.message || JSON.stringify(data.error));
                      break;
                    }
                    if (data.choices?.[0]?.delta?.content) {
                       const deltaText = data.choices[0].delta.content; 
                       fullContentBuffer += deltaText; 
                       
                       // ✨ 核心修复：彻底将 TTS 切片解析逻辑与 <ADD_MEMO> 隔离
                       const currentMemoIdx = fullContentBuffer.indexOf('<ADD_MEMO');
                       const cleanBuffer = currentMemoIdx !== -1 ? fullContentBuffer.substring(0, currentMemoIdx) : fullContentBuffer;

                       if (settings.enableTranslation) {
                           const match = cleanBuffer.match(/<VOICE>([\s\S]*?)(?:<\/VOICE>|$)/i);
                           if (match) { 
                               const currentVoiceText = match[1]; 
                               const newVoiceChunk = currentVoiceText.slice(processedVoiceLength); 
                               ttsBuffer += newVoiceChunk; 
                               processedVoiceLength = currentVoiceText.length; 
                           } else if (cleanBuffer.length > 30 && !/<VOICE>/i.test(cleanBuffer) && !/<TEXT>/i.test(cleanBuffer)) { 
                               const newChunk = cleanBuffer.slice(processedVoiceLength);
                               ttsBuffer += newChunk;
                               processedVoiceLength = cleanBuffer.length;
                           }
                       } else { 
                           const newChunk = cleanBuffer.slice(processedVoiceLength);
                           ttsBuffer += newChunk;
                           processedVoiceLength = cleanBuffer.length;
                       }
                       
                       const splitRegex = settings.ttsFastMode ? /^([\s\S]*?[。！？\.\!\?\n]+)/ : /^([\s\S]*?[。！？\.\!\?\n]+)/;
                       let matchPunc;
                       while ((matchPunc = ttsBuffer.match(splitRegex))) {
                           const chunk = matchPunc[1];
                           if (chunk.trim()) enqueueTTS(chunk.trim());
                           ttsBuffer = ttsBuffer.slice(chunk.length);
                       }
                       // 如果 buffer 里有超过 100 字但没句号，也切一次（避免等太久）
                       if (ttsBuffer.length > 100 && /[，,、~～]/.test(ttsBuffer)) {
                           const lastComma = Math.max(ttsBuffer.lastIndexOf('，'), ttsBuffer.lastIndexOf(','), ttsBuffer.lastIndexOf('、'), ttsBuffer.lastIndexOf('~'));
                           if (lastComma > 0) {
                               const chunk = ttsBuffer.slice(0, lastComma + 1);
                               if (chunk.trim()) enqueueTTS(chunk.trim());
                               ttsBuffer = ttsBuffer.slice(lastComma + 1);
                           }
                       }
                    }
                  } catch (e) {}
                }
              }
              if (networkError) break;
            }
          }
        } catch (err) { networkError = err; } finally { 
          networkDone = true; 
          if (ttsBuffer.trim()) enqueueTTS(ttsBuffer.trim()); 
          const memoMatch = fullContentBuffer.match(/<ADD_MEMO>([\s\S]*?)(?:<\/ADD_MEMO>|$)/i);
          if (memoMatch) {
             try {
                 const memoData = JSON.parse(memoMatch[1].trim());
                 if (memoData.time && memoData.text) {
                     const memoDate = new Date(memoData.time);
                     if (!isNaN(memoDate.getTime())) {
                         setMemos(prev => [{ id: Date.now().toString(), text: memoData.text, date: memoData.time, isDone: false, hasReminded: false }, ...prev]);
                         showToast(`已自动为您添加日程: ${memoData.text}`, "success");
                     }
                 }
             } catch(e) { console.log("解析自动备忘录JSON失败", e); }
          }
          resetProactiveTimer();
        }

      } else {
        const data = await response.json(); if (data.error) throw new Error(data.error.message || 'API 返回错误');
        let assistantContent = data.choices?.[0]?.message?.content || data.message || "";
        
        const memoMatch = assistantContent.match(/<ADD_MEMO>([\s\S]*?)(?:<\/ADD_MEMO>|$)/i);
        if (memoMatch) {
             try {
                 const memoData = JSON.parse(memoMatch[1].trim());
                 if (memoData.time && memoData.text) {
                     const memoDate = new Date(memoData.time);
                     if (!isNaN(memoDate.getTime())) {
                         setMemos(prev => [{ id: Date.now().toString(), text: memoData.text, date: memoData.time, isDone: false, hasReminded: false }, ...prev]);
                         showToast(`已自动为您添加日程: ${memoData.text}`, "success");
                     }
                 }
             } catch(e) { console.log("解析自动备忘录JSON失败", e); }
        }
        
        assistantContent = assistantContent.replace(/<ADD_MEMO>[\s\S]*?(?:<\/ADD_MEMO>|$)/gi, '').trim();

        let displayContent = assistantContent; let voiceContent = assistantContent;
        if (settings.enableTranslation) { displayContent = (assistantContent.match(/<TEXT>([\s\S]*?)(?:<\/TEXT>|$)/i)?.[1] || assistantContent).trim(); voiceContent = (assistantContent.match(/<VOICE>([\s\S]*?)(?:<\/VOICE>|$)/i)?.[1] || assistantContent).trim(); }
        const finalMessages = [...uiMessages, { role: 'assistant', content: displayContent }]; updateSessionMessages(activeSessionId, finalMessages); enqueueTTS(voiceContent);
        // 推送 AI 回复文本到桌宠聊天框
        fetch('/api/pet_chat/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_msg: userMessage.content?.substring(0, 200) || '', ai_msg: displayContent }) }).catch(() => {});
        if (settings.enablePlotOptions) generatePlotOptions(finalMessages); isLoadingRef.current = false; setIsLoading(false);
        if (settings.enableMemory && finalMessages.length >= settings.memoryInterval) { triggerMemoryCompression(activeSessionId, finalMessages, activeSession?.memorySummary); }
        resetProactiveTimer();
      }
    } catch (error) { 
        showToast(`发送失败: ${error.message}`, "error"); 
        updateSessionMessages(activeSessionId, [...uiMessages, { role: 'assistant', content: `[系统错误]: ${error.message}`, isError: true }]); 
        isLoadingRef.current = false; 
        setIsLoading(false); 
    }
  };
  const handleSendMessage = () => triggerSendMessage();

  // ================= 语音输入 (Voice Input) =================
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [voiceKeyActive, setVoiceKeyActive] = useState(false);
  const [asrModelStatus, setAsrModelStatus] = useState({ status: 'idle', message: '' });
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const voiceStreamRef = useRef(null);
  const voiceHoldRef = useRef(false);
  const voiceToggleRef = useRef(false);
  const voiceActionsRef = useRef({});
  const voiceSettingsRef = useRef(settings);
  voiceSettingsRef.current = settings;

  // 始终保持最新引用，避免 useCallback([]) 导致闭包过期
  voiceActionsRef.current.startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        voiceStreamRef.current = null;
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          await voiceActionsRef.current.processBlob(blob);
        }
      };
      recorder.onerror = () => { setIsVoiceRecording(false); setVoiceError('录音出错'); };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsVoiceRecording(true);
      setVoiceError(null);
    } catch (e) {
      setVoiceError('无法访问麦克风: ' + e.message);
    }
  };

  voiceActionsRef.current.stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsVoiceRecording(false);
    }
  };

  voiceActionsRef.current.processBlob = async (blob) => {
    try {
      const form = new FormData();
      form.append('file', blob, 'voice.webm');
      form.append('language', settings.voiceInputLang || 'zh');
      const r = await fetch('http://127.0.0.1:5201/api/asr/transcribe', { method: 'POST', body: form });
      const d = await r.json();
      if (d.text && d.text.trim()) {
        const txt = d.text.trim();
        if (settings.voiceInputPreview !== false) {
          setInputValue(txt);
        } else {
          triggerSendMessage(txt);
          fetch('/api/pet_chat/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_msg: txt, ai_msg: '' }) }).catch(() => {});
        }
      } else {
        setVoiceError('未识别到语音内容' + (d.error ? ': ' + d.error : ''));
      }
    } catch (e) {
      setVoiceError('ASR 请求失败: ' + e.message);
    }
  };

  const startVoiceRecording = useCallback(() => voiceActionsRef.current.startRecording(), []);
  const stopVoiceRecording = useCallback(() => voiceActionsRef.current.stopRecording(), []);

  const toggleVoiceRecording = useCallback(() => {
    if (isVoiceRecording) stopVoiceRecording();
    else startVoiceRecording();
  }, [isVoiceRecording, startVoiceRecording, stopVoiceRecording]);

  // 将录音函数和设置暴露到 window，供 index.html 的原生按键监听直接调用
  useEffect(() => {
    window.__voiceStart = () => voiceActionsRef.current.startRecording();
    window.__voiceStop = () => voiceActionsRef.current.stopRecording();
    return () => { window.__voiceStart = function() {}; window.__voiceStop = function() {}; };
  }, []);

  // 同步 settings 到 window，index.html 按键监听读取这些值
  useEffect(() => {
    window.__voiceKey = settings.voiceInputKey || 'ControlRight';
    window.__voiceMode = settings.voiceInputMode || 'hold';
    setVoiceKeyActive(settings.voiceInputMode !== 'auto');
  }, [settings.voiceInputKey, settings.voiceInputMode]);

  // 轮询桌宠传来的语音识别结果
  const voiceLastTsRef = useRef(0);
  const triggerSendRef = useRef(triggerSendMessage);
  triggerSendRef.current = triggerSendMessage;
  useEffect(() => {
    if (!settings.enableVoiceInput) return;
    const poll = async () => {
      try {
        const r = await fetch('http://127.0.0.1:5201/api/voice-result');
        if (!r.ok) return;
        const d = await r.json();
        if (d.text && d.ts > voiceLastTsRef.current) {
          voiceLastTsRef.current = d.ts;
          if (settings.voiceInputPreview !== false) {
            setInputValue(d.text);
          } else {
            triggerSendRef.current(d.text);
          }
        }
      } catch (e) {}
    };
    const iv = setInterval(poll, 500);
    return () => clearInterval(iv);
  }, [settings.enableVoiceInput, settings.voiceInputPreview]);

  // 轮询 ASR 模型下载状态
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('http://127.0.0.1:5201/api/asr/model-status');
        if (r.ok) setAsrModelStatus(await r.json());
      } catch (e) {}
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, []);

  const updateSessionMessages = (id, newMessages, newTitle) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s;
      let title = newTitle || s.title;
      // 自动命名：首次有用户消息时，用第一条用户消息作为标题
      if (title === '新剧情' && s.messages.length === 0 && newMessages.length > 0) {
        const firstUser = newMessages.find(m => m.role === 'user');
        if (firstUser && firstUser.content) {
          title = firstUser.content.slice(0, 30);
        }
      }
      return { ...s, messages: newMessages, title };
    }));
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };

  const handleStartGame = () => { 
    if (autoSaveData && autoSaveData.messages && autoSaveData.messages.length > 0) {
      setConfirmDialog({
        isOpen: true, text: '检测到存在【自动存档】记录！\n开始新剧情将会覆盖该记录。\n是否需要将其迁移至常规存档位进行备份？', confirmText: '迁移备份并开始', cancelText: '取消',
        thirdButton: { text: '直接覆盖开始', onClick: () => { setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); createNewSession(); setAppMode('game'); } },
        onConfirm: () => {
          let targetId = 1; while (saveSlots[targetId] && targetId <= 100) targetId++;
          if (targetId <= 100) { const newSave = { id: targetId, title: `[${settings.aiName}自动保存迁移]`, date: autoSaveData.date || new Date().toLocaleString(), messages: autoSaveData.messages }; setSaveSlots(prev => ({ ...prev, [targetId]: newSave })); showToast(`已成功迁移至 No.${String(targetId).padStart(3, '0')} 存档`, 'success'); } else { showToast('常规存档位已满，备份失败！将直接开始新剧情。', 'error'); }
          setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); createNewSession(); setAppMode('game');
        }
      });
    } else { createNewSession(); setAppMode('game'); }
  };

  const handleContinueGame = () => { setAppMode('game'); };

  const handleExitGame = () => {
    setConfirmDialog({ isOpen: true, text: '确定要退出游戏吗？\n当前未保存的进度将会丢失！', onConfirm: () => { setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); window.close(); showToast("已下达退出指令，若窗口未关闭请手动关闭浏览器页签。", "info"); } });
  };

  const handleLogout = () => {
    setConfirmDialog({ isOpen: true, text: '确定要退出登录吗？\n请确保已保存当前进度。', onConfirm: () => {
      setConfirmDialog({ isOpen: false, text: '', onConfirm: null });
      logoutUser();
      window.location.hash = '/login';
      window.location.reload();
    }});
  };

 const handleReturnToTitle = () => {
    if (appMode === 'title') { setIsSettingsOpen(false); return; }
    setConfirmDialog({ isOpen: true, text: '确定要返回标题画面吗？\n当前未保存的对话进度将会丢失！', onConfirm: () => { 
        setAppMode('title'); 
        setIsSettingsOpen(false); 
        setIsSaveLoadUIOpen(false); 
        setIsMemoOpen(false); 
        setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); 
        clearTTSQueue(); 
        setActivePluginUI(null);
        window.dispatchEvent(new CustomEvent('gwc-force-stop-plugin'));
    } });
  };

  useEffect(() => {
    // 统一管控退出逻辑堆栈
    const handleBackAction = () => {
        if (confirmDialog.isOpen) { if (confirmDialog.onCancel) confirmDialog.onCancel(); else setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); return; }
        if (editingSlotId !== null) { setEditingSlotId(null); return; }
        if (isBgMenuOpen || isExpressionMenuOpen || isModelMenuOpen) { setIsBgMenuOpen(false); setIsExpressionMenuOpen(false); setIsModelMenuOpen(false); return; }
        if (visualAdjustMode) { setVisualAdjustMode(null); return; }
        if (isMemoOpen) { setIsMemoOpen(false); return; }
        if (isSettingsOpen) { setIsSettingsOpen(false); return; }
        if (isSaveLoadUIOpen) { setIsSaveLoadUIOpen(false); return; }
        if (isLogOpen) { setIsLogOpen(false); return; }
        const mapOverlay = document.getElementById('sm-player-map-overlay'); if (mapOverlay) { mapOverlay.remove(); return; }
        if (appMode === 'game') { handleReturnToTitle(); return; }
        if (appMode === 'title') { handleExitGame(); return; }
    };

    const handleGlobalKeyDown = (e) => { if (e.key === 'Escape') handleBackAction(); };
    
    // ✨ 核心防御：安卓物理返回键/侧边滑动手势劫持 (拦截浏览器 PopState)
    const handlePopState = (e) => {
        // 瞬间补充虚拟历史记录，防止下一次手势直接杀掉 APP
        window.history.pushState({ app: 'gwc_back_guard' }, document.title, window.location.href);
        handleBackAction();
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('popstate', handlePopState);
    
    // 初始化时注入虚拟防身记录
    if (!window.history.state || window.history.state.app !== 'gwc_back_guard') {
        window.history.pushState({ app: 'gwc_back_guard' }, document.title, window.location.href);
    }

    return () => { window.removeEventListener('keydown', handleGlobalKeyDown); window.removeEventListener('popstate', handlePopState); };
  }, [confirmDialog, editingSlotId, isBgMenuOpen, isExpressionMenuOpen, isModelMenuOpen, visualAdjustMode, isMemoOpen, isSettingsOpen, isSaveLoadUIOpen, isLogOpen, appMode]);

  // ✨ 核心大迁徙：在数据未从黑盒中完全取出前，强行锁死渲染，防止白板空数据误杀
  if (isCoreLoading) {
    return (
      <div className="fixed inset-0 bg-[#2c2b29] flex flex-col items-center justify-center text-[#e6d5b8] z-50">
        <div className="w-12 h-12 border-4 border-[#ba3f42] border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold tracking-widest">正在潜入底层数据库唤醒记忆...</h2>
      </div>
    );
  }

  // ✨ 共享状态上下文 — 供子页面使用
  const contextValue = {
    router, currentPage, navigate,
    // 核心状态
    appMode, setAppMode, settings, setSettings, isCoreLoading,
    // 会话
    sessions, setSessions, activeSession, activeSessionId, setActiveSessionId,
    // 存档
    saveSlots, setSaveSlots, quickSaveData, autoSaveData,
    // 备忘录
    memos, setMemos, isMemoOpen, setIsMemoOpen,
    // UI 状态
    isSettingsOpen, setIsSettingsOpen, settingsTab, setSettingsTab,
    isLogOpen, setIsLogOpen, isSaveLoadUIOpen, setIsSaveLoadUIOpen,
    slMode, setSlMode, isLoading, setIsLoading,
    // 输入
    inputValue, setInputValue, selectedFiles, setSelectedFiles, handleFileSelect,
    // BGM
    bgmList, setBgmList, currentBgmIndex, setCurrentBgmIndex,
    isBgmPlaying, setIsBgmPlaying, bgmToast, setBgmToast,
    handleNextBgm, handlePrevBgm, toggleBgm,
    // 背景/模型/表情
    bgList, setBgList, modelsList, setModelsList, expressions, setExpressions,
    isModelHidden: settings.hideLive2dModel || false, setIsModelHidden: (v) => setSettings(s => ({...s, hideLive2dModel: typeof v === 'function' ? v(s.hideLive2dModel) : v})),
    // 技能包
    skillPacksList, setSkillPacksList, expandedSkillPack, setExpandedSkillPack,
    // 插件
    modsList, setModsList, pluginTitleButtons, pluginDialog,
    // Toast
    toast, showToast,
    // 备份
    backupProgress,
    // 角色卡
    saveCurrentAsCharCard, importCharCard, exportCharCard, deleteCharCard,
    switchCharacter, updateCharCardSkillPacks, updateCharCardKbPacks,
    // 世界观
    saveWorldviewProfile, applyWorldviewProfile, renameWorldviewProfile, deleteWorldviewProfile, exportWorldviewProfile,
    // API 配置
    saveApiProfile, applyApiProfile, renameApiProfile, deleteApiProfile,
    availableModels, isFetchingModels, fetchOpenAIModels,
    // 技能包管理
    toggleSkillFile, toggleSkillPack, fetchSkillPacks,
    // 消息
    triggerSendMessage, handleKeyDown,
    // 游戏生命周期
    handleStartNewGame: createNewSession, handleContinueGame, handleExitGame, handleReturnToTitle,
    renameSession,
    // 其他
    copyToClipboard: handleCopyMessage, workMode, setWorkMode, ttsEnabled, setTtsEnabled,
    enableFaceTracking: settings.enableFaceTracking,
    toggleFaceTracking: () => setSettings(s => ({...s, enableFaceTracking: !s.enableFaceTracking})),
    visualAdjustMode, setVisualAdjustMode,
    vnLines: pages, vnPage, setVnPage, vnTotalPages: pages.length,
    suggestedReplies, setSuggestedReplies, isGeneratingReplies, generatePlotOptions,
    generateStorySummary: () => {},
    // 备忘录函数
    addMemo: handleAddMemo, toggleMemoDone, deleteMemo,
    // 插件函数
    handleModUpload, toggleModEnabled, removeMod,
    // 存档函数
    handleSaveToSlot: handleSlotClick, handleLoadFromSlot: handleSlotClick,
    handleDeleteSlot: (id) => { setConfirmDialog({ isOpen: true, text: `确定要删除 No.${String(id).padStart(3, '0')} 存档吗？`, onConfirm: () => { setSaveSlots(prev => { const next = {...prev}; delete next[id]; return next; }); setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); showToast('存档已删除', 'success'); } }); },
    handleRenameSlot: handleSaveNameConfirm,
    editingSlotId, setEditingSlotId,
    // 备份函数
    handleExportFullBackup, handleImportFullBackup: handleSmartImportBackup, handleFactoryReset: handleFirstResetClick,
    handleLegacyMigration,
    getActiveMirrorId, showToast,
    // 背景图
    localTitleBgImage,
    // 媒体上传/管理函数
    handleBgUpload, removeBg, handleTitleBgUpload, clearTitleBgImage,
    handleBgmUpload, removeBgm,
    handleModelUpload, handleZipModelUpload, switchModel, removeModel,
    handleOfflineEngineUpload, handleFullscreen, handleResetFocus,
    handleEnterVisualAdjust,
    updateModelConfig, setModelReloadTrigger,
    // 其他
    isHidden, setIsHidden, newMemoText, setNewMemoText, newMemoDate, setNewMemoDate,
    isBgmMenuOpen, setIsBgmMenuOpen,
    confirmDialog, setConfirmDialog,
    // 语音输入
    isVoiceRecording, toggleVoiceRecording, startVoiceRecording, stopVoiceRecording, voiceError, setVoiceError, voiceKeyActive, asrModelStatus,
  };

  // ✨ 路由页面渲染：独立页面模式
  if (currentPage === '/') {
    navigate('/main');
    return null;
  }
  if (currentPage === '/login') {
    return null; // 登录页由 App.jsx 处理
  }
  if (currentPage === '/saveload') {
    return <AppProvider value={contextValue}><SaveLoadPage /></AppProvider>;
  }
  if (currentPage === '/log') {
    return <AppProvider value={contextValue}><LogPage /></AppProvider>;
  }
  if (currentPage === '/story' || currentPage === '/storyide') {
    // 渲染主应用，插件通过 useEffect 接管 UI
  }

 return (
    <AppProvider value={contextValue}>
    <div className="relative h-screen w-full bg-slate-900 overflow-hidden font-sans select-none" onClick={() => { setIsBgMenuOpen(false); setIsExpressionMenuOpen(false); setIsModelMenuOpen(false); }}>
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .text-outline-blue { text-shadow: -1px -1px 0 #1e3a8a, 1px -1px 0 #1e3a8a, -1px 1px 0 #1e3a8a, 1px 1px 0 #1e3a8a; } .light-scrollbar::-webkit-scrollbar { width: 8px; } .light-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 4px;} .light-scrollbar::-webkit-scrollbar-thumb { background: #d9c5b2; border-radius: 4px; } .light-scrollbar::-webkit-scrollbar-thumb:hover { background: #ba3f42; } .clip-polygon { clip-path: polygon(0 0, 100% 0, 85% 100%, 0% 100%); }
      
      /* ✨ ATRI Theme Native Core Styles */
      .atri-header::after { content: 'HELP Window'; position: absolute; right: 120px; top: 0px; width: 250px; height: 50px; background: rgba(255, 255, 255, 0.2); border-left: 1px solid rgba(255, 255, 255, 0.6); border-right: 1px solid rgba(255, 255, 255, 0.6); border-bottom: 1px solid rgba(255, 255, 255, 0.6); padding: 5px 15px; font-size: 0.75rem; color: white; font-weight: bold; pointer-events: none; background-image: linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px); background-size: 15px 15px; z-index: 0; }
      @media screen and (max-width: 800px) { .atri-header::after { display: none; } }
      .atri-tab-btn::before { content: ''; position: absolute; top: 0; bottom: 0; left: -8px; right: -8px; background: #74c1f0; transform: skewX(-25deg); z-index: -1; border-right: 2px solid rgba(255, 255, 255, 0.5); transition: all 0.2s ease; }
      .atri-tab-btn.active-tab::before { background: white; border-right: none; }
      .atri-container .bg-white\\/60 { background: rgba(255,255,255,0.4) !important; border: 1px solid rgba(255,255,255,0.6) !important; box-shadow: 0 4px 15px rgba(0,0,0,0.05) !important; }
      .atri-container .text-\\[\\#4a4036\\] { color: #1e3a8a !important; }
      .atri-container h3.text-\\[\\#ba3f42\\] { color: #1a5c9a !important; font-size: 1.15rem !important; position: relative !important; padding-left: 24px !important; }
      .atri-container h3.text-\\[\\#ba3f42\\]::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; background-color: #60a5fa; box-shadow: 5px 5px 0 #3b82f6, 5px -5px 0 #93c5fd; }
      .atri-container label.text-\\[\\#ba3f42\\] { color: #1a5c9a !important; font-weight: 900 !important; }
      .atri-container label.text-\\[\\#ba3f42\\] span.text-sm { display: none !important; }
      .atri-container .text-\\[\\#7a6b5d\\] { color: #475569 !important; }
      .atri-container input[type="file"] { color: #1e3a8a !important; font-weight: bold !important; }
      .atri-container input[type="file"]::file-selector-button { background-color: #5ab4ed !important; color: white !important; border: none !important; border-radius: 9999px !important; padding: 0.4rem 1.2rem !important; font-weight: bold !important; cursor: pointer !important; transition: all 0.2s !important; margin-right: 1rem !important; box-shadow: 0 2px 4px rgba(90, 180, 237, 0.3) !important; }
      .atri-container input[type="file"]::file-selector-button:hover { background-color: #3ea3e6 !important; transform: translateY(-1px) !important; }
      .atri-container .bg-white\\/60 button[class*="text-white"], .atri-container .bg-white\\/60 label[class*="text-white"], .atri-container .bg-white\\/60 button[class*="bg-\\[\\#"], .atri-container .bg-white\\/60 label[class*="bg-\\[\\#"] { background-color: #5ab4ed !important; color: white !important; border: none !important; box-shadow: 0 2px 6px rgba(90, 180, 237, 0.3) !important; }
      .atri-container .bg-white\\/60 button[class*="text-white"]:hover, .atri-container .bg-white\\/60 label[class*="text-white"]:hover, .atri-container .bg-white\\/60 button[class*="bg-\\[\\#"]:hover, .atri-container .bg-white\\/60 label[class*="bg-\\[\\#"]:hover { background-color: #3ea3e6 !important; transform: translateY(-1px) !important; }
      .atri-container .bg-\\[\\#e8decb\\] { background: transparent !important; box-shadow: none !important; padding: 0 !important; gap: 2px !important; border-radius: 0 !important; }
      .atri-container .bg-\\[\\#e8decb\\] button { border-radius: 0 !important; padding: 6px 36px !important; box-shadow: none !important; font-size: 0.8rem !important; }
      .atri-container .bg-\\[\\#e8decb\\] button.bg-\\[\\#ba3f42\\] { background: #5ab4ed !important; color: white !important; }
      .atri-container .bg-\\[\\#e8decb\\] button.text-\\[\\#7a6b5d\\] { background: #d1d5db !important; color: white !important; }
      .atri-container .bg-white\\/60 button.text-red-500 { background: transparent !important; box-shadow: none !important; color: #ef4444 !important; }
      `}} />
 
 {/* ✨ 新增：全局备份与恢复进度条 (左上角悬浮) */}
      {backupProgress.visible && (
        <div className="fixed top-6 left-6 z-[100000] bg-black/85 backdrop-blur-xl border border-white/20 p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-col gap-2.5 w-72 pointer-events-none transition-all duration-300 animate-fade-in">
            <div className="flex justify-between items-center text-white text-xs font-bold tracking-wider">
                <span className="flex items-center gap-1.5"><Archive size={14} className="animate-pulse text-[#4fa0d8]"/> {backupProgress.text}</span>
                <span className="text-[#4fa0d8]">{backupProgress.percent}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-[#4fa0d8] to-[#ba3f42] h-full rounded-full transition-all duration-200 ease-out" style={{ width: `${backupProgress.percent}%` }}></div>
            </div>
        </div>
      )}

      {toast.visible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] transition-all duration-300 pointer-events-auto">
          <div className={`px-6 py-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-start gap-3 backdrop-blur-md max-w-lg w-max ${toast.type === 'error' ? 'bg-red-950/90 border border-red-500/50 text-red-50' : toast.type === 'success' ? 'bg-emerald-950/90 border border-emerald-500/50 text-emerald-50' : 'bg-indigo-950/90 border border-indigo-500/50 text-indigo-50'}`}>
            {toast.type === 'error' ? <AlertCircle className="shrink-0 mt-0.5" size={18}/> : toast.type === 'success' ? <CheckCircle className="shrink-0 mt-0.5" size={18}/> : <Info className="shrink-0 mt-0.5" size={18}/>}
            <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{toast.message}</p>
            <button onClick={() => setToast(prev => ({...prev, visible: false}))} className="ml-2 text-white/50 hover:text-white"><X size={16} /></button>
          </div>
        </div>
      )}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100000] bg-black/60 flex items-center justify-center backdrop-blur-sm pointer-events-auto">
           <div className="bg-[#fdfaf5] text-[#4a4036] p-8 rounded-xl border-2 border-[#d9c5b2] shadow-[0_20px_60px_rgba(0,0,0,0.8)] max-w-sm w-full transform transition-all">
              <div className="flex items-center gap-3 mb-6 text-[#ba3f42]"><AlertCircle size={28} /><h3 className="font-bold text-xl tracking-widest">系统确认</h3></div>
              <p className="mb-10 text-[#7a6b5d] font-bold whitespace-pre-wrap leading-relaxed text-sm">{confirmDialog.text}</p>
              <div className="flex justify-end gap-3">
                 <button className="px-6 py-2.5 bg-[#e8decb] hover:bg-[#d9c5b2] text-[#4a4036] rounded-full text-sm font-bold transition-colors" onClick={() => { if(confirmDialog.onCancel) confirmDialog.onCancel(); else setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); }}>{confirmDialog.cancelText || '取消'}</button>
                 {confirmDialog.thirdButton && (<button className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-full text-sm font-bold transition-colors shadow-lg" onClick={confirmDialog.thirdButton.onClick}>{confirmDialog.thirdButton.text}</button>)}
                 {confirmDialog.onConfirm && <button className="px-6 py-2.5 bg-[#ba3f42] hover:bg-[#d64b4f] text-white rounded-full text-sm font-bold transition-colors shadow-lg" onClick={confirmDialog.onConfirm}>{confirmDialog.confirmText || '确定执行'}</button>}
              </div>
           </div>
        </div>
      )}
      {isMemoOpen && !visualAdjustMode && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100000] flex flex-col font-sans transition-opacity pointer-events-auto items-center justify-center">
           <div className="bg-[#fdfaf5] w-[90%] max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)] border-2 border-[#d9c5b2]">
              <div className="flex justify-between items-center p-4 border-b-2 border-dashed border-[#e6d5b8] bg-[#efe6d5] shrink-0">
                 <h3 className="font-black text-[#ba3f42] text-lg flex items-center gap-2"><FileText size={20}/> 备忘录与日程设定</h3>
                 <button onClick={() => setIsMemoOpen(false)} className="text-[#7a6b5d] hover:text-[#ba3f42] transition-colors"><X size={24}/></button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto light-scrollbar">
                 <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white p-4 rounded-xl border border-[#e6d5b8] shadow-sm">
                    <input type="datetime-local" value={newMemoDate} onChange={e=>setNewMemoDate(e.target.value)} className="bg-[#fdfaf5] border border-[#d9c5b2] rounded-lg px-3 py-2 outline-none text-sm text-[#4a4036] focus:border-[#ba3f42] shrink-0"/>
                    <input type="text" value={newMemoText} onChange={e=>setNewMemoText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddMemo()} placeholder="输入新的备忘或日程安排..." className="flex-1 bg-[#fdfaf5] border border-[#d9c5b2] rounded-lg px-3 py-2 outline-none text-sm text-[#4a4036] focus:border-[#ba3f42]"/>
                    <button onClick={handleAddMemo} className="bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white px-5 py-2 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center"><Plus size={18}/></button>
                 </div>
                 <div className="space-y-3">
                    {memos.length === 0 ? <p className="text-center text-[#a89578] py-12 font-bold opacity-60">暂无任何备忘事项</p> : memos.map(m => (
                       <div key={m.id} className={`flex justify-between items-center p-4 rounded-xl border transition-all ${m.isDone ? 'bg-black/5 border-transparent opacity-60' : 'bg-white border-[#e6d5b8] shadow-sm'}`}>
                          <div className="flex flex-col"><span className={`text-sm font-bold ${m.isDone ? 'line-through text-[#a89578]' : 'text-[#4a4036]'}`}>{m.text}</span>{m.date && <span className="text-xs text-[#ba3f42] mt-1.5 flex items-center gap-1"><Clock size={12}/> {new Date(m.date).toLocaleString()}</span>}</div>
                          <div className="flex gap-2 shrink-0">
                             <button onClick={() => toggleMemoDone(m.id)} className={`p-2 rounded-lg transition-colors ${m.isDone ? 'text-blue-500 hover:bg-blue-50' : 'text-emerald-500 hover:bg-emerald-50'}`} title={m.isDone ? "标记为未完成" : "标记为已完成"}><CheckCircle size={20}/></button>
                             <button onClick={() => deleteMemo(m.id)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="删除记录"><Trash2 size={20}/></button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className={`absolute top-4 right-6 z-[9000] transition-opacity duration-1000 ${bgmToast.visible ? 'opacity-100' : 'opacity-0'} pointer-events-none`}><span className="text-[10px] text-white/40 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm tracking-wider">♪ {bgmToast.name}</span></div>

      {/* ✨ 背景图层支持原生插件接管 (已修复重复渲染) */}
      <div className="absolute inset-0 bg-cover z-0 transition-all duration-1000" style={{ 
          backgroundImage: (activePluginUI && pluginDialog.bgUrl) ? `url(${pluginDialog.bgUrl})` : (activeBgUrl ? `url(${activeBgUrl})` : 'none'), 
          backgroundColor: (activePluginUI && pluginDialog.bgUrl) ? 'transparent' : (activeBgUrl ? 'transparent' : '#1e1b4b'),
          backgroundPosition: (appMode === 'title' && localTitleBgImage) ? `calc(50% + ${settings.titleBgOffsetX || 0}px) calc(50% + ${settings.titleBgOffsetY || 0}px)` : 'center'
        }}>
        {!activeBgUrl && (!activePluginUI || !pluginDialog.bgUrl) && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.1),_transparent_70%)]" />}
      </div>

      {/* ✨ 剧本模式专属的原生立绘图层 (已接入原生预览悬浮窗机制) */}
      {((activePluginUI && pluginDialog.spriteUrl) || visualAdjustMode === 'story_model') && (
          <div className="absolute inset-0 flex items-end justify-center pointer-events-none z-[15]">
             <img 
               src={(activePluginUI && pluginDialog.spriteUrl) ? pluginDialog.spriteUrl : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" width="400" height="800"><rect width="400" height="800" fill="rgba(186,63,66,0.15)" stroke="%23ba3f42" stroke-width="6" stroke-dasharray="15,15"/><circle cx="200" cy="200" r="80" fill="rgba(186,63,66,0.3)"/><path d="M100 800V500c0-60 40-100 100-100s100 40 100 100v300" fill="rgba(186,63,66,0.3)"/><text x="200" y="450" font-family="sans-serif" font-size="36" font-weight="bold" fill="%23ba3f42" text-anchor="middle">立绘预览占位</text></svg>'} 
               style={{ 
                 transform: `translate(${settings.storySpriteX || 0}px, ${settings.storySpriteY || 0}px) scale(${settings.storySpriteScale || 1.0})`, 
                 transformOrigin: 'bottom center', 
                 transition: 'all 0.3s ease',
                 filter: (activePluginUI && pluginDialog.spriteUrl) ? 'none' : 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))'
               }} 
               className={`max-h-[140%] object-contain ${!(activePluginUI && pluginDialog.spriteUrl) ? 'opacity-90' : ''}`} 
               alt="sprite" 
             />
          </div>
      )}

      {/* ✨ 核心修复：当处于故事模式时，原生 Live2D 容器必须彻底透明并失去交互，彻底解决立绘重叠！ */}
      <div ref={containerRef} className={`absolute inset-0 z-10 overflow-hidden ${activePluginUI ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'} transition-opacity duration-300`} onClick={handleModelContainerClick}>
        {live2dStatus && !settings.enableNoLive2DMode && (<div className="absolute bottom-8 left-8 flex items-center justify-center text-white/70 pointer-events-none drop-shadow-md z-30"><span className="bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm text-xs tracking-widest border border-white/10">{live2dStatus}</span></div>)}
        <canvas ref={canvasRef} className="w-full h-full block pointer-events-none" />
      </div>

      {/* 实时面部捕捉摄像头画中画 */}
      <video 
        ref={videoRef} 
        className={`absolute top-6 left-6 z-50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-2 border-white/20 object-cover backdrop-blur-sm pointer-events-none transition-all duration-300 ${settings.enableFaceTracking && settings.enableCameraPreview ? 'w-48 h-36 opacity-80' : 'w-0 h-0 opacity-0'}`} 
        autoPlay 
        playsInline 
        muted 
        style={{ transform: 'scaleX(-1)' }} 
      />

      {isSettingsOpen && visualAdjustMode === 'login_preview' && <LoginPreviewAdjust settings={settings} setSettings={setSettings} setVisualAdjustMode={setVisualAdjustMode} />}

      {isSettingsOpen && visualAdjustMode && visualAdjustMode !== 'login_preview' && (
        <div className="fixed top-8 right-8 z-[99999] w-80 bg-[#fdfaf5]/95 backdrop-blur-xl border-2 border-[#d9c5b2] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-5 text-[#4a4036] pointer-events-auto animate-fade-in">
           <div className="flex justify-between items-center border-b-2 border-dashed border-[#e6d5b8] pb-3 mb-4">
              <h3 className="font-black text-[#ba3f42] text-sm flex items-center gap-2">
                <Eye size={16} /> 
                {visualAdjustMode === 'model' && '聊天模型实时调整'} 
                {visualAdjustMode === 'title_model' && '主标题模型实时调整'} 
                {visualAdjustMode === 'dialog' && '对话框排版实时调整'}
                {visualAdjustMode === 'story_model' && '剧本立绘实时调整'}
              </h3>
              <button onClick={() => setVisualAdjustMode(null)} className="px-4 py-1.5 bg-[#ba3f42] hover:bg-[#d64b4f] text-white rounded-full text-xs font-bold transition-colors shadow-sm">返回设置</button>
           </div>
           
           {visualAdjustMode === 'model' && (
              <div className="space-y-5">
                <SettingSlider label="模型独立缩放" value={currentModelConfig.scale} min={0.01} max={2} step={0.01} suffix="x" onChange={v => updateModelConfig('scale', v)} />
                <SettingSlider label="水平独立位置 (X)" value={currentModelConfig.x} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('x', v)} />
                <SettingSlider label="垂直独立位置 (Y)" value={currentModelConfig.y} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('y', v)} />
              </div>
           )}
           {visualAdjustMode === 'title_model' && (
              <div className="space-y-5">
                <SettingSlider label="主标题模型独立缩放" value={currentModelConfig.titleScale} min={0.01} max={2} step={0.01} suffix="x" onChange={v => updateModelConfig('titleScale', v)} />
                <SettingSlider label="水平独立位置 (X)" value={currentModelConfig.titleX} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('titleX', v)} />
                <SettingSlider label="垂直独立位置 (Y)" value={currentModelConfig.titleY} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('titleY', v)} />
              </div>
           )}
           {visualAdjustMode === 'dialog' && (
              <div className="space-y-5">
                {/* ✨ 新增：快捷预览面板里的文本行距滑块 */}
                <SettingSlider label="文本行距" value={settings.dialogLineHeight || 1.8} min={1.0} max={3.0} step={0.1} suffix="倍" onChange={v => setSettings({...settings, dialogLineHeight: v})} />
                <SettingSlider label="对话框垂直偏移" value={settings.dialogPositionY} min={0} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, dialogPositionY: v})} />
                <SettingSlider label="对话框不透明度" value={settings.dialogOpacity} min={0} max={1} step={0.05} suffix="" onChange={v => setSettings({...settings, dialogOpacity: v})} />
                <div className="flex flex-col gap-2 w-full pt-2 border-t border-dashed border-[#e6d5b8]"><label className="text-[#ba3f42] font-bold flex items-center gap-1"><span className="text-sm">✱</span> 窗口背景主题色</label><div className="flex items-center gap-3"><input type="color" value={settings.dialogThemeColor} onChange={e => setSettings({...settings, dialogThemeColor: e.target.value})} className="h-10 w-full rounded cursor-pointer bg-white border border-[#d9c5b2] p-0.5 shadow-inner" /></div></div>
              </div>
           )}
           
          {/* ✨ 新增：故事剧本立绘预览调整 */}
           {visualAdjustMode === 'story_model' && (
              <div className="space-y-5">
                <SettingSlider label="立绘缩放 (Scale)" value={settings.storySpriteScale || 1.0} min={0.5} max={3.0} step={0.05} suffix="x" onChange={v => setSettings({...settings, storySpriteScale: v})} />
                <SettingSlider label="水平偏移 (X)" value={settings.storySpriteX || 0} min={-1000} max={1000} step={10} suffix="px" onChange={v => setSettings({...settings, storySpriteX: v})} />
                <SettingSlider label="垂直偏移 (Y)" value={settings.storySpriteY || 0} min={-1000} max={1000} step={10} suffix="px" onChange={v => setSettings({...settings, storySpriteY: v})} />
              </div>
           )}
           {/* ✨ 新增：主标题排版预览调整 */}
           {visualAdjustMode === 'title_text' && (
              <div className="space-y-5">
                <SettingSlider label="主标题水平位置 (X)" value={settings.mainTitleX} min={-800} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, mainTitleX: v})} />
                <SettingSlider label="主标题垂直位置 (Y)" value={settings.mainTitleY} min={-500} max={500} step={10} suffix="px" onChange={v => setSettings({...settings, mainTitleY: v})} />
                <div className="border-t border-dashed border-[#e6d5b8] my-2"></div>
                <SettingSlider label="副标题水平位置 (X)" value={settings.subTitleX} min={-800} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, subTitleX: v})} />
                <SettingSlider label="副标题垂直位置 (Y)" value={settings.subTitleY} min={-500} max={500} step={10} suffix="px" onChange={v => setSettings({...settings, subTitleY: v})} />
              </div>
           )}
           {/* ✨ 新增：主标题背景偏移预览调整 */}
           {visualAdjustMode === 'title_bg' && (
              <div className="space-y-5">
                <SettingSlider label="背景水平偏移 (X)" value={settings.titleBgOffsetX} min={-1000} max={1000} step={10} suffix="px" onChange={v => setSettings({...settings, titleBgOffsetX: v})} />
                <SettingSlider label="背景垂直偏移 (Y)" value={settings.titleBgOffsetY} min={-1000} max={1000} step={10} suffix="px" onChange={v => setSettings({...settings, titleBgOffsetY: v})} />
              </div>
           )}
        </div>
    )}

      {appMode === 'title' && (
        <div className="absolute inset-0 z-20 pointer-events-none flex">
          <div className={`flex-1 flex flex-col justify-center relative w-full h-full ${settings.enableMobileUI ? 'px-8 md:px-24 lg:px-32' : 'px-12 md:px-32'}`}>
            <div className="pointer-events-auto">
              <h1 className="font-black drop-shadow-[0_5px_5px_rgba(30,58,138,0.8)] tracking-widest leading-none inline-block transition-transform duration-300" style={{ fontSize: settings.enableMobileUI ? 'clamp(4rem, 8vw, 8rem)' : 'clamp(5rem, 8vw, 8rem)', color: settings.mainTitleColor, fontFamily: settings.mainTitleFont, transform: `translate(${settings.mainTitleX || 0}px, ${settings.mainTitleY || 0}px)` }}>{settings.mainTitleText}</h1><br/>
              <p className={`font-bold tracking-[0.4em] mt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] inline-block transition-transform duration-300 ${settings.enableMobileUI ? 'text-lg md:text-2xl md:ml-2' : 'text-xl md:text-2xl ml-2'}`} style={{ color: settings.subTitleColor, fontFamily: settings.subTitleFont, transform: `translate(${settings.subTitleX || 0}px, ${settings.subTitleY || 0}px)` }}>{settings.subTitleText}</p>
             {/* ✨ 优化：增加 max-h 和 overflow-y-auto，让手机横屏时可以上下滑动菜单 */}
             <div className={`flex flex-col w-56 max-h-[50vh] landscape:max-h-[45vh] overflow-y-auto hide-scrollbar py-2 ${settings.enableMobileUI ? 'mt-8 md:mt-24 gap-5 md:gap-6 ml-2 md:ml-4' : 'mt-12 md:mt-24 gap-6 ml-4'}`}>
                <button onClick={handleStartGame} className={`shrink-0 text-left font-bold text-white/90 hover:text-blue-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-md ${settings.enableMobileUI ? 'text-xl md:text-2xl' : 'text-2xl'}`}>START</button>
                <button onClick={handleContinueGame} className={`shrink-0 text-left font-bold text-white/90 hover:text-blue-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-md ${settings.enableMobileUI ? 'text-xl md:text-2xl' : 'text-2xl'}`}>CONTINUE</button>
                
                {/* ✨ 原生级动态注入插件按钮 */}
                {pluginTitleButtons.map(btn => (
                   <button key={btn.id} onClick={btn.onClick} className={`shrink-0 text-left font-bold text-amber-400 hover:text-amber-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-[0_2px_10px_rgba(251,191,36,0.3)] ${settings.enableMobileUI ? 'text-xl md:text-2xl' : 'text-2xl'}`}>{btn.label}</button>
                ))}

                <button onClick={() => { setSlMode('load'); setIsSaveLoadUIOpen(true); }} className={`shrink-0 text-left font-bold text-white/90 hover:text-blue-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-md ${settings.enableMobileUI ? 'text-xl md:text-2xl' : 'text-2xl'}`}>LOAD</button>
                <button onClick={() => {
                  if (getCurrentUser() !== 'Admin') { showToast('请使用Admin账号登录后访问', 'error'); return; }
                  setIsBotPanelOpen(true); setBotPasswordVerified(false); setBotPasswordInput(''); setBotPasswordError(''); setBotPasswordAttempts(0);
                }} className={`shrink-0 text-left font-bold text-white/90 hover:text-blue-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-md ${settings.enableMobileUI ? 'text-xl md:text-2xl' : 'text-2xl'}`}>BOT</button>
                <button onClick={() => { setIsSettingsOpen(true); }} className={`shrink-0 text-left font-bold text-white/90 hover:text-blue-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-md ${settings.enableMobileUI ? 'text-xl md:text-2xl' : 'text-2xl'}`}>SYSTEM</button>
                <button onClick={handleExitGame} className={`shrink-0 text-left font-bold text-white/90 hover:text-blue-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-md ${settings.enableMobileUI ? 'text-xl md:text-2xl' : 'text-2xl'}`}>EXIT</button>
                <div className="border-t border-white/10 my-1"></div>
                <button onClick={handleLogout} className={`shrink-0 text-left font-bold text-rose-400/70 hover:text-rose-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-md ${settings.enableMobileUI ? 'text-base md:text-lg' : 'text-lg'}`}>
                  LOGOUT <span className="text-xs opacity-50 ml-1">{getCurrentUser()}</span>
                </button>
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 right-8 text-white/60 font-bold text-sm drop-shadow-md pointer-events-none">v5.0-Pro</div>
        </div>
      )}

      {appMode === 'title' && settings.showTitleBgmPlayer && (
        <div 
           className="absolute z-[8500] bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col p-4 w-72 pointer-events-auto transition-transform duration-75"
           style={{ left: '2rem', bottom: '2rem', transform: `translate(${bgmOffset.x}px, ${bgmOffset.y}px)` }}
        >
           <div 
             className="flex justify-center items-center mb-3 cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity"
             onMouseDown={handleBgmPointerDown} onTouchStart={handleBgmPointerDown}
           >
             <GripHorizontal size={18} className="text-white" />
           </div>
           <div className="text-white text-sm font-bold truncate mb-4 text-center tracking-wider drop-shadow-md px-2">
             {bgmList.length > 0 ? (bgmList[currentBgmIndex]?.name || '加载中...') : '暂无背景音乐'}
           </div>
           <div className="flex justify-between items-center px-3">
             <button onClick={toggleBgmMode} className="text-white/60 hover:text-white transition-colors" title="播放模式 (顺序/随机/单曲循环)">
               {settings.bgmMode === 'sequential' && <Repeat size={18} />}
               {settings.bgmMode === 'random' && <Shuffle size={18} />}
               {settings.bgmMode === 'loop' && <Repeat1 size={18} />}
             </button>
             <div className="flex items-center gap-4">
               <button onClick={handlePrevBgm} className="text-white/80 hover:text-white transition-colors"><SkipBack size={20} /></button>
               <button onClick={toggleBgm} className="bg-white text-black p-2.5 rounded-full hover:scale-105 transition-all shadow-md">
                 {isBgmPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}
               </button>
               <button onClick={handleNextBgm} className="text-white/80 hover:text-white transition-colors"><SkipForward size={20} /></button>
             </div>
             <button onClick={() => setSettings({...settings, showTitleBgmPlayer: false})} className="text-white/30 hover:text-red-400 transition-colors" title="关闭播放器 (可在设置中恢复)"><X size={18} /></button>
           </div>
        </div>
      )}

    {appMode === 'game' && !visualAdjustMode && (
        <>
          {!activePluginUI && (
            <div className={`absolute top-16 right-6 z-[8000] flex flex-col items-end gap-3 pointer-events-none max-w-[300px] md:max-w-sm transition-all duration-500 ${isImmersive ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
              {isGeneratingReplies && (<div className="pointer-events-auto"><span className="bg-black/60 text-indigo-300 text-xs px-4 py-1.5 rounded-full animate-pulse border border-indigo-500/30 backdrop-blur-md shadow-lg flex items-center"><Sparkles size={12} className="mr-1" /> 正在推演选项...</span></div>)}
              {!isGeneratingReplies && suggestedReplies.length > 0 && (
                <div className="flex flex-col gap-2.5 items-end pointer-events-auto w-full">
                  {suggestedReplies.map((reply, idx) => (
                    <button key={idx} onClick={() => { setInputValue(reply); setSuggestedReplies([]); }} className="group bg-black/70 hover:bg-indigo-900/90 border border-indigo-500/50 text-indigo-50 px-4 py-3 rounded-xl text-sm tracking-widest backdrop-blur-md transition-all shadow-[0_4px_15px_rgba(79,70,229,0.3)] hover:shadow-[0_4px_20px_rgba(79,70,229,0.6)] hover:-translate-x-1 text-left break-words w-full border-r-4 border-r-pink-500"><span className="text-pink-400 mr-1.5 opacity-80 text-xs transition-transform group-hover:translate-x-1 inline-block">▶</span> {reply}</button>
                  ))}
                </div>
             )}
            </div>
          )}

         {/* ✨ 核心渲染重构：将 className 里的 -translate-x-1/2 抽离到 style transform 中，以便叠加全局 Scale 缩放 */}
         {(!activePluginUI || pluginDialog.visible) && (
            <div className="absolute left-1/2 z-20 pointer-events-none flex flex-col transition-all duration-300 w-[94%] max-w-5xl" style={{ bottom: `calc(1.5rem - ${settings.dialogPositionY}px)`, transform: `translateX(-50%) ${settings.enableMobileUI ? `scale(${settings.mobileUIScale || 1.0})` : ''}`, transformOrigin: 'bottom center' }}>
              <div className={`transition-opacity duration-300 ${(!activePluginUI && latestMessage) || (activePluginUI && pluginDialog.speaker) ? 'opacity-100' : 'opacity-0'}`}>
                <div className={`px-4 md:px-8 py-1 rounded-t-lg w-fit text-sm md:text-xl font-bold tracking-widest text-white ${settings.dialogOpacity > 0 ? 'backdrop-blur-md' : ''} pointer-events-auto transition-colors duration-300`} style={{ backgroundColor: activePluginUI ? hexToRgba('#312e81', settings.dialogOpacity) : (latestMessage?.role === 'user' ? hexToRgba('#064e3b', settings.dialogOpacity) : hexToRgba('#312e81', settings.dialogOpacity)), borderLeft: `4px solid rgba(${(!activePluginUI && latestMessage?.role === 'user') ? '52, 211, 153' : '129, 140, 248'}, ${settings.dialogOpacity > 0 ? 1 : 0})` }}>
                  {activePluginUI ? pluginDialog.speaker : (latestMessage?.role === 'user' ? settings.userName : settings.aiName)}
                </div>
              </div>

           <div className={`rounded-b-xl rounded-tr-xl ${settings.dialogOpacity > 0 ? 'backdrop-blur-sm' : ''} relative flex flex-col pointer-events-auto transition-all duration-300 ${hasNextPage || activePluginUI ? 'cursor-pointer' : ''}`} style={{ backgroundColor: hexToRgba(settings.dialogThemeColor, settings.dialogOpacity), borderColor: `rgba(255, 255, 255, ${settings.dialogOpacity * 0.2})`, borderWidth: settings.dialogOpacity > 0 ? '1px' : '0px', boxShadow: settings.dialogOpacity > 0.1 ? `0 8px 32px rgba(0,0,0,${settings.dialogOpacity * 0.5})` : 'none' }} onClick={(e) => { e.stopPropagation(); if(activePluginUI){ window.dispatchEvent(new CustomEvent('gwc-dialog-click')); } else { handleDialogClick(); } }} onWheel={handleWheel}>
                {/* ✨ 优化：通过开关隔离移动端紧凑模式与PC端原版宽敞模式 */}
                <div ref={vnTextContainerRef} style={{ color: settings.dialogTextColor, fontFamily: settings.dialogFontFamily, lineHeight: settings.dialogLineHeight || 1.8 }} className={`overflow-y-auto scroll-smooth relative pointer-events-auto select-text cursor-text tracking-widest ${settings.enableMobileUI ? 'p-3 md:p-6 landscape:p-2 landscape:md:p-4 pb-2 md:pb-4 landscape:pb-1 text-sm sm:text-base md:text-xl lg:text-2xl landscape:text-sm min-h-[60px] md:min-h-[120px] landscape:min-h-[50px] max-h-[35vh] landscape:max-h-[22vh]' : 'p-8 pb-4 text-xl md:text-2xl min-h-[140px] max-h-[30vh]'}`}>
                  {activePluginUI ? (
                      <span>
                        <span className="whitespace-pre-wrap">{pluginDialog.text}</span>
                        {pluginDialog.typing && <span className={`inline-block ml-1 bg-white/70 animate-pulse align-middle rounded-sm ${settings.enableMobileUI ? 'w-2 md:w-2.5 h-4 md:h-6' : 'w-2.5 h-6'}`}></span>}
                        {!pluginDialog.typing && <span className={`inline-block animate-bounce text-indigo-300 pointer-events-none select-none ${settings.enableMobileUI ? 'ml-2 md:ml-3' : 'ml-3'}`}><ChevronDown size={settings.enableMobileUI ? 20 : 24} className={settings.enableMobileUI ? "md:w-6 md:h-6" : ""}/></span>}
                      </span>
                  ) : (latestMessage 
                    ? <span className={`${latestMessage.isError ? 'text-red-400' : ''}`}>
                        <div className="whitespace-pre-wrap">{currentDisplay}</div>
                        {latestMessage.isStreaming && !hasNextPage && <span className={`inline-block ml-1 bg-white/70 animate-pulse align-middle rounded-sm ${settings.enableMobileUI ? 'w-2 md:w-2.5 h-4 md:h-6' : 'w-2.5 h-6'}`}></span>}
                        {hasNextPage && <span className={`inline-block animate-bounce text-indigo-300 pointer-events-none select-none ${settings.enableMobileUI ? 'ml-2 md:ml-3' : 'ml-3'}`}><ChevronDown size={settings.enableMobileUI ? 20 : 24} className={settings.enableMobileUI ? "md:w-6 md:h-6" : ""} /></span>}
                      </span>
                    : <span className="italic pointer-events-none select-none" style={{ opacity: settings.dialogOpacity > 0 ? 0.4 : 0.8, color: '#ffffff' }}>（环境极其安静，试着在下方输入框说点什么打破沉寂吧...）</span>
                  )}
                </div>

                {!activePluginUI && (
                  <div className={`border-t border-white/10 flex flex-col relative pointer-events-auto ${settings.enableMobileUI ? 'px-2 md:px-6 py-1.5 md:py-3 landscape:py-1' : 'px-6 py-4'}`} onClick={e => e.stopPropagation()}>
                    {selectedFiles.length > 0 && (
                        <div className={`flex flex-wrap ${settings.enableMobileUI ? 'mb-2 md:mb-3 gap-2 md:gap-3' : 'mb-3 gap-3'}`}>
                            {selectedFiles.map((f, i) => (
                                <div key={i} className={`relative rounded-md border border-white/20 overflow-hidden shadow-lg flex items-center bg-black/50 pr-2 ${settings.enableMobileUI ? 'h-12 md:h-16 max-w-[150px] md:max-w-[200px]' : 'h-16 max-w-[200px]'}`}>
                                    {f.type === 'image' ? <img src={f.data} className={`object-cover shrink-0 ${settings.enableMobileUI ? 'w-12 h-12 md:w-16 md:h-16' : 'w-16 h-16'}`} alt="preview" /> : <div className={`flex items-center justify-center text-white/50 bg-white/5 shrink-0 ${settings.enableMobileUI ? 'w-12 h-12 md:w-16 md:h-16' : 'w-16 h-16'}`}><FileText size={settings.enableMobileUI ? 20 : 24}/></div>}
                                    {f.type === 'document' && <span className={`text-white/80 ml-2 truncate font-bold ${settings.enableMobileUI ? 'text-[10px] md:text-xs' : 'text-xs'}`}>{f.name}</span>}
                                    <button onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-black/60 p-1 rounded-bl-md hover:bg-red-500 text-white transition-colors" title="取消文件"><X size={10} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className={`flex items-center w-full ${settings.enableMobileUI ? 'gap-1.5 md:gap-3' : 'gap-3'}`}>
                      <input type="file" accept="image/*,.txt,.md,.json,.csv" multiple hidden ref={fileInputRef} onChange={handleFileSelect} />
                      <button onClick={() => fileInputRef.current.click()} className={`text-white/50 hover:text-white transition-colors shrink-0 bg-white/5 hover:bg-white/10 rounded-md ${settings.enableMobileUI ? 'p-1.5 md:p-2' : 'p-2'}`} title="上传附件(图片/文档)"><Plus size={settings.enableMobileUI ? 18 : 20} className={settings.enableMobileUI ? "md:w-5 md:h-5" : ""}/></button>
                      <div className="flex-1 relative">
                        <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={settings.workMode ? "编程模式，无字数限制..." : "输入你想说的话..."} disabled={isLoading} className={`w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 focus:bg-black/40 transition-all font-sans disabled:opacity-50 ${settings.enableMobileUI ? 'px-2 py-1.5 md:px-4 md:py-2 landscape:py-1 text-xs md:text-base' : 'px-4 py-3 text-base'}`} />
                        <button onClick={handleSendMessage} disabled={(!inputValue.trim() && selectedFiles.length === 0) || isLoading} className={`absolute top-1/2 -translate-y-1/2 bg-indigo-500/80 hover:bg-indigo-400 disabled:bg-white/10 text-white rounded-md transition-colors ${settings.enableMobileUI ? 'right-1.5 md:right-2 p-1.5 md:p-2' : 'right-2 p-2'}`}><Send size={settings.enableMobileUI ? 16 : 18} className={settings.enableMobileUI ? "md:w-[18px] md:h-[18px]" : ""} /></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ✨ 快捷栏全面适配：修复字体发黑 Bug，严格限定颜色，同时保留双端隔离 */}
              <div className={`w-full flex justify-end pointer-events-none z-[9000] ${settings.enableMobileUI ? 'mt-1 md:mt-2' : 'mt-2'}`}>
                <div className={`flex flex-wrap justify-end items-center ${settings.dialogOpacity > 0 ? 'backdrop-blur-md' : ''} rounded-xl font-bold shadow-lg transition-colors duration-300 pointer-events-auto text-indigo-200 ${settings.enableMobileUI ? 'px-2 md:px-4 py-1 md:py-2 landscape:py-1 gap-x-2 md:gap-x-4 gap-y-1 md:gap-y-2 text-[10px] sm:text-xs md:text-sm' : 'px-4 py-2 gap-x-5 gap-y-2.5 text-sm'}`} style={{ backgroundColor: hexToRgba(settings.dialogThemeColor, settings.dialogOpacity), border: settings.dialogOpacity > 0 ? `1px solid rgba(255, 255, 255, ${settings.dialogOpacity * 0.2})` : 'none' }} onClick={e => e.stopPropagation()}>
                  
                  {/* ✨ 快捷栏全面挂载拦截器 (triggerShortcut) */}
                  {settings.shortcuts?.save && <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={(e) => triggerShortcut('save', handleAutoSaveSButton, e)} title="一键保存当前进度并命名">S</span>}
                  {settings.shortcuts?.load && <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={(e) => triggerShortcut('load', () => { setSlMode('load'); setIsSaveLoadUIOpen(true); }, e)} title="打开存档/读档页面">L</span>}
                  {settings.shortcuts?.quickSave && <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={(e) => triggerShortcut('quickSave', handleQuickSave, e)} title="记录临时快捷存档 (不占常规栏位)">QS</span>}
                  {settings.shortcuts?.quickLoad && <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={(e) => triggerShortcut('quickLoad', handleQuickLoad, e)} title="瞬间加载快捷存档">QL</span>}
                  {settings.shortcuts?.skip && <span className="cursor-pointer text-blue-300 hover:text-white transition-colors shrink-0 whitespace-nowrap font-bold" onClick={(e) => triggerShortcut('skip', handleSkip, e)} title="跳过当前对话，直接翻到最后一页">SKIP</span>}
                  
                  {(settings.shortcuts?.save || settings.shortcuts?.load || settings.shortcuts?.quickSave || settings.shortcuts?.quickLoad || settings.shortcuts?.skip) && 
                    <span className="hidden sm:inline-block w-px h-4 bg-white/20 mx-1 shrink-0"></span>
                  }
                  
                  {/* ✨ 核心修复：当处于故事剧本模式 (activePluginUI) 时，自动隐藏所有用不到的功能 */}
                  {settings.shortcuts?.bg && !activePluginUI && (
                    <div className="relative flex items-center shrink-0">
                      <span className="cursor-pointer transition-colors flex items-center gap-1 hover:text-white whitespace-nowrap" onClick={(e) => triggerShortcut('bg', () => { setIsBgMenuOpen(!isBgMenuOpen); setIsExpressionMenuOpen(false); setIsModelMenuOpen(false); }, e)} title="切换背景"><ImageIcon size={14} /> 背景</span>
                      {isBgMenuOpen && (
                        <div className="absolute bottom-full mb-3 right-0 bg-black/85 backdrop-blur-xl border border-white/20 rounded-xl p-2 w-48 max-h-64 overflow-y-auto flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50">
                          {bgList.length === 0 ? (<span className="text-xs text-white/50 px-3 py-2 text-center">暂无背景，请在设置中导入</span>) : (
                            <>
                              <button onClick={() => { setSettings(s => ({...s, currentBgId: null})); setIsBgMenuOpen(false); }} className={`shrink-0 text-sm px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap overflow-hidden overflow-ellipsis leading-tight ${settings.currentBgId === null ? 'bg-indigo-600/80 text-white font-bold' : 'hover:bg-white/10 text-white/80'}`}>默认背景 (无)</button>
                              {bgList.map(bg => <button key={bg.id} onClick={() => { setSettings(s => ({...s, currentBgId: bg.id})); setIsBgMenuOpen(false); }} className={`shrink-0 text-sm px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap overflow-hidden overflow-ellipsis leading-tight ${settings.currentBgId === bg.id ? 'bg-indigo-600/80 text-white font-bold' : 'hover:bg-white/10 text-white/80'}`}>{bg.name}</button>)}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {settings.shortcuts?.model && !activePluginUI && (
                    <div className="relative flex items-center shrink-0">
                      <span className="cursor-pointer transition-colors flex items-center gap-1 hover:text-white whitespace-nowrap" onClick={(e) => triggerShortcut('model', () => { setIsModelMenuOpen(!isModelMenuOpen); setIsBgMenuOpen(false); setIsExpressionMenuOpen(false); }, e)} title="切换Live2D模型/立绘"><User size={14} /> 模型</span>
                      {isModelMenuOpen && (
                        <div className="absolute bottom-full mb-3 right-0 bg-black/85 backdrop-blur-xl border border-white/20 rounded-xl p-2 w-52 max-h-72 overflow-y-auto flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50">
                          {/* Live2D 模型列表 */}
                          {modelsList.length > 0 && (
                            <>
                              <span className="text-[10px] text-white/40 px-3 py-1 font-bold tracking-wider">LIVE2D 模型</span>
                              {modelsList.map(m => (
                                <button key={m.id} onClick={() => {
                                  if (settings.currentModelId === m.id && !window.__spriteDLC?.enabled) {
                                    // 再次点击已选中的模型 → 不做操作
                                    return;
                                  }
                                  // 禁用立绘，切换到 Live2D 模型
                                  if (window.__spriteDLC) window.__spriteDLC.enabled = false;
                                  switchModel(m.id);
                                }} className={`shrink-0 text-sm px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap overflow-hidden overflow-ellipsis leading-tight ${settings.currentModelId === m.id && !window.__spriteDLC?.enabled ? 'bg-indigo-600/80 text-white font-bold' : 'hover:bg-white/10 text-white/80'}`}>
                                  {m.name}
                                </button>
                              ))}
                              <div className="border-t border-white/10 my-1"></div>
                            </>
                          )}
                          {/* 立绘列表 */}
                          {window.__allSpriteSets && window.__allSpriteSets.length > 0 && (
                            <>
                              <span className="text-[10px] text-white/40 px-3 py-1 font-bold tracking-wider">立绘模式</span>
                              {window.__allSpriteSets.map(set => (
                                <button key={set.id} onClick={() => {
                                  const isActive = settings.spriteDlcEnabled && settings.spriteDlcActiveId === set.id;
                                  if (isActive) {
                                    // 再次点击已激活的立绘 → 关闭立绘，恢复 Live2D
                                    setSettings(s => ({...s, spriteDlcEnabled: false, spriteDlcActiveId: null}));
                                  } else {
                                    // 激活立绘（通过 settings 触发插件同步）
                                    setSettings(s => ({...s, spriteDlcEnabled: true, spriteDlcActiveId: set.id}));
                                  }
                                  setIsModelMenuOpen(false);
                                }} className={`shrink-0 text-sm px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap overflow-hidden overflow-ellipsis leading-tight ${settings.spriteDlcEnabled && settings.spriteDlcActiveId === set.id ? 'bg-purple-600/80 text-white font-bold' : 'hover:bg-white/10 text-white/80'}`}>
                                  🎨 {set.name}
                                </button>
                              ))}
                            </>
                          )}
                          {modelsList.length === 0 && (!window.__allSpriteSets || window.__allSpriteSets.length === 0) && (
                            <span className="text-xs text-white/50 px-3 py-2 text-center">暂无模型或立绘</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {settings.shortcuts?.expression && !activePluginUI && (
                    <div className="relative flex items-center shrink-0">
                      <span className="cursor-pointer transition-colors flex items-center gap-1 hover:text-white whitespace-nowrap" onClick={(e) => triggerShortcut('expression', () => { setIsExpressionMenuOpen(!isExpressionMenuOpen); setIsBgMenuOpen(false); setIsModelMenuOpen(false); }, e)} title="切换模型预设表情"><Smile size={14} /> 表情</span>
                      {isExpressionMenuOpen && (
                        <div className="absolute bottom-full mb-3 right-0 bg-black/85 backdrop-blur-xl border border-white/20 rounded-xl p-2 w-48 max-h-64 overflow-y-auto flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50">
                          {expressions.length === 0 ? (<span className="text-xs text-white/50 px-3 py-2 text-center">当前模型无预设表情</span>) : (
                            <>
                              <button onClick={() => { if(modelRef.current?.internalModel?.motionManager?.expressionManager) modelRef.current.internalModel.motionManager.expressionManager.restoreExpression(); setSettings(s => ({...s, currentExpressionId: null})); setIsExpressionMenuOpen(false); }} className="shrink-0 text-sm px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap overflow-hidden overflow-ellipsis leading-tight hover:bg-white/10 text-white/80 border-b border-white/10">恢复默认</button>
                              {expressions.map(exp => (<button key={exp.id} onClick={() => { modelRef.current?.expression(exp.id); setSettings(s => ({...s, currentExpressionId: exp.id})); setIsExpressionMenuOpen(false); }} className={`shrink-0 text-sm px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap overflow-hidden overflow-ellipsis leading-tight ${settings.currentExpressionId === exp.id ? 'bg-indigo-600/80 text-white font-bold' : 'hover:bg-white/10 text-white/80'}`}>{exp.name}</button>))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {settings.shortcuts?.memo && !activePluginUI && <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap hover:text-white`} onClick={(e) => triggerShortcut('memo', () => { setIsMemoOpen(true); }, e)} title="记录备忘录或日程安排"><FileText size={14} /> 备忘</span>}
                  {settings.shortcuts?.workMode && !activePluginUI && <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${settings.workMode ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]' : 'hover:text-white'}`} onClick={(e) => triggerShortcut('workMode', () => { const newMode = !settings.workMode; setSettings({...settings, workMode: newMode, ttsEnabled: newMode ? false : settings.ttsEnabled}); if (newMode) showToast("💻 OpenCode 工作模式开启！消息将由 OpenCode 处理（支持文件操作、联网搜索）", "success", 5000); else showToast("🌸 聊天模式开启！", "info"); }, e)} title="工作模式 (OpenCode)"><Monitor size={14} /> {settings.workMode ? '工作:开' : '工作:关'}</span>}
                  {ocTaskId && <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${ocVisible ? 'text-blue-300' : 'text-gray-500 hover:text-white'}`} onClick={() => setOcVisible(!ocVisible)} title="显示/隐藏 OpenCode 工作窗"><Square size={12} /> OC窗</span>}
                  
                  {settings.shortcuts?.faceTracking && !activePluginUI && <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${settings.enableFaceTracking ? 'text-indigo-300 drop-shadow-[0_0_5px_rgba(165,180,252,0.8)]' : 'hover:text-white'}`} onClick={(e) => triggerShortcut('faceTracking', () => { setSettings({...settings, enableFaceTracking: !settings.enableFaceTracking}); }, e)} title="开启/关闭摄像头实时面捕 (Face Tracking)"><Video size={14} className={isFaceTrackingLoading ? 'animate-pulse' : ''}/> {settings.enableFaceTracking ? '面捕:开' : '面捕:关'}</span>}
                  {settings.shortcuts?.hideModel && !activePluginUI && <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${settings.hideLive2dModel ? 'text-white/50 hover:text-white' : 'hover:text-white'}`} onClick={(e) => triggerShortcut('hideModel', () => { setSettings({...settings, hideLive2dModel: !settings.hideLive2dModel}); }, e)} title="开启/关闭看板娘显示"><Eye size={14} /> {settings.hideLive2dModel ? '模型:隐' : '模型:显'}</span>}
                  {settings.shortcuts?.bgm && <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${isBgmPlaying ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'hover:text-white'}`} onClick={(e) => triggerShortcut('bgm', toggleBgm, e)} title="播放/暂停背景音乐"><Music size={14} className={isBgmPlaying ? 'animate-pulse' : ''}/> BGM</span>}
                  {settings.shortcuts?.plot && !activePluginUI && <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${settings.enablePlotOptions ? 'text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.8)]' : 'hover:text-white'}`} onClick={(e) => triggerShortcut('plot', () => setSettings({...settings, enablePlotOptions: !settings.enablePlotOptions}), e)} title="开启/关闭剧情选项推演"><Sparkles size={14} className={settings.enablePlotOptions ? 'animate-pulse' : ''}/> 选项</span>}
                  {settings.shortcuts?.tts && <span className={`cursor-pointer transition-colors shrink-0 whitespace-nowrap ${settings.ttsEnabled ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'hover:text-white'}`} onClick={(e) => triggerShortcut('tts', () => setSettings({...settings, ttsEnabled: !settings.ttsEnabled}), e)}>Auto(TTS)</span>}
                  {settings.shortcuts?.log && <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={(e) => triggerShortcut('log', () => setIsLogOpen(true), e)}>Log</span>}
                  
                  {/* 强制始终显示设置按钮以防锁死 */}
                  <Settings className="w-4 h-4 cursor-pointer hover:text-white transition-colors shrink-0" onClick={() => { setIsSettingsOpen(true); }} title="系统设置" />
                </div>
              </div>
            </div>
          )}
        </>
      )}

     {/* SAVE / LOAD UI */}
      {isSaveLoadUIOpen && !visualAdjustMode && (
        <div className="fixed inset-0 z-[100] flex flex-col font-sans select-none pointer-events-auto bg-gradient-to-b from-[#87CEEB] to-[#E0F6FF]">
          {/* 修复：使用 flex-wrap 让移动端按钮自由换行，不被挤出屏幕 */}
          <div className="flex flex-wrap justify-between items-center md:items-end px-4 md:px-12 pt-4 md:pt-8 pb-2 md:pb-4 shrink-0 gap-4">
             <h1 className="text-4xl md:text-7xl font-bold text-white tracking-widest drop-shadow-md leading-none w-full md:w-auto text-center md:text-left">{slMode === 'save' ? 'SAVE' : 'LOAD'}</h1>
             <div className="flex flex-wrap justify-center md:justify-end items-end w-full md:w-auto gap-1 md:gap-0">
                <div className="hidden md:block text-xs text-white/80 bg-black/20 px-3 py-1 rounded-t-md mb-0.5 mr-6 backdrop-blur-sm">SYSTEM Window</div>
                <button onClick={() => setSlMode('save')} className={`px-4 md:px-10 py-2 md:py-3 md:rounded-tl-xl rounded-md md:rounded-none font-bold tracking-wider text-xs md:text-sm transition-all shadow-md ${slMode === 'save' ? 'bg-white text-[#4fa0d8] h-10 md:h-12' : 'bg-[#4fa0d8] text-white hover:bg-[#5db4f0] h-10 border border-white/40 md:border-b-0'}`}>SAVE</button>
                <button onClick={() => setSlMode('load')} className={`px-4 md:px-10 py-2 md:py-3 font-bold tracking-wider text-xs md:text-sm transition-all shadow-md rounded-md md:rounded-none ${slMode === 'load' ? 'bg-white text-[#4fa0d8] h-10 md:h-12' : 'bg-[#4fa0d8] text-white hover:bg-[#5db4f0] h-10 border border-white/40 md:border-b-0 md:border-l-0'}`}>LOAD</button>
                <button onClick={handleQuickLoad} className="px-4 md:px-10 py-2 md:py-3 font-bold tracking-wider text-xs md:text-sm transition-all shadow-md bg-[#4fa0d8] text-white hover:bg-[#5db4f0] h-10 rounded-md md:rounded-none border border-white/40 md:border-b-0 md:border-l-0">Q.LOAD</button>
                <button onClick={() => showToast("语音回放库暂未实现", "info")} className="px-4 md:px-10 py-2 md:py-3 md:rounded-tr-xl rounded-md md:rounded-none font-bold tracking-wider text-xs md:text-sm transition-all shadow-md bg-[#4fa0d8] text-white hover:bg-[#5db4f0] h-10 border border-white/40 md:border-b-0 md:border-l-0">VOICE</button>
             </div>
          </div>
          
          {/* 修复：追加 min-h-0 强制内部的 flex-1 生效独立滚动，不再把屏幕顶破 */}
          <div className="flex-1 min-h-0 px-4 md:px-12 py-2 md:py-4 flex flex-col w-full max-w-7xl mx-auto overflow-y-auto light-scrollbar">
             {slPage === 1 && (
               <div className="mb-3 md:mb-4 flex flex-col md:flex-row gap-2 md:gap-4 shrink-0">
                 <div onClick={() => slMode === 'load' ? handleQuickLoad() : handleQuickSave()} className="flex-1 group relative w-full h-auto md:h-16 py-2 md:py-3 bg-gradient-to-r from-amber-500/90 to-orange-400/90 border-2 border-white/80 rounded-sm cursor-pointer hover:border-white shadow-lg transition-all overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6">
                   <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto"><span className="text-white font-black text-sm md:text-lg drop-shadow-md italic">No.000</span><span className="text-white font-bold text-sm md:text-lg drop-shadow-md truncate flex-1">{quickSaveData ? quickSaveData.title : 'No Data (快捷栏位)'}</span></div>
                   <div className="text-white/80 text-[10px] md:text-sm font-bold tracking-wider mt-1 md:mt-0">{quickSaveData ? quickSaveData.date : ''}</div>
                   <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors"></div>
                 </div>
                 <div onClick={() => slMode === 'load' ? handleAutoLoad() : showToast('自动存档位仅供读取，系统会在后台自动覆盖。', 'info')} className="flex-1 group relative w-full h-auto md:h-16 py-2 md:py-3 bg-gradient-to-r from-cyan-600/90 to-blue-500/90 border-2 border-white/80 rounded-sm cursor-pointer hover:border-white shadow-lg transition-all overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6">
                   <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto"><span className="text-white font-black text-sm md:text-lg drop-shadow-md italic">AUTO</span><span className="text-white font-bold text-sm md:text-lg drop-shadow-md truncate flex-1">{autoSaveData ? autoSaveData.title : 'No Data (自动存档)'}</span></div>
                   <div className="text-white/80 text-[10px] md:text-sm font-bold tracking-wider mt-1 md:mt-0">{autoSaveData ? autoSaveData.date : ''}</div>
                   <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors"></div>
                 </div>
               </div>
             )}

             <div className="grid grid-cols-2 gap-x-2 md:gap-x-8 gap-y-2 md:gap-y-4 flex-1 pb-4">
                {Array.from({length: 10}).map((_, i) => {
                   const slotId = (slPage - 1) * 10 + i + 1; const data = saveSlots[slotId]; const isEditing = editingSlotId === slotId;
                   return (
                     <div key={slotId} onClick={() => handleSlotClick(slotId)} className="group relative bg-[#8fbf8f] border-[2px] md:border-[3px] border-white/80 rounded-sm p-2 md:p-3 cursor-pointer hover:border-white hover:bg-[#7ebd7e] shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-all overflow-hidden flex flex-col justify-between min-h-[80px] md:min-h-[120px]">
                       <div className="flex justify-between items-start">
                         <span className="text-white font-black text-xs md:text-sm drop-shadow-md">No.{String(slotId).padStart(3, '0')}</span>
                         {data && !isEditing && slMode === 'save' && (<button onClick={(e) => { e.stopPropagation(); setEditingSlotId(slotId); setEditSaveName(data.title); }} className="opacity-100 md:opacity-0 group-hover:opacity-100 text-white/80 hover:text-white transition-opacity p-0.5 md:p-1 z-10" title="修改存档名称"><Edit3 size={14} className="md:w-4 md:h-4" /></button>)}
                       </div>
                       <div className="flex-1 flex items-center justify-center relative z-10 w-full">
                         {isEditing ? (<input ref={editInputRef} type="text" value={editSaveName} onChange={(e) => setEditSaveName(e.target.value)} onBlur={handleSaveNameConfirm} onKeyDown={(e) => e.key === 'Enter' && handleSaveNameConfirm()} onClick={(e) => e.stopPropagation()} className="w-11/12 md:w-3/4 bg-white/20 border-b-2 border-white text-white text-center text-sm md:text-xl font-bold outline-none placeholder-white/50 px-1 md:px-2" placeholder="输入存档名..."/>) : data ? (<span className="text-white text-sm md:text-2xl font-bold drop-shadow-md tracking-wider truncate px-1 md:px-4 w-full text-center">{data.title}</span>) : (<span className="text-white/80 text-lg md:text-3xl font-bold tracking-widest drop-shadow-sm opacity-60">No Data</span>)}
                       </div>
                       <div className="text-right text-white/80 text-[8px] md:text-xs font-bold tracking-wider h-3 md:h-4">{!isEditing && data ? data.date : ''}</div>
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                     </div>
                   );
                })}
             </div>
          </div>
          
         {/* 修复：移动端将控制按钮换行并居中，防止互相重叠 */}
          <div className="flex flex-wrap justify-center md:justify-between items-center px-4 md:px-12 py-3 md:py-5 bg-white/30 backdrop-blur-md border-t-2 border-white/50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] shrink-0 gap-4">
             <button onClick={() => { if (window.confirm("确定要清空所有常规存档吗？(不可恢复)")) { setSaveSlots({}); } }} className="px-4 md:px-6 py-2 bg-[#8fbf8f] text-white font-bold tracking-widest rounded-md border border-white hover:bg-red-400 transition-colors text-xs md:text-base hidden md:block">ALL Delete</button>
             <div className="flex gap-1.5 md:gap-2 items-end flex-wrap justify-center">
               {Array.from({length: 10}).map((_, i) => {
                 const p = i + 1; const isActive = slPage === p;
                 return (
                   <div key={p} onClick={() => setSlPage(p)} className={`cursor-pointer flex flex-col items-center group transition-all`}>
                     <span className={`text-[8px] md:text-[10px] font-bold ${isActive ? 'text-amber-500' : 'text-emerald-600 group-hover:text-emerald-500'}`}>Page</span>
                     <div className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center clip-diamond font-black text-sm md:text-lg ${isActive ? 'bg-amber-400 text-white scale-110 shadow-lg' : 'bg-emerald-400/80 text-white group-hover:bg-emerald-400'}`} style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}>{p}</div>
                   </div>
                 );
               })}
             </div>
             <div className="flex gap-2 w-full md:w-auto justify-center">
               <button className="flex-1 md:flex-none px-3 md:px-6 py-2 bg-[#4fa0d8] text-white font-bold tracking-widest rounded-md border border-white hover:bg-[#5db4f0] transition-colors text-[10px] sm:text-xs md:text-base" onClick={handleReturnToTitle}>返回标题</button>
               <button className="flex-1 md:flex-none px-3 md:px-6 py-2 bg-[#4fa0d8] text-white font-bold tracking-widest rounded-md border border-white hover:bg-[#5db4f0] transition-colors text-[10px] sm:text-xs md:text-base" onClick={() => setIsSaveLoadUIOpen(false)}>返回游戏</button>
               <button className="flex-1 md:flex-none px-3 md:px-6 py-2 bg-red-400 text-white font-bold tracking-widest rounded-md border border-white hover:bg-red-500 transition-colors text-[10px] sm:text-xs md:text-base" onClick={handleExitGame}>退出游戏</button>
             </div>
          </div>
          <style dangerouslySetInnerHTML={{__html: ` @keyframes shimmer { 100% { transform: translateX(150%); } } `}} />
        </div>
      )}

      {/* Bot 管理面板 */}
      {isBotPanelOpen && getCurrentUser() === 'Admin' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
          <div className="bg-gradient-to-b from-[#1a2332] to-[#0f172a] rounded-2xl shadow-2xl w-[95vw] max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-lg font-black text-white tracking-wider">BOT 管理面板</span>
              </div>
              <button onClick={() => { setIsBotPanelOpen(false); setBotPasswordVerified(false); setBotPasswordInput(''); setBotPasswordAttempts(0); setBotPasswordLockoutUntil(0); }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!botPasswordVerified ? (
                /* Password gate */
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-4xl mb-6">🔐</div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    {settings.qqBotPasswordHash ? '输入二级密码' : '设置二级密码'}
                  </h2>
                  <p className="text-sm text-white/40 mb-6">
                    {settings.qqBotPasswordHash ? '请输入 BOT 管理二级密码以继续' : '首次进入 BOT 管理，请设置一个二级密码'}
                  </p>
                  {botPasswordLockoutUntil > Date.now() ? (
                    <div className="w-72 text-center">
                      <p className="text-red-400 text-sm font-bold mb-2">密码错误次数过多</p>
                      <p className="text-white/40 text-xs">请等待 {Math.ceil((botPasswordLockoutUntil - Date.now()) / 1000)} 秒后重试</p>
                    </div>
                  ) : (
                  <div className="w-72 space-y-4">
                    <input
                      type="password"
                      value={botPasswordInput}
                      onChange={e => { setBotPasswordInput(e.target.value); setBotPasswordError(''); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (!settings.qqBotPasswordHash) {
                            // Set new password
                            if (botPasswordInput.length < 6) { setBotPasswordError('密码至少6个字符'); return; }
                            (async () => {
                              const { hash, salt } = await hashPassword(botPasswordInput);
                              setSettings(prev => ({ ...prev, qqBotPasswordHash: JSON.stringify({ hash, salt }) }));
                              setBotPasswordVerified(true);
                              setBotPasswordError('');
                            })();
                          } else {
                            // Verify password
                            if (botPasswordLockoutUntil > Date.now()) return;
                            (async () => {
                              let stored;
                              try { stored = JSON.parse(settings.qqBotPasswordHash); } catch { stored = null; }
                              let ok = false;
                              if (stored && stored.hash && stored.salt) {
                                // New PBKDF2 format
                                const { hash } = await hashPassword(botPasswordInput, stored.salt);
                                ok = hash === stored.hash;
                              } else {
                                // Legacy btoa format — accept but auto-upgrade
                                ok = btoa(botPasswordInput) === settings.qqBotPasswordHash;
                                if (ok) {
                                  const { hash, salt } = await hashPassword(botPasswordInput);
                                  setSettings(prev => ({ ...prev, qqBotPasswordHash: JSON.stringify({ hash, salt }) }));
                                }
                              }
                              if (ok) {
                                setBotPasswordVerified(true);
                                setBotPasswordError('');
                                setBotPasswordAttempts(0);
                              } else {
                                const next = botPasswordAttempts + 1;
                                setBotPasswordAttempts(next);
                                if (next >= 5) {
                                  setBotPasswordLockoutUntil(Date.now() + 30000);
                                  setBotPasswordError('错误次数过多，已锁定30秒');
                                } else {
                                  setBotPasswordError(`密码错误 (${next}/5)`);
                                }
                              }
                            })();
                          }
                        }
                      }}
                      placeholder={settings.qqBotPasswordHash ? '输入密码' : '设置新密码 (至少6位)'}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-emerald-500 transition-colors placeholder-white/30"
                      autoFocus
                    />
                    {botPasswordError && (
                      <p className="text-red-400 text-xs font-bold text-center">{botPasswordError}</p>
                    )}
                    <button
                      onClick={() => {
                        if (!settings.qqBotPasswordHash) {
                          if (botPasswordInput.length < 6) { setBotPasswordError('密码至少6个字符'); return; }
                          (async () => {
                            const { hash, salt } = await hashPassword(botPasswordInput);
                            setSettings(prev => ({ ...prev, qqBotPasswordHash: JSON.stringify({ hash, salt }) }));
                            setBotPasswordVerified(true);
                          })();
                        } else {
                          if (botPasswordLockoutUntil > Date.now()) return;
                          (async () => {
                            let stored;
                            try { stored = JSON.parse(settings.qqBotPasswordHash); } catch { stored = null; }
                            let ok = false;
                            if (stored && stored.hash && stored.salt) {
                              const { hash } = await hashPassword(botPasswordInput, stored.salt);
                              ok = hash === stored.hash;
                            } else {
                              ok = btoa(botPasswordInput) === settings.qqBotPasswordHash;
                              if (ok) {
                                const { hash, salt } = await hashPassword(botPasswordInput);
                                setSettings(prev => ({ ...prev, qqBotPasswordHash: JSON.stringify({ hash, salt }) }));
                              }
                            }
                            if (ok) {
                              setBotPasswordVerified(true);
                              setBotPasswordError('');
                              setBotPasswordAttempts(0);
                            } else {
                              const next = botPasswordAttempts + 1;
                              setBotPasswordAttempts(next);
                              if (next >= 5) {
                                setBotPasswordLockoutUntil(Date.now() + 30000);
                                setBotPasswordError('错误次数过多，已锁定30秒');
                              } else {
                                setBotPasswordError(`密码错误 (${next}/5)`);
                              }
                            }
                          })();
                        }
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors text-sm"
                    >
                      {settings.qqBotPasswordHash ? '验证' : '确认设置'}
                    </button>
                    {settings.qqBotPasswordHash && (
                      <button
                        onClick={() => {
                          if (confirm('⚠️ 警告：此操作将擦除 BOT 所有数据（配置、会话、上下文、角色卡、接口配置）并重置二级密码，且不可恢复！\n\n确定要继续吗？')) {
                            if (confirm('最后确认：真的要擦除所有 BOT 数据并重置密码吗？')) {
                              setSettings(prev => ({
                                ...prev,
                                qqBotPasswordHash: '',
                                qqBotSessions: {},
                                qqBotContextGroups: {},
                                qqBotCharCards: [],
                                qqBotApiProfiles: [],
                                qqBotPersona: '',
                                qqBotApiBaseUrl: '',
                                qqBotApiKey: '',
                                qqBotApiModel: 'gpt-3.5-turbo',
                                qqBotApiTemperature: 0.7,
                                qqBotWsUrl: '',
                                qqBotToken: '',
                                qqBotAdminQQ: '',
                                qqBotPrivateWhitelist: '',
                                qqBotGroupWhitelist: '',
                              }));
                              setBotPasswordInput('');
                              setBotPasswordError('');
                              setBotPasswordAttempts(0);
                            }
                          }
                        }}
                        className="w-full py-2 text-red-400/40 hover:text-red-400 text-xs transition-colors"
                      >
                        擦除所有数据并重置密码
                      </button>
                    )}
                  </div>
                  )}
                </div>
              ) : (
                /* Bot settings content */
                <AppProvider value={contextValue}>
                  <div className="atri-container" style={{ backgroundColor: '#8dc3f0', backgroundImage: 'radial-gradient(circle at 15% 30%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 30%), radial-gradient(circle at 85% 10%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 35%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #7dbcf6 0%, #d8f0fe 40%, #ffffff 90%)' }}>
                    <QQBotTab />
                  </div>
                </AppProvider>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log 历史记录遮罩层 */}
      {isLogOpen && !visualAdjustMode && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-40 flex flex-col font-sans transition-opacity pointer-events-auto">
          <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-4">
              <h2 className="text-white text-2xl font-bold tracking-widest">历史剧情 (Log)</h2>
              <select value={activeSessionId || ''} onChange={(e) => setActiveSessionId(e.target.value)} className="bg-white/10 border border-white/20 text-white text-sm rounded px-3 py-1 outline-none">
                {sessions.map(s => <option key={s.id} value={s.id} className="bg-slate-800">{s.title}</option>)}
              </select>
              <button onClick={createNewSession} className="text-indigo-300 hover:text-white text-sm flex items-center"><Plus size={14} className="mr-1"/>新剧情</button>
            </div>
            <button onClick={() => setIsLogOpen(false)} className="text-white/50 hover:text-white p-2"><X size={28} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 lg:px-32 space-y-6">

            {activeSession?.messages?.map((msg, idx) => (
              <div key={idx} className={`flex flex-col group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                   <span className="text-xs text-white/40">{msg.role === 'user' ? settings.userName : settings.aiName}</span>
                   <button onClick={() => handleCopyMessage(msg.content)} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white transition-all cursor-pointer" title="复制此段对话"><Copy size={12}/></button>
                </div>
                <div className={`max-w-[80%] rounded-xl px-5 py-3 text-lg leading-relaxed select-text cursor-text ${msg.role === 'user' ? 'bg-emerald-900/60 text-emerald-50 border border-emerald-500/30 rounded-tr-sm' : `bg-indigo-900/40 text-indigo-50 border border-indigo-500/30 rounded-tl-sm ${msg.isError ? 'border-red-500 text-red-300' : ''}`}`}>
                  {(msg.files || (msg.image ? [{type:'image', data:msg.image}] : [])).map((f, i) => f.type === 'image' ? <img key={i} src={f.data} className="max-w-sm rounded-lg mb-3 border border-white/20 shadow-md" alt="upload" /> : <div key={i} className="text-xs text-emerald-200/70 mb-2 border border-emerald-500/30 p-2 rounded bg-black/20 flex items-center gap-1"><FileText size={14}/> 附件: {f.name}</div>)}
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* ✨ 苍穹视觉风格 (ATRI) 浅色主题系统设置面板 */}
       {isSettingsOpen && !visualAdjustMode && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto p-0">
           <SettingsPage />
         </div>
       )}

     </div>

     {/* OpenCode 工作面板 */}
     <OCPanel taskId={ocTaskId} setOcTaskId={setOcTaskId} settings={settings} setSettings={setSettings} visible={ocVisible} setOcVisible={setOcVisible} />

     </AppProvider>
   );
 }