import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronDown, ChevronUp, Minimize2, Maximize2, Play, Square } from 'lucide-react';

export default function OpenCodePanel({ taskId, onClose, onToggleWorkMode, settings, personaName }) {
  const [output, setOutput] = useState([]);
  const [status, setStatus] = useState('connecting');
  const [collapsed, setCollapsed] = useState(false);
  const [summary, setSummary] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(null);
  const panelRef = useRef(null);
  const dragRef = useRef({ dragging: false, ox: 0, oy: 0 });

  // 拖动
  const onMouseDown = useCallback((e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
    dragRef.current = { dragging: true, ox: e.clientX - panelRef.current.offsetLeft, oy: e.clientY - panelRef.current.offsetTop };
    e.preventDefault();
  }, []);
  useEffect(() => {
    const move = (e) => {
      if (!dragRef.current.dragging) return;
      panelRef.current.style.left = (e.clientX - dragRef.current.ox) + 'px';
      panelRef.current.style.top = (e.clientY - dragRef.current.oy) + 'px';
      panelRef.current.style.right = 'auto';
      panelRef.current.style.bottom = 'auto';
    };
    const up = () => { dragRef.current.dragging = false; };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  // SSE 流式输出
  useEffect(() => {
    if (!taskId) return;
    setStatus('connecting');
    setOutput([]);
    let fullText = '';
    const es = new EventSource(`/api/opencode/stream/${taskId}`);

    es.onmessage = (ev) => {
      try {
        const e = JSON.parse(ev.data);
        if (e.type === 'done') { es.close(); setStatus('completed'); return; }
        if (e.type === 'step_finish') { setStatus('completed'); return; }
        if (e.type === 'text' && e.part?.text) {
          fullText += e.part.text;
          setOutput(prev => {
            const last = prev[prev.length - 1];
            if (last && last.type === 'text') {
              const copy = [...prev]; copy[copy.length - 1] = { ...last, text: fullText };
              return copy;
            }
            return [...prev, { type: 'text', text: e.part.text }];
          });
        }
        if (e.type === 'step_start') {
          setOutput(prev => [...prev, { type: 'step', msg: '思考中...' }]);
        }
        if (e.type === 'tool_use') {
          setOutput(prev => [...prev, { type: 'tool', name: e.tool || e.name, input: e.input }]);
        }
        if (e.type === 'tool_result') {
          setOutput(prev => [...prev, { type: 'tool_result', content: e.content?.substring(0, 200) || '' }]);
        }
      } catch(err) {}
    };
    es.onerror = () => { es.close(); if (status === 'connecting') setStatus('error'); setStatus(s => s === 'connecting' ? 'error' : s); };
    return () => es.close();
  }, [taskId]);

  // 确认处理（TTS 提醒）
  const confirmYes = () => {
    if (!needsConfirm) return;
    fetch('/api/opencode/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: taskId, confirmed: true }) });
    setNeedsConfirm(null);
  };
  const confirmNo = () => {
    if (!needsConfirm) return;
    fetch('/api/opencode/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: taskId, confirmed: false }) });
    setNeedsConfirm(null);
  };

  // 检测确认请求（从输出中）
  useEffect(() => {
    const last = output[output.length - 1];
    if (last?.type === 'tool' && last.name?.includes('confirm')) {
      setNeedsConfirm({ msg: `需要确认: ${last.name}`, input: last.input });
    }
  }, [output]);

  return (
    <div ref={panelRef}
      style={{
        position: 'fixed', bottom: '100px', left: '20px', width: '380px', maxHeight: '400px',
        background: 'rgba(20,20,30,0.95)', backdropFilter: 'blur(12px)', borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.12)', zIndex: 1500, display: 'flex', flexDirection: 'column',
        pointerEvents: 'auto', fontSize: '13px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
      {/* Header */}
      <div onMouseDown={onMouseDown}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'move', flexShrink: 0 }}>
        <span style={{ color: '#8bf', fontWeight: 700, fontSize: '13px' }}>
          💻 OpenCode {status === 'connecting' ? '· 连接中...' : status === 'completed' ? '· ✓ 完成' : status === 'error' ? '· ⚠ 中断' : ''}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <button onClick={onToggleWorkMode} title="关闭工作模式（不中断任务）" style={btnStyle}>
            <Square size={13} />
          </button>
          <button onClick={() => setCollapsed(!collapsed)} style={btnStyle}>
            {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button onClick={onClose} style={btnStyle}><X size={13} /></button>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', maxHeight: '280px',
            fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#ccc', lineHeight: 1.5 }}>
            {output.map((item, i) => (
              <div key={i} style={{ marginBottom: '6px', padding: '4px 8px', borderRadius: '6px',
                background: item.type === 'tool' ? 'rgba(255,165,0,0.1)' :
                  item.type === 'tool_result' ? 'rgba(100,200,100,0.1)' :
                  item.type === 'step' ? 'rgba(255,255,255,0.03)' : '' }}>
                {item.type === 'text' && <span style={{ color: '#ddd', whiteSpace: 'pre-wrap' }}>{item.text}</span>}
                {item.type === 'step' && <span style={{ color: '#8bf', fontSize: '11px' }}>🔄 {item.msg}</span>}
                {item.type === 'tool' && <span style={{ color: '#fa0' }}>🔧 工具调用: {item.name}</span>}
                {item.type === 'tool_result' && <span style={{ color: '#8c8', fontSize: '11px' }}>✓ {item.content}</span>}
              </div>
            ))}
            {output.length === 0 && <span style={{ color: '#666' }}>等待输出...</span>}
          </div>

          {/* Confirmation */}
          {needsConfirm && (
            <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,165,0,0.3)',
              background: 'rgba(255,165,0,0.08)' }}>
              <p style={{ color: '#fa0', fontSize: '12px', margin: '0 0 8px 0' }}>
                ⚠ {needsConfirm.msg}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={confirmYes} style={{ ...btnStyle, background: '#4a6',
                  color: '#fff', padding: '4px 16px', borderRadius: '6px' }}>确认</button>
                <button onClick={confirmNo} style={{ ...btnStyle, background: '#644',
                  color: '#fff', padding: '4px 16px', borderRadius: '6px' }}>拒绝</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const btnStyle = {
  background: 'none', border: 'none', color: '#999', cursor: 'pointer',
  padding: '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
};
