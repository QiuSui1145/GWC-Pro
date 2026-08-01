import React, { useState, useEffect } from 'react';
import SettingSectionTitle from '../ui/SettingSectionTitle';
import SettingToggle from '../ui/SettingToggle';
import { RefreshCw, FolderOpen, Upload, CheckCircle, AlertCircle, Eye, X, Globe, Lock, Trash2, Clock, Check, XCircle } from 'lucide-react';
import { getCurrentUser } from '../../utils/auth';

export default function SkillsConsoleTab({ settings = {}, setSettings, skillPacksList = [], toggleSkillFile, toggleSkillPack, fetchSkillPacks, expandedSkillPack, setExpandedSkillPack, showToast }) {
  const isAdmin = getCurrentUser() === 'Admin';

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importScope, setImportScope] = useState('public');
  const [previewContent, setPreviewContent] = useState(null);
  const [previewName, setPreviewName] = useState('');

  // Admin review
  const [pendingList, setPendingList] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const update = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

  // Load pending reviews for Admin
  const loadPending = async () => {
    if (!isAdmin) return;
    setLoadingPending(true);
    try {
      const res = await fetch(`/admin/api/skills/pending?operator=Admin`);
      const data = await res.json();
      if (data.ok) setPendingList(data.pending || []);
    } catch (e) {}
    setLoadingPending(false);
  };
  useEffect(() => { if (isAdmin) loadPending(); }, [isAdmin]);

  const handleImport = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const allowedExts = ['.txt', '.md', '.json', '.zip'];
    const validFiles = [];
    const invalidFiles = [];
    for (const file of fileList) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (allowedExts.includes(ext)) validFiles.push(file);
      else invalidFiles.push(`${file.name} (不支持 ${ext})`);
    }
    if (validFiles.length === 0) {
      setImportResult({ ok: false, msg: `没有可导入的文件。支持格式: ${allowedExts.join(' ')}`, errors: invalidFiles });
      e.target.value = '';
      return;
    }
    setIsImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      for (const file of validFiles) formData.append('files', file);
      formData.append('target_dir', '');
      formData.append('user_id', localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin');
      formData.append('scope', importScope);
      const res = await fetch('/admin/api/skills/import', { method: 'POST', body: formData });
      const data = await res.json();
      setImportResult({
        ok: data.ok, count: data.count || 0, imported: data.imported || [],
        errors: [...(data.errors || []), ...invalidFiles],
        msg: data.ok ? `成功导入 ${data.count} 个文件到${importScope === 'private' ? '私有' : '公共'}技能库` : (data.msg || '导入失败')
      });
      if (data.ok) { fetchSkillPacks(); if (isAdmin) loadPending(); }
    } catch (err) {
      setImportResult({ ok: false, msg: `导入失败: ${err.message}` });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const previewFile = async (path, scope) => {
    try {
      const userId = localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin';
      const res = await fetch(`/admin/api/file_content?path=${encodeURIComponent(path)}&scope=${scope || 'public'}&user_id=${userId}`);
      const data = await res.json();
      if (data.error) showToast(data.error, 'error');
      else { setPreviewContent(data.content); setPreviewName(path); }
    } catch (e) { showToast('预览失败: 后端离线', 'error'); }
  };

  const deleteFile = async (path, scope) => {
    if (!confirm(`确定删除 ${path.split('/').pop()}？`)) return;
    try {
      const userId = localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin';
      const res = await fetch('/admin/api/skills/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, scope, user_id: userId })
      });
      const data = await res.json();
      if (data.ok) { showToast('已删除', 'success'); fetchSkillPacks(); }
      else showToast(data.msg, 'error');
    } catch (e) { showToast('删除失败', 'error'); }
  };

  const reviewAction = async (path, action) => {
    try {
      const res = await fetch('/admin/api/skills/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, action, operator: getCurrentUser() })
      });
      const data = await res.json();
      if (data.ok) { showToast(data.msg, 'success'); loadPending(); fetchSkillPacks(); }
      else showToast(data.msg, 'error');
    } catch (e) { showToast('操作失败', 'error'); }
  };

  const formatDate = (ts) => ts ? new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="space-y-8 animate-fade-in">
      <SettingSectionTitle title="技能引擎总开关" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
        <SettingToggle label="启用技能引擎 (Skills & RAG)" value={settings.enableSkills} onChange={v => update('enableSkills', v)} />
        <p className="text-xs text-[#7a6b5d] font-bold">关闭后将禁用所有技能包的 RAG 检索注入，对话将不再引用技能知识库内容。</p>
      </div>

      {/* Admin: 待审核区 */}
      {isAdmin && pendingList.length > 0 && (
        <>
          <SettingSectionTitle title={`待审核 (${pendingList.length})`} />
          <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 shadow-sm space-y-3">
            <p className="text-xs text-amber-700 font-bold mb-3">用户上传到公共库的文件需要审核后才对所有人可见。</p>
            {pendingList.map(item => (
              <div key={item.path} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#4a4036] truncate">{item.path}</p>
                  <p className="text-[10px] text-[#7a6b5d]">上传者: {item.uploaded_by} | {formatDate(item.time)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => previewFile(item.path, 'public')} className="p-1.5 text-[#4fa0d8] hover:bg-[#e0f2fe] rounded" title="预览"><Eye size={14} /></button>
                  <button onClick={() => reviewAction(item.path, 'approve')} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="通过"><Check size={14} /></button>
                  <button onClick={() => reviewAction(item.path, 'reject')} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="拒绝"><XCircle size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <SettingSectionTitle title="导入技能文件" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
        <p className="text-xs text-[#7a6b5d] font-bold">支持导入 .txt、.md、.json 文件或 .zip 压缩包到技能库。ZIP 会保留目录结构。</p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#7a6b5d]">存储位置：</span>
          <button onClick={() => setImportScope('public')} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${importScope === 'public' ? 'bg-[#5ab4ed] text-white shadow-md' : 'bg-[#f0ebe3] text-[#7a6b5d] hover:bg-[#e6d5b8]'}`}><Globe size={12} /> 公共</button>
          <button onClick={() => setImportScope('private')} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${importScope === 'private' ? 'bg-[#ba3f42] text-white shadow-md' : 'bg-[#f0ebe3] text-[#7a6b5d] hover:bg-[#e6d5b8]'}`}><Lock size={12} /> 私有</button>
          <span className="text-[10px] text-[#a89578]">{importScope === 'public' ? '所有用户共享' : '仅自己可见'}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className={`px-5 py-2.5 ${importScope === 'private' ? 'bg-[#ba3f42] hover:bg-[#a83538]' : 'bg-[#4fa0d8] hover:bg-[#5db4f0]'} text-white font-bold text-sm rounded-full flex items-center cursor-pointer transition-colors shadow-md ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
            {importScope === 'private' ? <Lock size={16} className="mr-2" /> : <FolderOpen size={16} className="mr-2" />}
            {isImporting ? '导入中...' : `导入到${importScope === 'private' ? '私有' : '公共'}库`}
            <input type="file" multiple accept=".txt,.md,.json,.zip" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={() => { fetchSkillPacks(); if (isAdmin) loadPending(); }} className="px-5 py-2.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md"><RefreshCw size={16} className="mr-2" /> 刷新列表</button>
        </div>
        {importResult && (
          <div className={`p-4 rounded-xl border ${importResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {importResult.ok ? <CheckCircle size={16} className="text-green-500" /> : <AlertCircle size={16} className="text-red-400" />}
              <span className={`text-sm font-bold ${importResult.ok ? 'text-green-700' : 'text-red-600'}`}>{importResult.msg}</span>
            </div>
            {importResult.imported?.length > 0 && <div className="mt-2 max-h-32 overflow-y-auto light-scrollbar">{importResult.imported.map((f, i) => <p key={i} className="text-[10px] text-green-600 font-bold truncate">+ {f}</p>)}</div>}
            {importResult.errors?.length > 0 && <div className="mt-2 max-h-32 overflow-y-auto light-scrollbar">{importResult.errors.map((e, i) => <p key={i} className="text-[10px] text-red-500 font-bold truncate">- {e}</p>)}</div>}
          </div>
        )}
      </div>

      <SettingSectionTitle title="技能包管理" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
        <p className="text-sm text-[#7a6b5d] font-bold mb-4">管理技能包。<span className="text-[#5ab4ed]">🌐 公共</span> 所有用户共享，<span className="text-[#ba3f42]">🔒 私有</span> 仅自己可见。</p>
        {skillPacksList.length > 0 ? (
          <div className="space-y-3 max-h-[600px] overflow-y-auto light-scrollbar pr-2">
            {skillPacksList.map(pack => (
              <div key={pack.name} className="border-2 border-[#e6d5b8] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-white cursor-pointer hover:bg-[#fdfaf5] transition-colors" onClick={() => setExpandedSkillPack(expandedSkillPack === pack.name ? null : pack.name)}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{pack.name === '(root)' ? '📄' : '📁'}</span>
                    <div>
                      <p className="text-sm font-bold text-[#4a4036] flex items-center gap-2">
                        {pack.name === '(root)' ? '根目录独立文件' : pack.name}
                        {pack.files?.[0]?.scope === 'private' && <span className="text-[10px] px-1.5 py-0.5 bg-[#ba3f42] text-white rounded-full flex items-center gap-1"><Lock size={8} /> 私有</span>}
                      </p>
                      <p className="text-[10px] text-[#7a6b5d] mt-0.5">{pack.enabled_count}/{pack.total_count} 个文件已启用</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleSkillPack(pack.name, pack.enabled_count > 0); }} className={`px-3 py-1 rounded-full text-xs font-bold transition-colors shadow-sm ${pack.enabled_count > 0 ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'bg-[#8fbf8f] text-white hover:bg-[#7ebd7e]'}`}>
                    {pack.enabled_count > 0 ? '停用整组' : '启用整组'}
                  </button>
                </div>
                {expandedSkillPack === pack.name && (
                  <div className="pl-6 pr-2 py-2 space-y-2 border-t border-[#e6d5b8] bg-[#fdfaf5]/50">
                    {pack.files.map(file => (
                      <div key={file.path + (file.scope || '')} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${file.enabled ? 'bg-white border-[#e6d5b8]' : 'bg-[#f5f0e8] border-transparent opacity-60'}`}>
                        <div className="flex-1 overflow-hidden pr-3">
                          <p className="text-xs font-bold text-[#4a4036] truncate flex items-center gap-1.5">{file.name}{file.scope === 'private' && <Lock size={10} className="text-[#ba3f42] shrink-0" />}</p>
                          <p className={`text-[10px] mt-0.5 ${file.size < 3000 ? 'text-purple-500' : 'text-blue-500'}`}>{file.size < 3000 ? '⭐ 核心机制' : '🔍 RAG'} | {(file.size/1024).toFixed(1)} KB</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => previewFile(file.path, file.scope)} className="p-1.5 text-[#4fa0d8] hover:bg-[#e0f2fe] rounded transition-colors" title="预览"><Eye size={14} /></button>
                          <button onClick={() => toggleSkillFile(file.path, file.enabled, file.scope)} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors shadow-sm ${file.enabled ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'bg-[#8fbf8f] text-white hover:bg-[#7ebd7e]'}`}>{file.enabled ? '停用' : '启用'}</button>
                          <button onClick={() => deleteFile(file.path, file.scope)} className="p-1.5 text-red-400 hover:bg-red-50 rounded transition-colors" title="删除"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-[#a89578] text-sm py-8 font-bold border-2 border-dashed border-[#e6d5b8] rounded-xl bg-white/40">暂无技能包，请在上方导入文件。</div>
        )}
      </div>

      {/* 文件预览弹窗 */}
      {previewContent !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={() => setPreviewContent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6d5b8]">
              <span className="text-sm font-black text-[#4a4036] truncate">{previewName}</span>
              <button onClick={() => setPreviewContent(null)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <pre className="flex-1 overflow-auto p-6 text-xs text-[#4a4036] whitespace-pre-wrap font-mono leading-relaxed">{previewContent}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
