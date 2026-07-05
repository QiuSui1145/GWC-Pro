import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function SaveLoadPage() {
  const {
    slMode, setSlMode, setIsSaveLoadUIOpen,
    saveSlots, quickSaveData, autoSaveData,
    handleSaveToSlot, handleLoadFromSlot, handleDeleteSlot,
    setEditingSlotId, editingSlotId, handleRenameSlot
  } = useApp();

  const [slPage, setSlPage] = useState(1);
  const totalPages = 10;

  const getSlotDisplay = (slot) => {
    if (!slot) return { title: '— 空档位 —', date: '', empty: true };
    return { title: slot.title || '未命名存档', date: slot.date || '', empty: false, messages: slot.messages };
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#1a1028] to-[#0d0a12]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#e6d5b8]/20 shrink-0">
        <div className="flex gap-2">
          <button onClick={() => setSlMode('save')} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${slMode === 'save' ? 'bg-[#ba3f42] text-white' : 'bg-white/10 text-white/60'}`}>SAVE</button>
          <button onClick={() => setSlMode('load')} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${slMode === 'load' ? 'bg-[#4fa0d8] text-white' : 'bg-white/10 text-white/60'}`}>LOAD</button>
        </div>
        <button onClick={() => setIsSaveLoadUIOpen(false)} className="p-2 text-white/60 hover:text-white transition-colors">
          <X size={24}/>
        </button>
      </div>

      {/* Quick & Auto */}
      <div className="flex gap-4 p-4 shrink-0">
        <div className="flex-1 p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-xs text-white/40 font-bold mb-2">QUICK SAVE</p>
          {quickSaveData ? (
            <div>
              <p className="text-sm text-white font-bold truncate">{quickSaveData.title}</p>
              <p className="text-[10px] text-white/40 mt-1">{quickSaveData.date}</p>
            </div>
          ) : <p className="text-sm text-white/30">无快存数据</p>}
          {slMode === 'load' && quickSaveData && (
            <button onClick={() => {}} className="mt-2 px-3 py-1 bg-[#4fa0d8] text-white text-xs font-bold rounded-full">读取</button>
          )}
        </div>
        <div className="flex-1 p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-xs text-white/40 font-bold mb-2">AUTO SAVE</p>
          {autoSaveData ? (
            <div>
              <p className="text-sm text-white font-bold truncate">{autoSaveData.title}</p>
              <p className="text-[10px] text-white/40 mt-1">{autoSaveData.date}</p>
            </div>
          ) : <p className="text-sm text-white/30">无自动存档</p>}
          {slMode === 'load' && autoSaveData && (
            <button onClick={() => {}} className="mt-2 px-3 py-1 bg-[#4fa0d8] text-white text-xs font-bold rounded-full">读取</button>
          )}
        </div>
      </div>

      {/* Slots Grid */}
      <div className="flex-1 overflow-y-auto p-4 light-scrollbar">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }, (_, i) => (slPage - 1) * 10 + i + 1).map(slotId => {
            const slot = saveSlots[slotId];
            const display = getSlotDisplay(slot);
            return (
              <div key={slotId} className={`p-3 rounded-xl border-2 transition-colors cursor-pointer ${display.empty ? 'border-white/10 bg-white/5' : 'border-[#e6d5b8]/30 bg-white/10 hover:border-[#4fa0d8]'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-white/40 font-bold">No.{String(slotId).padStart(3, '0')}</span>
                  {!display.empty && (
                    <button onClick={() => handleDeleteSlot(slotId)} className="text-red-400/50 hover:text-red-400 text-xs">×</button>
                  )}
                </div>
                {editingSlotId === slotId ? (
                  <input autoFocus defaultValue={display.title} onBlur={(e) => { handleRenameSlot(slotId, e.target.value); setEditingSlotId(null); }}
                    className="w-full bg-transparent text-white text-xs outline-none border-b border-white/30" />
                ) : (
                  <p className="text-xs text-white font-bold truncate cursor-pointer" onDoubleClick={() => !display.empty && setEditingSlotId(slotId)}>{display.title}</p>
                )}
                <p className="text-[10px] text-white/30 mt-1">{display.date}</p>
                {!display.empty && (
                  <button onClick={() => slMode === 'save' ? handleSaveToSlot(slotId) : handleLoadFromSlot(slotId)}
                    className={`mt-2 w-full px-2 py-1 text-xs font-bold rounded-full transition-colors ${slMode === 'save' ? 'bg-[#ba3f42] hover:bg-[#a03538]' : 'bg-[#4fa0d8] hover:bg-[#5db4f0]'} text-white`}>
                    {slMode === 'save' ? '覆盖' : '读取'}
                  </button>
                )}
                {display.empty && slMode === 'save' && (
                  <button onClick={() => handleSaveToSlot(slotId)}
                    className="mt-2 w-full px-2 py-1 text-xs font-bold rounded-full bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white transition-colors">
                    保存
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4 p-4 shrink-0">
        <button onClick={() => setSlPage(Math.max(1, slPage - 1))} disabled={slPage === 1} className="text-white/50 hover:text-white disabled:opacity-30"><ChevronLeft size={20}/></button>
        <span className="text-sm text-white/60">{slPage} / {totalPages}</span>
        <button onClick={() => setSlPage(Math.min(totalPages, slPage + 1))} disabled={slPage === totalPages} className="text-white/50 hover:text-white disabled:opacity-30"><ChevronRight size={20}/></button>
      </div>
    </div>
  );
}
