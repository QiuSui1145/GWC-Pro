import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import SettingSectionTitle from '../ui/SettingSectionTitle';
import SettingToggle from '../ui/SettingToggle';
import SettingSlider from '../ui/SettingSlider';
import { hashPassword } from '../../utils/auth';
import { Wifi, Shield, MessageSquare, Layers, Play, Square, RefreshCw, Plus, Trash2, ChevronDown, ChevronRight, CheckCircle, XCircle, Loader2, Database, Edit3, Terminal, Trash, BookOpen, Puzzle, Download, FolderOpen } from 'lucide-react';

// Load settings from ALL mirrors in IndexedDB, bypassing mirror isolation
async function loadAllMirrorSettings() {
  const results = [];
  try {
    const dbs = await indexedDB.databases?.() || [];
    for (const dbInfo of dbs) {
      if (!dbInfo.name?.startsWith('GWC_')) continue;
      try {
        const db = await new Promise((resolve, reject) => {
          const req = indexedDB.open(dbInfo.name);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (db.objectStoreNames.contains('core_data')) {
          const tx = db.transaction('core_data', 'readonly');
          const store = tx.objectStore('core_data');
          const allKeys = await new Promise((resolve, reject) => {
            const req = store.getAllKeys();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
          for (const key of allKeys) {
            if (typeof key === 'string' && key.endsWith('live2d_settings_v35')) {
              const data = await new Promise((resolve, reject) => {
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
              });
              if (data && typeof data === 'object') results.push(data);
            }
          }
        }
        db.close();
      } catch { /* skip inaccessible dbs */ }
    }
  } catch { /* databases() not supported */ }
  return results;
}

const SUB_TABS = [
  { id: 'connection', icon: <Wifi size={16} />, label: '连接设置' },
  { id: 'whitelist', icon: <Shield size={16} />, label: '白名单' },
  { id: 'sessions', icon: <MessageSquare size={16} />, label: '会话配置' },
  { id: 'groups', icon: <Layers size={16} />, label: '上下文组' },
  { id: 'api', icon: <Database size={16} />, label: 'API 配置' },
  { id: 'library', icon: <BookOpen size={16} />, label: '资源库' },
  { id: 'extensions', icon: <Puzzle size={16} />, label: '功能拓展' },
  { id: 'security', icon: <Shield size={16} />, label: '安全' },
  { id: 'logs', icon: <Terminal size={16} />, label: '日志' },
];

export default function QQBotTab() {
  const { settings, setSettings, skillPacksList, showToast } = useApp();
  const [activeSub, setActiveSub] = useState('connection');
  const [botStatus, setBotStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [newSessionId, setNewSessionId] = useState('');
  const [expandedSession, setExpandedSession] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [botApiFetching, setBotApiFetching] = useState(false);
  const [botApiModels, setBotApiModels] = useState([]);
  const [allMirrorPersonas, setAllMirrorPersonas] = useState([]);
  const [botLogs, setBotLogs] = useState([]);
  const [botLogTotal, setBotLogTotal] = useState(0);
  const logContainerRef = React.useRef(null);
  const [allMirrorApiProfiles, setAllMirrorApiProfiles] = useState([]);  // {source, name, text}
  const [secOldPwd, setSecOldPwd] = useState('');
  const [secNewPwd, setSecNewPwd] = useState('');
  const [secConfirmPwd, setSecConfirmPwd] = useState('');
  const [secError, setSecError] = useState('');
  const [secSuccess, setSecSuccess] = useState('');
  const [ctxList, setCtxList] = useState([]);
  const [ctxLoading, setCtxLoading] = useState(false);

  const update = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

  // Load cross-mirror personas and API profiles on mount
  useEffect(() => {
    loadAllMirrorSettings().then(allSettings => {
      const personas = [];
      const apiProfiles = [];
      for (const s of allSettings) {
        const source = s.mainTitleText || '未命名镜像';
        if (s.worldviewProfiles?.length) {
          for (const wp of s.worldviewProfiles) {
            if (wp.text) personas.push({ source, name: wp.name || '未命名', text: wp.text });
          }
        }
        if (s.characterList?.length) {
          for (const ch of s.characterList) {
            if (ch.prompt) personas.push({ source, name: `${ch.aiName || '角色'} (${ch.userName || '玩家'})`, text: ch.prompt });
          }
        }
        if (s.apiProfiles?.length) {
          for (const p of s.apiProfiles) {
            apiProfiles.push({ source, ...p });
          }
        }
      }
      setAllMirrorPersonas(personas);
      setAllMirrorApiProfiles(apiProfiles);
    });
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/qqbot/status');
      const data = await res.json();
      if (data.ok) setBotStatus(data);
    } catch { /* offline */ }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/qqbot/logs?since=${botLogTotal}`);
      const data = await res.json();
      if (data.ok) {
        if (data.logs.length > 0) {
          setBotLogs(prev => [...prev, ...data.logs]);
          setBotLogTotal(data.total);
        }
      }
    } catch { /* offline */ }
  };

  useEffect(() => {
    if (activeSub === 'logs') {
      fetchLogs();
      const timer = setInterval(fetchLogs, 2000);
      return () => clearInterval(timer);
    }
  }, [activeSub, botLogTotal]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [botLogs]);

  const syncConfig = async () => {
    const config = {
      wsMode: settings.qqBotWsMode || 'forward',
      wsUrl: settings.qqBotWsUrl,
      reverseWsHost: settings.qqBotReverseWsHost || '0.0.0.0',
      reverseWsPort: settings.qqBotReverseWsPort || 6700,
      token: settings.qqBotToken,
      adminQQ: settings.qqBotAdminQQ,
      privateWhitelistEnabled: settings.qqBotPrivateWhitelistEnabled,
      privateWhitelist: settings.qqBotPrivateWhitelist,
      groupWhitelistEnabled: settings.qqBotGroupWhitelistEnabled,
      groupWhitelist: settings.qqBotGroupWhitelist,
      persona: settings.qqBotPersona,
      contextLength: settings.qqBotContextLength,
      activeReplyRate: settings.qqBotActiveReplyRate,
      botApiBaseUrl: settings.qqBotApiBaseUrl || '',
      botApiKey: settings.qqBotApiKey || '',
      botApiModel: settings.qqBotApiModel || 'gpt-3.5-turbo',
      botApiTemperature: settings.qqBotApiTemperature ?? 0.7,
      sessions: settings.qqBotSessions,
      contextGroups: settings.qqBotContextGroups,
      segmentedReply: settings.qqBotSegmentedReply !== false,
      adminList: settings.qqBotAdminList || '',
      commandPrefix: settings.qqBotCommandPrefix || '#',
      enableImage: settings.qqBotEnableImage || false,
      enableVoice: settings.qqBotEnableVoice || false,
    };
    try {
      await fetch('/api/qqbot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
    } catch { /* offline */ }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/qqbot/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wsUrl: settings.qqBotWsUrl,
          token: settings.qqBotToken,
          wsMode: settings.qqBotWsMode || 'forward',
        }),
      });
      const data = await res.json();
      showToast(data.msg, data.ok ? 'success' : 'error');
    } catch (e) {
      showToast('测试失败: 后端离线', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    await syncConfig();
    try {
      const config = {
        wsMode: settings.qqBotWsMode || 'forward',
        wsUrl: settings.qqBotWsUrl,
        reverseWsHost: settings.qqBotReverseWsHost || '0.0.0.0',
        reverseWsPort: settings.qqBotReverseWsPort || 6700,
        token: settings.qqBotToken,
        adminQQ: settings.qqBotAdminQQ,
        privateWhitelistEnabled: settings.qqBotPrivateWhitelistEnabled,
        privateWhitelist: settings.qqBotPrivateWhitelist,
        groupWhitelistEnabled: settings.qqBotGroupWhitelistEnabled,
        groupWhitelist: settings.qqBotGroupWhitelist,
        persona: settings.qqBotPersona, contextLength: settings.qqBotContextLength,
        activeReplyRate: settings.qqBotActiveReplyRate,
        botApiBaseUrl: settings.qqBotApiBaseUrl || '',
        botApiKey: settings.qqBotApiKey || '',
        botApiModel: settings.qqBotApiModel || 'gpt-3.5-turbo',
        botApiTemperature: settings.qqBotApiTemperature ?? 0.7,
        sessions: settings.qqBotSessions, contextGroups: settings.qqBotContextGroups,
        segmentedReply: settings.qqBotSegmentedReply !== false,
        adminList: settings.qqBotAdminList || '',
        commandPrefix: settings.qqBotCommandPrefix || '#',
        enableImage: settings.qqBotEnableImage || false,
        enableVoice: settings.qqBotEnableVoice || false,
      };
      const res = await fetch('/api/qqbot/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      showToast(data.msg, data.ok ? 'success' : 'error');
      fetchStatus();
    } catch { showToast('启动失败: 后端离线', 'error'); }
    finally { setStarting(false); }
  };

  const handleStop = async () => {
    try {
      const res = await fetch('/api/qqbot/stop', { method: 'POST' });
      const data = await res.json();
      showToast(data.msg, data.ok ? 'success' : 'error');
      fetchStatus();
    } catch { showToast('停止失败: 后端离线', 'error'); }
  };

  const addSession = () => {
    if (!newSessionId.trim()) return;
    const sid = newSessionId.trim();
    if (settings.qqBotSessions[sid]) { showToast('该会话已存在', 'error'); return; }
    update('qqBotSessions', { ...settings.qqBotSessions, [sid]: { model: '', persona: '', skillPacks: [], kbPacks: [] } });
    setNewSessionId('');
    setExpandedSession(sid);
  };

  const removeSession = (sid) => {
    const next = { ...settings.qqBotSessions };
    delete next[sid];
    update('qqBotSessions', next);
    if (expandedSession === sid) setExpandedSession(null);
  };

  const updateSession = (sid, key, val) => {
    update('qqBotSessions', {
      ...settings.qqBotSessions,
      [sid]: { ...settings.qqBotSessions[sid], [key]: val },
    });
  };

  const addContextGroup = () => {
    if (!newGroupName.trim()) return;
    const gname = newGroupName.trim();
    if (settings.qqBotContextGroups[gname]) { showToast('该上下文组已存在', 'error'); return; }
    update('qqBotContextGroups', { ...settings.qqBotContextGroups, [gname]: [] });
    setNewGroupName('');
  };

  const removeContextGroup = (gname) => {
    const next = { ...settings.qqBotContextGroups };
    delete next[gname];
    update('qqBotContextGroups', next);
  };

  const toggleSessionInGroup = (gname, sid) => {
    const group = settings.qqBotContextGroups[gname] || [];
    const next = group.includes(sid) ? group.filter(s => s !== sid) : [...group, sid];
    update('qqBotContextGroups', { ...settings.qqBotContextGroups, [gname]: next });
  };

  // --- Bot Character Card Library ---
  const botCharCards = settings.qqBotCharCards || [];

  const saveBotCharCard = () => {
    const name = prompt('请输入角色卡名称：', `角色卡 ${botCharCards.length + 1}`);
    if (!name) return;
    const card = {
      id: Date.now().toString(),
      name: name.trim(),
      persona: settings.qqBotPersona || '',
    };
    update('qqBotCharCards', [...botCharCards, card]);
    showToast('角色卡已保存', 'success');
  };

  const applyBotCharCard = (card) => {
    update('qqBotPersona', card.persona);
    showToast(`已加载角色卡: ${card.name}`, 'success');
  };

  const deleteBotCharCard = (id) => {
    update('qqBotCharCards', botCharCards.filter(c => c.id !== id));
  };

  const renameBotCharCard = (id, oldName) => {
    const newName = prompt('请输入新的角色卡名称：', oldName);
    if (newName && newName.trim()) {
      update('qqBotCharCards', botCharCards.map(c => c.id === id ? { ...c, name: newName.trim() } : c));
    }
  };

  const importBotCharCardFromMirror = (persona) => {
    const card = {
      id: Date.now().toString(),
      name: persona.name,
      persona: persona.text,
    };
    update('qqBotCharCards', [...botCharCards, card]);
    showToast(`已导入角色卡: ${persona.name}`, 'success');
  };

  // --- Bot API Profile Library ---
  const botApiProfiles = settings.qqBotApiProfiles || [];

  const saveBotApiProfile = () => {
    const name = prompt('请输入配置名称：', `接口配置 ${botApiProfiles.length + 1}`);
    if (!name) return;
    const profile = {
      id: Date.now().toString(),
      name: name.trim(),
      baseUrl: settings.qqBotApiBaseUrl || '',
      apiKey: settings.qqBotApiKey || '',
      model: settings.qqBotApiModel || '',
      temperature: settings.qqBotApiTemperature ?? 0.7,
    };
    update('qqBotApiProfiles', [...botApiProfiles, profile]);
    showToast('API 配置已保存', 'success');
  };

  const applyBotApiProfile = (profile) => {
    setSettings(prev => ({
      ...prev,
      qqBotApiBaseUrl: profile.baseUrl || '',
      qqBotApiKey: profile.apiKey || '',
      qqBotApiModel: profile.model || '',
      qqBotApiTemperature: profile.temperature ?? 0.7,
    }));
    showToast(`已加载配置: ${profile.name}`, 'success');
  };

  const deleteBotApiProfile = (id) => {
    update('qqBotApiProfiles', botApiProfiles.filter(p => p.id !== id));
  };

  const renameBotApiProfile = (id, oldName) => {
    const newName = prompt('请输入新的配置名称：', oldName);
    if (newName && newName.trim()) {
      update('qqBotApiProfiles', botApiProfiles.map(p => p.id === id ? { ...p, name: newName.trim() } : p));
    }
  };

  const importBotApiProfileFromMirror = (profile) => {
    const newProfile = {
      id: Date.now().toString(),
      name: `${profile.name} (${profile.source})`,
      baseUrl: profile.baseUrl || '',
      apiKey: profile.apiKey || '',
      model: profile.model || '',
      temperature: profile.temp ?? 0.7,
    };
    update('qqBotApiProfiles', [...botApiProfiles, newProfile]);
    showToast(`已导入配置: ${profile.name}`, 'success');
  };

  const fetchBotModels = async () => {
    if (!settings.qqBotApiBaseUrl) { showToast('请先输入接口地址', 'error'); return; }
    setBotApiFetching(true);
    try {
      const res = await fetch('/api/qqbot/fetch_models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: settings.qqBotApiBaseUrl, apiKey: settings.qqBotApiKey || '' }),
      });
      const data = await res.json();
      if (data.ok) {
        setBotApiModels(data.models);
        if (data.models.length > 0 && !data.models.includes(settings.qqBotApiModel)) {
          update('qqBotApiModel', data.models[0]);
        }
        showToast(`成功获取 ${data.models.length} 个模型`, 'success');
      } else {
        showToast(data.msg, 'error');
      }
    } catch {
      showToast('获取失败: 后端离线', 'error');
    } finally {
      setBotApiFetching(false);
    }
  };

  const isConnected = botStatus?.connected;
  const isRunning = botStatus?.running;

  const fetchContexts = async () => {
    setCtxLoading(true);
    try {
      const res = await fetch('/api/qqbot/contexts');
      const data = await res.json();
      if (data.ok) setCtxList(data.contexts);
    } catch { /* offline */ }
    finally { setCtxLoading(false); }
  };

  const deleteContext = async (sid) => {
    if (!confirm(`确定要删除 ${sid} 的所有聊天记录吗？`)) return;
    try {
      const res = await fetch('/api/qqbot/context/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sid }),
      });
      const data = await res.json();
      showToast(data.msg, data.ok ? 'success' : 'error');
      if (data.ok) fetchContexts();
    } catch { showToast('操作失败: 后端离线', 'error'); }
  };

  const exportContext = async (sid) => {
    try {
      const res = await fetch('/api/qqbot/context/export', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sid }),
      });
      const data = await res.json();
      if (data.ok) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${sid}.json`; a.click();
        URL.revokeObjectURL(url);
        showToast(`已导出 ${sid}`, 'success');
      } else {
        showToast(data.msg, 'error');
      }
    } catch { showToast('导出失败: 后端离线', 'error'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sub-tab nav */}
      <div className="flex flex-wrap gap-1 bg-white/40 rounded-xl p-1 border border-[#e6d5b8]">
        {SUB_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveSub(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeSub === tab.id ? 'bg-[#4fa0d8] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-white/60'}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Connection */}
      {activeSub === 'connection' && (
        <div className="space-y-6">
          <SettingSectionTitle title="QQ 机器人总开关" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <SettingToggle label="启用 QQ 机器人" value={settings.enableQQBot} onChange={v => update('enableQQBot', v)} />
            <p className="text-xs text-[#7a6b5d] font-bold">基于 OneBot V11 协议对接 NapCat，强制开启 Token 验证。</p>
          </div>

          <SettingSectionTitle title="连接模式" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <div className="flex gap-2">
              <button onClick={() => update('qqBotWsMode', 'forward')}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all border-2 ${(settings.qqBotWsMode || 'forward') === 'forward' ? 'border-[#4fa0d8] bg-[#4fa0d8]/10 text-[#4fa0d8]' : 'border-[#e6d5b8] text-[#7a6b5d] hover:border-[#c9b8a4]'}`}>
                正向 WS
              </button>
              <button onClick={() => update('qqBotWsMode', 'reverse')}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all border-2 ${settings.qqBotWsMode === 'reverse' ? 'border-[#4fa0d8] bg-[#4fa0d8]/10 text-[#4fa0d8]' : 'border-[#e6d5b8] text-[#7a6b5d] hover:border-[#c9b8a4]'}`}>
                反向 WS
              </button>
            </div>
            <p className="text-xs text-[#7a6b5d] font-bold">
              {(settings.qqBotWsMode || 'forward') === 'forward'
                ? '正向模式：本程序主动连接 NapCat 的 WebSocket 服务。'
                : '反向模式：NapCat 主动连接本程序提供的 WebSocket 服务。'}
            </p>
          </div>

          <SettingSectionTitle title="连接配置" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            {(settings.qqBotWsMode || 'forward') === 'forward' ? (
              <div>
                <label className="block text-xs font-bold text-[#4a4036] mb-1.5">NapCat WebSocket 地址</label>
                <input value={settings.qqBotWsUrl} onChange={e => update('qqBotWsUrl', e.target.value)}
                  placeholder="ws://127.0.0.1:3001"
                  className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
                <p className="text-[10px] text-[#7a6b5d] font-bold mt-1">填入 NapCat 正向 WebSocket 服务器的地址。</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4a4036] mb-1.5">监听地址</label>
                  <input value={settings.qqBotReverseWsHost || '0.0.0.0'} onChange={e => update('qqBotReverseWsHost', e.target.value)}
                    placeholder="0.0.0.0"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4a4036] mb-1.5">监听端口</label>
                  <input type="number" value={settings.qqBotReverseWsPort || 6700} onChange={e => update('qqBotReverseWsPort', parseInt(e.target.value) || 6700)}
                    placeholder="6700"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
                </div>
              </div>
            )}
            {settings.qqBotWsMode === 'reverse' && (
              <p className="text-[10px] text-[#7a6b5d] font-bold">
                在 NapCat 配置中将 &quot;reverseWs&quot; 地址设为 ws://本机IP:{settings.qqBotReverseWsPort || 6700}
              </p>
            )}
            <div>
              <label className="block text-xs font-bold text-[#4a4036] mb-1.5">Token <span className="text-red-400">*</span></label>
              <input type="password" value={settings.qqBotToken} onChange={e => update('qqBotToken', e.target.value)}
                placeholder="NapCat 设置的 access token"
                className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
              <p className="text-[10px] text-red-400 font-bold mt-1">Token 验证已强制开启，请在 NapCat 中配置 access token。</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4a4036] mb-1.5">管理员 QQ 号</label>
              <input value={settings.qqBotAdminQQ} onChange={e => update('qqBotAdminQQ', e.target.value)}
                placeholder="管理员的 QQ 号，识别为前端 Admin 玩家"
                className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
            </div>
          </div>

          <SettingSectionTitle title="连接状态" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : isRunning ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm font-bold text-[#4a4036]">
                {isConnected
                  ? `已连接 (QQ: ${botStatus?.self_id || '?'})`
                  : isRunning
                    ? (botStatus?.ws_mode === 'reverse' ? '等待 NapCat 连接...' : '连接中...')
                    : '未运行'}
              </span>
              {isRunning && botStatus?.uptime > 0 && (
                <span className="text-[10px] text-[#7a6b5d] ml-auto">运行 {Math.floor(botStatus.uptime / 60)} 分钟</span>
              )}
            </div>
            {isRunning && botStatus?.ws_url && (
              <p className="text-xs text-[#7a6b5d] font-bold">{botStatus.ws_url}</p>
            )}
            <div className="flex flex-wrap gap-3">
              <button onClick={handleTest} disabled={testing}
                className="px-5 py-2.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md disabled:opacity-50">
                {testing ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RefreshCw size={16} className="mr-2" />}
                测试连接
              </button>
              {!isRunning ? (
                <button onClick={handleStart} disabled={starting}
                  className="px-5 py-2.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md disabled:opacity-50">
                  {starting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Play size={16} className="mr-2" />}
                  启动机器人
                </button>
              ) : (
                <button onClick={handleStop}
                  className="px-5 py-2.5 bg-red-400 hover:bg-red-500 text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md">
                  <Square size={16} className="mr-2" /> 停止机器人
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Whitelists */}
      {activeSub === 'whitelist' && (
        <div className="space-y-6">
          <SettingSectionTitle title="私聊白名单" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <SettingToggle label="启用私聊白名单" value={settings.qqBotPrivateWhitelistEnabled} onChange={v => update('qqBotPrivateWhitelistEnabled', v)} />
            {settings.qqBotPrivateWhitelistEnabled && (
              <div>
                <label className="block text-xs font-bold text-[#4a4036] mb-1.5">允许的 QQ 号（每行一个）</label>
                <textarea value={settings.qqBotPrivateWhitelist} onChange={e => update('qqBotPrivateWhitelist', e.target.value)}
                  placeholder={"123456789\n987654321"} rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8] resize-none" />
              </div>
            )}
            <p className="text-xs text-[#7a6b5d] font-bold">开启后，仅白名单内的 QQ 号可以私聊机器人。管理员 QQ 无视白名单。</p>
          </div>

          <SettingSectionTitle title="群聊白名单" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <SettingToggle label="启用群聊白名单" value={settings.qqBotGroupWhitelistEnabled} onChange={v => update('qqBotGroupWhitelistEnabled', v)} />
            {settings.qqBotGroupWhitelistEnabled && (
              <div>
                <label className="block text-xs font-bold text-[#4a4036] mb-1.5">允许的群号（每行一个）</label>
                <textarea value={settings.qqBotGroupWhitelist} onChange={e => update('qqBotGroupWhitelist', e.target.value)}
                  placeholder={"111222333\n444555666"} rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8] resize-none" />
              </div>
            )}
            <p className="text-xs text-[#7a6b5d] font-bold">开启后，仅白名单内的群聊才会响应。管理员发送的消息无视白名单。</p>
          </div>
        </div>
      )}

      {/* Session Config */}
      {activeSub === 'sessions' && (
        <div className="space-y-6">
          <SettingSectionTitle title="全局配置" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#4a4036]">全局人设 (Persona)</label>
                {allMirrorPersonas.length > 0 && (
                  <select value="" onChange={e => { if (e.target.value) update('qqBotPersona', e.target.value); }}
                    className="text-[10px] font-bold px-2 py-1 rounded border border-[#d9c5b2] bg-white text-[#4a4036] outline-none">
                    <option value="">从角色卡库导入...</option>
                    {allMirrorPersonas.map((p, i) => (
                      <option key={i} value={p.text}>{p.name} ({p.source})</option>
                    ))}
                  </select>
                )}
              </div>
              <textarea value={settings.qqBotPersona} onChange={e => update('qqBotPersona', e.target.value)}
                placeholder="你是一个友好的AI助手..." rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8] resize-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4a4036] mb-1.5">上下文消息数</label>
              <input type="number" value={settings.qqBotContextLength ?? 20}
                onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) update('qqBotContextLength', v); }}
                min={1}
                className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
              <p className="text-[10px] text-[#7a6b5d] font-bold mt-1">设置为较大的数值可保留更多上下文，但会增加 Token 消耗。</p>
            </div>
            <SettingSlider label="主动回复概率" value={settings.qqBotActiveReplyRate} min={1} max={100} step={1} suffix="%"
              onChange={v => update('qqBotActiveReplyRate', v)} />
            <p className="text-xs text-[#7a6b5d] font-bold">群聊中每条消息触发 AI 回复的概率。@机器人 必定回复。上下文数全局生效。</p>
          </div>

          <SettingSectionTitle title="会话独立配置" extra={
            <div className="flex items-center gap-2">
              <input value={newSessionId} onChange={e => setNewSessionId(e.target.value)}
                placeholder="group_123456 或 private_789"
                className="px-3 py-1.5 rounded-lg border border-[#d9c5b2] bg-white text-xs font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8] w-48" />
              <button onClick={addSession} className="px-3 py-1.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-xs rounded-full flex items-center shadow-sm">
                <Plus size={12} className="mr-1" /> 添加
              </button>
            </div>
          } />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
            <p className="text-xs text-[#7a6b5d] font-bold mb-4">
              格式：group_群号 或 private_QQ号。独立配置会覆盖全局设置。Skill 和知识库包来自技能控制台。
            </p>
            {Object.keys(settings.qqBotSessions).length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto light-scrollbar pr-2">
                {Object.entries(settings.qqBotSessions).map(([sid, cfg]) => (
                  <div key={sid} className="border-2 border-[#e6d5b8] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-white cursor-pointer hover:bg-[#fdfaf5] transition-colors"
                      onClick={() => setExpandedSession(expandedSession === sid ? null : sid)}>
                      <div className="flex items-center gap-2">
                        {expandedSession === sid ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className="text-sm font-bold text-[#4a4036]">{sid}</span>
                        {cfg.model && <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-bold">{cfg.model}</span>}
                      </div>
                      <button onClick={e => { e.stopPropagation(); removeSession(sid); }}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {expandedSession === sid && (
                      <div className="p-4 space-y-3 border-t border-[#e6d5b8] bg-[#fdfaf5]/50">
                        <div>
                          <label className="block text-[10px] font-bold text-[#7a6b5d] mb-1">独立模型（留空使用全局）</label>
                          <input value={cfg.model || ''} onChange={e => updateSession(sid, 'model', e.target.value)}
                            placeholder="gpt-4 / claude-3 / ..."
                            className="w-full px-3 py-2 rounded-lg border border-[#d9c5b2] bg-white text-xs font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] font-bold text-[#7a6b5d]">独立人设（留空使用全局）</label>
                            {allMirrorPersonas.length > 0 && (
                              <select value="" onChange={e => { if (e.target.value) updateSession(sid, 'persona', e.target.value); }}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#d9c5b2] bg-white text-[#4a4036] outline-none">
                                <option value="">导入角色卡...</option>
                                {allMirrorPersonas.map((p, i) => (
                                  <option key={i} value={p.text}>{p.name} ({p.source})</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <textarea value={cfg.persona || ''} onChange={e => updateSession(sid, 'persona', e.target.value)}
                            placeholder="该会话专属人设..." rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-[#d9c5b2] bg-white text-xs font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8] resize-none" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] font-bold text-[#7a6b5d]">独立 API Base（留空使用全局）</label>
                            {(botApiProfiles.length > 0 || allMirrorApiProfiles.length > 0) && (
                              <select value="" onChange={e => {
                                if (!e.target.value) return;
                                const [src, idx] = e.target.value.split(':');
                                const list = src === 'bot' ? botApiProfiles : allMirrorApiProfiles;
                                const p = list[parseInt(idx)];
                                if (!p) return;
                                const base = p.baseUrl || '';
                                const key = p.apiKey || '';
                                const model = p.model || '';
                                updateSession(sid, 'apiBase', base);
                                updateSession(sid, 'apiKey', key);
                                if (model) updateSession(sid, 'model', model);
                              }}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#d9c5b2] bg-white text-[#4a4036] outline-none">
                                <option value="">导入接口配置...</option>
                                {botApiProfiles.length > 0 && (
                                  <optgroup label="Bot 配置">
                                    {botApiProfiles.map((p, i) => (
                                      <option key={`bot:${i}`} value={`bot:${i}`}>{p.name}</option>
                                    ))}
                                  </optgroup>
                                )}
                                {allMirrorApiProfiles.length > 0 && (
                                  <optgroup label="前端配置">
                                    {allMirrorApiProfiles.map((p, i) => (
                                      <option key={`fe:${i}`} value={`fe:${i}`}>{p.name} ({p.source})</option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            )}
                          </div>
                          <input value={cfg.apiBase || ''} onChange={e => updateSession(sid, 'apiBase', e.target.value)}
                            placeholder="https://api.openai.com/v1"
                            className="w-full px-3 py-2 rounded-lg border border-[#d9c5b2] bg-white text-xs font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#7a6b5d] mb-1">独立 API Key（留空使用全局）</label>
                          <input type="password" value={cfg.apiKey || ''} onChange={e => updateSession(sid, 'apiKey', e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-3 py-2 rounded-lg border border-[#d9c5b2] bg-white text-xs font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#7a6b5d] mb-1">独立 Skill 包</label>
                          <div className="flex flex-wrap gap-1.5">
                            {skillPacksList.map(pack => {
                              const selected = (cfg.skillPacks || []).includes(pack.name);
                              return (
                                <button key={pack.name} onClick={() => {
                                  const next = selected ? (cfg.skillPacks || []).filter(p => p !== pack.name) : [...(cfg.skillPacks || []), pack.name];
                                  updateSession(sid, 'skillPacks', next);
                                }}
                                  className={`px-2 py-1 rounded-full text-[10px] font-bold transition-colors ${selected ? 'bg-[#4fa0d8] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                  {pack.name}
                                </button>
                              );
                            })}
                            {skillPacksList.length === 0 && <span className="text-[10px] text-gray-400">暂无技能包</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-[#a89578] text-sm py-6 font-bold border-2 border-dashed border-[#e6d5b8] rounded-xl bg-white/40">
                暂无独立会话配置，请在上方添加。
              </div>
            )}
          </div>
        </div>
      )}

      {/* Context Groups */}
      {activeSub === 'groups' && (
        <div className="space-y-6">
          <SettingSectionTitle title="上下文组管理" extra={
            <div className="flex items-center gap-2">
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                placeholder="组名称"
                className="px-3 py-1.5 rounded-lg border border-[#d9c5b2] bg-white text-xs font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8] w-32" />
              <button onClick={addContextGroup} className="px-3 py-1.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-xs rounded-full flex items-center shadow-sm">
                <Plus size={12} className="mr-1" /> 新建组
              </button>
            </div>
          } />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
            <p className="text-xs text-[#7a6b5d] font-bold mb-4">
              将多个会话加入同一上下文组，组内所有会话共享对话历史。例如将多个群设为同一组，AI 可以跨群记忆对话。
            </p>
            {Object.keys(settings.qqBotContextGroups).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(settings.qqBotContextGroups).map(([gname, sessions]) => (
                  <div key={gname} className="border-2 border-[#e6d5b8] rounded-xl p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-[#4a4036]">{gname}</span>
                      <button onClick={() => removeContextGroup(gname)}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(settings.qqBotSessions).map(sid => {
                        const inGroup = sessions.includes(sid);
                        return (
                          <button key={sid} onClick={() => toggleSessionInGroup(gname, sid)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${inGroup ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                            {inGroup && <CheckCircle size={10} className="inline mr-1" />}
                            {sid}
                          </button>
                        );
                      })}
                      {Object.keys(settings.qqBotSessions).length === 0 && (
                        <span className="text-[10px] text-gray-400">请先在「会话配置」中添加会话</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-[#a89578] text-sm py-6 font-bold border-2 border-dashed border-[#e6d5b8] rounded-xl bg-white/40">
                暂无上下文组，请在上方创建。
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Config */}
      {activeSub === 'api' && (
        <div className="space-y-6">
          <SettingSectionTitle title="机器人独立接口配置" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <p className="text-xs text-[#7a6b5d] font-bold">机器人使用独立的 API 接口，与前端互不影响。会话独立配置可覆盖以下设置。</p>
            <div>
              <label className="block text-xs font-bold text-[#4a4036] mb-1.5">接口地址 (Base URL)</label>
              <input value={settings.qqBotApiBaseUrl || ''} onChange={e => update('qqBotApiBaseUrl', e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4a4036] mb-1.5">API Key</label>
              <input type="password" value={settings.qqBotApiKey || ''} onChange={e => update('qqBotApiKey', e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
            </div>
            <div className="flex flex-col md:flex-row items-end gap-3">
              <div className="flex-1 relative w-full">
                <label className="block text-xs font-bold text-[#4a4036] mb-1.5">模型名称</label>
                <input type="text" list="bot-model-suggestions"
                  value={settings.qqBotApiModel || ''} onChange={e => update('qqBotApiModel', e.target.value)}
                  placeholder="gpt-4o / claude-3 / ..."
                  className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
                <datalist id="bot-model-suggestions">{botApiModels.map(m => <option key={m} value={m} />)}</datalist>
              </div>
              <button onClick={fetchBotModels} disabled={botApiFetching}
                className="px-5 py-2.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md disabled:opacity-50 h-[42px] w-full md:w-auto shrink-0">
                {botApiFetching ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RefreshCw size={16} className="mr-2" />}
                探测模型
              </button>
            </div>
            <div className="pt-2 border-t border-dashed border-[#e6d5b8]">
              <SettingSlider label="模型创造力 (Temperature)"
                value={settings.qqBotApiTemperature ?? 0.7}
                min={0.0} max={2.0} step={0.1} suffix=""
                onChange={v => update('qqBotApiTemperature', v)} />
            </div>
          </div>

          <SettingSectionTitle title="模型功能选择" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <p className="text-xs text-[#7a6b5d] font-bold">控制 Bot 接收和处理哪些类型的多媒体消息。视频消息默认不传输至 API。</p>
            <SettingToggle label="启用图片识别" value={settings.qqBotEnableImage || false}
              onChange={v => update('qqBotEnableImage', v)} />
            <p className="text-[10px] text-[#7a6b5d] font-bold -mt-2">开启后，收到的图片将以 Base64 编码发送至支持视觉的多模态模型（如 GPT-4o、Claude Sonnet 等）。需确保模型支持图片输入。</p>
            <SettingToggle label="启用语音识别" value={settings.qqBotEnableVoice || false}
              onChange={v => update('qqBotEnableVoice', v)} />
            <p className="text-[10px] text-[#7a6b5d] font-bold -mt-2">开启后，收到的语音消息将被转为文字再发送至模型。需确保 NapCat 已配置语音转文字功能。</p>
            <div className="pt-2 border-t border-dashed border-[#e6d5b8]">
              <p className="text-xs font-bold text-[#4a4036]">视频消息</p>
              <p className="text-[10px] text-[#7a6b5d] font-bold mt-1">视频消息始终忽略，不会传输至 API。Bot 收到视频时仅回复提示文字。</p>
            </div>
          </div>

          <SettingSectionTitle title="会话独立覆盖" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
            <p className="text-xs text-[#7a6b5d] font-bold mb-3">
              会话配置中的「独立 API Base / API Key / 模型」始终优先，留空则使用上方全局配置。
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(settings.qqBotSessions).length > 0 ? (
                Object.entries(settings.qqBotSessions).map(([sid, cfg]) => {
                  const hasOverride = cfg.apiBase || cfg.model;
                  return (
                    <div key={sid} className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${hasOverride ? 'border-[#4fa0d8] bg-[#4fa0d8]/5 text-[#4fa0d8]' : 'border-[#e6d5b8] bg-white text-[#7a6b5d]'}`}>
                      {sid}
                      {cfg.model && <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded">{cfg.model}</span>}
                      {!hasOverride && <span className="ml-1.5 text-[10px] text-gray-400">继承全局</span>}
                    </div>
                  );
                })
              ) : (
                <span className="text-xs text-[#a89578] font-bold">暂无会话配置，请在「会话配置」页面添加。</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resource Library */}
      {activeSub === 'library' && (
        <div className="space-y-6">
          {/* Character Card Library */}
          <SettingSectionTitle title="Bot 角色卡库" extra={
            <div className="flex items-center gap-2">
              <button onClick={saveBotCharCard}
                className="px-3 py-1.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-xs rounded-full flex items-center shadow-sm">
                <Plus size={12} className="mr-1" /> 保存当前人设
              </button>
            </div>
          } />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
            <p className="text-xs text-[#7a6b5d] font-bold mb-4">
              保存和管理 Bot 的角色人设配置，可快速切换。从当前「全局人设」保存，或从镜像角色卡库导入。
            </p>
            {botCharCards.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 max-h-[240px] overflow-y-auto light-scrollbar pr-2">
                {botCharCards.map(card => (
                  <div key={card.id} className="flex items-center justify-between p-3 bg-white border-2 border-[#e6d5b8] rounded-xl hover:border-[#4fa0d8] transition-colors">
                    <div className="flex-1 min-w-0 mr-3">
                      <span className="text-sm font-black text-[#4fa0d8] truncate block">{card.name}</span>
                      <span className="text-[10px] text-[#a89578] truncate block mt-0.5">{card.persona || '（空人设）'}</span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => applyBotCharCard(card)}
                        className="px-3 py-1 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-xs rounded-full transition-colors shadow-sm">加载</button>
                      <button onClick={() => renameBotCharCard(card.id, card.name)}
                        className="p-1 text-[#4fa0d8] hover:bg-[#e0f2fe] rounded transition-colors"><Edit3 size={14}/></button>
                      <button onClick={() => deleteBotCharCard(card.id)}
                        className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-[#a89578] text-sm py-6 font-bold border-2 border-dashed border-[#e6d5b8] rounded-xl bg-white/40">
                暂无保存的角色卡，请从上方保存或从镜像导入。
              </div>
            )}

            {/* Import from mirrors */}
            {allMirrorPersonas.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dashed border-[#e6d5b8]">
                <p className="text-[10px] font-bold text-[#7a6b5d] mb-2">从镜像角色卡库快速导入：</p>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto light-scrollbar">
                  {allMirrorPersonas.map((p, i) => (
                    <button key={i} onClick={() => importBotCharCardFromMirror(p)}
                      className="px-2 py-1 bg-white border border-[#e6d5b8] rounded-full text-[10px] font-bold text-[#7a6b5d] hover:border-[#4fa0d8] hover:text-[#4fa0d8] transition-colors truncate max-w-[200px]">
                      {p.name} <span className="text-gray-400">({p.source})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* API Profile Library */}
          <SettingSectionTitle title="Bot 接口配置库" extra={
            <div className="flex items-center gap-2">
              <button onClick={saveBotApiProfile}
                className="px-3 py-1.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-xs rounded-full flex items-center shadow-sm">
                <Plus size={12} className="mr-1" /> 保存当前配置
              </button>
            </div>
          } />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
            <p className="text-xs text-[#7a6b5d] font-bold mb-4">
              保存和管理 Bot 的 API 接口配置，可快速切换不同的模型服务商。
            </p>
            {botApiProfiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[240px] overflow-y-auto light-scrollbar pr-2">
                {botApiProfiles.map(profile => (
                  <div key={profile.id} className="flex flex-col p-3 bg-white border-2 border-[#e6d5b8] rounded-xl hover:border-[#4fa0d8] transition-colors shadow-sm">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-black text-[#4fa0d8] truncate">{profile.name}</span>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => applyBotApiProfile(profile)}
                          className="px-3 py-1 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white font-bold text-xs rounded-full transition-colors shadow-sm">加载</button>
                        <button onClick={() => renameBotApiProfile(profile.id, profile.name)}
                          className="p-1 text-[#8fbf8f] hover:bg-[#eaf4ea] rounded transition-colors"><Edit3 size={14}/></button>
                        <button onClick={() => deleteBotApiProfile(profile.id)}
                          className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#7a6b5d] truncate">模型: <span className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{profile.model || '未指定'}</span></span>
                    <span className="text-[10px] text-[#a89578] truncate mt-0.5">{profile.baseUrl || '未指定地址'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-[#a89578] text-sm py-6 font-bold border-2 border-dashed border-[#e6d5b8] rounded-xl bg-white/40">
                暂无保存的接口配置，请从上方保存或从镜像导入。
              </div>
            )}

            {/* Import from mirrors */}
            {allMirrorApiProfiles.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dashed border-[#e6d5b8]">
                <p className="text-[10px] font-bold text-[#7a6b5d] mb-2">从镜像接口配置库快速导入：</p>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto light-scrollbar">
                  {allMirrorApiProfiles.map((p, i) => (
                    <button key={i} onClick={() => importBotApiProfileFromMirror(p)}
                      className="px-2 py-1 bg-white border border-[#e6d5b8] rounded-full text-[10px] font-bold text-[#7a6b5d] hover:border-[#4fa0d8] hover:text-[#4fa0d8] transition-colors truncate max-w-[200px]">
                      {p.name} <span className="text-gray-400">({p.source})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Extensions */}
      {activeSub === 'extensions' && (
        <div className="space-y-6">
          <SettingSectionTitle title="平台功能拓展" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <SettingToggle label="分段回复" value={settings.qqBotSegmentedReply !== false}
              onChange={v => update('qqBotSegmentedReply', v)} />
            <p className="text-xs text-[#7a6b5d] font-bold">开启后，AI 回复将按句号、感叹号、问号自动拆分为多条消息发送。关闭则整段发送。</p>
          </div>

          <SettingSectionTitle title="指令系统" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#4a4036] mb-1.5">指令唤醒词</label>
              <input value={settings.qqBotCommandPrefix || '#'} onChange={e => update('qqBotCommandPrefix', e.target.value)}
                placeholder="#"
                className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
              <p className="text-[10px] text-[#7a6b5d] font-bold mt-1">指令格式: [唤醒词][指令内容]，例如 #重置</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4a4036] mb-1.5">管理员列表（每行一个 QQ 号）</label>
              <textarea value={settings.qqBotAdminList || ''} onChange={e => update('qqBotAdminList', e.target.value)}
                placeholder={"123456789\n987654321"} rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8] resize-none" />
              <p className="text-[10px] text-[#7a6b5d] font-bold mt-1">列表中的 QQ 号可以使用指令。不在列表中的 QQ 号发送指令将被忽略。连接设置中的管理员 QQ 也自动拥有权限。</p>
            </div>
            <div className="pt-2 border-t border-dashed border-[#e6d5b8]">
              <p className="text-xs font-bold text-[#4a4036] mb-2">可用指令列表：</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { cmd: '重置', desc: '清空当前群聊/私聊的聊天上下文' },
                  { cmd: '模型切换', desc: '获取当前 API 的模型列表（合并转发格式）' },
                  { cmd: '模型切换 [序号]', desc: '切换到指定序号的模型' },
                  { cmd: '开启聊天', desc: '开启大语言模型聊天功能' },
                  { cmd: '关闭聊天', desc: '关闭大语言模型聊天功能（指令仍可用）' },
                ].map(item => (
                  <div key={item.cmd} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-[#e6d5b8]">
                    <code className="text-xs font-bold text-[#4fa0d8] bg-[#4fa0d8]/10 px-2 py-0.5 rounded shrink-0">
                      {settings.qqBotCommandPrefix || '#'}{item.cmd}
                    </code>
                    <span className="text-[10px] text-[#7a6b5d] font-bold">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <SettingSectionTitle title="数据管理" extra={
            <button onClick={fetchContexts} disabled={ctxLoading}
              className="px-3 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white font-bold text-xs rounded-full flex items-center shadow-sm disabled:opacity-50">
              {ctxLoading ? <Loader2 size={12} className="mr-1 animate-spin" /> : <RefreshCw size={12} className="mr-1" />}
              刷新列表
            </button>
          } />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
            <p className="text-xs text-[#7a6b5d] font-bold mb-4">
              管理各会话的聊天记录，可按群号/私聊删除或导出。默认名称为会话 ID（如 group_123456）。
            </p>
            {ctxList.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto light-scrollbar pr-2">
                {ctxList.map(ctx => (
                  <div key={ctx.id} className="flex items-center justify-between p-3 bg-white border border-[#e6d5b8] rounded-lg hover:border-[#4fa0d8] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-bold text-[#4a4036] truncate">{ctx.display_name}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-bold shrink-0">{ctx.message_count} 条</span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => exportContext(ctx.id)}
                        className="px-3 py-1 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white font-bold text-xs rounded-full transition-colors shadow-sm flex items-center">
                        <Download size={12} className="mr-1" /> 导出
                      </button>
                      <button onClick={() => deleteContext(ctx.id)}
                        className="px-3 py-1 bg-red-400 hover:bg-red-500 text-white font-bold text-xs rounded-full transition-colors shadow-sm flex items-center">
                        <Trash2 size={12} className="mr-1" /> 删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-[#a89578] text-sm py-6 font-bold border-2 border-dashed border-[#e6d5b8] rounded-xl bg-white/40">
                {ctxLoading ? '加载中...' : '暂无聊天数据，点击上方刷新。'}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Security */}
      {activeSub === 'security' && (
        <div className="space-y-6">
          <SettingSectionTitle title="修改二级密码" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <p className="text-xs text-[#7a6b5d] font-bold">修改 BOT 管理面板的二级密码。修改后需要重新验证。</p>
            <div>
              <label className="block text-xs font-bold text-[#4a4036] mb-1.5">当前密码</label>
              <input type="password" value={secOldPwd} onChange={e => { setSecOldPwd(e.target.value); setSecError(''); setSecSuccess(''); }}
                placeholder="输入当前二级密码"
                className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4a4036] mb-1.5">新密码</label>
              <input type="password" value={secNewPwd} onChange={e => { setSecNewPwd(e.target.value); setSecError(''); setSecSuccess(''); }}
                placeholder="输入新密码 (至少6位)"
                className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4a4036] mb-1.5">确认新密码</label>
              <input type="password" value={secConfirmPwd} onChange={e => { setSecConfirmPwd(e.target.value); setSecError(''); setSecSuccess(''); }}
                placeholder="再次输入新密码"
                className="w-full px-4 py-2.5 rounded-lg border border-[#d9c5b2] bg-white text-sm font-bold text-[#4a4036] outline-none focus:border-[#4fa0d8]" />
            </div>
            {secError && <p className="text-red-400 text-xs font-bold">{secError}</p>}
            {secSuccess && <p className="text-emerald-500 text-xs font-bold">{secSuccess}</p>}
            <button
              onClick={async () => {
                setSecError('');
                setSecSuccess('');
                if (!secOldPwd) { setSecError('请输入当前密码'); return; }
                if (secNewPwd.length < 6) { setSecError('新密码至少6个字符'); return; }
                if (secNewPwd !== secConfirmPwd) { setSecError('两次输入的新密码不一致'); return; }
                if (!settings.qqBotPasswordHash) { setSecError('未设置二级密码，请先在 BOT 管理面板设置'); return; }
                // Verify old password
                let stored;
                try { stored = JSON.parse(settings.qqBotPasswordHash); } catch { stored = null; }
                let ok = false;
                if (stored && stored.hash && stored.salt) {
                  const { hash } = await hashPassword(secOldPwd, stored.salt);
                  ok = hash === stored.hash;
                } else {
                  ok = btoa(secOldPwd) === settings.qqBotPasswordHash;
                }
                if (!ok) { setSecError('当前密码错误'); return; }
                // Set new password
                const { hash, salt } = await hashPassword(secNewPwd);
                setSettings(prev => ({ ...prev, qqBotPasswordHash: JSON.stringify({ hash, salt }) }));
                setSecOldPwd('');
                setSecNewPwd('');
                setSecConfirmPwd('');
                setSecSuccess('密码修改成功');
              }}
              className="px-6 py-2.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white font-bold text-sm rounded-full transition-colors shadow-md"
            >
              修改密码
            </button>
          </div>

          <SettingSectionTitle title="危险操作" />
          <div className="bg-red-50/60 p-6 rounded-xl border border-red-200 shadow-sm space-y-4">
            <p className="text-xs text-red-500 font-bold">以下操作不可恢复，请谨慎使用。</p>
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
                    showToast('BOT 所有数据已擦除，密码已重置', 'success');
                  }
                }
              }}
              className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-full transition-colors shadow-md"
            >
              擦除所有数据并重置密码
            </button>
          </div>
        </div>
      )}

      {/* Logs */}
      {activeSub === 'logs' && (
        <div className="space-y-6">
          <SettingSectionTitle title="机器人实时日志" extra={
            <div className="flex items-center gap-2">
              <button onClick={() => { setBotLogs([]); setBotLogTotal(0); fetchLogs(); }}
                className="px-3 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white font-bold text-xs rounded-full flex items-center shadow-sm">
                <RefreshCw size={12} className="mr-1" /> 刷新
              </button>
              <button onClick={() => { setBotLogs([]); setBotLogTotal(0); }}
                className="px-3 py-1.5 bg-red-400 hover:bg-red-500 text-white font-bold text-xs rounded-full flex items-center shadow-sm">
                <Trash size={12} className="mr-1" /> 清空
              </button>
            </div>
          } />
          <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a4a] shadow-sm overflow-hidden">
            <div ref={logContainerRef} className="h-[400px] overflow-y-auto p-4 font-mono text-xs leading-relaxed">
              {botLogs.length > 0 ? (
                botLogs.map((log, i) => (
                  <div key={i} className={`flex gap-2 py-0.5 ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : log.level === 'success' ? 'text-emerald-400' : 'text-gray-300'}`}>
                    <span className="text-gray-500 shrink-0 select-none">{log.ts}</span>
                    <span className="shrink-0 w-4 text-center">
                      {log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : log.level === 'success' ? '✅' : 'ℹ️'}
                    </span>
                    <span className="break-all">{log.msg}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  暂无日志{isRunning ? '，等待事件...' : '，请先启动机器人'}
                </div>
              )}
            </div>
            <div className="px-4 py-2 bg-[#12122a] border-t border-[#2a2a4a] flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-bold">
                {isRunning ? '🟢 运行中' : '⚪ 未运行'} · 共 {botLogs.length} 条日志
              </span>
              <span className="text-[10px] text-gray-600 font-bold">每 2 秒自动刷新</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
