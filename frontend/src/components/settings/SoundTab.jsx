import React from 'react';
import { useApp } from '../../contexts/AppContext';
import SettingToggle from '../ui/SettingToggle';
import SettingSlider from '../ui/SettingSlider';
import SettingSectionTitle from '../ui/SettingSectionTitle';
<<<<<<< HEAD
import { Upload, Trash2, Music, AlertCircle, Mic2, Play, Square, RefreshCw, Loader2, CheckCircle, XCircle } from 'lucide-react';
=======
import { Upload, Trash2, Music, AlertCircle } from 'lucide-react';
>>>>>>> 64b6d65c5a98416f5db9608a4493435ec5aca2bf

export default function SoundTab() {
  const { settings, setSettings, handleBgmUpload, removeBgm, bgmList, currentBgmIndex, setCurrentBgmIndex, isBgmPlaying, toggleBgm } = useApp();

<<<<<<< HEAD
  // ---- 内置配音 (GPT-SoVITS) ----
  const [ttsStatus, setTtsStatus] = React.useState(null);   // null = 尚未探测
  const [ttsVoices, setTtsVoices] = React.useState([]);
  const [ttsBusy, setTtsBusy] = React.useState(false);
  const [ttsMsg, setTtsMsg] = React.useState('');
  const [voiceBusy, setVoiceBusy] = React.useState('');

  const fetchTtsStatus = React.useCallback(async () => {
    try {
      const s = await fetch('/api/tts/status').then(r => r.json());
      setTtsStatus(s);
      return s;
    } catch { setTtsStatus({ ok: false, running: false }); return null; }
  }, []);

  const fetchVoices = React.useCallback(async () => {
    try {
      const d = await fetch('/api/tts/voices').then(r => r.json());
      setTtsVoices(Array.isArray(d.voices) ? d.voices : []);
    } catch { setTtsVoices([]); }
  }, []);

  React.useEffect(() => {
    fetchTtsStatus().then(s => { if (s?.running) fetchVoices(); });
  }, [fetchTtsStatus, fetchVoices]);

  const startTts = async () => {
    setTtsBusy(true); setTtsMsg('正在启动，首次加载模型约需 10-60 秒…');
    try {
      const r = await fetch('/api/tts/start', { method: 'POST' }).then(r => r.json());
      if (!r.ok) { setTtsMsg(r.msg || '启动失败'); setTtsBusy(false); return; }
      // 模型加载较慢，轮询到就绪为止（最多约 90 秒）
      for (let i = 0; i < 45; i++) {
        await new Promise(res => setTimeout(res, 2000));
        const s = await fetchTtsStatus();
        if (s?.running) { setTtsMsg('内置配音已就绪'); await fetchVoices(); break; }
        if (i === 44) setTtsMsg('启动超时，请查看 TTS 窗口输出');
      }
    } catch (e) { setTtsMsg('启动失败: ' + e.message); }
    setTtsBusy(false);
  };

  const stopTts = async () => {
    setTtsBusy(true); setTtsMsg('');
    try {
      const r = await fetch('/api/tts/stop', { method: 'POST' }).then(r => r.json());
      setTtsMsg(r.msg || '');
      await fetchTtsStatus();
    } catch (e) { setTtsMsg('停止失败: ' + e.message); }
    setTtsBusy(false);
  };

  // ---- 按需安装（分发包不含推理代码与模型，首次使用时从本机 GPT-SoVITS 导入）----
  const [instSources, setInstSources] = React.useState(null);
  const [instPath, setInstPath] = React.useState('');
  const [instVoices, setInstVoices] = React.useState([]);
  const [instPicked, setInstPicked] = React.useState({});
  const [instProg, setInstProg] = React.useState(null);
  const [instScanning, setInstScanning] = React.useState(false);

  const scanSources = async (manual) => {
    setInstScanning(true);
    try {
      const q = manual ? `?path=${encodeURIComponent(manual)}` : '';
      const d = await fetch('/api/tts/install/sources' + q).then(r => r.json());
      setInstSources(d.sources || []);
      if (d.sources?.length) {
        const p = d.sources[0].path;
        setInstPath(p);
        loadInstVoices(p);
      }
    } catch { setInstSources([]); }
    setInstScanning(false);
  };

  const loadInstVoices = async (p) => {
    try {
      const d = await fetch(`/api/tts/install/voices?path=${encodeURIComponent(p)}`).then(r => r.json());
      setInstVoices(d.voices || []);
      // 默认勾选每个角色轮次最高的一组，避免一次拷贝几 GB
      const best = {};
      (d.voices || []).forEach(v => {
        const role = v.file.replace(/[-_]e\d+(_s\d+)?\.(ckpt|pth)$/i, '');
        const key = `${v.kind}:${role}`;
        const ep = parseInt((v.file.match(/[-_]e(\d+)/) || [])[1] || '0', 10);
        if (!best[key] || ep > best[key].ep) best[key] = { ep, rel: v.rel };
      });
      const picked = {};
      Object.values(best).forEach(b => { picked[b.rel] = true; });
      setInstPicked(picked);
    } catch { setInstVoices([]); }
  };

  const startInstall = async () => {
    const voices = instVoices.filter(v => instPicked[v.rel])
      .map(v => ({ kind: v.kind, dir: v.dir, file: v.file }));
    // 依据勾选的音色目录推断需要哪些底模，避免把所有版本都拷进来
    const versions = [];
    voices.forEach(v => {
      if (/v2ProPlus/i.test(v.dir)) versions.push('v2ProPlus');
      else if (/v2Pro/i.test(v.dir)) versions.push('v2Pro');
      else if (/v4/i.test(v.dir)) versions.push('v4');
    });
    const r = await fetch('/api/tts/install', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: instPath, voices, versions: [...new Set(versions)] })
    }).then(r => r.json());
    if (!r.ok) { setTtsMsg(r.msg); return; }
    setInstProg({ running: true, percent: 0, step: '开始…' });
    const timer = setInterval(async () => {
      try {
        const p = await fetch('/api/tts/install/progress').then(r => r.json());
        setInstProg(p);
        if (p.done) {
          clearInterval(timer);
          setTtsMsg(p.ok ? '安装完成，可以启动内置配音了' : ('安装失败: ' + p.error));
          if (p.ok) { setInstSources(null); await fetchTtsStatus(); }
        }
      } catch { clearInterval(timer); }
    }, 1000);
  };

  const pickedSize = React.useMemo(
    () => instVoices.filter(v => instPicked[v.rel]).reduce((s, v) => s + v.size, 0),
    [instVoices, instPicked]
  );

  const switchVoice = async (id) => {
    setVoiceBusy(id); setTtsMsg('');
    try {
      const r = await fetch('/api/tts/set_voice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: id })
      }).then(r => r.json());
      setTtsMsg(r.ok ? `已切换音色: ${id}` : (r.msg || r.message || '切换失败'));
      if (r.ok) setSettings({ ...settings, ttsVoiceId: id });
    } catch (e) { setTtsMsg('切换失败: ' + e.message); }
    setVoiceBusy('');
  };

