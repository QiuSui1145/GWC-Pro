import React, { useState, useRef, useCallback } from 'react';
import SettingSlider from '../ui/SettingSlider';

export default function LoginPreviewAdjust({ settings = {}, setSettings, setVisualAdjustMode }) {
  const [selectedElement, setSelectedElement] = useState('title');
  const dragRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, origX: 0, origY: 0 });

  const update = (key, val) => setSettings(prev => ({ ...(prev || {}), [key]: val }));

  const updateTextBox = (id, key, val) => {
    update('loginTextBoxes', (settings.loginTextBoxes || []).map(b => b.id === id ? { ...b, [key]: val } : b));
  };

  const handleMouseDown = useCallback((e, element, boxId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElement(boxId ? `box_${boxId}` : element);
    dragRef.current = { element, boxId };
    dragStartRef.current = { x: e.clientX, y: e.clientY, origX: 0, origY: 0 };

    const onMove = (ev) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragStartRef.current.x;
      const dy = ev.clientY - dragStartRef.current.y;

      if (dragRef.current.boxId) {
        const boxes = settings.loginTextBoxes || [];
        const box = boxes.find(b => b.id === dragRef.current.boxId);
        if (box) {
          const container = document.getElementById('login-preview-container');
          if (container) {
            const rect = container.getBoundingClientRect();
            const pctX = Math.max(0, Math.min(100, (ev.clientX - rect.left) / rect.width * 100));
            const pctY = Math.max(0, Math.min(100, (ev.clientY - rect.top) / rect.height * 100));
            update('loginTextBoxes', boxes.map(b => b.id === dragRef.current.boxId ? { ...b, x: pctX, y: pctY } : b));
          }
        }
      } else if (dragRef.current.element === 'title') {
        update('loginPageTitleX', dragStartRef.current.origX + dx);
        update('loginPageTitleY', dragStartRef.current.origY + dy);
      } else if (dragRef.current.element === 'subtitle') {
        update('loginPageSubTitleX', dragStartRef.current.origX + dx);
        update('loginPageSubTitleY', dragStartRef.current.origY + dy);
      }
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    // Store original values for drag
    if (element === 'title') {
      dragStartRef.current.origX = settings.loginPageTitleX || 0;
      dragStartRef.current.origY = settings.loginPageTitleY || 0;
    } else if (element === 'subtitle') {
      dragStartRef.current.origX = settings.loginPageSubTitleX || 0;
      dragStartRef.current.origY = settings.loginPageSubTitleY || 0;
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [settings, update]);

  const titleX = settings.loginPageTitleX || 0;
  const titleY = settings.loginPageTitleY || 0;
  const subTitleX = settings.loginPageSubTitleX || 0;
  const subTitleY = settings.loginPageSubTitleY || 0;
  const boxes = settings.loginTextBoxes || [];

  const isSelected = (key) => selectedElement === key;

  return (
    <div className="fixed inset-0 z-[100000] flex flex-col" style={{ background: '#0f172a' }}>
      {/* 全屏预览区域 */}
      <div id="login-preview-container" className="flex-1 relative overflow-hidden"
        style={{
          background: settings.loginBgImage
            ? `url(${settings.loginBgImage}) center/cover no-repeat`
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          backgroundPosition: settings.loginBgImage ? `calc(50% + ${settings.loginBgOffsetX || 0}px) calc(50% + ${settings.loginBgOffsetY || 0}px)` : undefined
        }}>

        {/* 默认背景纹理 */}
        {!settings.loginBgImage && (
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, #5ab4ed 0.5px, transparent 0.5px), radial-gradient(circle at 75% 75%, #ba3f42 0.5px, transparent 0.5px)',
            backgroundSize: '60px 60px'
          }} />
        )}

        {/* 主标题 */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'title')}
          className={`absolute cursor-move select-none ${isSelected('title') ? 'ring-2 ring-[#5ab4ed] ring-offset-2 ring-offset-transparent rounded-lg' : ''}`}
          style={{
            left: `calc(50% + ${titleX}px)`,
            top: `calc(30% + ${titleY}px)`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10
          }}
        >
          <h1 className="text-5xl font-black tracking-wider" style={{
            color: settings.loginPageTitleColor || '#5ab4ed',
            fontFamily: settings.loginPageTitleFont || 'serif',
            textShadow: '0 0 30px rgba(90,180,237,0.3)'
          }}>
            {settings.loginPageTitle || 'GWC'}
          </h1>
        </div>

        {/* 副标题 */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'subtitle')}
          className={`absolute cursor-move select-none ${isSelected('subtitle') ? 'ring-2 ring-[#5ab4ed] ring-offset-2 ring-offset-transparent rounded-lg' : ''}`}
          style={{
            left: `calc(50% + ${subTitleX}px)`,
            top: `calc(30% + 50px + ${subTitleY}px)`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10
          }}
        >
          <p className="text-lg tracking-widest" style={{
            color: settings.loginPageSubTitleColor || 'rgba(255,255,255,0.4)',
            fontFamily: settings.loginPageSubTitleFont || 'sans-serif'
          }}>
            {settings.loginPageSubTitle || 'GalGame Web Chat Engine'}
          </p>
        </div>

        {/* 自定义文字框 */}
        {boxes.map(box => (
          <div
            key={box.id}
            onMouseDown={(e) => handleMouseDown(e, null, box.id)}
            className={`absolute cursor-move select-none ${isSelected(`box_${box.id}`) ? 'ring-2 ring-[#5ab4ed] ring-offset-2 ring-offset-transparent rounded' : ''}`}
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${box.fontSize}px`,
              color: box.color,
              opacity: box.opacity,
              zIndex: 10,
              whiteSpace: 'nowrap'
            }}
          >
            {box.text}
          </div>
        ))}

        {/* 登录卡片占位 */}
        <div className="absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 w-[400px] rounded-2xl p-8" style={{
          backgroundColor: 'rgba(30, 30, 35, 0.65)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)'
        }}>
          <div className="text-center text-white/50 text-sm">
            登录表单预览区域
          </div>
          <div className="mt-4 space-y-3">
            <div className="h-10 rounded-xl bg-white/10" />
            <div className="h-10 rounded-xl bg-white/10" />
            <div className="h-10 rounded-xl bg-gradient-to-r from-[#5ab4ed] to-[#4fa0d8] opacity-50" />
          </div>
        </div>
      </div>

      {/* 右上角调节面板 */}
      <div className="fixed top-8 right-8 z-[100001] w-72 max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-[#e6d5b8] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-[#ba3f42]">登录页调整</h3>
          <button onClick={() => setVisualAdjustMode(null)} className="px-3 py-1 bg-[#ba3f42] hover:bg-[#a03538] text-white text-xs font-bold rounded-full transition-colors">
            返回设置
          </button>
        </div>

        {/* 元素选择 */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[{ key: 'title', label: '主标题' }, { key: 'subtitle', label: '副标题' }, ...boxes.map(b => ({ key: `box_${b.id}`, label: b.text.slice(0, 6) }))].map(el => (
            <button
              key={el.key}
              onClick={() => setSelectedElement(el.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${selectedElement === el.key ? 'bg-[#5ab4ed] text-white' : 'bg-[#f0ebe3] text-[#7a6b5d] hover:bg-[#e6d5b8]'}`}
            >
              {el.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {selectedElement === 'title' && (
            <>
              <SettingSlider label="X 偏移" value={titleX} min={-500} max={500} step={1} suffix="px" onChange={v => update('loginPageTitleX', v)} />
              <SettingSlider label="Y 偏移" value={titleY} min={-500} max={500} step={1} suffix="px" onChange={v => update('loginPageTitleY', v)} />
            </>
          )}
          {selectedElement === 'subtitle' && (
            <>
              <SettingSlider label="X 偏移" value={subTitleX} min={-500} max={500} step={1} suffix="px" onChange={v => update('loginPageSubTitleX', v)} />
              <SettingSlider label="Y 偏移" value={subTitleY} min={-500} max={500} step={1} suffix="px" onChange={v => update('loginPageSubTitleY', v)} />
            </>
          )}
          {selectedElement.startsWith('box_') && (() => {
            const boxId = selectedElement.slice(4);
            const box = boxes.find(b => b.id === boxId);
            if (!box) return null;
            return (
              <>
                <SettingSlider label="X" value={box.x} min={0} max={100} step={0.5} suffix="%" onChange={v => updateTextBox(boxId, 'x', v)} />
                <SettingSlider label="Y" value={box.y} min={0} max={100} step={0.5} suffix="%" onChange={v => updateTextBox(boxId, 'y', v)} />
                <SettingSlider label="字号" value={box.fontSize} min={8} max={72} step={1} onChange={v => updateTextBox(boxId, 'fontSize', v)} />
                <SettingSlider label="透明度" value={box.opacity} min={0} max={1} step={0.05} onChange={v => updateTextBox(boxId, 'opacity', v)} />
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
