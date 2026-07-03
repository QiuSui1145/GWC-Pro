import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { X, Home } from 'lucide-react';
import VisualTab from '../components/settings/VisualTab';
import TextTab from '../components/settings/TextTab';
import SoundTab from '../components/settings/SoundTab';
import CharacterTab from '../components/settings/CharacterTab';
import ApiTab from '../components/settings/ApiTab';
import DataTab from '../components/settings/DataTab';
import ModsTab from '../components/settings/ModsTab';
import AboutTab from '../components/settings/AboutTab';
import AccountTab from '../components/settings/AccountTab';
import LoginCustomizeTab from '../components/settings/LoginCustomizeTab';
import KnowledgeBaseTab from '../components/settings/KnowledgeBaseTab';
import SkillsConsoleTab from '../components/settings/SkillsConsoleTab';
import { getCurrentUser } from '../utils/auth';

const TABS = [
  { id: 'visual', label: '视觉设定', hideInStory: false },
  { id: 'text', label: '文本互动', hideInStory: true },
  { id: 'sound', label: '声音设定', hideInStory: false },
  { id: 'character', label: '剧本角色', hideInStory: true },
  { id: 'api', label: '模型接口', hideInStory: true },
  { id: 'data', label: '数据管理', hideInStory: true },
  { id: 'mods', label: '插件模组', hideInStory: false },
  { id: 'skillsConsole', label: '技能控制台', hideInStory: true },
  { id: 'knowledgeBase', label: '知识库', hideInStory: true },
  { id: 'account', label: '账号安全', hideInStory: false },
  { id: 'loginCustom', label: '登录定制', adminOnly: true, hideInStory: false },
  { id: 'about', label: '关于系统', hideInStory: false },
];

