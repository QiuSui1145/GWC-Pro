import React, { useState } from 'react';
import { Palette, Type, Image as ImageIcon, Plus, Trash2, Eye, GripHorizontal } from 'lucide-react';
import SettingSlider from '../ui/SettingSlider';

const FONT_OPTIONS = [
  { value: 'serif', label: '衬线体' },
  { value: 'sans-serif', label: '无衬线' },
  { value: 'monospace', label: '等宽体' },
  { value: '"Microsoft YaHei", sans-serif', label: '微软雅黑' },
  { value: '"STKaiti", serif', label: '华文楷体' },
  { value: '"SimSun", serif', label: '宋体' },
];

const LOGIN_CONFIG_KEYS = [
  'loginPageTitle', 'loginPageTitleColor', 'loginPageTitleFont', 'loginPageTitleX', 'loginPageTitleY',
  'loginPageSubTitle', 'loginPageSubTitleColor', 'loginPageSubTitleFont', 'loginPageSubTitleX', 'loginPageSubTitleY',
  'loginBgImage', 'loginBgOffsetX', 'loginBgOffsetY', 'loginTextBoxes'
];

export default function LoginCustomizeTab({ settings = {}, setSettings, setVisualAdjustMode }) {
  const [editingBoxId, setEditingBoxId] = useState(null);

  // 保存登录配置到全局端点
  const saveGlobalConfig = async (cfg) => {
    try {
      await fetch('/api/login-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
      });
    } catch (e) { console.error('登录配置保存失败:', e); }
  };

  // 更新：同时更新本地 React 状态 + 全局端点
  const update = (key, val) => {
    setSettings(prev => {
      const next = { ...(prev || {}), [key]: val };
      // 提取登录配置字段保存到全局
      const loginCfg = {};
      LOGIN_CONFIG_KEYS.forEach(k => { if (next[k] !== undefined) loginCfg[k] = next[k]; });
      saveGlobalConfig(loginCfg);
      return next;
    });
  };

  const addTextBox = () => {
    const newBox = {
      id: 'tb_' + Date.now(),
      text: '新文字框',
      x: 50, y: 50,
      fontSize: 16,
      color: '#ffffff',
      opacity: 0.8
    };
    update('loginTextBoxes', [...(settings.loginTextBoxes || []), newBox]);
    setEditingBoxId(newBox.id);
  };

  const removeTextBox = (id) => {
    update('loginTextBoxes', (settings.loginTextBoxes || []).filter(b => b.id !== id));
    if (editingBoxId === id) setEditingBoxId(null);
  };

  const updateTextBox = (id, key, val) => {
    update('loginTextBoxes', (settings.loginTextBoxes || []).map(b => b.id === id ? { ...b, [key]: val } : b));
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file, 'login_bg.png');
      const resp = await fetch('/api/login-bg', {
        method: 'POST', body: formData
      });
      if (resp.ok) {
        update('loginBgImage', '/api/login-bg');
      }
    } catch (err) {
      console.error('登录背景上传失败:', err);
    }
    e.target.value = '';
  };

  const currentBoxes = settings.loginTextBoxes || [];
  const editingBox = currentBoxes.find(b => b.id === editingBoxId);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in p-2 md:p-4">
      <h2 className="text-xl md:text-2xl font-black text-[#ba3f42] tracking-widest mb-6 flex items-center gap-3">
        <Palette size={24} /> 登录页定制
      </h2>

      {/* 预览调整按钮 */}
      <button
        onClick={() => setVisualAdjustMode('login_preview')}
        className="px-6 py-2.5 bg-[#5ab4ed] hover:bg-[#4fa0d8] text-white font-bold text-sm rounded-full transition-colors shadow-md flex items-center gap-2"
      >
        <Eye size={16} /> 预览调整
      </button>

      {/* 主标题设置 */}
      <div className="bg-white rounded-2xl border border-[#e6d5b8] shadow-sm p-6">
        <h4 className="text-sm font-bold text-[#ba3f42] mb-4 flex items-center gap-2">
          <Type size={16} /> 主标题
        </h4>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold text-[#7a6b5d] mb-1.5">标题文字</label>
            <input type="text" value={settings.loginPageTitle || ''} onChange={e => update('loginPageTitle', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm text-[#4a4036] bg-[#fdfaf5] border border-[#e6d5b8] outline-none focus:border-[#5ab4ed] transition-colors" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-[#7a6b5d] mb-1.5">颜色</label>
              <input type="color" value={settings.loginPageTitleColor || '#5ab4ed'} onChange={e => update('loginPageTitleColor', e.target.value)}
                className="w-full h-10 rounded-lg cursor-pointer border border-[#e6d5b8]" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-[#7a6b5d] mb-1.5">字体</label>
              <select value={settings.loginPageTitleFont || 'serif'} onChange={e => update('loginPageTitleFont', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-[#4a4036] bg-[#fdfaf5] border border-[#e6d5b8] outline-none">
                {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <SettingSlider label="X 偏移" value={settings.loginPageTitleX || 0} min={-500} max={500} step={1} suffix="px" onChange={v => update('loginPageTitleX', v)} />
          <SettingSlider label="Y 偏移" value={settings.loginPageTitleY || 0} min={-500} max={500} step={1} suffix="px" onChange={v => update('loginPageTitleY', v)} />
        </div>
      </div>

      {/* 副标题设置 */}
      <div className="bg-white rounded-2xl border border-[#e6d5b8] shadow-sm p-6">
        <h4 className="text-sm font-bold text-[#ba3f42] mb-4 flex items-center gap-2">
          <Type size={16} /> 副标题
        </h4>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold text-[#7a6b5d] mb-1.5">副标题文字</label>
            <input type="text" value={settings.loginPageSubTitle || ''} onChange={e => update('loginPageSubTitle', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm text-[#4a4036] bg-[#fdfaf5] border border-[#e6d5b8] outline-none focus:border-[#5ab4ed] transition-colors" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-[#7a6b5d] mb-1.5">颜色</label>
              <input type="color" value={settings.loginPageSubTitleColor || 'rgba(255,255,255,0.4)'} onChange={e => update('loginPageSubTitleColor', e.target.value)}
                className="w-full h-10 rounded-lg cursor-pointer border border-[#e6d5b8]" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-[#7a6b5d] mb-1.5">字体</label>
              <select value={settings.loginPageSubTitleFont || 'sans-serif'} onChange={e => update('loginPageSubTitleFont', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-[#4a4036] bg-[#fdfaf5] border border-[#e6d5b8] outline-none">
                {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <SettingSlider label="X 偏移" value={settings.loginPageSubTitleX || 0} min={-500} max={500} step={1} suffix="px" onChange={v => update('loginPageSubTitleX', v)} />
          <SettingSlider label="Y 偏移" value={settings.loginPageSubTitleY || 0} min={-500} max={500} step={1} suffix="px" onChange={v => update('loginPageSubTitleY', v)} />
        </div>
      </div>

      {/* 背景图设置 */}
      <div className="bg-white rounded-2xl border border-[#e6d5b8] shadow-sm p-6">
        <h4 className="text-sm font-bold text-[#ba3f42] mb-4 flex items-center gap-2">
          <ImageIcon size={16} /> 背景图
        </h4>
        <div className="space-y-4 max-w-md">
          <div className="flex items-center gap-3">
            <label className="px-4 py-2 bg-[#5ab4ed] hover:bg-[#4fa0d8] text-white font-bold text-sm rounded-full transition-colors cursor-pointer shadow-md">
              上传背景图
              <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
            </label>
            {settings.loginBgImage && (
              <button onClick={() => { fetch('/api/login-bg', { method: 'DELETE' }); update('loginBgImage', ''); }} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-full transition-colors">
                移除
              </button>
            )}
          </div>
          {settings.loginBgImage && (
            <div className="rounded-xl overflow-hidden border border-[#e6d5b8] max-h-48">
              <img src={settings.loginBgImage} alt="背景预览" className="w-full h-full object-cover" />
            </div>
          )}
          <SettingSlider label="X 偏移" value={settings.loginBgOffsetX || 0} min={-500} max={500} step={1} suffix="px" onChange={v => update('loginBgOffsetX', v)} />
          <SettingSlider label="Y 偏移" value={settings.loginBgOffsetY || 0} min={-500} max={500} step={1} suffix="px" onChange={v => update('loginBgOffsetY', v)} />
        </div>
      </div>

      {/* 文字框管理 */}
      <div className="bg-white rounded-2xl border border-[#e6d5b8] shadow-sm p-6">
        <h4 className="text-sm font-bold text-[#ba3f42] mb-4 flex items-center gap-2">
          <GripHorizontal size={16} /> 文字框
        </h4>

        <button onClick={addTextBox} className="mb-4 px-4 py-2 bg-[#5ab4ed] hover:bg-[#4fa0d8] text-white font-bold text-sm rounded-full transition-colors shadow-md flex items-center gap-2">
          <Plus size={14} /> 添加文字框
        </button>

        {currentBoxes.length === 0 && (
          <p className="text-sm text-[#7a6b5d]">暂无文字框，点击上方按钮添加。</p>
        )}

        {currentBoxes.map(box => (
          <div key={box.id} className="mb-3 border border-[#e6d5b8] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-[#fdfaf5] cursor-pointer" onClick={() => setEditingBoxId(editingBoxId === box.id ? null : box.id)}>
              <span className="text-sm font-bold text-[#4a4036] truncate flex-1">{box.text}</span>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); removeTextBox(box.id); }} className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {editingBoxId === box.id && (
              <div className="p-4 space-y-3 border-t border-[#e6d5b8]">
                <div>
                  <label className="block text-xs font-bold text-[#7a6b5d] mb-1">文字内容</label>
                  <input type="text" value={box.text} onChange={e => updateTextBox(box.id, 'text', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-[#4a4036] bg-white border border-[#e6d5b8] outline-none focus:border-[#5ab4ed]" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-[#7a6b5d] mb-1">字号</label>
                    <input type="number" min={8} max={72} value={box.fontSize} onChange={e => updateTextBox(box.id, 'fontSize', parseInt(e.target.value) || 16)}
                      className="w-full px-3 py-2 rounded-lg text-sm text-[#4a4036] bg-white border border-[#e6d5b8] outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-[#7a6b5d] mb-1">颜色</label>
                    <input type="color" value={box.color} onChange={e => updateTextBox(box.id, 'color', e.target.value)}
                      className="w-full h-[38px] rounded-lg cursor-pointer border border-[#e6d5b8]" />
                  </div>
                </div>
                <SettingSlider label="X" value={box.x} min={0} max={100} step={0.5} suffix="%" onChange={v => updateTextBox(box.id, 'x', v)} />
                <SettingSlider label="Y" value={box.y} min={0} max={100} step={0.5} suffix="%" onChange={v => updateTextBox(box.id, 'y', v)} />
                <SettingSlider label="透明度" value={box.opacity} min={0} max={1} step={0.05} onChange={v => updateTextBox(box.id, 'opacity', v)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
