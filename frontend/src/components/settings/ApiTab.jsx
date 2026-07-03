import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import SettingSlider from '../ui/SettingSlider';
import SettingSectionTitle from '../ui/SettingSectionTitle';
import { Plus, Edit3, Trash2, RefreshCw, Cpu, CheckCircle, XCircle, Loader2, Download, ExternalLink, Box, Upload, Server } from 'lucide-react';

export default function ApiTab() {
  const { settings, setSettings, availableModels, isFetchingModels, fetchOpenAIModels, saveApiProfile, applyApiProfile, renameApiProfile, deleteApiProfile } = useApp();

  // OpenCode 状态
  const [ocStatus, setOcStatus] = useState(null);
  const [ocModels, setOcModels] = useState('');
  const [ocParsedModels, setOcParsedModels] = useState([]);
  const [ocLoading, setOcLoading] = useState(false);
  const [ocTestResult, setOcTestResult] = useState(null);

  // Ollama 状态
  const [olStatus, setOlStatus] = useState(null);
  const [olPullModel, setOlPullModel] = useState('');
  const [olPulling, setOlPulling] = useState(false);
  const [olPullLog, setOlPullLog] = useState('');
  const [olInstalling, setOlInstalling] = useState(false);
  const [olInstallPct, setOlInstallPct] = useState(0);
  const [olLocalModels, setOlLocalModels] = useState('');

  // llama.cpp 状态
  const [lcStatus, setLcStatus] = useState(null);
  const [lcInstalling, setLcInstalling] = useState(false);
  const [lcInstallPct, setLcInstallPct] = useState(0);
  const [lcInstallMsg, setLcInstallMsg] = useState('');
  const [lcGpuVendor, setLcGpuVendor] = useState('cpu');
  const [lcModels, setLcModels] = useState([]);
  const [lcImporting, setLcImporting] = useState(false);

  useEffect(() => {
    fetch('/api/opencode/status').then(r => r.json()).then(setOcStatus).catch(() => {});
    fetch('/api/ollama/status').then(r => r.json()).then(setOlStatus).catch(() => {});
    fetch('/api/llamacpp/status').then(r => r.json()).then(setLcStatus).catch(() => {});
  }, []);

  // ========== OpenCode ==========
  const installOpenCode = async () => {
    setOcLoading(true);
    try { const r = await fetch('/api/opencode/install', { method: 'POST' }); const d = await r.json(); if (d.success) { const s = await fetch('/api/opencode/status'); setOcStatus(await s.json()) } } catch(e) {}
    setOcLoading(false);
  };

  const fetchOcModels = async () => {
    setOcLoading(true); setOcParsedModels([]); setOcModels('');
    try {
      const r = await fetch('/api/opencode/models');
      const d = await r.json();
      if (d.error) { setOcModels(d.error); setOcLoading(false); return; }
      const raw = d.models || '';
      setOcModels(raw);
      // 解析模型列表（每行一个，格式通常是 provider/model 或 model:tag）
      const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('NAME') && !l.startsWith('-'));
      const parsed = lines.map(l => {
        const parts = l.split(/\s+/);
        return { name: parts[0], size: parts[1] || '', desc: parts.slice(2).join(' ') || '' };
      });
      setOcParsedModels(parsed);
    } catch(e) { setOcModels('请求失败') }
    setOcLoading(false);
  };

  const selectOcModel = (modelName) => {
    setSettings({...settings, opencodeModel: modelName, opencodeUseChatModel: false, opencodeUseFreeModel: false});
  };

  const testOcConnection = async () => {
    setOcLoading(true); setOcTestResult(null);
    try {
      const model = settings.opencodeUseChatModel ? '' : (settings.opencodeUseFreeModel ? '' : settings.opencodeModel);
      const r = await fetch('/api/opencode/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '测试连通性，请回复"连接成功"', model }) });
      const d = await r.json();
      setOcTestResult(d.error ? { ok: false, msg: d.error } : { ok: true, msg: `任务已启动: ${d.task_id}` });
    } catch(e) { setOcTestResult({ ok: false, msg: e.message }) }
    setOcLoading(false);
  };

  // ========== Ollama ==========
  const installOllama = async () => {
    setOlInstalling(true); setOlInstallPct(0);
    try {
      const es = new EventSource('/api/ollama/install-progress');
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.percent !== undefined) setOlInstallPct(data.percent);
          if (data.status === 'done') { es.close(); setOlInstalling(false); fetch('/api/ollama/status').then(r => r.json()).then(setOlStatus); }
          if (data.status === 'error') { es.close(); setOlInstalling(false); alert('安装失败: ' + data.message); }
        } catch(e) {}
      };
      es.onerror = () => { es.close(); setOlInstalling(false); };
    } catch(e) { setOlInstalling(false); }
  };

  const pullOllamaModel = async () => {
    if (!olPullModel.trim()) return;
    setOlPulling(true); setOlPullLog('');
    try {
      const r = await fetch('/api/ollama/pull', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: olPullModel.trim() }) });
      const d = await r.json();
      if (d.error) { setOlPullLog('错误: ' + d.error); setOlPulling(false); return; }
      const es = new EventSource(`/api/ollama/pull-progress/${d.task_id}`);
      es.onmessage = (ev) => {
        const line = ev.data;
        setOlPullLog(prev => prev + line + '\n');
        try { const parsed = JSON.parse(line); if (parsed.status === 'done') { es.close(); setOlPulling(false); } } catch(e) {}
      };
      es.onerror = () => { es.close(); setOlPulling(false); };
    } catch(e) { setOlPullLog('请求失败: ' + e.message); setOlPulling(false); }
  };

  const fetchOlLocalModels = async () => {
    try { const r = await fetch('/api/ollama/models'); const d = await r.json(); setOlLocalModels(d.models || d.error || '无结果') } catch(e) { setOlLocalModels('请求失败') }
  };

  // ========== llama.cpp ==========
  const installLlamaCpp = async () => {
    setLcInstalling(true); setLcInstallPct(0); setLcInstallMsg('');
    try {
      const es = new EventSource(`/api/llamacpp/install?gpu=${lcGpuVendor}`);
      es.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (d.status === 'downloading' || d.status === 'start') { setLcInstallPct(d.pct || 0); setLcInstallMsg(d.msg || ''); }
          else if (d.status === 'extracting') { setLcInstallMsg(d.msg || '解压中...'); }
          else if (d.status === 'done') { setLcInstallMsg(d.msg || '安装完成'); setLcInstallPct(100); es.close(); setLcInstalling(false); setTimeout(() => fetch('/api/llamacpp/status').then(r => r.json()).then(setLcStatus), 500); }
          else if (d.status === 'error') { setLcInstallMsg('失败: ' + (d.msg || '')); es.close(); setLcInstalling(false); }
        } catch(e) {}
      };
      es.onerror = () => { es.close(); setLcInstalling(false); if (!lcInstallMsg) setLcInstallMsg('连接中断') };
    } catch(e) { setLcInstalling(false); setLcInstallMsg('失败: ' + e.message) }
  };

  const fetchLcModels = async () => {
    try { const r = await fetch('/api/llamacpp/models'); const d = await r.json(); setLcModels(d.models || []) } catch(e) {}
  };

  const importLcModel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.gguf')) { alert('仅支持 .gguf 格式模型文件'); return }
    setLcImporting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await fetch('/api/llamacpp/import', { method: 'POST', body: form });
      await fetchLcModels();
    } catch(e) { alert('导入失败: ' + e.message) }
    setLcImporting(false);
    e.target.value = '';
  };

  const importLcZip = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLcInstalling(true); setLcInstallMsg('正在解压...'); setLcInstallPct(50);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await fetch('/api/llamacpp/import-zip', { method: 'POST', body: form });
      const d = await r.json();
      if (d.status === 'ok') {
        setLcInstallMsg('导入完成'); setLcInstallPct(100);
        setTimeout(() => fetch('/api/llamacpp/status').then(r => r.json()).then(setLcStatus), 300);
      } else {
        setLcInstallMsg('失败: ' + (d.message || ''));
      }
    } catch(e) { setLcInstallMsg('失败: ' + e.message) }
    setLcInstalling(false);
    e.target.value = '';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <SettingSectionTitle title="大语言模型 (LLM) 接口配置" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 接口地址 (Base URL)</label>
          <input type="text" value={settings.openaiBaseUrl} onChange={e => setSettings({...settings, openaiBaseUrl: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> API Key</label>
          <input type="password" value={settings.openaiApiKey} onChange={e => setSettings({...settings, openaiApiKey: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" />
        </div>
        <div className="flex flex-col md:flex-row items-end gap-3">
          <div className="flex-1 relative w-full">
            <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 模型名称</label>
            <input type="text" list="model-suggestions" value={settings.aiModel} onChange={e => setSettings({...settings, aiModel: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" />
            <datalist id="model-suggestions">{availableModels.map(m => <option key={m} value={m} />)}</datalist>
          </div>
          <button onClick={fetchOpenAIModels} disabled={isFetchingModels} className="bg-[#4fa0d8] hover:bg-[#5db4f0] disabled:opacity-50 text-white px-5 py-2 rounded-lg font-bold transition-colors flex items-center justify-center shadow-md h-[40px] w-full md:w-auto">
            <RefreshCw size={16} className={`mr-2 ${isFetchingModels ? "animate-spin" : ""}`} /> 探测模型
          </button>
        </div>
        <div className="pt-4 border-t border-dashed border-[#e6d5b8]">
          <SettingSlider label="模型创造力 (Temperature)" value={settings.aiTemperature || 0.7} min={0.0} max={2.0} step={0.1} suffix="" onChange={v => setSettings({...settings, aiTemperature: v})} />
        </div>
        <div className="pt-4 border-t border-[#e6d5b8] flex justify-end">
          <button onClick={saveApiProfile} className="px-4 py-2 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md"><Plus size={16} className="mr-1.5" /> 存为新配置</button>
        </div>
      </div>

      <SettingSectionTitle title="模型接口配置库" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
        {/* 已保存的配置 */}
        {settings.apiProfiles?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto light-scrollbar pr-2">
            {settings.apiProfiles.map(profile => (
              <div key={profile.id} className="flex flex-col p-4 bg-white border-2 border-[#e6d5b8] rounded-xl hover:border-[#4fa0d8] transition-colors shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-base font-black text-[#4fa0d8] truncate">{profile.name}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => applyApiProfile(profile)} className="px-3 py-1 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white font-bold text-xs rounded-full transition-colors shadow-sm">加载</button>
                    <button onClick={() => renameApiProfile(profile.id, profile.name)} className="p-1 text-[#8fbf8f] hover:bg-[#eaf4ea] rounded transition-colors"><Edit3 size={16}/></button>
                    <button onClick={() => deleteApiProfile(profile.id)} className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>
                <span className="text-xs text-[#7a6b5d] font-bold truncate">模型: <span className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{profile.model}</span></span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-[#a89578] text-sm py-8 font-bold border-2 border-dashed border-[#e6d5b8] rounded-xl bg-white/40">暂无保存的配置。</div>
        )}

        {/* ========== 本地模型下载 (Ollama) ========== */}
        <div className="pt-6 border-t-2 border-[#e6d5b8]">
          <div className="flex items-center gap-2 mb-4">
            <Box size={16} className="text-green-600" />
            <span className="text-sm font-black text-[#4a4036]">本地模型 (Ollama)</span>
            {olStatus === null ? <span className="text-gray-400 text-xs ml-auto">检测中...</span> :
              olStatus.installed ? <span className="text-green-600 text-xs font-bold flex items-center gap-1 ml-auto"><CheckCircle size={12} /> {olStatus.version}</span> :
              <span className="text-red-500 text-xs font-bold flex items-center gap-1 ml-auto"><XCircle size={12} /> 未安装</span>}
          </div>

          {/* 未安装：一键安装 */}
          {!olStatus?.installed && (
            <div className="space-y-3">
              <p className="text-xs text-[#a89578]">Ollama 是本地大模型运行工具，安装后可离线使用各种开源模型。</p>
              {olInstalling ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-[#4fa0d8]" />
                    <span className="text-xs font-bold text-[#4a4036]">{olInstallPct > 0 ? `下载中... ${olInstallPct}%` : '正在安装...'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#4fa0d8] h-full rounded-full transition-all duration-300" style={{ width: `${olInstallPct || 5}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">安装完成后自动检测，请稍候...</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={installOllama} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-full flex items-center shadow-md">
                    <Download size={14} className="mr-1.5" /> 一键安装 Ollama
                  </button>
                  <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full flex items-center shadow-sm border border-gray-300">
                    <ExternalLink size={12} className="mr-1" /> 官网下载
                  </a>
                </div>
              )}
            </div>
          )}

          {/* 已安装：拉取模型 */}
          {olStatus?.installed && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" value={olPullModel} onChange={e => setOlPullModel(e.target.value)} placeholder="输入模型名称，如 qwen2.5:7b" className="flex-1 bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-1.5 text-xs outline-none focus:border-[#ba3f42]" onKeyDown={e => { if (e.key === 'Enter') pullOllamaModel() }} />
                <button onClick={pullOllamaModel} disabled={olPulling || !olPullModel.trim()} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-full flex items-center shadow-sm">
                  {olPulling ? <Loader2 size={12} className="animate-spin mr-1" /> : <Download size={12} className="mr-1" />} 拉取
                </button>
                <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full flex items-center shadow-sm border border-gray-300">
                  <ExternalLink size={12} className="mr-1" /> 模型库
                </a>
              </div>

              {/* 拉取日志 */}
              {olPullLog && (
                <div className="p-2 bg-gray-900 text-green-400 rounded-lg text-xs font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">{olPullLog}</div>
              )}

              {/* 本地模型列表 */}
              <div className="flex gap-2">
                <button onClick={fetchOlLocalModels} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full flex items-center border border-gray-300">
                  <RefreshCw size={12} className="mr-1" /> 查看已安装模型
                </button>
              </div>
              {olLocalModels && <div className="p-2 bg-gray-50 rounded-lg text-xs text-gray-600 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{olLocalModels}</div>}

              <p className="text-xs text-[#a89578]">拉取后模型自动注册到 Ollama，聊天接口填写 <code className="bg-gray-100 px-1 rounded">http://127.0.0.1:11434/v1</code> 即可使用。</p>
            </div>
          )}
        </div>

        {/* ========== 本地模型 (llama.cpp) ========== */}
        <div className="pt-6 border-t-2 border-[#e6d5b8]">
          <div className="flex items-center gap-2 mb-4">
            <Server size={16} className="text-orange-600" />
            <span className="text-sm font-black text-[#4a4036]">本地模型 (llama.cpp)</span>
            {lcStatus === null ? <span className="text-gray-400 text-xs ml-auto">检测中...</span> :
              lcStatus.installed ? <span className="text-green-600 text-xs font-bold flex items-center gap-1 ml-auto"><CheckCircle size={12} /> 已安装</span> :
              <span className="text-red-500 text-xs font-bold flex items-center gap-1 ml-auto"><XCircle size={12} /> 未安装</span>}
          </div>

          {!lcStatus?.installed ? (
            <div className="space-y-3">
              <p className="text-xs text-[#a89578]">llama.cpp 是轻量级本地推理引擎，驱动 .gguf 量化模型。首次需下载约 50MB。</p>
              {lcInstalling ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-orange-600" />
                    <span className="text-xs font-bold text-[#4a4036]">{lcInstallMsg || '正在下载...'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-orange-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(lcInstallPct, 3)}%` }} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <select value={lcGpuVendor} onChange={e => setLcGpuVendor(e.target.value)} className="bg-white border border-[#d9c5b2] text-[#4a4036] font-bold text-xs rounded-md px-3 py-1.5 outline-none shadow-inner">
                      <option value="cpu">CPU (通用)</option>
                      <option value="cuda">NVIDIA CUDA</option>
                    </select>
                    <button onClick={installLlamaCpp} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-full flex items-center shadow-md">
                      <Download size={14} className="mr-1.5" /> 安装 llama.cpp
                    </button>
                    <a href="https://github.com/ggerganov/llama.cpp/releases" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full flex items-center shadow-sm border border-gray-300">
                      <ExternalLink size={12} className="mr-1" /> GitHub
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full flex items-center border border-gray-300 cursor-pointer">
                      <Upload size={12} className="mr-1" /> 手动导入 ZIP
                      <input type="file" accept=".zip" onChange={importLcZip} className="hidden" />
                    </label>
                    <span className="text-[10px] text-[#a89578]">下载 Release ZIP 后手动导入解压</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <label className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-full flex items-center shadow-sm cursor-pointer">
                  {lcImporting ? <Loader2 size={12} className="animate-spin mr-1" /> : <Upload size={12} className="mr-1" />}
                  导入 .gguf 模型
                  <input type="file" accept=".gguf" onChange={importLcModel} className="hidden" />
                </label>
                <button onClick={fetchLcModels} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full flex items-center border border-gray-300">
                  <RefreshCw size={12} className="mr-1" /> 刷新
                </button>
              </div>
              {lcModels.length > 0 && (
                <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-2 border border-[#e6d5b8] space-y-1">
                  {lcModels.map((m, i) => <div key={i} className="text-xs text-gray-700 font-mono px-2">{m}</div>)}
                </div>
              )}
              <p className="text-xs text-[#a89578]">下载 .gguf 模型文件后导入此目录，然后通过 <code className="bg-gray-100 px-1 rounded">http://127.0.0.1:8080/v1</code> 调用。启动命令: <code className="bg-gray-100 px-1 rounded">llama-server -m 模型路径 --port 8080</code></p>
            </div>
          )}
        </div>

        {/* ========== OpenCode 编程助手 ========== */}
        <div className="pt-6 border-t-2 border-[#e6d5b8]">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={16} className="text-[#4fa0d8]" />
            <span className="text-sm font-black text-[#4a4036]">OpenCode 编程助手</span>
            {ocStatus === null ? <span className="text-gray-400 text-xs ml-auto">检测中...</span> :
              ocStatus.installed ? <span className="text-green-600 text-xs font-bold flex items-center gap-1 ml-auto"><CheckCircle size={12} /> {ocStatus.version}</span> :
              <span className="text-red-500 text-xs font-bold flex items-center gap-1 ml-auto"><XCircle size={12} /> 未安装</span>}
            {!ocStatus?.installed && <button onClick={installOpenCode} disabled={ocLoading} className="px-3 py-1 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full disabled:opacity-50">{ocLoading ? <Loader2 size={12} className="animate-spin" /> : '安装'}</button>}
          </div>

          {/* 模型选择 */}
          <div className="space-y-2 mb-4">
            <label className="block text-xs font-bold text-gray-500">模型选择</label>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="oc-model-mode" checked={settings.opencodeUseChatModel} onChange={() => setSettings({...settings, opencodeUseChatModel: true, opencodeUseFreeModel: false})} className="accent-[#4fa0d8]" />
                <span className="text-xs text-[#4a4036] font-bold">使用聊天模型配置 ({settings.aiModel || '未配置'})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="oc-model-mode" checked={settings.opencodeUseFreeModel} onChange={() => setSettings({...settings, opencodeUseChatModel: false, opencodeUseFreeModel: true})} className="accent-[#4fa0d8]" />
                <span className="text-xs text-[#4a4036] font-bold">使用 OpenCode 免费模型</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="oc-model-mode" checked={!settings.opencodeUseChatModel && !settings.opencodeUseFreeModel} onChange={() => setSettings({...settings, opencodeUseChatModel: false, opencodeUseFreeModel: false})} className="accent-[#4fa0d8]" />
                <span className="text-xs text-[#4a4036] font-bold">自定义模型</span>
              </label>
            </div>
          </div>

          {/* 自定义模型 */}
          {!settings.opencodeUseChatModel && !settings.opencodeUseFreeModel && (
            <div className="space-y-3 mb-4 pl-4 border-l-2 border-[#4fa0d8]/20">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">API Base URL（留空使用 OpenCode 默认）</label>
                <input type="text" value={settings.opencodeBaseUrl} onChange={e => setSettings({...settings, opencodeBaseUrl: e.target.value})} placeholder="https://api.openai.com/v1" className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-1.5 text-xs outline-none focus:border-[#ba3f42]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">API Key</label>
                <input type="password" value={settings.opencodeApiKey} onChange={e => setSettings({...settings, opencodeApiKey: e.target.value})} placeholder="sk-..." className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-1.5 text-xs outline-none focus:border-[#ba3f42]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">模型名称 (provider/model)</label>
                <input type="text" value={settings.opencodeModel} onChange={e => setSettings({...settings, opencodeModel: e.target.value})} placeholder="openai/gpt-4o" className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-1.5 text-xs outline-none focus:border-[#ba3f42]" />
              </div>
            </div>
          )}

          {/* 工作目录 */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 mb-1">工作目录（留空使用 GWC 根目录）</label>
            <input type="text" value={settings.opencodeProjectPath} onChange={e => setSettings({...settings, opencodeProjectPath: e.target.value})} placeholder="项目根目录" className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-1.5 text-xs outline-none focus:border-[#ba3f42]" />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button onClick={fetchOcModels} disabled={ocLoading || !ocStatus?.installed} className="px-3 py-1.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] disabled:opacity-50 text-white text-xs font-bold rounded-full flex items-center shadow-sm">
              <RefreshCw size={12} className={`mr-1 ${ocLoading ? 'animate-spin' : ''}`} /> 探测可用模型
            </button>
            <button onClick={testOcConnection} disabled={ocLoading || !ocStatus?.installed} className="px-3 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] disabled:opacity-50 text-white text-xs font-bold rounded-full flex items-center shadow-sm">
              <Cpu size={12} className="mr-1" /> 测试连通性
            </button>
          </div>

          {/* 模型列表（可选择挂载） */}
          {ocParsedModels.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-bold text-gray-500 mb-2">点击选择模型：</p>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {ocParsedModels.map((m, i) => (
                  <button key={i} onClick={() => selectOcModel(m.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors border ${settings.opencodeModel === m.name ? 'bg-[#4fa0d8]/10 border-[#4fa0d8] text-[#4fa0d8]' : 'bg-white border-[#e6d5b8] text-[#4a4036] hover:border-[#4fa0d8]'}`}>
                    <span className="font-black">{m.name}</span>
                    {m.size && <span className="ml-2 text-gray-400 font-normal">{m.size}</span>}
                    {settings.opencodeModel === m.name && <CheckCircle size={12} className="inline ml-2 text-[#4fa0d8]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 原始输出 */}
          {ocModels && !ocParsedModels.length && <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs text-gray-600 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{ocModels}</div>}

          {ocTestResult && <div className={`mt-2 p-2 rounded-lg text-xs font-bold ${ocTestResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{ocTestResult.msg}</div>}
          <p className="mt-3 text-xs text-[#a89578]">工作模式开启后，消息将由 OpenCode 处理（文件操作、联网搜索等），继承当前人设风格回复。</p>
        </div>
      </div>
    </div>
  );
}
