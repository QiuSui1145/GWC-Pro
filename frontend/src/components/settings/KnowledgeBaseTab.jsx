import React, { useState, useEffect } from 'react';
import SettingToggle from '../ui/SettingToggle';
import SettingSlider from '../ui/SettingSlider';
import SettingSectionTitle from '../ui/SettingSectionTitle';
import { RefreshCw, Zap, Database, Search, Upload, FolderOpen, FileArchive, CheckCircle, AlertCircle, Globe, Lock } from 'lucide-react';

export default function KnowledgeBaseTab({ settings = {}, setSettings }) {
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [indexStatus, setIndexStatus] = useState(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importScope, setImportScope] = useState('public');

  const update = (key, val) => { if (setSettings) setSettings(prev => ({ ...prev, [key]: val })); };

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/kb/status');
      if (res.ok) {
        const data = await res.json();
        setIndexStatus(data);
      }
    } catch {}
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/kb/test-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: settings.kbEmbeddingBaseUrl || settings.openaiBaseUrl,
          api_key: settings.kbEmbeddingApiKey || settings.openaiApiKey,
          model: settings.kbEmbeddingModel || 'text-embedding-3-small',
          dimensions: settings.kbEmbeddingDimensions || 1536
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ ok: false, msg: `连接失败: ${e.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const rebuildIndex = async () => {
    setIsIndexing(true);
    try {
      const res = await fetch('/api/kb/reindex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedding_base_url: settings.kbEmbeddingBaseUrl || settings.openaiBaseUrl,
          embedding_api_key: settings.kbEmbeddingApiKey || settings.openaiApiKey,
          embedding_model: settings.kbEmbeddingModel || 'text-embedding-3-small',
          embedding_dimensions: settings.kbEmbeddingDimensions || 1536,
          user_id: localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin'
        })
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, msg: `索引完成! 共 ${data.count} 个文档切片` });
      } else {
        setTestResult({ ok: false, msg: data.msg || '索引失败' });
      }
      fetchStatus();
    } catch (e) {
      setTestResult({ ok: false, msg: `索引失败: ${e.message}` });
    } finally {
      setIsIndexing(false);
    }
  };

  const embeddingBaseUrl = settings.kbEmbeddingBaseUrl || settings.openaiBaseUrl || '';

  const handleImport = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const allowedExts = ['.txt', '.md', '.json', '.zip'];
    const validFiles = [];
    const invalidFiles = [];

    for (const file of fileList) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (allowedExts.includes(ext)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(`${file.name} (不支持 ${ext})`);
      }
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
      for (const file of validFiles) {
        formData.append('files', file);
      }
      formData.append('target_dir', '');
      formData.append('user_id', localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin');
      formData.append('scope', importScope);

      const res = await fetch('/admin/api/skills/import', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setImportResult({
        ok: data.ok,
        count: data.count || 0,
        imported: data.imported || [],
        errors: [...(data.errors || []), ...invalidFiles],
        msg: data.ok ? `成功导入 ${data.count} 个文件到${importScope === 'private' ? '私有' : '公共'}知识库` : (data.msg || '导入失败')
      });
      if (data.ok) fetchStatus();
    } catch (err) {
      setImportResult({ ok: false, msg: `导入失败: ${err.message}` });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };
  const embeddingApiKey = settings.kbEmbeddingApiKey || settings.openaiApiKey || '';

  return (
    <div className="space-y-8 animate-fade-in">
      <SettingSectionTitle title="知识库总开关" />
      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
        <SettingToggle
          label="启用知识库 (RAG 增强)"
          value={settings.enableKnowledgeBase}
          onChange={v => update('enableKnowledgeBase', v)}
        />
        <p className="text-xs text-[#7a6b5d] font-bold">
          启用后将使用嵌入式模型进行语义向量检索，与现有 BM25 关键词检索混合，提升知识召回质量。
        </p>
      </div>

      {settings.enableKnowledgeBase && (
        <>
          <SettingSectionTitle title="嵌入式模型配置" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-5">
            <div>
              <label className="block text-sm font-bold text-[#ba3f42] mb-2">
                <span className="text-sm">✱</span> 接口地址 (Base URL)
              </label>
              <input type="text" value={settings.kbEmbeddingBaseUrl}
                onChange={e => update('kbEmbeddingBaseUrl', e.target.value)}
                placeholder={settings.openaiBaseUrl || '留空则复用主模型接口地址'}
                className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" />
              {!settings.kbEmbeddingBaseUrl && settings.openaiBaseUrl && (
                <p className="text-[10px] text-[#8fbf8f] font-bold mt-1">当前复用: {settings.openaiBaseUrl}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-[#ba3f42] mb-2">
                <span className="text-sm">✱</span> API Key
              </label>
              <input type="password" value={settings.kbEmbeddingApiKey}
                onChange={e => update('kbEmbeddingApiKey', e.target.value)}
                placeholder={settings.openaiApiKey ? '••••••••（留空则复用主模型 Key）' : ''}
                className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" />
              {!settings.kbEmbeddingApiKey && settings.openaiApiKey && (
                <p className="text-[10px] text-[#8fbf8f] font-bold mt-1">当前复用主模型 API Key</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-[#ba3f42] mb-2">
                <span className="text-sm">✱</span> 嵌入模型名称
              </label>
              <input type="text" value={settings.kbEmbeddingModel}
                onChange={e => update('kbEmbeddingModel', e.target.value)}
                list="kb-embedding-suggestions"
                className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" />
              <datalist id="kb-embedding-suggestions">
                <option value="text-embedding-3-small" />
                <option value="text-embedding-3-large" />
                <option value="text-embedding-ada-002" />
                <option value="bge-m3" />
                <option value="bge-large-zh-v1.5" />
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-bold text-[#ba3f42] mb-2">
                <span className="text-sm">✱</span> 向量维度 (Dimensions)
              </label>
              <input type="number" value={settings.kbEmbeddingDimensions || 1536}
                onChange={e => update('kbEmbeddingDimensions', parseInt(e.target.value) || 1536)}
                min={1} max={65536}
                className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" />
              <p className="text-[10px] text-[#7a6b5d] font-bold mt-1">常见值: 256, 512, 768, 1024, 1536, 3072</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button onClick={testConnection} disabled={isTesting || !embeddingBaseUrl}
                className="px-5 py-2 bg-[#4fa0d8] hover:bg-[#5db4f0] disabled:opacity-50 text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md">
                <Zap size={14} className={`mr-1.5 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? '测试中...' : '测试连接'}
              </button>
              {testResult && (
                <span className={`text-xs font-bold ${testResult.ok ? 'text-[#8fbf8f]' : 'text-red-400'}`}>
                  {testResult.msg}
                </span>
              )}
            </div>
          </div>

          <SettingSectionTitle title="重排序模型配置" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <SettingToggle
              label="启用重排序 (Reranking)"
              value={settings.kbRerankEnabled}
              onChange={v => update('kbRerankEnabled', v)}
            />
            <p className="text-xs text-[#7a6b5d] font-bold">
              重排序模型对检索结果进行二次精排，可显著提升最终结果的相关性。
            </p>
            {settings.kbRerankEnabled && (
              <div className="pt-4 mt-4 border-t border-dashed border-[#e6d5b8] space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#ba3f42] mb-2">重排序接口地址 (Base URL)</label>
                  <input type="text" value={settings.kbRerankBaseUrl}
                    onChange={e => update('kbRerankBaseUrl', e.target.value)}
                    placeholder="例如: https://api.cohere.com 或自建服务"
                    className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#ba3f42] mb-2">API Key</label>
                  <input type="password" value={settings.kbRerankApiKey}
                    onChange={e => update('kbRerankApiKey', e.target.value)}
                    className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#ba3f42] mb-2">重排序模型名称</label>
                  <input type="text" value={settings.kbRerankModel}
                    onChange={e => update('kbRerankModel', e.target.value)}
                    list="kb-rerank-suggestions"
                    className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" />
                  <datalist id="kb-rerank-suggestions">
                    <option value="rerank-v3.5" />
                    <option value="rerank-multilingual-v3.0" />
                    <option value="bge-reranker-v2-m3" />
                  </datalist>
                </div>
                <SettingSlider label="重排序后保留数量" value={settings.kbRerankTopK || 3}
                  min={1} max={10} step={1} suffix="条"
                  onChange={v => update('kbRerankTopK', v)} />
              </div>
            )}
          </div>

          <SettingSectionTitle title="检索参数" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <SettingSlider label="知识库召回数量 (Top K)" value={settings.kbTopK || 5}
              min={1} max={20} step={1} suffix="条"
              onChange={v => update('kbTopK', v)} />
            <p className="text-xs text-[#7a6b5d] font-bold">
              检索流程: BM25 关键词检索 + 向量语义检索 → 通过 RRF 融合排序
              {settings.kbRerankEnabled ? ' → 重排序模型精排' : ''} → 注入系统提示词。
            </p>
          </div>

          <SettingSectionTitle title="索引状态" extra={
            <button onClick={rebuildIndex} disabled={isIndexing || !embeddingBaseUrl}
              className="px-4 py-1.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] disabled:opacity-50 text-white font-bold text-xs rounded-full flex items-center transition-colors shadow-md">
              <RefreshCw size={12} className={`mr-1.5 ${isIndexing ? 'animate-spin' : ''}`} />
              {isIndexing ? '索引中...' : '重建索引'}
            </button>
          } />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-[#4fa0d8]" />
                <span className="text-sm font-bold text-[#4a4036]">
                  {indexStatus?.is_indexed ? (
                    <>已索引 <span className="text-[#8fbf8f]">{indexStatus.chunk_count}</span> 个文档切片</>
                  ) : (
                    <span className="text-[#a89578]">尚未索引</span>
                  )}
                </span>
              </div>
              {indexStatus?.indexed_at && (
                <span className="text-xs text-[#7a6b5d] font-bold">
                  上次索引: {indexStatus.indexed_at}
                </span>
              )}
              {indexStatus?.model && (
                <span className="text-xs text-[#7a6b5d] font-bold">
                  模型: {indexStatus.model}
                </span>
              )}
            </div>
            {!embeddingBaseUrl && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-700 font-bold">
                  <Search size={12} className="inline mr-1" />
                  请先配置嵌入模型接口地址后再进行索引。
                </p>
              </div>
            )}
          </div>

          <SettingSectionTitle title="导入知识库文档" />
          <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-4">
            <p className="text-xs text-[#7a6b5d] font-bold">
              支持导入 .txt、.md、.json 文件或 .zip 压缩包。ZIP 内仅提取受支持格式的文件。
            </p>

            {/* 存储位置选择 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#7a6b5d]">存储位置：</span>
              <button
                onClick={() => setImportScope('public')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${importScope === 'public' ? 'bg-[#5ab4ed] text-white shadow-md' : 'bg-[#f0ebe3] text-[#7a6b5d] hover:bg-[#e6d5b8]'}`}>
                <Globe size={12} /> 公共
              </button>
              <button
                onClick={() => setImportScope('private')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${importScope === 'private' ? 'bg-[#ba3f42] text-white shadow-md' : 'bg-[#f0ebe3] text-[#7a6b5d] hover:bg-[#e6d5b8]'}`}>
                <Lock size={12} /> 私有
              </button>
              <span className="text-[10px] text-[#a89578]">
                {importScope === 'public' ? '所有用户共享' : '仅自己可见'}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className={`px-5 py-2.5 ${importScope === 'private' ? 'bg-[#ba3f42] hover:bg-[#a83538]' : 'bg-[#4fa0d8] hover:bg-[#5db4f0]'} text-white font-bold text-sm rounded-full flex items-center cursor-pointer transition-colors shadow-md ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                {importScope === 'private' ? <Lock size={16} className="mr-2" /> : <FolderOpen size={16} className="mr-2" />}
                {isImporting ? '导入中...' : `导入到${importScope === 'private' ? '私有' : '公共'}库`}
                <input type="file" multiple accept=".txt,.md,.json,.zip" onChange={handleImport} className="hidden" />
              </label>
            </div>
            {importResult && (
              <div className={`p-4 rounded-xl border ${importResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {importResult.ok ? <CheckCircle size={16} className="text-green-500" /> : <AlertCircle size={16} className="text-red-400" />}
                  <span className={`text-sm font-bold ${importResult.ok ? 'text-green-700' : 'text-red-600'}`}>{importResult.msg}</span>
                </div>
                {importResult.imported?.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto light-scrollbar">
                    {importResult.imported.map((f, i) => (
                      <p key={i} className="text-[10px] text-green-600 font-bold truncate">+ {f}</p>
                    ))}
                  </div>
                )}
                {importResult.errors?.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto light-scrollbar">
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-[10px] text-red-500 font-bold truncate">- {e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