=======
>>>>>>> 64b6d65c5a98416f5db9608a4493435ec5aca2bf
  return (
    <div className="space-y-8 animate-fade-in">
      {/* 主界面音乐组件 */}
      <SettingSectionTitle title="主界面音乐组件设定" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
        <SettingToggle label="在主界面显示音乐播放器 (可拖拽)" value={settings.showTitleBgmPlayer} onChange={v => setSettings({...settings, showTitleBgmPlayer: v})} />
        <p className="text-xs text-[#7a6b5d] mt-2">开启后在主标题界面左下角显示半透明悬浮播放器。</p>
      </div>

      {/* 音量与播放控制 */}
      <SettingSectionTitle title="音量与播放控制" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
        <SettingSlider label="背景音乐音量 (BGM)" value={settings.bgmVolume} min={0} max={1} step={0.05} suffix="" onChange={v => setSettings({...settings, bgmVolume: v})} />
        <SettingSlider label="语音合成音量 (TTS)" value={settings.ttsVolume} min={0} max={1} step={0.05} suffix="" onChange={v => setSettings({...settings, ttsVolume: v})} />
        <SettingSlider label="语音播放倍速" value={settings.ttsPlaybackRate} min={0.5} max={2.0} step={0.1} suffix="x" onChange={v => setSettings({...settings, ttsPlaybackRate: v})} />
      </div>

      {/* BGM 管理 */}
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
        <label className="block text-sm font-bold text-[#ba3f42] mb-3">导入本地背景音乐 (支持多首)</label>
        <div className="flex gap-4 items-center mb-4">
          <input type="file" accept="audio/*" multiple onChange={handleBgmUpload} className="block w-full text-sm text-[#7a6b5d] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#8fbf8f] file:text-white hover:file:bg-[#7ebd7e] cursor-pointer"/>
          <select value={settings.bgmMode} onChange={e => setSettings({...settings, bgmMode: e.target.value})} className="bg-white border border-[#d9c5b2] text-[#4a4036] font-bold text-sm rounded-md px-4 py-2 outline-none shadow-inner">
            <option value="sequential">顺序播放</option><option value="random">随机播放</option><option value="loop">单曲循环</option>
          </select>
        </div>
        {bgmList.length > 0 && (
          <div className="max-h-40 overflow-y-auto bg-white rounded-lg p-2 border border-[#e6d5b8] space-y-1 mb-4">
            {bgmList.map((bgm, idx) => (
              <div key={bgm.id} className={`flex justify-between items-center px-4 py-2 rounded text-sm group transition-colors ${currentBgmIndex === idx ? 'bg-[#8fbf8f]/20 font-bold text-[#4a4036]' : 'hover:bg-black/5 text-[#7a6b5d]'}`}>
                <span className="truncate pr-4 flex-1 cursor-pointer" onClick={() => { setCurrentBgmIndex(idx); if(!isBgmPlaying) toggleBgm(); }}>{currentBgmIndex === idx && isBgmPlaying ? '🎶 ' : ''}{bgm.name}</span>
                <button onClick={() => removeBgm(bgm.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 px-2 shrink-0"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        )}
        <SettingToggle label="切歌时显示歌曲名称" value={settings.enableBgmToast} onChange={v => setSettings({...settings, enableBgmToast: v})} />
      </div>

      {/* TTS 语音合成 */}
      <SettingSectionTitle title="语音合成 (TTS) 接口" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
        <SettingToggle label="开启全局 TTS 自动朗读" value={settings.ttsEnabled} onChange={v => setSettings({...settings, ttsEnabled: v})} />
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity ${!settings.ttsEnabled && 'opacity-50 pointer-events-none'}`}>
          <div>
            <label className="block text-sm font-bold text-[#ba3f42] mb-2">发音语言</label>
            <select value={settings.ttsLanguage} onChange={e => setSettings({...settings, ttsLanguage: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 outline-none shadow-inner">
              <option value="zh">中文</option><option value="ja">日文</option><option value="en">英文</option><option value="ko">韩文</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-[#ba3f42] mb-2">API URL 模板</label>
            <input type="text" value={settings.ttsUrlTemplate} onChange={e => setSettings({...settings, ttsUrlTemplate: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm outline-none shadow-inner" />
            <div className="bg-[#fdfaf5] p-3 mt-2 rounded border border-[#e6d5b8]">
              <p className="text-[11px] text-[#7a6b5d] font-bold mb-1"><AlertCircle size={12} className="inline mr-1 text-[#ba3f42]"/> 模板示例：</p>
              <code className="text-[10px] text-blue-600 break-all select-all block bg-white p-1.5 rounded border border-[#d9c5b2]">http://127.0.0.1:9880/tts?text={'{text}'}&text_lang={'{lang}'}&ref_audio_path={'{ref_audio}'}&prompt_text={'{ref_text}'}&prompt_lang={'{ref_lang}'}</code>
            </div>
          </div>
          <div className="md:col-span-3 border-t border-dashed border-[#e6d5b8] pt-4">
            <SettingSlider label="流式分句停顿时间" value={settings.ttsSentencePause} min={0} max={3000} step={10} suffix="ms" onChange={v => setSettings({...settings, ttsSentencePause: v})} />
          </div>
          <div className="md:col-span-3">
            <SettingToggle label="🚀 极速短标点切句预加载" value={settings.ttsFastMode} onChange={v => setSettings({...settings, ttsFastMode: v})} />
            <p className="text-xs text-[#7a6b5d] mt-2 leading-relaxed bg-[#fdfaf5] p-3 rounded-lg border border-[#e6d5b8]"><strong className="text-emerald-600">GPT-SoVITS 优化：</strong>开启后遇到逗号就预加载下一句，消除排队延迟。</p>
          </div>
          <div className="md:col-span-3 border-t border-dashed border-[#e6d5b8] pt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <h4 className="text-sm font-bold text-[#4a4036]">参考音频配置 (克隆/指定音色必填)</h4>
<<<<<<< HEAD
              <SettingToggle label="🎙️ 内置配音" value={settings.ttsBuiltIn} onChange={v => setSettings({...settings, ttsBuiltIn: v})} />
            </div>

            {/* 内置配音控制台：一键启停 + 音色选择 */}
            {settings.ttsBuiltIn && (
              <div className="mb-5 bg-[#fdfaf5] p-5 rounded-xl border border-[#e6d5b8] shadow-inner space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mic2 size={16} className="text-[#4fa0d8] shrink-0" />
                    <span className="text-sm font-black text-[#4a4036]">内置配音服务 (GPT-SoVITS)</span>
                    {ttsStatus === null ? (
                      <span className="text-xs text-[#a89578]">检测中…</span>
                    ) : ttsStatus.running ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle size={12} /> 运行中
                        {ttsStatus.health?.version && ` · ${ttsStatus.health.version}`}
                        {ttsStatus.health?.device && ` · ${ttsStatus.health.device}`}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-[#a89578] flex items-center gap-1"><XCircle size={12} /> 未运行</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ttsStatus && !ttsStatus.installed ? null : !ttsStatus?.running ? (
                      <button onClick={startTts} disabled={ttsBusy}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white text-xs font-bold rounded-full transition-colors disabled:opacity-50">
                        {ttsBusy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} 启动
                      </button>
                    ) : (
                      <button onClick={stopTts} disabled={ttsBusy}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-[#ba3f42] hover:bg-[#a03538] text-white text-xs font-bold rounded-full transition-colors disabled:opacity-50">
                        {ttsBusy ? <Loader2 size={13} className="animate-spin" /> : <Square size={13} />} 停止
                      </button>
                    )}
                    <button onClick={() => { fetchTtsStatus(); fetchVoices(); }} disabled={ttsBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full transition-colors disabled:opacity-50">
                      <RefreshCw size={13} /> 刷新
                    </button>
                  </div>
                </div>

                {ttsMsg && <p className="text-xs font-bold text-[#4fa0d8]">{ttsMsg}</p>}

                {/* 未安装：引导从本机 GPT-SoVITS 一键导入（分发包不含大文件） */}
                {ttsStatus && !ttsStatus.installed && (
                  <div className="bg-white rounded-lg border border-[#e6d5b8] p-4 space-y-3">
                    <p className="text-xs text-[#7a6b5d] leading-relaxed">
                      内置配音尚未安装。为控制分发体积，推理代码与模型不随程序附带，
                      可从本机已安装的 <b>GPT-SoVITS</b> 一键导入（仅复制文件，不修改原目录）。
                    </p>

                    {instProg?.running || instProg?.done ? (
                      <div>
                        <div className="flex justify-between text-xs font-bold text-[#4a4036] mb-1">
                          <span>{instProg.step}</span><span>{instProg.percent}%</span>
                        </div>
                        <div className="h-2 bg-[#e8decb] rounded-full overflow-hidden">
                          <div className="h-full bg-[#8fbf8f] transition-all" style={{ width: `${instProg.percent}%` }} />
                        </div>
                        {instProg.error && <p className="text-xs text-[#ba3f42] mt-2">{instProg.error}</p>}
                      </div>
                    ) : instSources === null ? (
                      <button onClick={() => scanSources()} disabled={instScanning}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full disabled:opacity-50">
                        {instScanning ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} 扫描本机 GPT-SoVITS
                      </button>
                    ) : instSources.length === 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-[#ba3f42]">未找到 GPT-SoVITS 安装，请手动指定其根目录：</p>
                        <div className="flex gap-2">
                          <input type="text" value={instPath} onChange={e => setInstPath(e.target.value)}
                            placeholder="如: D:\GPT-SoVITS\GPT-SoVITS-v2pro-xxxxxxxx"
                            className="flex-1 bg-white border border-[#d9c5b2] rounded-md px-3 py-1.5 text-xs outline-none" />
                          <button onClick={() => scanSources(instPath)} disabled={!instPath || instScanning}
                            className="px-3 py-1.5 bg-[#4fa0d8] text-white text-xs font-bold rounded-full disabled:opacity-50">检测</button>
                        </div>
                        <p className="text-[11px] text-[#a89578]">
                          没有的话，可前往 GPT-SoVITS 官方仓库下载整合包，解压后指定该目录即可。
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-[#7a6b5d] mb-1">来源目录</label>
                          <select value={instPath} onChange={e => { setInstPath(e.target.value); loadInstVoices(e.target.value); }}
                            className="w-full bg-white border border-[#d9c5b2] rounded-md px-3 py-1.5 text-xs outline-none">
                            {instSources.map(s => (
                              <option key={s.path} value={s.path}>{s.path}{s.has_runtime ? ' (含运行时)' : ' (无运行时)'}</option>
                            ))}
                          </select>
                        </div>

                        {instVoices.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-bold text-[#7a6b5d]">选择要导入的音色</label>
                              <span className="text-[11px] text-[#a89578]">
                                已选 {Object.values(instPicked).filter(Boolean).length} 个 · 约 {(pickedSize / 1024 / 1024 / 1024).toFixed(2)} GB
                              </span>
                            </div>
                            <div className="max-h-40 overflow-y-auto bg-[#fdfaf5] rounded border border-[#e6d5b8] p-2 space-y-1">
                              {instVoices.map(v => (
                                <label key={v.rel} className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-white/60 px-1 rounded">
                                  <input type="checkbox" checked={!!instPicked[v.rel]}
                                    onChange={e => setInstPicked({ ...instPicked, [v.rel]: e.target.checked })}
                                    className="accent-[#4fa0d8]" />
                                  <span className={`font-bold ${v.kind === 'gpt' ? 'text-[#ba3f42]' : 'text-[#4fa0d8]'}`}>{v.kind}</span>
                                  <span className="flex-1 truncate text-[#4a4036]">{v.file}</span>
                                  <span className="text-[#a89578]">{(v.size / 1024 / 1024).toFixed(0)}MB</span>
                                </label>
                              ))}
                            </div>
                            <p className="text-[11px] text-[#a89578] mt-1">
                              已默认勾选每个角色轮次最高的一组。GPT 与 SoVITS 需成对导入才能使用。
                            </p>
                          </div>
                        )}

                        <button onClick={startInstall}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white text-xs font-bold rounded-full">
                          <Play size={13} /> 开始导入
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {ttsStatus && !ttsStatus.runtime_ok && (
                  <p className="text-xs text-[#ba3f42] leading-relaxed">
                    未找到 Python 运行时：<code className="break-all">{ttsStatus.runtime}</code><br />
                    内置配音共享原 GPT-SoVITS 安装目录的 runtime。若路径不同，请设置环境变量 <b>GWC_SOVITS_RUNTIME</b> 指向 runtime\python.exe。
                  </p>
                )}

                {/* 音色选择 */}
                {ttsStatus?.running && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[#7a6b5d]">音色选择</label>
                      <span className="text-[10px] text-[#a89578]">切换需重新加载权重，约数秒</span>
                    </div>
                    {ttsVoices.length === 0 ? (
                      <p className="text-xs text-[#a89578]">未发现音色，请将权重放入 tts/models/gpt 与 tts/models/sovits</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ttsVoices.map(v => (
                          <button key={v.id} onClick={() => v.usable && switchVoice(v.id)}
                            disabled={!v.usable || !!voiceBusy}
                            title={v.usable ? `${v.gpt} + ${v.sovits}` : '缺少 GPT 或 SoVITS 权重，无法使用'}
                            className={`text-left px-3 py-2 rounded-lg text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              settings.ttsVoiceId === v.id
                                ? 'bg-[#4fa0d8]/10 border-[#4fa0d8] text-[#4fa0d8]'
                                : 'bg-white border-[#e6d5b8] text-[#4a4036] hover:border-[#4fa0d8]'
                            }`}>
                            <span className="font-black">{v.name}</span>
                            {voiceBusy === v.id && <Loader2 size={11} className="inline ml-2 animate-spin" />}
                            {settings.ttsVoiceId === v.id && voiceBusy !== v.id && <CheckCircle size={11} className="inline ml-2" />}
                            {!v.usable && <span className="ml-2 font-normal text-[#a89578]">权重不全</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-[#7a6b5d] leading-relaxed border-t border-dashed border-[#e6d5b8] pt-3">
                  内置配音随项目一起提供，无需另外部署。推理代码与音色位于 <code>tts/</code> 目录，
                  Python 运行时共享自原 GPT-SoVITS 安装（以节省约 6.6GB 空间）。
                  服务地址为 <code>127.0.0.1:9880</code>，与上方 API URL 模板一致。
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2"><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">参考音频路径/URL</label><input type="text" value={settings.ttsRefAudio || ''} onChange={e => setSettings({...settings, ttsRefAudio: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm outline-none shadow-inner" placeholder="如: D:\audio\ref.wav" /></div>
              <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">参考音频语种</label><select value={settings.ttsRefLang || 'zh'} onChange={e => setSettings({...settings, ttsRefLang: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 outline-none shadow-inner"><option value="zh">中文</option><option value="ja">日文</option><option value="en">英文</option><option value="ko">韩文</option></select></div>
              <div className="md:col-span-3"><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">参考音频文本</label><input type="text" value={settings.ttsRefText || ''} onChange={e => setSettings({...settings, ttsRefText: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm outline-none shadow-inner" placeholder="参考音频里说的话..." /></div>
            </div>
            <p className="text-[11px] text-[#7a6b5d] mt-2">留空则不传参考音频参数，由服务端使用自身配置的默认音色。</p>
=======
              <SettingToggle label="📱 云端挂载模式" value={settings.ttsMobileMode} onChange={v => setSettings({...settings, ttsMobileMode: v})} />
            </div>
            {!settings.ttsMobileMode ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2"><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">参考音频路径/URL</label><input type="text" value={settings.ttsRefAudio || ''} onChange={e => setSettings({...settings, ttsRefAudio: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm outline-none shadow-inner" placeholder="如: D:\audio\ref.wav" /></div>
                <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">参考音频语种</label><select value={settings.ttsRefLang || 'zh'} onChange={e => setSettings({...settings, ttsRefLang: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 outline-none shadow-inner"><option value="zh">中文</option><option value="ja">日文</option><option value="en">英文</option><option value="ko">韩文</option></select></div>
                <div className="md:col-span-3"><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">参考音频文本</label><input type="text" value={settings.ttsRefText || ''} onChange={e => setSettings({...settings, ttsRefText: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm outline-none shadow-inner" placeholder="参考音频里说的话..." /></div>
              </div>
            ) : (
              <div className="bg-[#fdfaf5] p-5 rounded-xl border border-[#e6d5b8] shadow-inner text-xs text-[#7a6b5d] leading-relaxed">
                <strong className="text-emerald-600">云端模式已开启：</strong>系统已剥离客户端的参考音频参数，自动使用服务端默认配置的参考音色。
              </div>
            )}
>>>>>>> 64b6d65c5a98416f5db9608a4493435ec5aca2bf
          </div>
        </div>
      </div>

      {/* 同声传译 */}
      <SettingSectionTitle title="同声传译设定" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
        <SettingToggle label="启用同声传译模式" value={settings.enableTranslation} onChange={v => setSettings({...settings, enableTranslation: v})} />
        <p className="text-xs text-[#7a6b5d]">开启后，AI 分别生成外文语音与母语文本。</p>
        {settings.enableTranslation && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dashed border-[#e6d5b8]">
            <div><label className="block text-sm font-bold text-[#ba3f42] mb-2">屏幕显示语种</label><select value={settings.displayLanguage} onChange={e => setSettings({...settings, displayLanguage: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 outline-none shadow-inner"><option value="zh">中文</option><option value="ja">日文</option><option value="en">英文</option><option value="ko">韩文</option></select></div>
            <div><label className="block text-sm font-bold text-[#ba3f42] mb-2">语音合成语种</label><select disabled value={settings.ttsLanguage} className="w-full bg-[#fdfaf5] border border-[#e6d5b8] text-[#a89578] font-bold rounded-md px-3 py-2 outline-none shadow-inner cursor-not-allowed"><option value="zh">中文</option><option value="ja">日文</option><option value="en">英文</option><option value="ko">韩文</option></select></div>
          </div>
        )}
      </div>
    </div>
  );
}
