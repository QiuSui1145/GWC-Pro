import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Copy, FileText, Send, Mic, MicOff } from 'lucide-react';

export default function ChatPage() {
  const {
    settings, setSettings, activeSession, inputValue, setInputValue,
    isLoading, isHidden, setIsHidden,
    triggerSendMessage, handleKeyDown,
    selectedFiles, setSelectedFiles, handleFileSelect,
    bgmList, currentBgmIndex, isBgmPlaying, bgmToast,
    handleNextBgm, handlePrevBgm, toggleBgm,
    setIsSettingsOpen, setIsSaveLoadUIOpen, setSlMode,
    setIsMemoOpen, setIsLogOpen,
    suggestedReplies, isGeneratingReplies,
    generatePlotOptions, enableFaceTracking, toggleFaceTracking,
    isModelHidden, setIsModelHidden,
    pluginDialog,
    vnLines, vnPage, setVnPage, vnTotalPages,
    visualAdjustMode, setVisualAdjustMode,
    copyToClipboard,
    isVoiceRecording, toggleVoiceRecording, voiceError, setVoiceError, voiceKeyActive, asrModelStatus
  } = useApp();

  const currentMessages = activeSession?.messages || [];
  const lastAssistantMsg = [...currentMessages].reverse().find(m => m.role === 'assistant');
  const displayText = lastAssistantMsg?.content || '';

  return (
    <div className="absolute inset-0 z-10 flex flex-col pointer-events-auto" tabIndex={-1} ref={el => el?.focus()}
      onKeyDown={(e) => {
        if (e.code === (settings.voiceInputKey || 'ControlRight') && !e.repeat && settings.voiceInputMode !== 'auto') {
          e.preventDefault(); toggleVoiceRecording();
        }
      }}>
      {/* 推演选项气泡 */}
      {settings.enablePlotOptions && suggestedReplies.length > 0 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 flex flex-wrap gap-2 max-w-[80%] justify-center">
          {suggestedReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => { setInputValue(reply); setSuggestedReplies([]); }}
              className="px-4 py-2 bg-white/80 hover:bg-white text-[#4a4036] text-sm rounded-full shadow-md border border-[#e6d5b8] transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* 插件对话框 */}
      {pluginDialog.visible && (
        <div className="absolute inset-0 z-30 flex items-end pointer-events-auto">
          <div className="w-full p-6 bg-black/60 backdrop-blur-sm text-white">
            {pluginDialog.speaker && <p className="font-bold text-sm mb-1">{pluginDialog.speaker}</p>}
            <p>{pluginDialog.text}</p>
          </div>
        </div>
      )}

      {/* VN 风格对话框 */}
      <div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-20"
        style={{ transform: `translate(-50%, ${settings.dialogPositionY || 0}px)` }}
      >
        <div
          className="relative p-5 rounded-xl shadow-2xl backdrop-blur-md"
          style={{
            backgroundColor: `rgba(0,0,0,${settings.dialogOpacity || 0.6})`,
            fontFamily: settings.dialogFontFamily,
            color: settings.dialogTextColor,
            lineHeight: settings.dialogLineHeight || 1.8
          }}
        >
          {/* 角色名 */}
          {lastAssistantMsg?.speaker && (
            <p className="text-sm font-bold mb-2 text-[#4fa0d8]">{lastAssistantMsg.speaker}</p>
          )}

          {/* 对话文本 */}
          <div className="whitespace-pre-wrap break-words min-h-[60px]">
            {displayText}
          </div>

          {/* 复制按钮 */}
          {displayText && (
            <button
              onClick={() => copyToClipboard(displayText)}
              className="absolute top-2 right-2 p-1 text-white/40 hover:text-white/80 transition-colors"
            >
              <Copy size={14}/>
            </button>
          )}

          {/* VN 分页 */}
          {vnTotalPages > 1 && (
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setVnPage(Math.max(0, vnPage - 1))} disabled={vnPage === 0} className="text-white/50 hover:text-white disabled:opacity-30">◀</button>
              <span className="text-xs text-white/50">{vnPage + 1}/{vnTotalPages}</span>
              <button onClick={() => setVnPage(Math.min(vnTotalPages - 1, vnPage + 1))} disabled={vnPage >= vnTotalPages - 1} className="text-white/50 hover:text-white disabled:opacity-30">▶</button>
            </div>
          )}
        </div>
      </div>

      {/* 文件附件预览 */}
      {selectedFiles.length > 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex gap-2 flex-wrap max-w-[80%]">
          {selectedFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              <span className="max-w-[120px] truncate">{f.name}</span>
              <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-white/50 hover:text-white">×</button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
        {asrModelStatus?.status === 'downloading' && (
          <div className="max-w-3xl mx-auto mb-2">
            <div className="flex items-center gap-2 text-yellow-400 bg-black/40 rounded-lg px-3 py-1.5 text-xs">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
              <span>🔄 {asrModelStatus.message || 'ASR 模型下载中…'}</span>
            </div>
          </div>
        )}
        {asrModelStatus?.status === 'error' && (
          <div className="max-w-3xl mx-auto mb-2">
            <p className="text-xs text-red-400 bg-black/40 rounded-lg px-3 py-1">
              模型加载失败。请将模型文件放至 backend\asr_model 目录，或设置环境变量 HF_ENDPOINT 更换镜像后重启。
            </p>
          </div>
        )}
        {voiceError && (
          <div className="max-w-3xl mx-auto mb-2">
            <p className="text-xs text-red-400 bg-black/40 rounded-lg px-3 py-1 inline-block">{voiceError}</p>
          </div>
        )}
        {isVoiceRecording && (
          <div className="max-w-3xl mx-auto mb-2">
            <div className="flex items-center gap-2 text-red-400 bg-black/40 rounded-lg px-3 py-1.5 inline-block">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-xs font-bold">录音中... 再次点击停止</span>
            </div>
          </div>
        )}
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="file"
            id="chat-file-input"
            className="hidden"
            multiple
            accept="image/*,.txt,.md,.pdf,.doc,.docx"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => document.getElementById('chat-file-input').click()}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
          >
            <FileText size={20}/>
          </button>
          <button
            onClick={() => { toggleVoiceRecording(); if (voiceError) setVoiceError(null); }}
            className={`px-4 py-3 rounded-xl transition-colors relative flex items-center gap-1.5 ${isVoiceRecording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            title={settings?.enableVoiceInput ? (voiceKeyActive ? '快捷键已就绪' : '语音输入') : '请在设置中开启语音输入'}
          >
            {isVoiceRecording ? <MicOff size={20}/> : <Mic size={20}/>}
            {voiceKeyActive && !isVoiceRecording && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]"></span>}
            {isVoiceRecording && <span className="text-xs font-bold">录音</span>}
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.code === (settings.voiceInputKey || 'ControlRight') && !e.repeat && settings.voiceInputMode !== 'auto') {
                e.preventDefault(); toggleVoiceRecording(); return;
              }
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); triggerSendMessage(); }
            }}
            placeholder="输入消息..."
            className="flex-1 bg-white/10 backdrop-blur-sm text-white placeholder-white/40 rounded-xl px-4 py-3 outline-none focus:bg-white/15 transition-colors"
          />
          <button
            onClick={() => triggerSendMessage()}
            disabled={isLoading}
            className="px-5 py-3 bg-[#ba3f42] hover:bg-[#a03538] disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
          >
            {isLoading ? '...' : <Send size={20}/>}
          </button>
        </div>
      </div>

      {/* 快捷栏 */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex gap-1 overflow-x-auto max-w-[95%] px-2">
        {settings.shortcuts?.save && <button onClick={() => { setSlMode('save'); setIsSaveLoadUIOpen(true); }} className="shortcut-btn">S</button>}
        {settings.shortcuts?.load && <button onClick={() => { setSlMode('load'); setIsSaveLoadUIOpen(true); }} className="shortcut-btn">L</button>}
        {settings.shortcuts?.quickSave && <button onClick={() => {}} className="shortcut-btn">QS</button>}
        {settings.shortcuts?.quickLoad && <button onClick={() => {}} className="shortcut-btn">QL</button>}
        {settings.shortcuts?.skip && <button onClick={() => {}} className="shortcut-btn">SKIP</button>}
        {settings.shortcuts?.bg && <button onClick={() => {}} className="shortcut-btn">BG</button>}
        {settings.shortcuts?.model && <button onClick={() => {}} className="shortcut-btn">MDL</button>}
        {settings.shortcuts?.expression && <button onClick={() => {}} className="shortcut-btn">EXP</button>}
        {settings.shortcuts?.memo && <button onClick={() => setIsMemoOpen(true)} className="shortcut-btn">MEMO</button>}
        {settings.shortcuts?.workMode && <button onClick={() => setSettings(s => ({...s, workMode: !s.workMode}))} className={`shortcut-btn ${settings.workMode ? 'active' : ''}`}>WORK</button>}
        {settings.shortcuts?.faceTracking && <button onClick={toggleFaceTracking} className={`shortcut-btn ${enableFaceTracking ? 'active' : ''}`}>CAM</button>}
        {settings.shortcuts?.hideModel && <button onClick={() => setIsModelHidden(!isModelHidden)} className="shortcut-btn">HIDE</button>}
        {settings.shortcuts?.bgm && <button onClick={toggleBgm} className="shortcut-btn">BGM</button>}
        {settings.shortcuts?.plot && <button onClick={generatePlotOptions} className="shortcut-btn">PLOT</button>}
        {settings.shortcuts?.tts && <button onClick={() => setSettings(s => ({...s, ttsEnabled: !s.ttsEnabled}))} className={`shortcut-btn ${settings.ttsEnabled ? 'active' : ''}`}>TTS</button>}
        {settings.shortcuts?.log && <button onClick={() => setIsLogOpen(true)} className="shortcut-btn">LOG</button>}
        <button onClick={() => setIsSettingsOpen(true)} className="shortcut-btn">⚙</button>
      </div>
    </div>
  );
}
