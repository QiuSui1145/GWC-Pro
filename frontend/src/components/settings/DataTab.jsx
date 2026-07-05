import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import SettingToggle from '../ui/SettingToggle';
import SettingSlider from '../ui/SettingSlider';
import SettingSectionTitle from '../ui/SettingSectionTitle';
import { Database, Trash2, RefreshCw, Download, Upload, Archive, Save, FileUp, Shield, AlertTriangle, Plus, MessageCircle, X, Check, Edit3 } from 'lucide-react';
import { getCurrentUser } from '../../utils/auth';

const API = '';

export default function DataTab() {
  const { settings, setSettings, handleExportFullBackup, handleImportFullBackup, handleLegacyMigration, backupProgress, showToast, getActiveMirrorId, sessions, setSessions, activeSessionId, setActiveSessionId, renameSession } = useApp();
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const currentUser = getCurrentUser();
  const isAdmin = currentUser === 'Admin';
  const mid = typeof getActiveMirrorId === 'function' ? getActiveMirrorId() : 'user_Admin';

  // 加载自动备份列表
  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const resp = await fetch(`${API}/api/auto-backup/${mid}`);
      if (resp.ok) { const data = await resp.json(); setBackups(data.backups || []); }
    } catch (e) {}
    setLoadingBackups(false);
  };
  useEffect(() => { loadBackups(); }, []);

  // 导入自动备份
  const handleImportAutoBackup = async (filename) => {
    if (!window.confirm(`确定要导入备份 "${filename}" 吗？\n当前数据将被覆盖！`)) return;
    try {
      const resp = await fetch(`${API}/api/auto-backup/${mid}/${filename}`);
      if (!resp.ok) throw new Error('读取备份失败');
      const data = await resp.json();
      const keys = ['live2d_settings_v35', 'live2d_sessions_v35', 'live2d_saves_v35', 'live2d_quicksave_v35', 'live2d_autosave_v35', 'live2d_memos_v35'];
      for (const key of keys) {
        if (data[key]) {
          await fetch(`${API}/api/userdata/${mid}/core/${key}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data[key])
          });
        }
      }
      showToast('备份导入成功！即将刷新页面...', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) { showToast('导入失败: ' + e.message, 'error'); }
  };

  // 清空当前用户数据
  const handleClearCurrentUser = async (logout = true) => {
    const msg = logout
      ? '确定要清空当前用户的所有数据并退出登录吗？\n（设置、存档、BGM、背景图、模型等全部清除）'
      : '确定要清空当前用户的所有数据吗？\n（不会退出登录，清除后数据将重置为默认值）';
    if (!window.confirm(msg)) return;
    try {
      await fetch(`${API}/api/userdata/${mid}/all`, { method: 'DELETE' });
      localStorage.clear();
      showToast('数据已清空' + (logout ? '，即将退出登录...' : ''), 'success');
      if (logout) {
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (e) { showToast('操作失败: ' + e.message, 'error'); }
  };

  // Admin: 清空全软件数据
  const handleResetAll = async () => {
    if (!window.confirm('⚠️ 即将清空全软件所有数据！\n包括所有用户、全局登录界面、Bot 配置等。\n此操作不可逆！')) return;
    if (!window.confirm('【最终确认】真的要彻底重置吗？')) return;
    try {
      await fetch(`${API}/api/admin/reset-all`, { method: 'DELETE' });
      // 重建默认 Admin
      await fetch(`${API}/api/auth/setup_default`, { method: 'POST' });
      localStorage.clear();
      showToast('全软件数据已清空，即将重启...', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) { showToast('操作失败: ' + e.message, 'error'); }
  };

  // Admin: 备份 QQ Bot 数据
  const handleExportQQBot = async () => {
    try {
      const resp = await fetch(`${API}/api/qqbot/config`);
      if (!resp.ok) throw new Error('读取 QQ Bot 配置失败');
      const configData = await resp.json();

      const contextsResp = await fetch(`${API}/api/qqbot/contexts`);
      const contextsData = contextsResp.ok ? await contextsResp.json() : {};

      const blob = new Blob([JSON.stringify({ config: configData, contexts: contextsData }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GWC_QQBot备份_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('QQ Bot 数据备份完成', 'success');
    } catch (e) {
      showToast('QQ Bot 备份失败: ' + e.message, 'error');
    }
  };

  // Admin: 恢复 QQ Bot 数据
  const handleImportQQBot = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.config) {
        await fetch(`${API}/api/qqbot/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.config)
        });
      }
      showToast('QQ Bot 数据恢复成功！', 'success');
    } catch (e) {
      showToast('恢复失败: ' + e.message, 'error');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 自动存档 */}
      <SettingSectionTitle title="自动存档与记忆增强" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
        <SettingToggle label="启用自动存档" value={settings.enableAutoSave} onChange={v => setSettings({...settings, enableAutoSave: v})} />
        {settings.enableAutoSave && (
          <SettingSlider label="自动存档间隔" value={settings.autoSaveInterval || 5} min={1} max={30} step={1} suffix="分钟" onChange={v => setSettings({...settings, autoSaveInterval: v})} />
        )}
        <div className="border-t border-dashed border-[#e6d5b8] pt-4">
          <SettingToggle label="启用长期记忆压缩" value={settings.enableMemory} onChange={v => setSettings({...settings, enableMemory: v})} />
          {settings.enableMemory && (
            <SettingSlider label="记忆压缩间隔" value={settings.memoryInterval || 150} min={50} max={500} step={10} suffix="条" onChange={v => setSettings({...settings, memoryInterval: v})} />
          )}
        </div>
      </div>

      {/* 数据管理 */}
      <SettingSectionTitle title="数据管理" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
        {backupProgress.visible && (
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-[#4fa0d8] h-4 rounded-full transition-all" style={{ width: `${backupProgress.percent}%` }}></div>
            <p className="text-xs text-[#7a6b5d] mt-1">{backupProgress.text}</p>
          </div>
        )}

        {/* 备份 */}
        <div>
          <p className="text-sm font-bold text-[#ba3f42] mb-3 flex items-center gap-1.5"><Database size={14}/> 数据备份</p>

          {/* 非 Admin：只显示用户备份 */}
          {!isAdmin && (
            <div className="flex flex-wrap gap-3">
              <button onClick={handleExportFullBackup} className="px-4 py-2 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md">
                <Download size={16} className="mr-1.5" /> 备份当前用户数据
              </button>
              <label className="px-4 py-2 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-sm rounded-full flex items-center cursor-pointer transition-colors shadow-md">
                <Upload size={16} className="mr-1.5" /> 恢复备份
                <input type="file" accept=".zip" hidden onChange={handleImportFullBackup} />
              </label>
            </div>
          )}

          {/* Admin：分三类备份 */}
          {isAdmin && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <button onClick={handleExportFullBackup} className="px-4 py-2 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md">
                  <Download size={16} className="mr-1.5" /> 备份当前用户数据
                </button>
                <button onClick={handleExportFullBackup} className="px-4 py-2 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md">
                  <Download size={16} className="mr-1.5" /> 备份整套软件数据
                </button>
                <label className="px-4 py-2 bg-[#e8decb] hover:bg-[#d9c5b2] text-[#4a4036] font-bold text-sm rounded-full flex items-center cursor-pointer transition-colors shadow-md">
                  <Upload size={16} className="mr-1.5" /> 恢复备份
                  <input type="file" accept=".zip" hidden onChange={handleImportFullBackup} />
                </label>
              </div>
              <div className="bg-[#fdfaf5] rounded-lg p-3 border border-[#e6d5b8]">
                <p className="text-xs text-[#7a6b5d] font-bold mb-1">备份说明：</p>
                <ul className="text-xs text-[#7a6b5d] list-disc list-inside space-y-0.5">
                  <li><strong>备份当前用户数据</strong>：仅包含当前登录用户的设置、存档、BGM、背景图、模型</li>
                  <li><strong>备份整套软件数据</strong>：包含所有用户、QQ Bot 配置、技能库、全局登录界面等</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* QQ Bot 数据备份 (Admin 专属) */}
        {isAdmin && (
          <>
            <div className="border-t border-dashed border-[#e6d5b8]"></div>
            <div>
              <p className="text-sm font-bold text-[#ba3f42] mb-3 flex items-center gap-1.5"><Database size={14}/> QQ 机器人数据备份</p>
              <p className="text-xs text-[#7a6b5d] mb-3">单独备份 QQ Bot 的配置、会话上下文和插件数据。</p>
              <div className="flex flex-wrap gap-3">
                <button onClick={handleExportQQBot} className="px-4 py-2 bg-[#a78bfa] hover:bg-[#8b5cf6] text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md">
                  <Download size={16} className="mr-1.5" /> 备份 QQ Bot 数据
                </button>
                <label className="px-4 py-2 bg-[#e8decb] hover:bg-[#d9c5b2] text-[#4a4036] font-bold text-sm rounded-full flex items-center cursor-pointer transition-colors shadow-md">
                  <Upload size={16} className="mr-1.5" /> 恢复 QQ Bot 数据
                  <input type="file" accept=".json" hidden onChange={handleImportQQBot} />
                </label>
              </div>
            </div>
          </>
        )}

        <div className="border-t border-dashed border-[#e6d5b8]"></div>

        {/* 自动备份 */}
        <div>
          <p className="text-sm font-bold text-[#ba3f42] mb-2 flex items-center gap-1.5"><Save size={14}/> 聊天数据自动备份</p>
          <p className="text-xs text-[#7a6b5d] mb-3">自动将聊天记录、存档、设置备份到服务端（仅保留最新一份）</p>
          <SettingToggle label="启用自动备份" value={settings.enableAutoChatBackup !== false} onChange={v => setSettings({...settings, enableAutoChatBackup: v})} />
          {settings.enableAutoChatBackup !== false && (
            <div className="mt-3">
              <SettingSlider label="备份间隔" value={settings.autoChatBackupInterval || 10} min={5} max={60} step={5} suffix="分钟" onChange={v => setSettings({...settings, autoChatBackupInterval: v})} />
            </div>
          )}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[#7a6b5d]">可用备份</p>
              <button onClick={loadBackups} className="text-xs text-[#5ab4ed] hover:underline">{loadingBackups ? '加载中...' : '刷新'}</button>
            </div>
            {backups.length === 0 ? (
              <p className="text-xs text-[#7a6b5d]">暂无自动备份</p>
            ) : (
              <div className="space-y-2">
                {backups.map(b => (
                  <div key={b.file} className="flex items-center justify-between bg-[#fdfaf5] rounded-lg px-4 py-2 border border-[#e6d5b8]">
                    <div>
                      <p className="text-sm font-bold text-[#4a4036]">{b.file}</p>
                      <p className="text-xs text-[#7a6b5d]">{new Date(b.time).toLocaleString()} · {(b.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={() => handleImportAutoBackup(b.file)} className="px-3 py-1 bg-[#5ab4ed] hover:bg-[#4fa0d8] text-white text-xs font-bold rounded-full transition-colors">
                      导入
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-dashed border-[#e6d5b8]"></div>

        {/* 老版本数据迁移 */}
        <div>
          <p className="text-sm font-bold text-[#ba3f42] mb-2 flex items-center gap-1.5"><FileUp size={14}/> 老版本数据迁移</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <p className="text-xs text-blue-700 font-bold">💡 系统镜像功能已被多用户功能替代。老版本备份中的镜像数据可恢复为独立用户账号。</p>
          </div>
          <p className="text-xs text-[#7a6b5d] mb-3">导入旧版本的全量备份 ZIP 包，每个镜像将创建为独立用户账号（无密码，首次登录需设置密码）。</p>
          <label className="px-4 py-2 bg-[#e6a04e] hover:bg-[#d4903e] text-white font-bold text-sm rounded-full flex items-center cursor-pointer transition-colors shadow-md w-max">
            <Archive size={16} className="mr-1.5" /> 导入老版本备份
            <input type="file" accept=".zip" hidden onChange={handleLegacyMigration} />
          </label>
        </div>
      </div>

      {/* 会话管理 */}
      <SettingSectionTitle title="会话管理" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#ba3f42] flex items-center gap-1.5"><MessageCircle size={14}/> 会话列表</p>
          <button onClick={() => { const s = { id: Date.now().toString(), title: '新剧情', messages: [], memorySummary: '' }; setSessions(prev => [s, ...prev]); setActiveSessionId(s.id); showToast('已创建新会话', 'success'); }} className="px-3 py-1.5 bg-[#5ab4ed] hover:bg-[#4fa0d8] text-white font-bold text-xs rounded-full flex items-center transition-colors shadow-md">
            <Plus size={14} className="mr-1"/> 新建会话
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto space-y-2">
          {sessions.length === 0 ? (
            <p className="text-xs text-[#7a6b5d] text-center py-4">暂无会话</p>
          ) : (
            sessions.map(s => {
              const lastUser = [...(s.messages||[])].reverse().find(m => m.role === 'user')
              const preview = lastUser?.content?.slice(0, 50) || '(空对话)'
              return (
              <div key={s.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors ${s.id === activeSessionId ? 'bg-[#5ab4ed]/10 border border-[#5ab4ed]/30' : 'bg-[#fdfaf5] border border-[#e6d5b8] hover:bg-[#f5f0e8]'}`}>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setActiveSessionId(s.id)}>
                  {editingId === s.id ? (
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { renameSession(s.id, editTitle.trim() || s.title); setEditingId(null) } if (e.key === 'Escape') setEditingId(null) }} autoFocus className="text-sm font-bold text-[#4a4036] bg-white border border-[#5ab4ed] rounded px-2 py-0.5 w-full outline-none" />
                  ) : (
                    <p className="text-sm font-bold text-[#4a4036] truncate">{s.title || '新剧情'}</p>
                  )}
                  <p className="text-xs text-[#7a6b5d] truncate">{preview}</p>
                  <p className="text-[10px] text-[#7a6b5d]/60">{s.messages?.length || 0} 条</p>
                </div>
                <button onClick={() => { setEditingId(s.id); setEditTitle(s.title) }} className="p-1 text-[#7a6b5d] hover:text-[#5ab4ed] hover:bg-blue-50 rounded-lg transition-colors shrink-0" title="重命名">
                  <Edit3 size={14}/>
                </button>
                <button onClick={() => { if (sessions.length <= 1) { showToast('至少保留一个会话', 'error'); return } setSessions(prev => prev.filter(x => x.id !== s.id)); if (activeSessionId === s.id) setActiveSessionId(null); showToast('已删除', 'success'); }} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0" title="删除">
                  <X size={16}/>
                </button>
              </div>
            )})
          )}
        </div>
      </div>

      {/* 数据清理 */}
      <SettingSectionTitle title="数据清理" />
      <div className="space-y-4">
        {/* 非 Admin：清空当前用户 */}
        {!isAdmin && (
          <div className="bg-orange-50 p-6 rounded-xl border-2 border-orange-200 shadow-sm">
            <p className="text-sm font-bold text-orange-700 mb-2 flex items-center gap-1.5"><Trash2 size={14}/> 清空当前用户数据</p>
            <p className="text-xs text-orange-600 mb-4">清除当前账号的所有设置、存档、BGM、背景图、模型等数据。</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => handleClearCurrentUser(true)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md">
                <Trash2 size={16} className="mr-1.5" /> 清空并退出登录
              </button>
              <button onClick={() => handleClearCurrentUser(false)} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md">
                <RefreshCw size={16} className="mr-1.5" /> 清空但不退出
              </button>
            </div>
          </div>
        )}

        {/* Admin 专属 */}
        {isAdmin && (
          <>
            <div className="bg-orange-50 p-6 rounded-xl border-2 border-orange-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-orange-600" />
                <p className="text-sm font-bold text-orange-700">清空当前用户数据</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-200 text-orange-800 font-bold">Admin</span>
              </div>
              <p className="text-xs text-orange-600 mb-4">清空 Admin 的设置、存档、BGM、模型等。<br/>保留：QQ Bot 配置、自定义登录界面、技能库。</p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => handleClearCurrentUser(true)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md">
                  <Trash2 size={16} className="mr-1.5" /> 清空并退出登录
                </button>
                <button onClick={() => handleClearCurrentUser(false)} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md">
                  <RefreshCw size={16} className="mr-1.5" /> 清空但不退出
                </button>
              </div>
            </div>

            <div className="bg-red-950/5 p-6 rounded-xl border-2 border-red-400 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-600" />
                <p className="text-sm font-bold text-red-700">清空全软件数据（彻底重置）</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-200 text-red-800 font-bold">Admin</span>
              </div>
              <p className="text-xs text-red-600 mb-4">删除所有用户、全局登录界面、Bot 配置、技能库索引等。<br/>仅保留技能库源文件。重置后自动重建 Admin 账号。</p>
              <button onClick={handleResetAll} className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md">
                <AlertTriangle size={16} className="mr-1.5" /> 彻底重置全软件
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
