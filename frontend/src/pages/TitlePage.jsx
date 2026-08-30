import React from 'react';
import { useApp } from '../contexts/AppContext';
import { SkipBack, SkipForward, Pause, Play } from 'lucide-react';

export default function TitlePage() {
  const {
    settings, appMode, setAppMode,
    bgmList, currentBgmIndex, isBgmPlaying, bgmToast,
    handleNextBgm, handlePrevBgm, toggleBgm,
    pluginTitleButtons, pluginDialog,
    setIsSettingsOpen, setIsSaveLoadUIOpen, setSlMode,
    handleStartNewGame, handleContinueGame, handleExitGame,
    localTitleBgImage
  } = useApp();

  const BgmPlayIcon = isBgmPlaying ? Pause : Play;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-auto">
      {/* 标题背景图 */}
      {(localTitleBgImage || settings.titleBgImage) && (
        <img
          src={localTitleBgImage || settings.titleBgImage}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: `translate(${settings.titleBgOffsetX || 0}px, ${settings.titleBgOffsetY || 0}px)` }}
          alt="title-bg"
        />
      )}

      {/* 标题文字 */}
      <div
        className="relative z-10 text-center select-none"
        style={{ transform: `translate(${settings.mainTitleX || 0}px, ${settings.mainTitleY || 0}px)` }}
      >
        <h1
          className="text-5xl md:text-7xl font-black tracking-wider drop-shadow-lg"
          style={{ fontFamily: settings.mainTitleFont, color: settings.mainTitleColor }}
        >
          {settings.mainTitleText || 'GWC'}
        </h1>
        <p
          className="text-lg md:text-xl mt-2 tracking-widest"
          style={{ fontFamily: settings.subTitleFont, color: settings.subTitleColor }}
        >
          {settings.subTitleText || '- GalGame Web Chat -'}
        </p>
      </div>

      {/* 按钮组 */}
      <div className="relative z-10 flex flex-col gap-3 mt-8">
        <button onClick={handleStartNewGame} className="title-btn">START</button>
        <button onClick={handleContinueGame} className="title-btn">CONTINUE</button>
        <button onClick={() => { setSlMode('load'); setIsSaveLoadUIOpen(true); }} className="title-btn">LOAD</button>
        <button onClick={() => setIsSettingsOpen(true)} className="title-btn">SYSTEM</button>
        <button onClick={handleExitGame} className="title-btn">EXIT</button>
        {/* 插件注入的按钮 */}
        {pluginTitleButtons.map(btn => (
          <button key={btn.id} onClick={btn.onClick} className="title-btn">{btn.label}</button>
        ))}
      </div>

      {/* BGM 播放器 */}
      {settings.showTitleBgmPlayer && bgmList.length > 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm">
          <button onClick={handlePrevBgm}><SkipBack size={16}/></button>
          <button onClick={toggleBgm}><BgmPlayIcon size={16}/></button>
          <button onClick={handleNextBgm}><SkipForward size={16}/></button>
          <span className="max-w-[200px] truncate">{bgmList[currentBgmIndex]?.name || ''}</span>
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
    </div>
  );
}
