import React from 'react';
import { useApp } from '../contexts/AppContext';
import { X, Copy } from 'lucide-react';

export default function LogPage() {
  const {
    sessions, activeSessionId, setActiveSessionId,
    setIsLogOpen, copyToClipboard, storySummary,
    isGeneratingSummary, generateStorySummary
  } = useApp();

  const currentSession = sessions.find(s => s.id === activeSessionId);
  const messages = currentSession?.messages || [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white">对话记录</h2>
          <select value={activeSessionId} onChange={e => setActiveSessionId(e.target.value)}
            className="bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 outline-none border border-white/20">
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.title || `会话 ${s.id}`}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateStorySummary} disabled={isGeneratingSummary}
            className="px-3 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] disabled:opacity-50 text-white text-xs font-bold rounded-full transition-colors">
            {isGeneratingSummary ? '生成中...' : 'AI 摘要'}
          </button>
          <button onClick={() => setIsLogOpen(false)} className="p-2 text-white/60 hover:text-white transition-colors">
            <X size={24}/>
          </button>
        </div>
      </div>

      {/* Summary */}
      {storySummary && (
        <div className="mx-4 mt-4 p-4 bg-[#4fa0d8]/10 border border-[#4fa0d8]/30 rounded-xl shrink-0">
          <p className="text-xs text-[#4fa0d8] font-bold mb-2">AI 摘要</p>
          <p className="text-sm text-white/80">{storySummary}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 light-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center text-white/30 py-20">暂无对话记录</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-[#ba3f42]/80 text-white' : 'bg-white/10 text-white/90'}`}>
                {msg.speaker && <p className="text-xs font-bold text-[#4fa0d8] mb-1">{msg.speaker}</p>}
                <p className="text-sm whitespace-pre-wrap break-words">{typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}</p>
                <div className="flex justify-end mt-1">
                  <button onClick={() => copyToClipboard(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content))}
                    className="p-1 text-white/20 hover:text-white/60 transition-colors"><Copy size={12}/></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
