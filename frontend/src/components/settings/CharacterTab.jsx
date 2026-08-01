import React from 'react';
import { useApp } from '../../contexts/AppContext';
import SettingSectionTitle from '../ui/SettingSectionTitle';
import { UserPlus, Upload, Download, Trash2 } from 'lucide-react';

export default function CharacterTab() {
  const {
    settings, setSettings, skillPacksList,
    saveCurrentAsCharCard, importCharCard, exportCharCard, deleteCharCard,
    switchCharacter, updateCharCardSkillPacks, updateCharCardKbPacks
  } = useApp();

  return (
    <div className="space-y-8 animate-fade-in">
      <SettingSectionTitle title="当前角色设定" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 玩家名称</label>
            <input type="text" value={settings.userName} onChange={e => setSettings({...settings, userName: e.target.value})}
              className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]"/>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 角色名称</label>
            <input type="text" value={settings.aiName} onChange={e => setSettings({...settings, aiName: e.target.value})}
              className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]"/>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 人设 / 系统提示词</label>
          <textarea value={settings.customSystemPrompt} onChange={e => setSettings({...settings, customSystemPrompt: e.target.value})}
            className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] leading-relaxed rounded-md px-4 py-3 outline-none shadow-inner focus:border-[#ba3f42] min-h-[120px]" />
        </div>
      </div>

      <SettingSectionTitle title="角色卡库管理" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-[#7a6b5d] font-bold">导入TXT角色卡，或将上方设定另存为新角色卡。</p>
          <div className="flex gap-3">
            <button onClick={saveCurrentAsCharCard} className="px-4 py-2 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md"><UserPlus size={16} className="mr-1.5" /> 存为新角色</button>
            <label className="px-4 py-2 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white font-bold text-sm rounded-full flex items-center cursor-pointer transition-colors shadow-md"><Upload size={16} className="mr-1.5" /> 导入TXT<input type="file" accept=".txt" hidden onChange={importCharCard} /></label>
          </div>
        </div>
        {settings.characterList?.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 max-h-[480px] overflow-y-auto light-scrollbar pr-2">
            {settings.characterList.map(card => (
              <div key={card.id} className="flex flex-col p-4 bg-white border-2 border-[#e6d5b8] rounded-xl hover:border-[#c44a4a] transition-colors shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-base font-black text-[#c44a4a] truncate">{card.aiName}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => switchCharacter(card)} className="px-3 py-1 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-xs rounded-full transition-colors shadow-sm">切换加载</button>
                    <button onClick={() => exportCharCard(card)} className="p-1 text-[#4fa0d8] hover:bg-[#e0f2fe] rounded transition-colors"><Download size={18}/></button>
                    <button onClick={() => deleteCharCard(card.id)} className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
                <span className="text-xs text-[#7a6b5d] font-bold truncate">玩家: {card.userName}</span>
                <span className="text-[10px] text-[#a89578] truncate mt-1">{card.prompt}</span>
                {/* Skill 包绑定 */}
                {skillPacksList.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dashed border-[#e6d5b8]">
                    <p className="text-[10px] font-bold text-[#7a6b5d] mb-2">关联技能包:</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => updateCharCardSkillPacks(card.id, [])}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${(!card.skillPacks || card.skillPacks.length === 0) ? 'bg-[#8fbf8f] text-white border-[#8fbf8f]' : 'bg-white text-[#7a6b5d] border-[#e6d5b8] hover:border-[#8fbf8f]'}`}>全部</button>
                      {skillPacksList.map(pack => {
                        const isSelected = card.skillPacks?.includes(pack.name);
                        return (
                          <button key={pack.name} onClick={() => {
                            const current = card.skillPacks || [];
                            const next = isSelected ? current.filter(n => n !== pack.name) : [...current, pack.name];
                            updateCharCardSkillPacks(card.id, next);
                          }} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${isSelected ? 'bg-[#4fa0d8] text-white border-[#4fa0d8]' : 'bg-white text-[#7a6b5d] border-[#e6d5b8] hover:border-[#4fa0d8]'}`}>{pack.name}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* 知识库包绑定 */}
                {settings.enableKnowledgeBase && skillPacksList.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-dashed border-[#e6d5b8]">
                    <p className="text-[10px] font-bold text-[#7a6b5d] mb-2">关联知识库包:</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => updateCharCardKbPacks(card.id, [])}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${(!card.kbPacks || card.kbPacks.length === 0) ? 'bg-[#ba3f42] text-white border-[#ba3f42]' : 'bg-white text-[#7a6b5d] border-[#e6d5b8] hover:border-[#ba3f42]'}`}>全部</button>
                      {skillPacksList.map(pack => {
                        const isSelected = card.kbPacks?.includes(pack.name);
                        return (
                          <button key={pack.name} onClick={() => {
                            const current = card.kbPacks || [];
                            const next = isSelected ? current.filter(n => n !== pack.name) : [...current, pack.name];
                            updateCharCardKbPacks(card.id, next);
                          }} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${isSelected ? 'bg-[#ba3f42] text-white border-[#ba3f42]' : 'bg-white text-[#7a6b5d] border-[#e6d5b8] hover:border-[#ba3f42]'}`}>{pack.name}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-[#a89578] text-sm py-8 font-bold border-2 border-dashed border-[#e6d5b8] rounded-xl bg-white/40">暂无保存的角色，请导入或新建。</div>
        )}
      </div>
    </div>
  );
}