export default function SettingsPage() {
  const ctx = useApp();
  const [activeTab, setActiveTab] = useState('visual');
  const currentUser = getCurrentUser();
  const isAdmin = currentUser === 'Admin';
  const isStoryMode = ctx.activePluginUI === 'story_mode_dlc';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        ctx.setIsSettingsOpen(false);
        const returnTo = localStorage.getItem('gwc_settings_return') || '/main';
        localStorage.removeItem('gwc_settings_return');
        window.location.hash = returnTo;
        setTimeout(() => {
          const canvas = document.querySelector('canvas');
          if (canvas) { canvas.style.opacity = '1'; canvas.style.display = 'block'; canvas.style.visibility = 'visible'; }
          const container = document.querySelector('.absolute.inset-0.z-10');
          if (container) { container.style.opacity = '1'; container.style.pointerEvents = 'auto'; }
        }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => {
    ctx.setIsSettingsOpen(false);
    // 恢复 Live2D 显示
    requestAnimationFrame(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.style.cssText = 'opacity:1 !important;';
      if (window.__pixiApp) {
        window.__pixiApp.renderer.resize(window.innerWidth, window.innerHeight);
        window.__pixiApp.render();
      }
    });
  };

  const handleGoHome = () => {
    ctx.setIsSettingsOpen(false);
    ctx.setAppMode('title');
    requestAnimationFrame(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.style.cssText = 'opacity:1 !important;';
      if (window.__pixiApp) {
        window.__pixiApp.renderer.resize(window.innerWidth, window.innerHeight);
        window.__pixiApp.render();
      }
    });
  };

  const visibleTabs = TABS.filter(t => {
    if (t.adminOnly && !isAdmin) return false;
    if (isStoryMode && t.hideInStory) return false;
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col shadow-2xl relative atri-container" style={{ backgroundColor: '#8dc3f0', backgroundImage: 'radial-gradient(circle at 15% 30%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 30%), radial-gradient(circle at 85% 10%, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 35%), radial-gradient(circle at 50% 80%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 60%), linear-gradient(180deg, #7dbcf6 0%, #d8f0fe 40%, #ffffff 90%)' }}>
      {/* Header */}
      <div className="flex h-[60px] md:h-[90px] bg-white/30 border-b-4 border-[#5ab4ed] shrink-0 items-end relative overflow-visible flex-nowrap atri-header">
        <div className="flex flex-col justify-end px-4 md:px-12 pb-[10px] md:pb-[15px] shrink-0 relative z-10 bg-transparent shadow-none">
          <span className="font-normal text-white text-3xl md:text-5xl tracking-[2px] md:tracking-[5px] drop-shadow-[2px_2px_8px_rgba(30,58,138,0.4)]" style={{ fontFamily: 'Arial, sans-serif' }}>SYSTEM</span>
        </div>
        <div className="flex-1 flex overflow-x-auto items-end gap-[2px] px-0 pb-0 scroll-smooth atri-tabs" style={{ WebkitOverflowScrolling: 'touch' }}>
          {visibleTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 whitespace-nowrap flex items-center justify-center relative px-[14px] md:px-[20px] py-[10px] md:py-[12px] font-bold text-[0.85rem] md:text-sm transition-all border-none rounded-none z-10 atri-tab-btn ${activeTab === tab.id ? 'text-[#5ab4ed] active-tab' : 'text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <button onClick={handleClose} className="w-[60px] md:w-[90px] h-full flex items-center justify-center bg-white/20 hover:bg-white/40 transition-colors shrink-0 border-none">
          <X size={24} className="md:w-9 md:h-9 text-white transition-colors"/>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-8 px-[5%] light-scrollbar text-[#1e3a8a]">
        {activeTab === 'visual' && <VisualTab />}
        {activeTab === 'text' && <TextTab />}
        {activeTab === 'sound' && <SoundTab />}
        {activeTab === 'character' && <CharacterTab />}
        {activeTab === 'api' && <ApiTab />}
        {activeTab === 'data' && <DataTab />}
        {activeTab === 'mods' && <ModsTab />}
        {activeTab === 'skillsConsole' && <SkillsConsoleTab settings={ctx.settings} setSettings={ctx.setSettings} skillPacksList={ctx.skillPacksList} toggleSkillFile={ctx.toggleSkillFile} toggleSkillPack={ctx.toggleSkillPack} fetchSkillPacks={ctx.fetchSkillPacks} expandedSkillPack={ctx.expandedSkillPack} setExpandedSkillPack={ctx.setExpandedSkillPack} showToast={ctx.showToast} />}
        {activeTab === 'knowledgeBase' && <KnowledgeBaseTab settings={ctx.settings} setSettings={ctx.setSettings} />}
        {activeTab === 'account' && <AccountTab />}
        {activeTab === 'loginCustom' && <LoginCustomizeTab settings={ctx.settings} setSettings={ctx.setSettings} setVisualAdjustMode={ctx.setVisualAdjustMode} />}
        {activeTab === 'about' && <AboutTab />}
      </div>

      {/* Footer */}
      <div className="bg-white/40 border-t-[3px] border-white shrink-0 flex flex-wrap justify-center md:justify-end items-center p-[15px] md:px-[5%] gap-[8px] md:gap-[15px]">
        <div className="hidden">GalGame Web Chat Settings</div>
        <button onClick={handleGoHome} className="w-full md:w-auto bg-[#5ab4ed] hover:bg-[#3ea3e6] hover:-translate-y-[1px] text-white px-[15px] md:px-[30px] py-[10px] font-bold text-[0.75rem] md:text-sm tracking-normal md:tracking-[2px] transition-all shadow-[2px_2px_5px_rgba(0,0,0,0.1)]">
          主界面
        </button>
        <button onClick={handleClose} className="w-full md:w-auto bg-[#5ab4ed] hover:bg-[#3ea3e6] hover:-translate-y-[1px] text-white px-[15px] md:px-[30px] py-[10px] font-bold text-[0.75rem] md:text-sm tracking-normal md:tracking-[2px] transition-all shadow-[2px_2px_5px_rgba(0,0,0,0.1)]">
          保存并关闭
        </button>
      </div>
    </div>
  );
}
