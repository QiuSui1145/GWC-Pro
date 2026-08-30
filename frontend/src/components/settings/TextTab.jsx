import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import SettingToggle from '../ui/SettingToggle';
import SettingSlider from '../ui/SettingSlider';
import SettingSectionTitle from '../ui/SettingSectionTitle';
import { Eye, AlertCircle, Keyboard } from 'lucide-react';
import { SHORTCUT_DEFS } from '../../utils/constants';

const KEY_LABELS = {
  ControlRight: '右 Ctrl', ControlLeft: '左 Ctrl', AltLeft: '左 Alt', AltRight: '右 Alt',
  ShiftLeft: '左 Shift', ShiftRight: '右 Shift',
  F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6', F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',
  CapsLock: 'CapsLock', Space: '空格', Enter: '回车', Tab: 'Tab', Escape: 'Esc',
  Backquote: '`', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5', Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0',
  Minus: '-', Equal: '=', Backspace: '退格',
  BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/',
};

function keyCodeToLabel(code) {
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  if (code?.startsWith('Key')) return code.slice(3);
  if (code?.startsWith('Digit')) return code.slice(5);
  return code || '未设置';
}

function KeyCaptureInput({ settings, setSettings }) {
  const [capturing, setCapturing] = useState(false);

  const startCapture = () => { setCapturing(true); };

  const handleKeyDown = (e) => {
    if (!capturing) return;
    e.preventDefault(); e.stopPropagation();
    setSettings({ ...settings, voiceInputKey: e.code });
    setCapturing(false);
  };

  React.useEffect(() => {
    if (capturing) { window.addEventListener('keydown', handleKeyDown, true); return () => window.removeEventListener('keydown', handleKeyDown, true); }
  }, [capturing]);

  return (
    <div className="bg-[#fdfaf5] border border-[#e6d5b8] p-4 rounded-lg">
      <label className="block text-sm font-bold text-[#ba3f42] mb-2">自定义快捷键</label>
      <button
        onClick={startCapture}
        className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all border-2 ${capturing ? 'border-[#ba3f42] bg-red-50 text-[#ba3f42] animate-pulse' : 'border-[#d9c5b2] bg-white text-[#4a4036] hover:border-[#ba3f42]'}`}
      >
        <Keyboard size={16} />
        {capturing ? '请按下按键...' : keyCodeToLabel(settings.voiceInputKey || 'CtrlRight')}
      </button>
      <p className="text-xs text-[#7a6b5d] mt-1.5">点击按钮后按下想要绑定的按键即可捕获。</p>
    </div>
  );
}

export default function TextTab() {
  const { settings, setSettings, handleEnterVisualAdjust } = useApp();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 快捷栏显示管理 */}
      <SettingSectionTitle title="快捷栏显示管理 (界面右下角)" />
      <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm">
        <p className="text-xs text-[#7a6b5d] mb-4">根据您的需求或屏幕大小，自由开启或隐藏游戏界面右下角的快捷按钮。</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {SHORTCUT_DEFS.map(def => (
            <button key={def.id} onClick={() => setSettings(s => ({...s, shortcuts: {...s.shortcuts, [def.id]: !s.shortcuts[def.id]}}))}
              className={`px-3 py-2.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${settings.shortcuts?.[def.id] ? 'bg-[#8fbf8f]/20 text-[#4a4036] border-[#8fbf8f]/50 shadow-inner' : 'bg-white/60 text-[#a89578] border-[#e6d5b8] hover:bg-white'}`}>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${settings.shortcuts?.[def.id] ? 'bg-[#ba3f42] shadow-[0_0_5px_rgba(186,63,66,0.6)]' : 'bg-[#d9c5b2]'}`}></div>
              {def.label}
            </button>
          ))}
        </div>
      </div>

      {/* 文字显示与排版 */}
      <SettingSectionTitle title="文字显示与排版" extra={<button onClick={() => handleEnterVisualAdjust('dialog')} className="flex items-center gap-1 px-4 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full transition-colors shadow-sm"><Eye size={14}/> 预览调整</button>} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
        <div>
          <label className="block text-sm font-bold text-[#ba3f42] mb-2">对话框排版字体</label>
          <select value={settings.dialogFontFamily} onChange={e => setSettings({...settings, dialogFontFamily: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 outline-none shadow-inner">
            <option value='"Microsoft YaHei", sans-serif'>默认黑体</option><option value='"SimSun", "Songti SC", serif'>经典宋体</option><option value='"KaiTi", "Kaiti SC", serif'>优雅楷体</option><option value='"FangSong", serif'>仿宋</option><option value='sans-serif'>现代无衬线</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#ba3f42] mb-2">对话文字颜色</label>
          <div className="flex items-center gap-3"><input type="color" value={settings.dialogTextColor} onChange={e => setSettings({...settings, dialogTextColor: e.target.value})} className="h-10 w-16 rounded cursor-pointer bg-white border border-[#d9c5b2] p-0.5 shadow-inner" /><span className="text-sm font-bold text-[#7a6b5d] uppercase">{settings.dialogTextColor}</span></div>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#ba3f42] mb-2">窗口背景主题色</label>
          <div className="flex items-center gap-3"><input type="color" value={settings.dialogThemeColor} onChange={e => setSettings({...settings, dialogThemeColor: e.target.value})} className="h-10 w-16 rounded cursor-pointer bg-white border border-[#d9c5b2] p-0.5 shadow-inner" /><span className="text-sm font-bold text-[#7a6b5d] uppercase">{settings.dialogThemeColor}</span></div>
        </div>
      </div>
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
        <SettingSlider label="主对话框不透明度" value={settings.dialogOpacity} min={0} max={1} step={0.05} suffix="" onChange={v => setSettings({...settings, dialogOpacity: v})} />
        <SettingSlider label="系统面板不透明度" value={settings.settingsOpacity} min={0.2} max={1} step={0.05} suffix="" onChange={v => setSettings({...settings, settingsOpacity: v})} />
        <div className="md:col-span-2 pt-2 border-t border-dashed border-[#e6d5b8]">
          <SettingSlider label="文本排版行距" value={settings.dialogLineHeight || 1.8} min={1.0} max={3.0} step={0.1} suffix="倍" onChange={v => setSettings({...settings, dialogLineHeight: v})} />
        </div>
        <div className="md:col-span-2 pt-2 border-t border-dashed border-[#e6d5b8]">
          <SettingSlider label="对话框/快捷栏 垂直位置偏移" value={settings.dialogPositionY} min={0} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, dialogPositionY: v})} />
        </div>
      </div>

      {/* 桥接通讯 */}
      <SettingSectionTitle title="桌宠桥接通讯 (Bridge)" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
        <SettingToggle label="开启后端通讯桥接" value={settings.enableBridge} onChange={v => setSettings({...settings, enableBridge: v})} />
        <p className="text-xs text-[#7a6b5d] mt-2">开启后，桌宠聊天框的请求将通过本前端转发至大模型，共享相同的 API 配置和 TTS 能力。</p>
      </div>

      {/* 语音输入 */}
      <SettingSectionTitle title="语音输入 (Voice Input)" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
        <SettingToggle label="开启语音输入功能" value={settings.enableVoiceInput} onChange={v => setSettings({...settings, enableVoiceInput: v})} />
        {settings.enableVoiceInput && (
          <>
            <KeyCaptureInput settings={settings} setSettings={setSettings} />
            <SettingToggle label="启用全局语音输入（桌宠接管）" value={settings.voiceInputGlobal === true} onChange={v => setSettings({...settings, voiceInputGlobal: v})} />
            <p className="text-xs text-[#7a6b5d]">开启后桌宠注册系统级快捷键，可在任意应用中触发录音，识别文字填入桌宠聊天框并中继到前端。</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-dashed border-[#e6d5b8]">
              <div>
                <label className="block text-sm font-bold text-[#ba3f42] mb-2">录音模式</label>
                <select value={settings.voiceInputMode || 'hold'} onChange={e => setSettings({...settings, voiceInputMode: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 outline-none shadow-inner">
                  <option value="hold">长按说话 / 松开停止</option>
                  <option value="toggle">按键切换 / 开始停止</option>
                  <option value="auto">自动检测语音（仅桌宠）</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#ba3f42] mb-2">识别语言</label>
                <select value={settings.voiceInputLang} onChange={e => setSettings({...settings, voiceInputLang: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 outline-none shadow-inner">
                  <option value="zh">中文</option><option value="ja">日文</option><option value="en">英文</option><option value="ko">韩文</option>
                </select>
              </div>
            </div>
            <div className="pt-2 border-t border-dashed border-[#e6d5b8]">
              <SettingToggle label="识别文字先显示在输入框（关=直接发送）" value={settings.voiceInputPreview !== false} onChange={v => setSettings({...settings, voiceInputPreview: v})} />
            </div>
            <div className="pt-2 border-t border-dashed border-[#e6d5b8]">
              <label className="block text-sm font-bold text-[#ba3f42] mb-2">ASR 模型大小</label>
              <select value={settings.voiceInputModelSize || 'base'} onChange={e => setSettings({...settings, voiceInputModelSize: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 outline-none shadow-inner">
                <option value="tiny">tiny (~150MB, 最快)</option>
                <option value="base">base (~300MB, 默认)</option>
                <option value="small">small (~1GB, 高精度)</option>
              </select>
              <p className="text-xs text-[#7a6b5d] mt-1.5">small 模型中文识别率大幅提升，首次切换会自动下载。</p>
            </div>
            {settings.voiceInputMode === 'auto' && (
              <div className="pt-2 border-t border-dashed border-[#e6d5b8]">
                <SettingSlider label="静音停顿时间" value={settings.voiceSilenceTimeout || 2.0} min={0.5} max={10.0} step={0.5} suffix="秒" onChange={v => setSettings({...settings, voiceSilenceTimeout: v})} />
              </div>
            )}
          </>
        )}
      </div>

      {/* 主动搭话 */}
      <SettingSectionTitle title="主动搭话机制" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <SettingToggle label="开启大模型主动搭话" value={settings.enableProactiveChat} onChange={v => setSettings({...settings, enableProactiveChat: v})} />
            <p className="text-xs text-[#7a6b5d] mt-2">玩家长时间未发言时，AI 会随机开启新话题。</p>
            <div className="mt-4">
              <SettingToggle label="📸 主动搭话附带屏幕截图" value={settings.enableProactiveScreenshot} onChange={v => setSettings({...settings, enableProactiveScreenshot: v})} />
              <p className="text-xs text-[#7a6b5d] mt-2">屏幕捕捉开启后，主动搭话时将附带最新屏幕截图。如模型不支持多模态则跳过。</p>
            </div>
          </div>
          {settings.enableProactiveChat && (
            <div className="flex-1 flex flex-col gap-4 justify-center border-t-2 md:border-t-0 md:border-l-2 border-dashed border-[#e6d5b8] pt-6 md:pt-0 md:pl-6">
              <SettingSlider label="最小间隔" value={settings.proactiveMinInterval} min={1} max={60} step={1} suffix="分钟" onChange={v => setSettings({...settings, proactiveMinInterval: v})} />
              <SettingSlider label="最大间隔" value={settings.proactiveMaxInterval} min={1} max={120} step={1} suffix="分钟" onChange={v => setSettings({...settings, proactiveMaxInterval: v})} />
            </div>
          )}
        </div>
      </div>

      {/* 行为互动设定 */}
      <SettingSectionTitle title="行为互动设定" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-3">
            <SettingToggle label="启用剧情选项推演" value={settings.enablePlotOptions} onChange={v => setSettings({...settings, enablePlotOptions: v})} />
            {settings.enablePlotOptions && (
              <div className="bg-[#fdfaf5] border border-[#e6d5b8] p-4 rounded-lg shadow-inner mt-1">
                <label className="block text-xs font-bold text-[#ba3f42] mb-2">推演 API 来源</label>
                <select value={settings.plotApiMode} onChange={e => setSettings({...settings, plotApiMode: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm outline-none mb-3">
                  <option value="shared">使用主聊天大模型</option><option value="independent">独立配置推演 API</option>
                </select>
                {settings.plotApiMode === 'independent' && (
                  <div className="space-y-3 pt-3 border-t border-dashed border-[#e6d5b8]">
                    <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">Base URL</label><input type="text" value={settings.plotBaseUrl} onChange={e => setSettings({...settings, plotBaseUrl: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-1.5 text-xs outline-none" /></div>
                    <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">API Key</label><input type="password" value={settings.plotApiKey} onChange={e => setSettings({...settings, plotApiKey: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-1.5 text-xs outline-none" /></div>
                    <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">模型名称</label><input type="text" value={settings.plotModel} onChange={e => setSettings({...settings, plotModel: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-1.5 text-xs outline-none" /></div>
                  </div>
                )}
              </div>
            )}
          </div>
          <SettingToggle label="启用 Live2D 鼠标点击交互" value={settings.enableClickExpression} onChange={v => setSettings({...settings, enableClickExpression: v})} />
          <div className="md:col-span-2 flex justify-between gap-4 border-t border-dashed border-[#e6d5b8] pt-6">
            <SettingToggle label="文字流式打字机效果" value={settings.enableStreaming} onChange={v => setSettings({...settings, enableStreaming: v})} />
            {settings.enableStreaming && <div className="flex-1 max-w-sm"><SettingSlider label="打字速度" value={settings.typingSpeed} min={10} max={150} step={10} suffix="ms" onChange={v => setSettings({...settings, typingSpeed: v})} /></div>}
          </div>
          <div className="md:col-span-2"><SettingSlider label="长段落分页行数" value={settings.vnLinesPerPage} min={2} max={12} step={1} suffix="行" onChange={v => setSettings({...settings, vnLinesPerPage: v})} /></div>
          <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-[#e8d5b5]">
            <input type="checkbox" id="vnAutoPage" checked={settings.vnAutoPage !== false} onChange={e => setSettings({...settings, vnAutoPage: e.target.checked})} className="w-5 h-5 accent-[#ba3f42] cursor-pointer" />
            <label htmlFor="vnAutoPage" className="flex-1 text-sm text-[#4a4a4a] cursor-pointer select-none">
              <span className="font-bold text-[#ba3f42]">自动翻页</span> — 流式输出时自动跟随到最后一页。关闭后始终显示第一页，点击对话框翻页
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
