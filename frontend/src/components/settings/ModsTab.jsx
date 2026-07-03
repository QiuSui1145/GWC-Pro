import React from 'react';
import { useApp } from '../../contexts/AppContext';
import SettingSectionTitle from '../ui/SettingSectionTitle';
import { Puzzle, Shield, Trash2 } from 'lucide-react';

export default function ModsTab() {
  const { modsList, handleModUpload, toggleModEnabled, removeMod } = useApp();

  return (
    <div className="space-y-8 animate-fade-in text-[#4a4036]">
      <SettingSectionTitle title="第三方插件模组 (Mods) 管理" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-[#7a6b5d] font-bold">导入 `.js` 插件以动态扩展核心功能或定制界面。</p>
          <label className="px-4 py-2 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-sm rounded-full flex items-center cursor-pointer transition-colors shadow-md shrink-0">
            <Puzzle size={16} className="mr-1.5" /> 批量装载插件
            <input type="file" accept=".js,application/javascript,text/javascript,text/plain,*/*" multiple hidden onChange={handleModUpload} />
          </label>
        </div>

        {modsList.length > 0 ? (
          <div className="space-y-3">
            {modsList.map(mod => (
              <div key={mod.id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors shadow-sm ${mod.enabled ? 'bg-white border-[#8fbf8f]/50' : 'bg-[#e8decb]/30 border-transparent opacity-80'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-inner ${mod.enabled ? 'bg-[#8fbf8f]' : 'bg-[#a89578]'}`}><Shield size={20}/></div>
                  <div>
                    <h5 className="font-bold text-base text-[#ba3f42]">{mod.name}</h5>
                    <p className="text-[10px] text-[#7a6b5d] uppercase tracking-wider mt-0.5">Installed: {mod.installDate}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => toggleModEnabled(mod.id, mod.enabled)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm ${mod.enabled ? 'bg-[#e8decb] text-[#7a6b5d] hover:bg-[#d9c5b2]' : 'bg-[#4fa0d8] text-white hover:bg-[#5db4f0]'}`}>
                    {mod.enabled ? '暂时停用' : '启用插件'}
                  </button>
                  <button onClick={() => { if(window.confirm('彻底卸载此插件？')) removeMod(mod.id); }}
                    className="px-3 py-1.5 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-colors shadow-sm">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-[#a89578] text-sm py-12 font-bold border-2 border-dashed border-[#e6d5b8] rounded-xl bg-white/40">
            暂无任何第三方插件，系统正在以纯净原版运行。
          </div>
        )}
      </div>
    </div>
  );
}
