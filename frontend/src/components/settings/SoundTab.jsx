import React from 'react';
import { useApp } from '../../contexts/AppContext';
import SettingToggle from '../ui/SettingToggle';
import SettingSlider from '../ui/SettingSlider';
import SettingSectionTitle from '../ui/SettingSectionTitle';
import { Upload, Trash2, Music, AlertCircle } from 'lucide-react';

export default function SoundTab() {
  const { settings, setSettings, handleBgmUpload, removeBgm, bgmList, currentBgmIndex, setCurrentBgmIndex, isBgmPlaying, toggleBgm } = useApp();

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
