/**
 * 插件名称：🎬 离线剧本模式拓展包 (Script Mode DLC) V4.35 究极导演版
 * 兼容版本：GWC v4.1.0+ 引擎 / Sprite DLC v2.7+
 * 功能进化：
 * 1. ✋ 独立拖拽区域：左侧隔离式拖拽条，彻底修复 UI 重叠，随意重排。
 * 2. 🕸️ 智能寻路连线：贝塞尔圆心精准锚定防断线，序章默认空节点自动显影不吞线。
 * 3. 🖼️ 定制蓝图背景：复活流程图导入功能，卡片采用极暗磨砂玻璃质感。
 * 4. 🗺️ 最高级时光地图：修复 X 按钮失灵，解除 UI 锁死，完美跳转。
 * 5. 🎮 结算矩阵与HUD：通关结算页按钮绝不重叠文本，底部 HUD 无缝挂载存档与读档。
 * 6. 📦 全量打包管家：原生内嵌导入/导出，完美封包立绘/音频。
 * 7. 🛡️ 【V4.35 新增】存档绝对隔离：独立于主程序的存档体系。在剧情中拦截主程序存档，大厅直连读档！
 * 8. 👁️ 【V4.35 优化】立绘清屏智能判定：非旁白的连贯对话保留立绘；一旦他人发言且无立绘，必定清屏防幽灵残留！
 * 9. ✏️ 【V4.35 优化】项目重命名：恢复编辑器顶栏的剧本重命名功能。
 */

(function() {
    if (window.__ScriptModeDLCLoaded_V4_35) return;
    window.__ScriptModeDLCLoaded_V4_35 = true;

  console.log("[Script Mode DLC] V4.35 究极导演版 开始装载...");

    // ✨ 新增：主程序同款暗黑系二次确认模态框
    window.showGwcConfirm = (message, onConfirm, onCancel) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 flex items-center justify-center pointer-events-auto';
        overlay.style.cssText = 'z-index: 2147483647; background-color: rgba(0,0,0,0.6); backdrop-filter: blur(4px);';
        overlay.innerHTML = `
            <div style="background-color: #2c2b29; border: 1px solid #ba3f42;" class="rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4 transform transition-all scale-100">
                <div class="flex items-center gap-3 mb-4">
                    <span style="color: #ba3f42;" class="text-2xl">⚠️</span>
                    <h3 style="color: #fdfaf5;" class="text-lg font-bold">系统提示</h3>
                </div>
                <p style="color: rgba(253,250,245,0.8);" class="text-sm mb-6 whitespace-pre-wrap leading-relaxed">${message}</p>
                <div class="flex justify-end gap-3">
                    <button class="px-4 py-2 rounded font-bold text-sm transition-colors btn-cancel outline-none cursor-pointer" style="border: 1px solid rgba(253,250,245,0.3); color: #fdfaf5; background: transparent;">取消</button>
                    <button class="px-4 py-2 rounded font-bold text-sm transition-colors btn-confirm outline-none cursor-pointer" style="background-color: #ba3f42; color: white;">确认</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('.btn-cancel').onclick = () => { overlay.remove(); if (onCancel) onCancel(); };
        overlay.querySelector('.btn-confirm').onclick = () => { overlay.remove(); if (onConfirm) onConfirm(); };
    };

    // ✨ 修复：全局防误触 ESC 返回，切断事件传播防止和系统层级冲突
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const saveUI = document.getElementById('sm-story-save-ui');
            const playerMap = document.getElementById('sm-player-map-overlay');
            const editorModal = document.getElementById('sm-editor-modal');
            const hub = document.getElementById('sm-story-selector');

            // 如果存在任何一个自定义模态框，立即截断事件，防止主程序退回大厅
            if (saveUI || playerMap || editorModal || hub) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }

            if (saveUI) {
                window.showGwcConfirm('是否关闭存档/读档控制面板？', () => saveUI.remove());
                return;
            }
            if (playerMap) {
                playerMap.remove();
                if(theaterState && theaterState.inSettlement) {
                   const menu = document.querySelector('.fixed.inset-0.bg-black\\/80');
                   if (menu) menu.style.display = 'flex';
                   theaterState.inSettlement = false;
                }
                return;
            }
            if (editorModal) {
                window.showGwcConfirm('⚠️ 确认要退出剧本编辑器吗？\\n未保存的更改将会全部丢失！请确保您已经点击了右下角的【保存工程】。', () => {
                    editorModal.classList.add('opacity-0');
                    setTimeout(() => { editorModal.remove(); if(typeof openStorySelectorModal === 'function') openStorySelectorModal(); }, 300);
                });
                return;
            }
            if (hub) {
                hub.classList.add('opacity-0');
                setTimeout(() => hub.remove(), 300);
                return;
            }
        }
    }, { capture: true }); // 使用事件捕获机制最高优先级拦截

    const injectGlobalStyles = () => {
        if (document.getElementById('sme-global-styles')) return;
        const style = document.createElement('style');
        style.id = 'sme-global-styles';
        style.innerHTML = `
            .sme-btn-primary { background-color: #4fa0d8 !important; color: white !important; border: none; outline: none; cursor: pointer; transition: 0.2s; }
            .sme-btn-primary:hover { background-color: #3b82f6 !important; }
            .sme-btn-danger { background-color: #fef2f2 !important; color: #ef4444 !important; border: 1px solid #fecaca !important; cursor: pointer; transition: 0.2s; }
            .sme-btn-danger:hover { background-color: #ef4444 !important; color: white !important; }
            .sme-btn-success { background-color: #8fbf8f !important; color: white !important; border: none; cursor: pointer; transition: 0.2s; }
            .sme-btn-success:hover { background-color: #7ebd7e !important; }
            .sme-btn-warning { background-color: #f59e0b !important; color: white !important; border: none; cursor: pointer; transition: 0.2s; }
            .sme-btn-warning:hover { background-color: #d97706 !important; }
            
            .sme-node-card { background-color: rgba(15,23,42,0.95) !important; backdrop-filter: blur(12px) !important; border: 2px solid #475569 !important; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1); }
            .sme-node-card:hover { border-color: #94a3b8 !important; }
            .sme-node-card.active { border-color: #f59e0b !important; box-shadow: 0 0 25px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.2); z-index: 30 !important; }
            .sme-node-input { background: transparent !important; color: white !important; font-weight: 900; font-size: 1.125rem; border: none; border-bottom: 1px dashed #64748b; width: 100%; outline: none; margin-bottom: 4px; font-family: serif; letter-spacing: 0.1em; }
            .sme-node-input:focus { border-bottom-color: #f59e0b; }
            
            .sme-port-out { position: absolute; right: -8px; width: 16px; height: 16px; border: 3px solid #0f172a; border-radius: 50%; cursor: crosshair; z-index: 20; transition: 0.2s; box-shadow: 0 0 5px rgba(0,0,0,0.5); }
            .sme-port-out.default { background-color: #ef4444; top: 60px; }
            .sme-port-out.choice { background-color: #f59e0b; }
            .sme-port-out:hover { transform: scale(1.5); box-shadow: 0 0 15px rgba(255,255,255,0.9); }
            
            .sme-port-in { position: absolute; left: -8px; top: 40px; width: 16px; height: 16px; background-color: #94a3b8; border: 3px solid #0f172a; border-radius: 50%; z-index: 20; transition: 0.2s; box-shadow: 0 0 5px rgba(0,0,0,0.5); }
            .sme-port-in:hover { transform: scale(1.5); background-color: #cbd5e1; }
            
            .sme-conn-line { pointer-events: stroke !important; cursor: pointer; transition: 0.2s; }
           .sme-conn-line:hover { stroke: #3b82f6 !important; stroke-width: 8px !important; opacity: 1 !important; filter: drop-shadow(0 0 8px rgba(59,130,246,0.9)); }
            
            .sme-drag-handle { cursor: grab; transition: background-color 0.2s; }
            .sme-drag-handle:active { cursor: grabbing; }
            .sme-line-item.dragging { opacity: 0.5; border: 2px dashed #ba3f42 !important; }
            
           /* 新增图片悬浮预览窗 */
            #sme-preview-tooltip { position: fixed; z-index: 999999; background: white; border: 2px solid #ba3f42; border-radius: 8px; padding: 4px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); pointer-events: none; display: none; max-width: 250px; max-height: 250px; }
            #sme-preview-tooltip img { max-width: 100%; max-height: 240px; border-radius: 4px; object-fit: contain; }

            /* 修复电脑端显示空间不足时按钮打架 (允许弹性折行) */
            .h-16.flex.items-center.justify-between.px-6.shrink-0.z-20 { height: auto !important; min-height: 4rem; padding-top: 0.5rem; padding-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem; }
            
            .sme-hover-show { display: none; }
            .group:hover .sme-hover-show { display: block; }
            .sme-grid-responsive { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .sme-choice-row-responsive { flex-direction: row; }

            /* 手机端竖屏适配 - 跟随紧凑布局 */
            @media (max-width: 768px) {
                .sme-view-toggle { display: none !important; }
                .sme-grid-responsive { grid-template-columns: repeat(1, minmax(0, 1fr)); }
                .sme-choice-row-responsive { flex-direction: column; }
                #sm-editor-modal .flex.flex-1.overflow-hidden { flex-direction: column !important; overflow-y: auto; }
                #sm-editor-modal .w-64 { width: 100% !important; border-right: none !important; border-bottom: 2px solid #e6d5b8; min-height: 30vh; }
                #sm-editor-modal .w-80 { width: 100% !important; border-left: none !important; border-top: 2px solid #e6d5b8; min-height: 50vh; }
                #sme-flow-container { min-height: 60vh; }
            }

            /* 优化流程图卡片美观度 (极暗磨砂玻璃质感) */
            .sme-node-card {
                background: rgba(25, 25, 25, 0.85) !important;
                backdrop-filter: blur(10px) !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
                transition: transform 0.2s, border-color 0.2s !important;
            }
            .sme-node-card:hover { transform: translateY(-2px); border-color: rgba(255, 255, 255, 0.4) !important; }

            /* 优化连线美观度 (贝塞尔曲线高亮与平滑) */
            .sme-conn-line {
                stroke: rgba(200, 200, 200, 0.6) !important; stroke-width: 3px !important; fill: none;
                transition: stroke 0.3s, stroke-width 0.3s !important;
            }
            .sme-conn-line:hover { stroke: rgba(100, 200, 255, 0.9) !important; stroke-width: 5px !important; cursor: pointer; filter: drop-shadow(0 0 6px rgba(100,200,255,0.8)); }
        `;
        document.head.appendChild(style);
    };
    injectGlobalStyles();

    // ================== 此处替换原有的预览方法 ==================
    // 获取全局BGM音乐（服务端 API）
    const getBgms = async () => {
        const api = window.__GWC_API;
        if (!api) return [];
        try {
            const items = await api.listPluginJson('audio') || [];
            return items.filter(a => a.id && a.id.toLowerCase().includes('bgm')).map(a => ({
                ...a,
                data: api.getPluginBlobUrl('audio', a.id)
            }));
        } catch { return []; }
    };

    // 新增：全局图片预览逻辑（修复内存爆炸版）
    window.showSmePreview = (selectEl, type) => {
        const tooltip = document.getElementById('sme-preview-tooltip');
        if (!tooltip) {
            const t = document.createElement('div'); t.id = 'sme-preview-tooltip'; t.innerHTML = '<img src="" id="sme-preview-img" />';
            document.body.appendChild(t);
        }
        const val = selectEl.value;
        if (!val || val === 'inherit' || val === 'none' || val === 'clear' || val === 'stop') return window.hideSmePreview();
        
        // ⚡ 直接从全局内存取图，不再强写进 DOM
        let targetUrl = window.__smePreviewMap ? window.__smePreviewMap[type + '_' + val] : '';
        if (!targetUrl) return window.hideSmePreview();
        
        const img = document.getElementById('sme-preview-img');
        img.src = targetUrl;
        const rect = selectEl.getBoundingClientRect();
        const tip = document.getElementById('sme-preview-tooltip');
        tip.style.display = 'block';
        tip.style.left = (rect.right + 10) + 'px';
        tip.style.top = (Math.max(10, rect.top - 50)) + 'px';
    };
    window.hideSmePreview = () => {
        const tip = document.getElementById('sme-preview-tooltip');
        if (tip) tip.style.display = 'none';
    };

    const checkEnv = () => {
        if (!window.$GWC || !window.$GWC.updatePluginDialog) {
            alert("⚠️ 严重不兼容：请先按照指示更新 App.jsx 主程序至 V4.1 原生插件版！");
            return false;
        }
        return true;
    };

    const getActiveMirrorId = () => localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin';
    
    const safePathEncode = (path) => {
        if (!path) return '';
        return encodeURIComponent(path.replace(/\\/g, '/'));
    };

    const getEditorLLMConfig = () => {
        const stored = localStorage.getItem('GWC_ScriptMode_LLM_Config');
        if (stored) { try { return JSON.parse(stored); } catch(e){} }
        return { baseUrl: '', apiKey: '', model: '' };
    };
    const saveEditorLLMConfig = (conf) => {
        localStorage.setItem('GWC_ScriptMode_LLM_Config', JSON.stringify(conf));
    };

    const DB_NAME = 'GWC_ScriptMode_DLC_DB';
    const getScriptDB = () => new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 3);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('story_saves')) db.createObjectStore('story_saves', { keyPath: 'id' });
        };
        req.onsuccess = e => resolve(e.target.result); req.onerror = e => reject(e.target.error);
    });

    const ScriptDB = {
        async getAll() { const db = await getScriptDB(); return new Promise(res => { db.transaction('projects', 'readonly').objectStore('projects').getAll().onsuccess = e => res((e.target.result || []).filter(p => p.id.startsWith(getActiveMirrorId() + '_'))); }); },
        async save(proj) { const db = await getScriptDB(); return new Promise(res => { proj.updatedAt = Date.now(); db.transaction('projects', 'readwrite').objectStore('projects').put(proj).onsuccess = res; }); },
        async get(id) { const db = await getScriptDB(); return new Promise(res => { db.transaction('projects', 'readonly').objectStore('projects').get(id).onsuccess = e => res(e.target.result); }); },
        async delete(id) { const db = await getScriptDB(); return new Promise(res => { db.transaction('projects', 'readwrite').objectStore('projects').delete(id).onsuccess = res; }); }
    };

    const SaveDB = {
        async getAll() { const db = await getScriptDB(); return new Promise(res => { db.transaction('story_saves', 'readonly').objectStore('story_saves').getAll().onsuccess = e => res((e.target.result || []).filter(s => s.id.startsWith(getActiveMirrorId() + '_'))); }); },
        async save(data) { const db = await getScriptDB(); return new Promise((res, rej) => { const tx = db.transaction('story_saves', 'readwrite'); tx.objectStore('story_saves').put(data).onsuccess = res; tx.onerror = rej; }); }
    };

    // 通过服务端 API 获取背景图列表
    const getMainBgs = async () => {
        const api = window.__GWC_API;
        if (!api) return [];
        try {
            const items = await api.listPluginJson('bg_images') || [];
            // 如果插件 API 没有 bg_images，直接从主 API 获取
            if (items.length === 0) {
                const mid = getActiveMirrorId();
                const resp = await fetch(`/api/userdata/${mid}/bg_images`);
                if (resp.ok) {
                    const bgItems = await resp.json();
                    return (bgItems || []).map(bg => ({
                        id: bg.id,
                        name: bg.name,
                        dataUrl: `${API_BASE}/api/userdata/${mid}/bg_images/${bg.id}/file`
                    }));
                }
            }
            return items;
        } catch { return []; }
    };

    async function loadJSZip() {
        if (window.JSZip) return window.JSZip;
        return new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
            s.onload = () => resolve(window.JSZip);
            document.head.appendChild(s);
        });
    }

    async function extractFromDB(dbName, storeName, matchFunc) {
        return new Promise((resolve) => {
            const req = indexedDB.open(dbName);
            req.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(storeName)) return resolve([]);
                const tx = db.transaction(storeName, 'readonly');
                tx.objectStore(storeName).getAll().onsuccess = (ev) => resolve((ev.target.result || []).filter(matchFunc));
            };
            req.onerror = () => resolve([]);
        });
    }

    async function injectToDB(dbName, storeName, items) {
        if (!items || items.length === 0) return;
        return new Promise((resolve) => {
            const req = indexedDB.open(dbName);
            req.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(storeName)) return resolve();
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                items.forEach(item => store.put(item));
                tx.oncomplete = () => resolve();
            };
            req.onerror = () => resolve();
        });
    }

    const blobToBase64 = (blob) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });

    const askAIText = async (sysPrompt, userPrompt, fallbackModel) => {
        const s = window.$GWC.getSettings(); 
        const editorLLM = getEditorLLMConfig();
        
        let rawBaseUrl = (editorLLM.baseUrl || s.openaiBaseUrl || '').trim();
        let apiKey = (editorLLM.apiKey || s.openaiApiKey || '').trim();
        let aiModel = (editorLLM.model || fallbackModel || s.aiModel || 'gpt-3.5-turbo').trim();

        if (rawBaseUrl && !/^https?:\/\//i.test(rawBaseUrl)) rawBaseUrl = 'https://' + rawBaseUrl; 
        rawBaseUrl = rawBaseUrl.replace(/\/$/, ''); 
        if (rawBaseUrl.endsWith('/v1')) rawBaseUrl = rawBaseUrl.slice(0, -3);
        
        let fetchUrl = `${rawBaseUrl}/v1/chat/completions`; 
        if (s.corsProxyType === 'corsproxy') fetchUrl = `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`;
        
        const headers = { 'Content-Type': 'application/json' }; 
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        
        const response = await fetch(fetchUrl, { 
            method: 'POST', headers, 
            body: JSON.stringify({ model: aiModel, messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userPrompt }], stream: false }) 
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status} 错误`);
        const data = await response.json(); 
        return data.choices?.[0]?.message?.content || data.message || "";
    };

    const generateScriptViaAI = async (inputOutline, fanficPrompt, customModel, customPrompt, mode) => {
        let modePrompt = "";
        let finalInput = inputOutline;

        switch(mode) {
            case 'idea': modePrompt = "用户输入的是一个【简短创意或想法】，请你发挥想象力，将其扩写成一段详细生动、包含人物动作和感情的视觉小说(VN)剧本。"; break;
            case 'script': modePrompt = "用户输入的是【已成型的剧本文本或小说】，请你绝对忠于原文，仅直接从中提取角色名、情绪和对白。不要擅自增加或删减剧情！"; break;
            case 'fanfic': 
                modePrompt = "用户输入了【原作剧本/世界观资料】以及【二创要求】。请严格根据用户的要求，以原世界观设定或指定节点为基础，发挥创意进行续写或改编创作视觉小说剧本。"; 
                finalInput = `【原作参考资料】：\n${inputOutline}\n\n【二创核心要求】：\n${fanficPrompt}`;
                break;
            case 'outline':
            default: modePrompt = "用户输入的是【剧情大纲】，请严格根据大纲的起承转合，填充合理的对话、内心戏和场景描述。"; break;
        }

        let systemPrompt = `你是一个专业的视觉小说剧本构建引擎。${modePrompt}\n\n请严格输出为 JSON 数组格式：\n[\n  {"speaker": "名字(旁白填'旁白')", "text": "台词", "emotion": "情绪", "bg": "场景"}\n]\n\n【绝对禁令】：必须确保返回的是合法的纯 JSON 数组，绝对不要在前后包含任何废话、解释或 Markdown 代码块标记（如 \`\`\`json 等）！`;
        if (customPrompt) systemPrompt += `\n【附加导演指令】：\n${customPrompt}`;

        const content = await askAIText(systemPrompt, finalInput, customModel);
        
        const arrayMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (!arrayMatch) throw new Error("AI未能返回有效的 JSON 数组结构。可能遭遇了严重幻觉，请换个模型或重试。");
        try { 
            return JSON.parse(arrayMatch[0]); 
        } catch (e) { throw new Error("抠取的 JSON 数组仍然解析失败：" + e.message); }
    };

    // ✨ V4.35 拦截：防止玩家在剧情模式点到主程序的存档/读档导致存档污染
    window.addEventListener('click', (e) => {
        if (theaterState && theaterState.active) {
            const el = e.target.closest('button') || e.target;
            const text = el.innerText || el.textContent || '';
            const title = el.getAttribute('title') || '';
            if (
                !el.closest('#sme-hud-group') && 
                !el.closest('#sm-story-save-ui') && 
                !el.closest('.fixed.inset-0.bg-black\\/80') && 
                !el.closest('#sm-choice-overlay') &&
                !el.closest('#sm-player-map-overlay')
            ) {
                if (text.includes('存档') || text.includes('读档') || title.includes('存档') || title.includes('读档') || text.includes('记录')) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.$GWC.showToast('剧情模式下，主程序存档通道已被隔离。\n请使用底栏的专属【存档 / 读档】HUD按钮。', 'warning', 4000);
                }
            }
        }
    }, true);

    const injectMainMenu = () => {
        const observer = new MutationObserver(() => {
            if (document.getElementById('gwc-btn-story-mode')) return;
            const allNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let startBtn = null, contBtn = null, loadBtn = null;
            while (allNodes.nextNode()) {
                const txt = allNodes.currentNode.nodeValue.trim();
                if (txt === 'START') startBtn = allNodes.currentNode.parentElement;
                if (txt === 'CONTINUE') contBtn = allNodes.currentNode.parentElement;
                if (txt === 'LOAD') loadBtn = allNodes.currentNode.parentElement;
            }

            let container = null, cloneSource = null, insertBeforeTarget = null;
            if (contBtn && loadBtn && contBtn.parentElement === loadBtn.parentElement) { container = contBtn.parentElement; cloneSource = contBtn; insertBeforeTarget = loadBtn; } 
            else if (startBtn && loadBtn && startBtn.parentElement === loadBtn.parentElement) { container = startBtn.parentElement; cloneSource = startBtn; insertBeforeTarget = loadBtn; } 
            else if (startBtn) { container = startBtn.parentElement; cloneSource = startBtn; insertBeforeTarget = startBtn.nextSibling; }

            if (container && cloneSource) {
                if (container.querySelector('#gwc-btn-story-mode')) return;
                const storyBtn = cloneSource.cloneNode(true);
                storyBtn.id = 'gwc-btn-story-mode';
                const textNodes = document.createTreeWalker(storyBtn, NodeFilter.SHOW_TEXT, null, false);
                while (textNodes.nextNode()) {
                    const txt = textNodes.currentNode.nodeValue.trim();
                    if (txt === 'START' || txt === 'CONTINUE' || txt === 'LOAD') textNodes.currentNode.nodeValue = 'STORY';
                }
                storyBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openStorySelectorModal(); };
                if (insertBeforeTarget) container.insertBefore(storyBtn, insertBeforeTarget);
                else container.appendChild(storyBtn);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    const openStorySelectorModal = async () => {
        if (!checkEnv()) return; const projects = await ScriptDB.getAll();
        let modal = document.getElementById('sm-story-selector'); if (modal) modal.remove();
        modal = document.createElement('div'); modal.id = 'sm-story-selector'; modal.className = 'fixed inset-0 flex items-center justify-center pointer-events-auto opacity-0 transition-opacity duration-300';
        modal.style.zIndex = '90000';
        modal.style.backgroundColor = 'rgba(0,0,0,0.6)';
        modal.style.backdropFilter = 'blur(4px)';
        modal.innerHTML = `
            <div style="background-color: #fdfaf5; border: 2px solid #d9c5b2;" class="p-8 rounded-xl w-[1000px] max-w-[95vw] h-[85vh] shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col transform scale-95 transition-transform duration-300">
                <div style="border-bottom: 1px dashed #e6d5b8;" class="flex justify-between items-center mb-6 pb-4">
                    <h2 style="color: #ba3f42;" class="text-2xl font-black tracking-widest">故事大厅 (Story Hub)</h2>
                    <div class="flex gap-4 items-center">
                        <button id="sm-hub-btn-load" class="sme-btn-warning px-4 py-2 font-bold text-sm rounded-full shadow-md">📂 读取存档</button>
                        <button id="sm-hub-btn-create" class="sme-btn-success px-4 py-2 font-bold text-sm rounded-full shadow-md">+ 创建新剧本</button>
                        <button id="sm-ss-close" style="color: #ba3f42;" class="font-bold text-xl px-2 ml-2 cursor-pointer hover:opacity-50 outline-none">✖</button>
                    </div>
                </div>
                <div class="sme-grid-responsive flex-1 overflow-y-auto pr-2 light-scrollbar grid grid-cols-1 gap-6 content-start">
                    ${projects.length === 0 ? '<div class="col-span-full text-center py-16 font-bold" style="color: #a89578;">暂无剧本，点击右上角创建。</div>' : projects.map(p => `
                        <div style="background-color: white; border: 2px solid #e6d5b8;" class="p-5 rounded-xl flex flex-col h-40 shadow-sm transition-colors z-10 relative hover:border-[#4fa0d8]">
                            <div class="flex justify-between items-start mb-2"><h4 style="color: #4a4036;" class="font-black text-lg truncate flex-1">${p.name}</h4></div>
                            <p style="color: #7a6b5d;" class="text-xs flex-1 overflow-hidden">${p.chapters?.[0]?.outline?.substring(0, 60) || '无摘要'}</p>
                            <div style="border-top: 1px dashed #e6d5b8;" class="flex gap-2 mt-4 pt-4">
                                <button class="sm-btn-play flex-1 py-1.5 sme-btn-warning font-bold text-xs rounded-lg shadow-sm" data-id="${p.id}">▶ 播放</button>
                                <button class="sm-btn-edit flex-1 py-1.5 sme-btn-primary font-bold text-xs rounded-lg shadow-sm" data-id="${p.id}">📝 编辑/打包</button>
                                <button class="sm-btn-del px-3 py-1.5 sme-btn-danger font-bold text-xs rounded-lg shadow-sm" data-id="${p.id}" title="删除">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        document.body.appendChild(modal); requestAnimationFrame(() => { modal.classList.remove('opacity-0'); modal.firstElementChild.classList.remove('scale-95'); });
        
        document.getElementById('sm-ss-close').onclick = () => { modal.classList.add('opacity-0'); setTimeout(() => modal.remove(), 300); };
        
        // ✨ 大厅直接读档
        document.getElementById('sm-hub-btn-load').onclick = () => {
            openStorySaveLoadUI('load');
        };

        document.getElementById('sm-hub-btn-create').onclick = () => {
            const newId = `${getActiveMirrorId()}_proj_${Date.now()}`;
            openEditorModal({ id: newId, name: "未命名剧本", chapters: [{ id: `ch_${Date.now()}`, title: '序章', outline: '', lines: [], x: 0, y: 0, isEnding: false }], charConfigs: {}, bgConfigs: {} });
        };
        modal.querySelectorAll('.sm-btn-play').forEach(btn => btn.onclick = async (e) => { const proj = await ScriptDB.get(e.target.getAttribute('data-id')); if (proj) startStoryPlayer(proj); });
        modal.querySelectorAll('.sm-btn-edit').forEach(btn => btn.onclick = async (e) => { const proj = await ScriptDB.get(e.target.getAttribute('data-id')); if (proj) openEditorModal(proj); });
        modal.querySelectorAll('.sm-btn-del').forEach(btn => btn.onclick = async (e) => { if (confirm("确定要永久删除这个剧本吗？")) { await ScriptDB.delete(e.target.getAttribute('data-id')); window.$GWC.showToast("已删除", "success"); openStorySelectorModal(); } });
    };

    // ==========================================
    // 5. 剧本编辑器 (IDE) - 蓝图逻辑全面重构
    // ==========================================
    const openEditorModal = async (project) => {
        const bgs = await getMainBgs(); const bgms = await getBgms(); const sprites = window.__allSpriteSets || []; 
        
        // ⚡修复内存爆炸：在内存中建立资源引用映射，禁止向 DOM 注入海量 Base64 字符串
        window.__smePreviewMap = {};
        bgs.forEach(b => {
            window.__smePreviewMap['bg_' + b.id] = b.dataUrl;
            window.__smePreviewMap['cg_' + b.id] = b.dataUrl;
        });
        sprites.forEach(set => {
            set.sprites.forEach(sp => {
                window.__smePreviewMap['sprite_' + set.id + ':::' + sp.name] = sp.dataUrl;
            });
        });
        if (project.customScenes) {
            project.customScenes.forEach(sc => {
                const bgData = bgs.find(b => b.id === sc.bgId);
                if (bgData) window.__smePreviewMap['bg_' + sc.id] = bgData.dataUrl;
            });
        }

        let activeChapterIdx = 0;
        let activeView = 'text'; 
        let flowTransform = { x: 0, y: 0, scale: 1 };
        
        project.chapters.forEach((ch, idx) => {
            if (ch.x === undefined) ch.x = (idx % 5) * 300;
            if (ch.y === undefined) ch.y = Math.floor(idx / 5) * 200;
            if (ch.isEnding === undefined) ch.isEnding = false;
        });

        if (!project.charConfigs) project.charConfigs = {}; if (!project.bgConfigs) project.bgConfigs = {};
        
        let modal = document.getElementById('sm-editor-modal'); if (modal) modal.remove();
        modal = document.createElement('div'); modal.id = 'sm-editor-modal'; 
        modal.className = 'fixed inset-0 flex flex-col font-sans pointer-events-auto transition-opacity duration-300 opacity-0';
        modal.style.zIndex = '90000';
        modal.style.backgroundColor = '#fdfaf5';
        document.body.appendChild(modal);

        let activeEditorAudio = null; 

        const safeBind = (id, event, handler) => {
            const el = document.getElementById(id);
            if (el) el[event] = handler;
        };

        const openLLMConfigModal = () => {
            const llmModal = document.createElement('div');
            llmModal.className = 'fixed inset-0 flex justify-center items-center pointer-events-auto';
            llmModal.style.zIndex = '95000';
            llmModal.style.backgroundColor = 'rgba(0,0,0,0.6)';
            llmModal.style.backdropFilter = 'blur(4px)';
            const conf = getEditorLLMConfig();
            
            llmModal.innerHTML = `
                <div style="background: white; border: 2px solid #4fa0d8;" class="p-6 rounded-xl w-[500px] max-w-[95vw] shadow-2xl flex flex-col gap-4">
                    <h3 style="color: #4fa0d8;" class="font-black text-xl flex items-center gap-2">⚙️ 独立大模型配置</h3>
                    <p style="color: #6b7280;" class="text-xs">专供剧本编辑器提取生成使用，与平时聊天通道隔离。</p>
                    <div>
                        <label style="color: #4a4036;" class="block text-xs font-bold mb-1">接口地址 (Base URL)</label>
                        <input type="text" id="llm-baseurl" value="${conf.baseUrl || ''}" style="border: 1px solid #d1d5db; color: #374151;" class="w-full rounded px-3 py-2 text-sm outline-none" placeholder="例如: https://api.openai.com/v1" />
                    </div>
                    <div>
                        <label style="color: #4a4036;" class="block text-xs font-bold mb-1">API Key</label>
                        <input type="password" id="llm-apikey" value="${conf.apiKey || ''}" style="border: 1px solid #d1d5db; color: #374151;" class="w-full rounded px-3 py-2 text-sm outline-none" placeholder="sk-..." />
                    </div>
                    <div>
                        <label style="color: #4a4036;" class="block text-xs font-bold mb-1">模型名称 (Model)</label>
                        <input type="text" id="llm-model" value="${conf.model || ''}" style="border: 1px solid #d1d5db; color: #374151;" class="w-full rounded px-3 py-2 text-sm outline-none" placeholder="如: gpt-4o" />
                    </div>
                    <div style="border-top: 1px solid #e5e7eb;" class="flex justify-end gap-3 mt-4 pt-4">
                        <button id="llm-btn-close" class="px-5 py-2 sme-btn-danger rounded-lg font-bold">取消</button>
                        <button id="llm-btn-save" class="px-5 py-2 sme-btn-primary rounded-lg font-bold shadow-md">💾 保存</button>
                    </div>
                </div>
            `;
            document.body.appendChild(llmModal);
            llmModal.querySelector('#llm-btn-close').onclick = () => llmModal.remove();
            llmModal.querySelector('#llm-btn-save').onclick = () => {
                saveEditorLLMConfig({ baseUrl: document.getElementById('llm-baseurl').value.trim(), apiKey: document.getElementById('llm-apikey').value.trim(), model: document.getElementById('llm-model').value.trim() });
                window.$GWC.showToast("独立大模型配置已保存！", "success"); llmModal.remove();
            };
        };

        const saveProjectState = () => { 
            if (activeView !== 'text') return; 
            
            const titleEl = document.getElementById('sme-chap-title');
            if(titleEl) project.chapters[activeChapterIdx].title = titleEl.value.trim(); 

            // ✨ V4.35 修复：重命名项目
            const projNameEl = document.getElementById('sme-proj-name');
            if(projNameEl) project.name = projNameEl.value.trim() || '未命名剧本';
            
           const animBgEl = document.getElementById('sme-chap-anim-bg');
            if (animBgEl) project.chapters[activeChapterIdx].chapAnimBg = animBgEl.value;
            const titleSizeEl = document.getElementById('sme-chap-title-size');
            if (titleSizeEl) project.chapters[activeChapterIdx].chapTitleSize = titleSizeEl.value;
            const chapBgmEl = document.getElementById('sme-chap-bgm');
            if (chapBgmEl) project.chapters[activeChapterIdx].chapBgm = chapBgmEl.value;

            const isEndingEl = document.getElementById('sme-chap-is-ending');
            if (isEndingEl) {
                project.chapters[activeChapterIdx].isEnding = isEndingEl.checked;
                if (isEndingEl.checked) {
                    const eBg = document.getElementById('sme-ending-bg');
                    const eText = document.getElementById('sme-ending-text');
                    if (eBg) project.chapters[activeChapterIdx].endingBg = eBg.value;
                    if (eText) project.chapters[activeChapterIdx].endingText = eText.value;
                    return; 
                }
            }

            const modeEl = document.getElementById('sme-gen-mode');
            if(modeEl) project.chapters[activeChapterIdx].genMode = modeEl.value; 
            
            const outlineEl = document.getElementById('sme-chap-outline');
            if (outlineEl) project.chapters[activeChapterIdx].outline = outlineEl.value.trim();
            const fanficEl = document.getElementById('sme-chap-fanfic-prompt');
            if (fanficEl) project.chapters[activeChapterIdx].fanficPrompt = fanficEl.value.trim();

            const newLines = [];
            document.querySelectorAll('.sme-line-item').forEach(el => {
                const type = el.getAttribute('data-ltype') || 'dialogue';
                const origIdx = el.getAttribute('data-lidx');
                const oldLine = project.chapters[activeChapterIdx].lines[origIdx] || {};

            if (type === 'dialogue') {
                    const speaker = el.querySelector(`.sme-line-speaker`)?.value?.trim() || '';
                    // ✨ 自动收录在台词框手动输入的新角色（包含旁白）
                            if (speaker && !project.charConfigs[speaker]) {
                                project.charConfigs[speaker] = {};
                            }
                    const emotion = el.querySelector(`.sme-line-emotion`)?.value?.trim() || '';
                    const cg = el.querySelector(`.sme-line-cg`)?.value || '';
                    const bg = el.querySelector(`.sme-line-bg`)?.value || 'inherit';
                    const bgm = el.querySelector(`.sme-line-bgm`)?.value || 'inherit';
                    const forceSprite = el.querySelector('.sme-line-sprite')?.value || '';
                    const text = el.querySelector(`.sme-line-text`)?.value?.trim() || '';
                    newLines.push({ type: 'dialogue', speaker, emotion, cg, bg: bg === 'inherit' ? null : bg, bgm: bgm === 'inherit' ? null : bgm, forceSprite, text, audioBlob: oldLine.audioBlob });
                } else if (type === 'label') {
                    const labelId = el.querySelector('.sme-label-id')?.value || '';
                    const labelName = el.querySelector('.sme-label-name')?.value?.trim() || '';
                    newLines.push({ type: 'label', labelId, labelName });
                } else if (type === 'jump') {
                    const target = el.querySelector('.sme-jump-target')?.value || 'CONTINUE';
                    newLines.push({ type: 'jump', target });
                } else if (type === 'choice') {
                    const choices = [];
                    el.querySelectorAll('.sme-choice-opt-row').forEach(row => {
                        choices.push({ 
                            text: row.querySelector('.sme-choice-opt-text')?.value?.trim() || '', 
                            target: row.querySelector('.sme-choice-opt-target')?.value || 'CONTINUE' 
                        });
                    });
                    newLines.push({ type: 'choice', choices });
                }
            });
          project.chapters[activeChapterIdx].lines = newLines;

            if (!project.customScenes) project.customScenes = [];
            document.querySelectorAll('.sme-custom-scene-row').forEach(el => {
                const scIdx = el.getAttribute('data-scidx');
                if (project.customScenes[scIdx]) {
                    project.customScenes[scIdx].name = el.querySelector('.sme-custom-scene-name').value.trim();
                    project.customScenes[scIdx].bgId = el.querySelector('.sme-custom-scene-bg').value;
                }
            });

            if (!project.bgConfigs) project.bgConfigs = {};
            document.querySelectorAll('.sme-bg-select').forEach(el => {
                if(el) project.bgConfigs[el.getAttribute('data-bg')] = el.value;
            });

          if (!project.charConfigs) project.charConfigs = {};
            document.querySelectorAll('.sme-char-sprite').forEach(el => {
                if(!el) return;
                const spk = el.getAttribute('data-speaker');
                if (!project.charConfigs[spk]) project.charConfigs[spk] = {};
                project.charConfigs[spk].spriteSetId = el.value;
            });
            document.querySelectorAll('.sme-char-version').forEach(el => {
                if(!el) return;
                const spk = el.getAttribute('data-speaker');
                if (!project.charConfigs[spk]) project.charConfigs[spk] = {};
                project.charConfigs[spk].modelVersion = el.value;
            });
            // ✨ 存储新增的模型路径配置
            document.querySelectorAll('.sme-char-gpt').forEach(el => {
                if(!el) return;
                const spk = el.getAttribute('data-speaker');
                if (!project.charConfigs[spk]) project.charConfigs[spk] = {};
                project.charConfigs[spk].gptModel = el.value.trim();
            });
            document.querySelectorAll('.sme-char-sovits').forEach(el => {
                if(!el) return;
                const spk = el.getAttribute('data-speaker');
                if (!project.charConfigs[spk]) project.charConfigs[spk] = {};
                project.charConfigs[spk].sovitsModel = el.value.trim();
            });
            document.querySelectorAll('.sme-char-audio').forEach(el => {
                if(!el) return;
                const spk = el.getAttribute('data-speaker');
                if (!project.charConfigs[spk]) project.charConfigs[spk] = {};
                project.charConfigs[spk].refAudio = el.value.trim();
            });
            document.querySelectorAll('.sme-char-text').forEach(el => {
                if(!el) return;
                const spk = el.getAttribute('data-speaker');
                if (!project.charConfigs[spk]) project.charConfigs[spk] = {};
                project.charConfigs[spk].refText = el.value.trim();
            });
        };

        let flowListeners = {};
        const cleanupFlowListeners = () => {
            const container = document.getElementById('sme-flow-container');
            if (container) { container.onmousedown = null; container.onwheel = null; }
            if (flowListeners.mousemove) window.removeEventListener('mousemove', flowListeners.mousemove);
            if (flowListeners.mouseup) window.removeEventListener('mouseup', flowListeners.mouseup);
            flowListeners = {};
        };

       const resolveTargetCh = (target, currentIdx) => {
            if (target === 'END') return null;
            if (!target || target === 'CONTINUE') {
                return null; /* 强制人工连线：切断编辑器内视觉上的自动排队连线 */
            }
            if (target.startsWith('ch_')) return project.chapters.find(c => c.id === target);
            for (const c of project.chapters) {
                if (c.lines && c.lines.some(l => l.type === 'label' && l.labelId === target)) return c;
            }
            return null;
        };

        const renderEditor = (resetScroll = false) => {
            let savedScrollTop = 0;
            let savedResScrollTop = 0;
            
            if (activeView === 'text' && !resetScroll) {
                const sc = document.getElementById('sme-lines-container');
                if (sc) savedScrollTop = sc.scrollTop;
                const resSc = document.getElementById('sme-resource-container');
                if (resSc) savedResScrollTop = resSc.scrollTop;
            }
            
            cleanupFlowListeners();

          const activeChapter = project.chapters[activeChapterIdx];
            
            let allLines = []; project.chapters.forEach(ch => allLines = allLines.concat(ch.lines || []));
           const uniqueSpeakers = [...new Set(allLines.map(l => l.speaker))].filter(s => s);
                    // ✨ 自动将剧本中出现的新角色同步至全局角色库（现已解除对“旁白”的封印，使其享有完整角色卡片）
                    if (!project.charConfigs) project.charConfigs = {};
                    if (!project.charConfigs['旁白']) project.charConfigs['旁白'] = { gptModel: '', sovitsModel: '' };
                    uniqueSpeakers.forEach(spk => { if (!project.charConfigs[spk]) project.charConfigs[spk] = {}; });
                    const allSpeakers = Object.keys(project.charConfigs);

            // 修复：严格过滤，只有纯文本（非 sc_ 场景ID，非 bg_ 真实背景ID）才会被列入直接环境映射
            const uniqueBgs = [...new Set(allLines.map(l => l.bg))].filter(b => b && b !== 'inherit' && !b.startsWith('sc_') && !bgs.some(bgItem => bgItem.id === b));

           const currentLabels = (activeChapter.lines || []).filter(l => l.type === 'label').map(l => ({id: l.labelId, name: l.labelName || '未命名节点'}));
            const chapterOptions = project.chapters.map(c => `<option value="${c.id}">📖 跨章跳转: ${c.title}</option>`).join('');
            const labelOptions = currentLabels.map(lbl => `<option value="${lbl.id}">📌 本章节点: ${lbl.name}</option>`).join('');
            const bgmOptions = bgms.map(b => `<option value="${b.id}">🎵 ${b.id}</option>`).join('');

            const headerHtml = `
                <div style="background-color: #efe6d5; border-bottom: 1px solid #d9c5b2;" class="h-16 flex items-center justify-between px-6 shrink-0 z-20">
                    <div class="flex items-center gap-4">
                        <button id="sme-btn-back" style="color: #ba3f42;" class="font-bold px-3 py-1 rounded hover:opacity-50 transition-opacity cursor-pointer">返回大厅</button>
                        <input type="text" id="sme-proj-name" value="${project.name}" style="color: #4a4036; background: transparent; border-bottom: 1px dashed #d9c5b2;" class="text-lg font-bold outline-none w-48 text-center" placeholder="剧本名称" />
                    </div>
                    
                    <div style="background-color: rgba(217,197,178,0.4); display: flex;" class="sme-view-toggle items-center p-1 rounded-lg shadow-inner absolute left-1/2 -translate-x-1/2">
                        <button id="sme-view-text-btn" class="px-5 py-1.5 rounded-md text-sm font-bold transition-all cursor-pointer ${activeView === 'text' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}" style="color: ${activeView === 'text' ? '#ba3f42' : '#7a6b5d'}">📝 剧本编排</button>
                        <button id="sme-view-flow-btn" class="px-5 py-1.5 rounded-md text-sm font-bold transition-all cursor-pointer ${activeView === 'flowchart' ? 'shadow-sm' : 'hover:bg-white/50'}" style="background-color: ${activeView === 'flowchart' ? '#1e293b' : 'transparent'}; color: ${activeView === 'flowchart' ? '#34d399' : '#7a6b5d'}">🗺️ 剧情路线图</button>
                    </div>

                    <div class="flex items-center gap-2">
                        <label class="flex items-center gap-1 text-xs font-bold text-amber-700 cursor-pointer bg-amber-50 px-3 py-1.5 rounded-full border border-amber-300 hover:bg-amber-100 transition-colors">
                            <input type="checkbox" id="sme-manual-mode" ${project.manualMode ? 'checked' : ''}> ✍️ 纯手工模式
                        </label>
                        <button id="sme-btn-export" class="sme-btn-primary px-4 py-2 text-sm rounded-full shadow-md" style="background-color: #9333ea !important;" title="将工程包含素材整体打包导出">📦 打包导出</button>
                        <button id="sme-btn-import" class="sme-btn-primary px-4 py-2 text-sm rounded-full shadow-md" style="background-color: #059669 !important;" title="解压并覆盖导入 ZIP 工程包">📥 覆盖导入</button>
                        <input type="file" id="sme-file-import" accept=".zip" class="hidden" />
                        <button id="sme-btn-llm-config" class="sme-btn-primary px-4 py-2 text-sm rounded-full shadow-md">⚙️ 大模型</button>
                        <button id="sme-btn-save" class="sme-btn-success px-5 py-2 text-sm rounded-full shadow-md">💾 保存工程</button>
                    </div>
                </div>
            `;

            if (activeView === 'flowchart') {
                modal.innerHTML = `
                    ${headerHtml}
                    <div class="relative flex-1 overflow-hidden select-none" id="sme-flow-container" style="background-color: #0f172a; ${project.flowBg ? `background-image: url(${project.flowBg}); background-size: cover; background-position: center;` : `background-image: radial-gradient(#334155 1px, transparent 1px); background-size: 20px 20px;`}">
                        <div id="sme-flow-canvas" class="absolute origin-top-left" style="transform: translate(${flowTransform.x}px, ${flowTransform.y}px) scale(${flowTransform.scale}); width: 10000px; height: 10000px; left: -5000px; top: -5000px;">
                            <svg id="sme-flow-svg" class="absolute inset-0 w-full h-full z-[5]" style="overflow: visible;"></svg>
                            <!-- 临时拖拽线 -->
                            <svg class="absolute inset-0 w-full h-full pointer-events-none z-[6]">
                                <path id="sme-temp-line" d="" stroke="#f59e0b" stroke-width="4" fill="none" stroke-dasharray="8,8" opacity="0.8"/>
                            </svg>

                            ${project.chapters.map((ch, idx) => {
                                const isEnding = ch.isEnding;
                                const choiceBlock = ch.lines && ch.lines.find(l => l.type === 'choice');
                                let portsHtml = '';
                                if (!isEnding) {
                                    if (choiceBlock && choiceBlock.choices && choiceBlock.choices.length > 0) {
                                        portsHtml = choiceBlock.choices.map((opt, oIdx) => `
                                            <div class="sme-port-out choice group" data-id="${ch.id}" data-type="choice" data-idx="${oIdx}" style="top: ${65 + oIdx * 25}px;">
                                                <div class="absolute left-full ml-3 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs font-bold whitespace-nowrap px-3 py-1.5 rounded shadow-xl border border-gray-600 pointer-events-none" style="z-index: 2147483647;">
                                                    👉 ${opt.text || '未命名选项'}
                                                </div>
                                            </div>
                                        `).join('');
                                    } else {
                                        portsHtml = `<div class="sme-port-out default group" data-id="${ch.id}" data-type="default">
                                            <div class="absolute left-full ml-3 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs font-bold whitespace-nowrap px-3 py-1.5 rounded shadow-xl border border-gray-600 pointer-events-none" style="z-index: 2147483647;">
                                                👉 默认/跳转流程
                                            </div>
                                        </div>`;
                                    }
                                }

                                const cardTheme = isEnding ? 'background-color: rgba(46,8,19,0.95) !important; border-color: #be123c !important;' : '';

                               return `
                                <div class="sme-node-card absolute p-4 flex flex-col z-10" data-id="${ch.id}" style="width: 220px; left: ${5000 + (ch.x || 0)}px; top: ${5000 + (ch.y || 0)}px; min-height: ${choiceBlock ? 60 + choiceBlock.choices.length * 25 : 90}px; ${cardTheme}">
                                    <div style="color: ${isEnding ? '#f43f5e' : '#94a3b8'};" class="text-[10px] font-bold mb-2 tracking-widest flex justify-between pointer-events-none">
                                        <span>${isEnding ? '🏁 ENDING' : 'CHAPTER ' + (idx + 1)}</span>
                                        ${idx === 0 && !isEnding ? '<span style="color: #34d399;">🏁 START</span>' : ''}
                                    </div>
                                    <input type="text" class="sme-node-input" data-id="${ch.id}" value="${ch.title || '未命名章节'}" placeholder="章节名称" />
                                    
                                    <div class="flex gap-2 mt-auto">
                                        <button class="sme-flow-edit flex-1 py-1.5 sme-btn-primary text-xs font-bold rounded shadow" data-id="${ch.id}">📝 编辑</button>
                                        <button class="sme-flow-del w-8 flex items-center justify-center sme-btn-danger rounded shadow" data-id="${ch.id}">✖</button>
                                    </div>

                                    <div class="sme-port-in" data-id="${ch.id}" title="目标连接点"></div>
                                    ${portsHtml}
                                </div>
                            `}).join('')}
                        </div>
                        
                        <div class="absolute bottom-6 right-6 flex gap-3 pointer-events-auto z-50">
                            <button id="sme-flow-bg-btn" onclick="document.getElementById('sme-flow-bg-upload').click()" class="w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer" title="导入或更换流程图背景图">🖼️</button>
                            <button id="sme-flow-bg-clear" class="w-12 h-12 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer" title="清除背景图">🗑️</button>
                            <input type="file" id="sme-flow-bg-upload" accept="image/*" class="hidden" />
                            <button id="sme-flow-reset" class="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center shadow-lg border border-slate-600 transition-colors cursor-pointer" title="适配内容">🎯</button>
                            <button id="sme-flow-add" class="px-5 h-12 sme-btn-primary font-bold rounded-full shadow-lg flex items-center gap-2">+ 新支线</button>
                        </div>
                    </div>
                `;

                safeBind('sme-proj-name', 'onchange', (e) => { project.name = e.target.value.trim() || '未命名剧本'; ScriptDB.save(project); });
                safeBind('sme-btn-back', 'onclick', () => { if(activeView==='text') saveProjectState(); ScriptDB.save(project); modal.classList.add('opacity-0'); setTimeout(() => { modal.remove(); openStorySelectorModal(); }, 300); });
                safeBind('sme-btn-save', 'onclick', async (e) => { 
                    const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = '⏳ 正在写入...';
                    await ScriptDB.save(project); window.$GWC.showToast("已成功保存剧本拓扑！", "success"); 
                    btn.innerHTML = '✅ 保存成功'; btn.style.backgroundColor = '#10b981';
                    setTimeout(() => { btn.innerHTML = '💾 保存工程'; btn.style.backgroundColor = ''; btn.disabled = false; }, 1500);
                });
                safeBind('sme-btn-llm-config', 'onclick', openLLMConfigModal);
                safeBind('sme-view-text-btn', 'onclick', () => { activeView = 'text'; renderEditor(); });

                bindImportExportEvents();

                const bgInput = document.getElementById('sme-flow-bg-upload');
                if (bgInput) {
                    bgInput.onchange = (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            project.flowBg = ev.target.result;
                            ScriptDB.save(project);
                            renderEditor();
                        };
                        reader.readAsDataURL(file);
                        bgInput.value = '';
                    };
                }
                
                safeBind('sme-flow-bg-clear', 'onclick', () => {
                    if (project.flowBg) { project.flowBg = null; ScriptDB.save(project); renderEditor(); }
                });

                modal.querySelectorAll('.sme-node-input').forEach(input => {
                    input.onchange = (e) => {
                        const targetId = e.target.getAttribute('data-id');
                        const ch = project.chapters.find(c => c.id === targetId);
                        if (ch) { ch.title = e.target.value.trim(); ScriptDB.save(project); }
                    };
                });

                const container = document.getElementById('sme-flow-container');
                const canvas = document.getElementById('sme-flow-canvas');
                const svg = document.getElementById('sme-flow-svg');
                const tempLine = document.getElementById('sme-temp-line');
                
                const updateLines = () => {
                    let paths = `<defs><marker id="arrowhead_gwc_dlc_434" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f59e0b"/></marker><marker id="arrowhead_def_gwc_dlc_434" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#ef4444"/></marker></defs>`;
                    project.chapters.forEach((ch, idx) => {
                        if (ch.isEnding) return; 

                        if (!ch.lines || ch.lines.length === 0) {
                            const targetCh = resolveTargetCh('CONTINUE', idx);
                            if (targetCh) {
                                const x1 = 5000 + (ch.x || 0) + 227; 
                                const y1 = 5000 + (ch.y || 0) + 67;
                                const x2 = 5000 + (targetCh.x || 0) - 7; 
                                const y2 = 5000 + (targetCh.y || 0) + 47;
                                const cx1 = x1 + Math.max(50, Math.abs(x2 - x1) * 0.4);
                                const cx2 = x2 - Math.max(50, Math.abs(x2 - x1) * 0.4);
                                paths += `<path d="M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}" stroke="#ef4444" stroke-width="3" fill="none" class="sme-conn-line" data-source="${ch.id}" data-type="default" marker-end="url(#arrowhead_def_gwc_dlc_434)"/>`;
                                paths += `<path d="M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}" stroke="transparent" stroke-width="12" fill="none" class="sme-conn-line" data-source="${ch.id}" data-type="default"/>`;
                            }
                            return;
                        }

                        const choiceBlock = ch.lines.find(l => l.type === 'choice');
                        if (choiceBlock && choiceBlock.choices) {
                            choiceBlock.choices.forEach((opt, oIdx) => {
                                const targetCh = resolveTargetCh(opt.target, idx);
                                if (targetCh) {
                                    const x1 = 5000 + (ch.x || 0) + 227; 
                                    const y1 = 5000 + (ch.y || 0) + 65 + oIdx * 25 + 7; 
                                    const x2 = 5000 + (targetCh.x || 0) - 7; 
                                    const y2 = 5000 + (targetCh.y || 0) + 47; 
                                    const cx1 = x1 + Math.max(50, Math.abs(x2 - x1) * 0.4);
                                    const cx2 = x2 - Math.max(50, Math.abs(x2 - x1) * 0.4);
                                    paths += `<path d="M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}" stroke="#f59e0b" stroke-width="3" fill="none" class="sme-conn-line" data-source="${ch.id}" data-type="choice" data-idx="${oIdx}" marker-end="url(#arrowhead_gwc_dlc_434)"/>`;
                                    paths += `<path d="M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}" stroke="transparent" stroke-width="12" fill="none" class="sme-conn-line" data-source="${ch.id}" data-type="choice" data-idx="${oIdx}"/>`;
                                }
                            });
                        } else {
                            const jumpBlock = ch.lines.find(l => l.type === 'jump');
                            const targetVal = jumpBlock ? jumpBlock.target : 'CONTINUE';
                            const targetCh = resolveTargetCh(targetVal, idx);
                            if (targetCh) {
                                const x1 = 5000 + (ch.x || 0) + 227; 
                                const y1 = 5000 + (ch.y || 0) + 67;
                                const x2 = 5000 + (targetCh.x || 0) - 7; 
                                const y2 = 5000 + (targetCh.y || 0) + 47;
                                const cx1 = x1 + Math.max(50, Math.abs(x2 - x1) * 0.4);
                                const cx2 = x2 - Math.max(50, Math.abs(x2 - x1) * 0.4);
                                paths += `<path d="M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}" stroke="#ef4444" stroke-width="3" fill="none" class="sme-conn-line" data-source="${ch.id}" data-type="default" marker-end="url(#arrowhead_def_gwc_dlc_434)"/>`;
                                paths += `<path d="M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}" stroke="transparent" stroke-width="12" fill="none" class="sme-conn-line" data-source="${ch.id}" data-type="default"/>`;
                            }
                        }
                    });
                    svg.innerHTML = paths;
                };
                updateLines();

                svg.onclick = (e) => {
                    if (e.target.classList.contains('sme-conn-line')) {
                        if(confirm("✂️ 确定要切断并取消这条剧情连线吗？")) {
                            const sourceId = e.target.getAttribute('data-source');
                            const type = e.target.getAttribute('data-type');
                            const sourceCh = project.chapters.find(c => c.id === sourceId);
                            if (sourceCh) {
                                if (type === 'choice') {
                                    const idx = parseInt(e.target.getAttribute('data-idx'));
                                    const choiceBlock = sourceCh.lines.find(l => l.type === 'choice');
                                    if (choiceBlock && choiceBlock.choices[idx]) choiceBlock.choices[idx].target = 'END'; 
                                } else {
                                    let jumpBlock = sourceCh.lines.find(l => l.type === 'jump');
                                    if (!jumpBlock) {
                                        sourceCh.lines.push({ type: 'jump', target: 'END' });
                                    } else {
                                        jumpBlock.target = 'END';
                                    }
                                }
                                ScriptDB.save(project); updateLines();
                            }
                        }
                    }
                };

                let isDragging = false; let dragNodeId = null; let startNodeX, startNodeY;
                let isPanning = false; let startX, startY;
                let isConnecting = false; let startPortNodeId = null; let startPortType = null; let startPortIdx = null;

                container.onmousedown = (e) => {
                    if (e.target.tagName === 'INPUT' || e.target.closest('button') || e.target.classList.contains('sme-conn-line')) return; 
                    
                    const portOut = e.target.closest('.sme-port-out');
                    if (portOut) {
                        isConnecting = true;
                        startPortNodeId = portOut.getAttribute('data-id');
                        startPortType = portOut.getAttribute('data-type');
                        startPortIdx = portOut.getAttribute('data-idx');
                        tempLine.style.display = 'block';
                        return; 
                    }

                    const node = e.target.closest('.sme-node-card');
                    if (node) {
                        isDragging = true; dragNodeId = node.getAttribute('data-id');
                        const ch = project.chapters.find(c => c.id === dragNodeId);
                        startNodeX = ch.x || 0; startNodeY = ch.y || 0;
                        startX = e.clientX; startY = e.clientY;
                        document.querySelectorAll('.sme-node-card').forEach(n => n.classList.remove('active'));
                        node.classList.add('active');
                    } else {
                        isPanning = true;
                        startX = e.clientX - flowTransform.x; startY = e.clientY - flowTransform.y;
                    }
                };

                const handleMouseMove = (e) => {
                    if (isDragging && dragNodeId) {
                        const dx = (e.clientX - startX) / flowTransform.scale; 
                        const dy = (e.clientY - startY) / flowTransform.scale;
                        const ch = project.chapters.find(c => c.id === dragNodeId);
                        if (ch) {
                            ch.x = startNodeX + dx; ch.y = startNodeY + dy;
                            const el = document.querySelector(`.sme-node-card[data-id="${ch.id}"]`);
                            if (el) { el.style.left = (5000 + ch.x) + 'px'; el.style.top = (5000 + ch.y) + 'px'; }
                            updateLines();
                        }
                    } else if (isPanning) {
                        flowTransform.x = e.clientX - startX; flowTransform.y = e.clientY - startY;
                        canvas.style.transform = `translate(${flowTransform.x}px, ${flowTransform.y}px) scale(${flowTransform.scale})`;
                    } else if (isConnecting && startPortNodeId) {
                        const rect = canvas.getBoundingClientRect();
                        const mouseX = (e.clientX - rect.left) / flowTransform.scale;
                        const mouseY = (e.clientY - rect.top) / flowTransform.scale;
                        
                        const ch = project.chapters.find(c => c.id === startPortNodeId);
                        if (ch) {
                            const startX = 5000 + (ch.x || 0) + 227; 
                            const startY = 5000 + (ch.y || 0) + (startPortType === 'choice' ? 65 + parseInt(startPortIdx) * 25 + 7 : 67);
                            const cx1 = startX + Math.max(50, Math.abs(mouseX - startX) * 0.4); 
                            const cx2 = mouseX - Math.max(50, Math.abs(mouseX - startX) * 0.4);
                            tempLine.setAttribute('d', `M ${startX} ${startY} C ${cx1} ${startY}, ${cx2} ${mouseY}, ${mouseX} ${mouseY}`);
                        }
                    }
                };

                const handleMouseUp = (e) => {
                    if (isDragging) { ScriptDB.save(project); }
                    
                    if (isConnecting && startPortNodeId) {
                        tempLine.setAttribute('d', ''); 
                        const targetNode = e.target.closest('.sme-node-card');
                        let targetNodeId = targetNode ? targetNode.getAttribute('data-id') : null;

                        if (targetNodeId && targetNodeId !== startPortNodeId) {
                            const sourceCh = project.chapters.find(c => c.id === startPortNodeId);
                            if (startPortType === 'choice') {
                                const choiceBlock = sourceCh.lines.find(l => l.type === 'choice');
                                if (choiceBlock && choiceBlock.choices[startPortIdx]) choiceBlock.choices[startPortIdx].target = targetNodeId;
                            } else {
                                let jumpBlock = sourceCh.lines.find(l => l.type === 'jump');
                                if (!jumpBlock) { sourceCh.lines.push({ type: 'jump', target: targetNodeId }); } 
                                else { jumpBlock.target = targetNodeId; }
                            }
                            ScriptDB.save(project); renderEditor(); 
                        }
                    }
                    isDragging = false; dragNodeId = null; isPanning = false; isConnecting = false; startPortNodeId = null;
                };

                flowListeners.mousemove = handleMouseMove;
                flowListeners.mouseup = handleMouseUp;
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);

                container.onwheel = (e) => {
                    e.preventDefault();
                    const rect = container.getBoundingClientRect();
                    // 鼠标在容器内的位置
                    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
                    // 鼠标在画布坐标系中的位置
                    const bx = (mx - flowTransform.x) / flowTransform.scale;
                    const by = (my - flowTransform.y) / flowTransform.scale;
                    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                    const newScale = Math.min(Math.max(0.15, flowTransform.scale * zoomFactor), 3);
                    // 以鼠标位置为中心缩放
                    flowTransform.x = mx - bx * newScale;
                    flowTransform.y = my - by * newScale;
                    flowTransform.scale = newScale;
                    canvas.style.transform = `translate(${flowTransform.x}px, ${flowTransform.y}px) scale(${flowTransform.scale})`;
                };

                document.querySelectorAll('.sme-flow-edit').forEach(btn => {
                    btn.onclick = () => { activeChapterIdx = project.chapters.findIndex(c => c.id === btn.getAttribute('data-id')); activeView = 'text'; renderEditor(true); };
                });
                document.querySelectorAll('.sme-flow-del').forEach(btn => {
                    btn.onclick = () => {
                        if(project.chapters.length <= 1) return window.$GWC.showToast("至少保留一个章节", "error");
                        if(confirm("删除该章节将丢失内部所有剧情，是否继续？")) {
                            project.chapters = project.chapters.filter(c => c.id !== btn.getAttribute('data-id'));
                            activeChapterIdx = 0; ScriptDB.save(project); renderEditor();
                        }
                    };
                });
                safeBind('sme-flow-reset', 'onclick', () => {
                    // 适配内容：计算所有章节卡的边界，自动缩放居中
                    const container = document.getElementById('sme-flow-container');
                    if (!container || !project.chapters.length) return;
                    const cw = container.clientWidth, ch = container.clientHeight;
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    project.chapters.forEach(c => {
                        const cx = c.x || 0, cy = c.y || 0;
                        if (cx < minX) minX = cx; if (cy < minY) minY = cy;
                        if (cx + 220 > maxX) maxX = cx + 220; if (cy + 100 > maxY) maxY = cy + 100;
                    });
                    const contentW = maxX - minX + 80, contentH = maxY - minY + 80;
                    const fitScale = Math.min(cw / contentW, ch / contentH, 1.5);
                    const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
                    flowTransform.scale = Math.max(0.2, fitScale);
                    flowTransform.x = cw / 2 - centerX * flowTransform.scale;
                    flowTransform.y = ch / 2 - centerY * flowTransform.scale;
                    canvas.style.transform = `translate(${flowTransform.x}px, ${flowTransform.y}px) scale(${flowTransform.scale})`;
                });
                safeBind('sme-flow-add', 'onclick', () => {
                    const newX = (-flowTransform.x + 300) / flowTransform.scale; const newY = (-flowTransform.y + 200) / flowTransform.scale;
                    project.chapters.push({ id: 'ch_' + Date.now(), title: `新支线章节`, outline: '', lines: [], x: newX, y: newY, isEnding: false });
                    ScriptDB.save(project); renderEditor();
                });
                
            } else {
              // =====================================
                // 📝 渲染：文本剧情编辑模式
                // =====================================
                const isEndingChap = activeChapter.isEnding;
                let chapterContentHtml = '';

                if (isEndingChap) {
                    chapterContentHtml = `
                        <div class="flex items-center gap-2 mt-2">
                            <span class="text-xs font-bold text-slate-500">动画背景图:</span>
                            <select id="sme-chap-anim-bg" class="sme-chap-anim-bg bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none" onmouseover="window.showSmePreview(this, 'bg')" onmouseout="window.hideSmePreview()">
                                <option value="">[纯黑背景]</option>
                                ${bgs.map(b => `<option value="${b.id}" ${activeChapter.chapAnimBg === b.id ? 'selected' : ''}>🖼️ ${b.name}</option>`).join('')}
                            </select>
                            <span class="text-xs font-bold text-slate-500 ml-3">标题字号:</span>
                            <select id="sme-chap-title-size" class="sme-chap-title-size bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none">
                                <option value="2.5rem" ${activeChapter.chapTitleSize === '2.5rem' ? 'selected' : ''}>中等 (2.5rem)</option>
                                <option value="4rem" ${!activeChapter.chapTitleSize || activeChapter.chapTitleSize === '4rem' ? 'selected' : ''}>标准大字 (4rem)</option>
                                <option value="6rem" ${activeChapter.chapTitleSize === '6rem' ? 'selected' : ''}>特大 (6rem)</option>
                            </select>
                            <span class="text-xs font-bold text-slate-500 ml-3">章节音乐:</span>
                            <select id="sme-chap-bgm" class="sme-chap-bgm bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none text-emerald-600 font-bold">
                                <option value="">[不更改/无音乐]</option>
                                <option value="stop" ${activeChapter.chapBgm === 'stop' ? 'selected' : ''}>🔇 强制停止音乐</option>
                                ${bgms.map(b => `<option value="${b.id}" ${activeChapter.chapBgm === b.id ? 'selected' : ''}>🎵 ${b.id}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex-1 flex flex-col gap-4 p-6 bg-slate-900 rounded-xl mt-4 shadow-inner border-2 border-rose-500">
                            <h3 class="text-white text-lg font-black tracking-widest border-b border-slate-700 pb-2 flex justify-between">
                                <span>🎬 结局画面与独立文本设置</span>
                                <span class="text-xs text-rose-400 font-normal">本章将无视后续所有对白，强制触发展示菜单</span>
                            </h3>
                            <div>
                                <label class="block text-slate-400 text-xs font-bold mb-1">结算通关插图 (留空则沿用动画背景)</label>
                                <select id="sme-ending-bg" class="w-full bg-slate-800 text-white border border-slate-600 rounded p-2 outline-none">
                                    <option value="">[ 纯黑无图 ]</option>
                                    ${bgs.map(b => `<option value="${b.id}" ${activeChapter.endingBg === b.id ? 'selected' : ''}>🖼️ ${b.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="flex-1 flex flex-col">
                                <label class="block text-slate-400 text-xs font-bold mb-1">结局文本 (大字居中展示，支持换行)</label>
                                <textarea id="sme-ending-text" class="flex-1 w-full min-h-[250px] bg-slate-800 text-white border border-slate-600 rounded p-6 outline-none resize-none text-center text-xl font-serif leading-loose tracking-widest" placeholder="在此输入结局文字，例如：\\n\\n「True End - 跨越星光的重逢」">${activeChapter.endingText || ''}</textarea>
                            </div>
                        </div>
                    `;
                } else {
                  const mode = activeChapter.genMode || 'outline';
                    let outlineHtml = '';

                    // 修复：将章节进入动画和背景音乐设置部分抽离为全局设定，防止手工模式下被隐藏
                    const globalChapterSettingsHtml = `
                        <div class="flex items-center gap-2 mt-2 mb-3 flex-wrap">
                            <span class="text-xs font-bold text-slate-500">动画背景图:</span>
                            <select id="sme-chap-anim-bg" class="sme-chap-anim-bg bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none" onmouseover="window.showSmePreview(this, 'bg')" onmouseout="window.hideSmePreview()">
                                <option value="">[纯黑背景]</option>
                                ${bgs.map(b => `<option value="${b.id}" ${activeChapter.chapAnimBg === b.id ? 'selected' : ''}>🖼️ ${b.name}</option>`).join('')}
                            </select>
                            <span class="text-xs font-bold text-slate-500 ml-3">标题字号:</span>
                            <select id="sme-chap-title-size" class="sme-chap-title-size bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none">
                                <option value="2.5rem" ${activeChapter.chapTitleSize === '2.5rem' ? 'selected' : ''}>中等 (2.5rem)</option>
                                <option value="4rem" ${!activeChapter.chapTitleSize || activeChapter.chapTitleSize === '4rem' ? 'selected' : ''}>标准大字 (4rem)</option>
                                <option value="6rem" ${activeChapter.chapTitleSize === '6rem' ? 'selected' : ''}>特大 (6rem)</option>
                            </select>
                            <span class="text-xs font-bold text-slate-500 ml-3">章节音乐:</span>
                            <select id="sme-chap-bgm" class="sme-chap-bgm bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none text-emerald-600 font-bold">
                                <option value="">[不更改/无音乐]</option>
                                <option value="stop" ${activeChapter.chapBgm === 'stop' ? 'selected' : ''}>🔇 强制停止音乐</option>
                                ${bgms.map(b => `<option value="${b.id}" ${activeChapter.chapBgm === b.id ? 'selected' : ''}>🎵 ${b.id}</option>`).join('')}
                            </select>
                        </div>
                    `;

                    if (project.manualMode) {
                        outlineHtml = globalChapterSettingsHtml + `<div class="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-bold mb-4 shadow-sm text-center">✍️ 纯手工模式已启用：AI构思功能被隐藏。请点击最下方“+ 添加对白”手工编排剧情。</div>`;
                    } else if (mode === 'fanfic') {
                        outlineHtml = `
                            ${globalChapterSettingsHtml}
                                <span class="text-xs font-bold text-slate-500">动画背景图:</span>
                                <select id="sme-chap-anim-bg" class="sme-chap-anim-bg bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none" onmouseover="window.showSmePreview(this, 'bg')" onmouseout="window.hideSmePreview()">
                                    <option value="">[纯黑背景]</option>
                                    ${bgs.map(b => `<option value="${b.id}" ${activeChapter.chapAnimBg === b.id ? 'selected' : ''}>🖼️ ${b.name}</option>`).join('')}
                                </select>
                                <span class="text-xs font-bold text-slate-500 ml-3">标题字号:</span>
                                <select id="sme-chap-title-size" class="sme-chap-title-size bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none">
                                    <option value="2.5rem" ${activeChapter.chapTitleSize === '2.5rem' ? 'selected' : ''}>中等 (2.5rem)</option>
                                    <option value="4rem" ${!activeChapter.chapTitleSize || activeChapter.chapTitleSize === '4rem' ? 'selected' : ''}>标准大字 (4rem)</option>
                                    <option value="6rem" ${activeChapter.chapTitleSize === '6rem' ? 'selected' : ''}>特大 (6rem)</option>
                                </select>
                                <span class="text-xs font-bold text-slate-500 ml-3">章节音乐:</span>
                                <select id="sme-chap-bgm" class="sme-chap-bgm bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none text-emerald-600 font-bold">
                                    <option value="">[不更改/无音乐]</option>
                                    <option value="stop" ${activeChapter.chapBgm === 'stop' ? 'selected' : ''}>🔇 强制停止音乐</option>
                                    ${bgms.map(b => `<option value="${b.id}" ${activeChapter.chapBgm === b.id ? 'selected' : ''}>🎵 ${b.id}</option>`).join('')}
                                </select>
                            </div>
                            <div class="flex gap-3 mb-2 h-32">
                                <textarea id="sme-chap-outline" class="flex-1 bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-4 py-3 outline-none text-sm shadow-inner focus:border-[#ba3f42] resize-none" placeholder="【左侧区：输入原作资料】\n在此贴入原作剧本片段、前文节点或世界观背景设定...">${activeChapter.outline || ''}</textarea>
                          <textarea id="sme-chap-fanfic-prompt" class="flex-1 bg-[#fdfaf5] border border-[#ba3f42] text-[#ba3f42] font-bold rounded-md px-4 py-3 outline-none text-sm shadow-inner focus:border-[#ba3f42] resize-none" placeholder="【右侧区：二创改写指令】\n输入具体的重构/续写要求。例如：\n“提取原文大纲并梳理逻辑线”">${activeChapter.fanficPrompt || ''}</textarea>
                            </div>
                        `;
                    } else {
                        outlineHtml = `
                            ${globalChapterSettingsHtml}
                            <textarea id="sme-chap-outline" class="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-4 py-3 outline-none min-h-[100px] text-sm shadow-inner mb-2" placeholder="在此输入内容（想法/大纲/成型小说）...">${activeChapter.outline || ''}</textarea>
                        `;
                    }

                    const getDragHandleHtml = () => `
                        <div class="w-8 shrink-0 bg-[#f8fafc] border-r border-[#e6d5b8] rounded-l-lg flex flex-col items-center justify-center cursor-grab text-[#cbd5e1] hover:text-[#ba3f42] hover:bg-[#fff1f2] transition-colors sme-drag-handle" title="按住拖拽重排顺序">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="4" y1="8" x2="20" y2="8"></line><line x1="4" y1="16" x2="20" y2="16"></line></svg>
                        </div>
                    `;

                  chapterContentHtml = `
                        ${outlineHtml}
                       <div class="flex gap-2 mb-2" style="${project.manualMode ? 'display:none;' : ''}">
                            <select id="sme-gen-mode" style="border: 1px solid #d9c5b2; color: #4a4036;" class="rounded px-2 py-1.5 text-xs outline-none bg-white font-bold">
                                <option value="outline" ${activeChapter.genMode === 'outline' ? 'selected' : ''}>📋 大纲构建模式</option>
                                <option value="idea" ${activeChapter.genMode === 'idea' ? 'selected' : ''}>💡 纯想法构建</option>
                                <option value="script" ${activeChapter.genMode === 'script' ? 'selected' : ''}>📜 成型剧本提取</option>
                                <option value="fanfic" ${activeChapter.genMode === 'fanfic' ? 'selected' : ''}>✂️ 二创分支模式</option>
                            </select>
                        </div>
                        <div class="mt-4 flex justify-between items-center" style="${project.manualMode ? 'display:none;' : ''}">
                            <button id="sme-btn-generate" class="px-6 py-2 sme-btn-primary font-bold text-sm rounded-lg shadow-md">✨ 执行生成</button>
                        </div>
                    </div>

                    <div style="background-color: #f8fafc;" class="flex-1 overflow-y-auto p-6 light-scrollbar relative" id="sme-lines-container">
                     ${(activeChapter.lines || []).map((line, lIdx) => {
                            const type = line.type || 'dialogue';

                            // 修复：生成/开关手工模式时，若背景为AI生成的文字，防止由于下拉框选项不足被重置为 inherit
                            const isBgMatched = (project.customScenes || []).some(sc => sc.id === line.bg) || bgs.some(b => b.id === line.bg);
                            const fallbackBgOption = (!isBgMatched && line.bg && line.bg !== 'inherit') ? `<option value="${line.bg}" selected>🤖 AI场景: ${line.bg}</option>` : '';

                            const controlBtns = `
                                <div style="border-top: 1px dashed #e6d5b8;" class="flex gap-2 shrink-0 items-center justify-end mt-2 pt-2">
                                    <span class="text-[10px] text-gray-400 font-bold mr-auto tracking-widest uppercase">ID: ${lIdx}</span>
                                    <button class="sme-line-add px-2.5 py-1 sme-btn-primary rounded text-xs font-bold" data-lidx="${lIdx}">+ 💬对白</button>
                                    <button class="sme-line-add-choice px-2.5 py-1 sme-btn-warning rounded text-xs font-bold" data-lidx="${lIdx}">+ 🔘选项</button>
                                    <button class="sme-line-add-label px-2.5 py-1 sme-btn-success rounded text-xs font-bold" data-lidx="${lIdx}">+ 📌节点</button>
                                    <button class="sme-line-add-jump px-2.5 py-1 sme-btn-danger rounded text-xs font-bold" data-lidx="${lIdx}">+ ↪️跳转</button>
                                    <button class="sme-line-del px-2.5 py-1 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded text-xs font-bold border-none cursor-pointer" data-lidx="${lIdx}">🗑️ 删除</button>
                                </div>
                            `;

                           // 修复：重新动态生成包含正确 selected 属性的跳转选项，防止连线断开与保存洗白丢失
                            const targetOptions = `
                                <option value="CONTINUE" ${line.target === 'CONTINUE' ? 'selected' : ''}>⬇️ 无跳转 (前往下一章节)</option>
                                <option value="END" ${line.target === 'END' || !line.target ? 'selected' : ''}>🛑 达成结局并结束剧情</option>
                                <optgroup label="📍 跨章跃迁 (支线)">
                                    ${project.chapters.map(c => `<option value="${c.id}" ${line.target === c.id ? 'selected' : ''}>📖 跨章跳转: ${c.title}</option>`).join('')}
                                </optgroup>
                                <optgroup label="📌 本章内部跳转">
                                    ${currentLabels.map(lbl => `<option value="${lbl.id}" ${line.target === lbl.id ? 'selected' : ''}>📌 本章节点: ${lbl.name}</option>`).join('')}
                                </optgroup>
                            `;

                            if (type === 'label') {
                                return `
                                    <div class="sme-line-item flex mb-3 rounded-lg shadow-sm group transition-all" draggable="true" style="background-color: #eef2ff; border: 2px solid #c7d2fe;" data-lidx="${lIdx}" data-ltype="label">
                                        ${getDragHandleHtml()}
                                        <div class="flex-1 p-3 flex flex-col gap-2">
                                            <div class="flex items-center gap-2">
                                                <span class="text-xl shrink-0 drop-shadow-sm">📌</span>
                                                <span style="color: #3730a3;" class="font-black text-sm shrink-0">剧情锚点节点：</span>
                                                <input type="hidden" class="sme-label-id" value="${line.labelId}">
                                                <input type="text" class="sme-label-name flex-1 bg-transparent px-2 py-1 text-base font-black outline-none" style="border-bottom: 2px solid #a5b4fc; color: #312e81;" placeholder="为节点命名 (如: 分支A)" value="${line.labelName || ''}">
                                            </div>
                                            ${controlBtns}
                                        </div>
                                    </div>
                                `;
                            } else if (type === 'jump') {
                                return `
                                    <div class="sme-line-item flex mb-3 rounded-lg shadow-sm group transition-all" draggable="true" style="background-color: #fff1f2; border: 2px solid #fecaca;" data-lidx="${lIdx}" data-ltype="jump">
                                        ${getDragHandleHtml()}
                                        <div class="flex-1 p-3 flex flex-col gap-2">
                                            <div class="flex items-center gap-2">
                                                <span class="text-xl shrink-0 drop-shadow-sm">↪️</span>
                                                <span style="color: #9f1239;" class="font-black text-sm shrink-0">强制跳转至：</span>
                                                <select class="sme-jump-target flex-1 rounded px-2 py-1.5 text-sm font-bold bg-white outline-none" style="border: 1px solid #fda4af; color: #881337;">
                                                    ${targetOptions}
                                                </select>
                                            </div>
                                            ${controlBtns}
                                        </div>
                                    </div>
                                `;
                            } else if (type === 'choice') {
                                return `
                                    <div class="sme-line-item flex mb-3 rounded-lg shadow-sm group transition-all" draggable="true" style="background-color: #fffbeb; border: 2px solid #fcd34d;" data-lidx="${lIdx}" data-ltype="choice">
                                        ${getDragHandleHtml()}
                                        <div class="flex-1 p-4 flex flex-col gap-2">
                                            <div style="border-bottom: 1px solid #fde68a;" class="flex items-center justify-between mb-2 pb-2">
                                                <span style="color: #92400e;" class="font-black text-base flex items-center gap-1"><span class="text-xl">🔘</span> 玩家选择分支</span>
                                                <button class="sme-choice-add-opt px-3 py-1.5 sme-btn-warning rounded text-xs font-bold shadow-sm" data-lidx="${lIdx}">+ 增加选项</button>
                                            </div>
                                            <div style="border-left: 4px solid #fbbf24;" class="flex flex-col gap-3 pl-6">
                                                ${(line.choices && line.choices.length > 0 ? line.choices : [{text:'', target:''}]).map((opt, optIdx) => `
                                                    <div style="border: 1px solid #fde68a;" class="sme-choice-row-responsive flex flex-col items-center gap-2 sme-choice-opt-row bg-white p-2 rounded shadow-sm relative">
                                                        <input type="text" class="sme-choice-opt-text flex-[2] rounded px-3 py-1.5 text-sm outline-none font-bold w-full" style="border: 1px solid #fcd34d; color: #4a4036;" placeholder="选项显示的文字" value="${opt.text}">
                                                        <span style="color: #d97706; display: inline;" class="text-sm font-bold shrink-0">👉 导向</span>
                                                        <select class="sme-choice-opt-target flex-[1.5] rounded px-2 py-1.5 text-sm font-bold outline-none w-auto" style="border: 1px solid #fcd34d; color: #78350f; background-color: #fffbeb;">
                                                            <option value="CONTINUE" ${opt.target === 'CONTINUE' ? 'selected' : ''}>⬇️ 无跳转 (前往下一章节)</option>
                                                            <option value="END" ${opt.target === 'END' || !opt.target ? 'selected' : ''}>🛑 达成结局并结束</option>
                                                            <optgroup label="📍 跨章跃迁 (支线)">${project.chapters.map(c => `<option value="${c.id}" ${opt.target === c.id ? 'selected' : ''}>📖 章节: ${c.title}</option>`).join('')}</optgroup>
                                                            <optgroup label="📌 本章内部跳转">${currentLabels.map(lbl => `<option value="${lbl.id}" ${opt.target === lbl.id ? 'selected' : ''}>📌 节点: ${lbl.name}</option>`).join('')}</optgroup>
                                                        </select>
                                                        <button class="sme-choice-del-opt ml-2 sme-btn-danger p-1.5 rounded" onclick="this.closest('.sme-choice-opt-row').remove()">✖</button>
                                                    </div>
                                                `).join('')}
                                            </div>
                                            ${controlBtns}
                                        </div>
                                    </div>
                                `;
                            } else {
                                return `
                                  <div class="sme-line-item flex mb-3 bg-white rounded-lg shadow-sm group transition-all" draggable="true" style="border: 1px solid #e6d5b8;" data-lidx="${lIdx}" data-ltype="dialogue">
                                        ${getDragHandleHtml()}
                                        <div class="flex-1 p-3 flex flex-col gap-2">
                                         <div class="flex flex-wrap gap-2 items-center">
                                                <div class="relative flex items-center w-28 group/spk">
                                                    <input type="text" class="sme-line-speaker flex-1 px-2 py-1.5 rounded text-xs font-black outline-none text-center" style="border: 1px solid #d9c5b2; color: #c44a4a; padding-right: 18px;" data-lidx="${lIdx}" value="${line.speaker}" placeholder="角色名"/>
                                                    <select class="absolute right-0 w-5 h-full opacity-0 cursor-pointer" onchange="const inp = this.previousElementSibling; inp.value = this.value; inp.dispatchEvent(new Event('input', {bubbles: true}));" title="点击选择已有角色">
                                                        <option value="" disabled selected></option>
                                                        ${allSpeakers.map(spk => `<option value="${spk}">${spk}</option>`).join('')}
                                                    </select>
                                                    <div class="absolute right-1.5 pointer-events-none text-[8px] text-[#ba3f42] opacity-60 group-hover/spk:opacity-100 transition-opacity">▼</div>
                                                </div>
                                                <input type="text" class="sme-line-emotion px-2 py-1.5 rounded w-24 text-xs outline-none text-center" style="border: 1px solid #d9c5b2; color: #7a6b5d;" data-lidx="${lIdx}" value="${line.emotion || ''}" placeholder="表情/动作"/>
                                                
                                                <div style="border: 1px solid #d9c5b2; background-color: #fdfaf5;" class="flex-[1.5] min-w-[150px] flex items-stretch rounded overflow-hidden shadow-sm">
                                                    <span style="background-color: #f59e0b; border-right: 1px solid #f59e0b;" class="text-[10px] text-white px-2 flex items-center justify-center font-bold tracking-wider shrink-0">立绘</span>
                                                    <select class="sme-line-sprite flex-1 border-none outline-none text-[10px] font-bold bg-transparent pl-2 pr-1 py-1.5 cursor-pointer" style="color: #d97706;" data-lidx="${lIdx}" onmouseover="window.showSmePreview(this, 'sprite')" onmouseout="window.hideSmePreview()">
                                                        <option value="" ${!line.forceSprite ? 'selected' : ''}>[自动匹配/隐藏]</option>
                                                        <option value="none" ${line.forceSprite === 'none' ? 'selected' : ''}>🚫 强制不显示立绘</option>
                                                        ${sprites.map(set => `
                                                            <optgroup label="📦 ${set.name}">
                                                                ${set.sprites.map(sp => `<option value="${set.id}:::${sp.name}" ${line.forceSprite === `${set.id}:::${sp.name}` ? 'selected' : ''}>🎭 ${sp.name}</option>`).join('')}
                                                            </optgroup>
                                                        `).join('')}
                                                    </select>
                                                </div>

                                              <div style="border: 1px solid #d9c5b2; background-color: #fdfaf5;" class="flex-[1.5] min-w-[120px] flex items-stretch rounded overflow-hidden shadow-sm">
                                                    <span style="background-color: #4fa0d8; border-right: 1px solid #4fa0d8;" class="text-[10px] text-white px-2 flex items-center justify-center font-bold tracking-wider shrink-0">场景</span>
                                                    <select class="sme-line-bg flex-1 border-none outline-none text-[10px] font-bold bg-transparent pl-2 pr-1 py-1.5 cursor-pointer" style="color: #4fa0d8;" data-lidx="${lIdx}" onmouseover="window.showSmePreview(this, 'bg')" onmouseout="window.hideSmePreview()">
                                                        <option value="inherit">[ 继承上句 ]</option>
                                                        ${fallbackBgOption}
                                                        ${(project.customScenes || []).map(sc => `<option value="${sc.id}" ${line.bg === sc.id ? 'selected' : ''}>🗺️ ${sc.name}</option>`).join('')}
                                                        ${bgs.map(b => `<option value="${b.id}" ${line.bg === b.id ? 'selected' : ''}>🖼️ ${b.name}</option>`).join('')}
                                                    </select>
                                                </div>

                                                <div style="border: 1px solid #d9c5b2; background-color: #fdfaf5;" class="flex-[1.5] min-w-[120px] flex items-stretch rounded overflow-hidden shadow-sm">
                                                    <span style="background-color: #ba3f42; border-right: 1px solid #ba3f42;" class="text-[10px] text-white px-2 flex items-center justify-center font-bold tracking-wider shrink-0">CG</span>
                                                    <select class="sme-line-cg flex-1 border-none outline-none text-[10px] font-bold bg-transparent pl-2 pr-1 py-1.5 cursor-pointer" style="color: #ba3f42;" data-lidx="${lIdx}" onmouseover="window.showSmePreview(this, 'cg')" onmouseout="window.hideSmePreview()">
                                                        <option value="" style="color: #7a6b5d;">[ 无插图 ]</option>
                                                        <option value="clear" ${line.cg === 'clear' ? 'selected' : ''}>🚫 清除CG</option>
                                                        ${bgs.map(b => `<option value="${b.id}" ${line.cg === b.id ? 'selected' : ''}>🖼️ ${b.name}</option>`).join('')}
                                                    </select>
                                                </div>
                                                
                                                <div style="border: 1px solid #d9c5b2; background-color: #fdfaf5;" class="flex-[1.5] min-w-[120px] flex items-stretch rounded overflow-hidden shadow-sm">
                                                    <span style="background-color: #10b981; border-right: 1px solid #10b981;" class="text-[10px] text-white px-2 flex items-center justify-center font-bold tracking-wider shrink-0">音乐</span>
                                                    <select class="sme-line-bgm flex-1 border-none outline-none text-[10px] font-bold bg-transparent pl-2 pr-1 py-1.5 cursor-pointer" style="color: #10b981;" data-lidx="${lIdx}">
                                                        <option value="inherit">[ 沿用当前 ]</option>
                                                        <option value="stop" ${line.bgm === 'stop' ? 'selected' : ''}>🔇 停止音乐</option>
                                                        ${bgms.map(b => `<option value="${b.id}" ${line.bgm === b.id ? 'selected' : ''}>🎵 ${b.id}</option>`).join('')}
                                                    </select>
                                                </div>
                                                
                                                <div class="flex gap-1 shrink-0 ml-auto items-center">
                                                    ${line.audioBlob ? `
                                                        <button class="sme-line-audio-play px-2.5 py-1.5 rounded text-xs font-bold shadow-sm" style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;" data-lidx="${lIdx}">▶ 试听</button>
                                                        <button class="sme-line-audio-del px-2 py-1.5 rounded text-xs font-bold shadow-sm" style="background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3;" data-lidx="${lIdx}">✖</button>
                                                    ` : `
                                                        <button class="sme-line-audio-upload px-2.5 py-1.5 rounded text-xs font-bold shadow-sm" style="background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd;" data-lidx="${lIdx}" title="导入自定义的MP3/WAV音频">📤 导入</button>
                                                        <input type="file" class="sme-line-audio-file hidden" data-lidx="${lIdx}" accept="audio/*" />
                                                        <button class="sme-line-audio-gen px-2.5 py-1.5 rounded text-xs font-bold shadow-sm" style="background: #fdf4ff; color: #9333ea; border: 1px solid #fae8ff;" data-lidx="${lIdx}" title="调用 TTS 接口自动生成">🔊 生成</button>
                                                    `}
                                                </div>
                                            </div>
                                            <div class="relative mt-1">
                                                <textarea class="sme-line-text w-full rounded-md px-3 py-2 text-sm outline-none resize-y min-h-[50px] leading-relaxed" style="border: 1px solid #e6d5b8; background-color: #fdfaf5; color: #4a4036;" data-lidx="${lIdx}">${line.text}</textarea>
                                            </div>
                                            ${controlBtns}
                                        </div>
                                    </div>
                                `;
                            }
                        }).join('')}
                        
                        <button id="sme-add-end-line" class="w-full py-3 font-bold rounded-lg transition-colors mt-2" style="border: 2px dashed #d9c5b2; color: #a89578; cursor: pointer;">
                            + 在末尾添加一行对白
                        </button>
                    `;
                }

                modal.innerHTML = `
                    ${headerHtml}
                    <div class="flex flex-1 overflow-hidden">
                        <div style="border-right: 1px solid #e6d5b8; background-color: white;" class="w-64 flex flex-col z-10">
                            <div style="background-color: #fdfaf5;" class="p-4 flex justify-between items-center">
                                <span style="color: #ba3f42;" class="font-bold text-sm">当前支线列表</span>
                                <button id="sme-add-chapter" class="sme-btn-primary px-2 py-0.5 rounded shadow-sm">+</button>
                            </div>
                           <div class="flex-1 overflow-y-auto p-2 space-y-1">
                                ${project.chapters.map((ch, idx) => `
                                <div class="p-3 rounded-lg cursor-pointer group flex justify-between items-center ${idx === activeChapterIdx ? 'font-bold' : ''}" style="background-color: ${idx === activeChapterIdx ? 'rgba(196,74,74,0.1)' : 'transparent'}; border: 1px solid ${idx === activeChapterIdx ? 'rgba(196,74,74,0.3)' : 'transparent'};" data-idx="${idx}">
                                    <span class="${ch.isEnding?'text-rose-500':''} truncate pr-2">${idx + 1}. ${ch.isEnding?'🎬':''} ${ch.title}</span>
                                    <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button class="sme-btn-move-up text-[10px] bg-slate-200 hover:bg-slate-300 rounded px-1.5 py-0.5 text-slate-600 outline-none" data-idx="${idx}" title="上移">▲</button>
                                        <button class="sme-btn-move-down text-[10px] bg-slate-200 hover:bg-slate-300 rounded px-1.5 py-0.5 text-slate-600 outline-none" data-idx="${idx}" title="下移">▼</button>
                                    </div>
                                </div>
                                `).join('')}
                            </div>
                        </div>
                        <div style="background-color: #fdfaf5;" class="flex-1 flex flex-col overflow-hidden relative">
                            <div style="background-color: #fdfaf5; border-bottom: 1px dashed #e6d5b8;" class="p-6 shadow-sm z-10">
                                <div class="flex items-center justify-between mb-3">
                                    <input type="text" id="sme-chap-title" value="${activeChapter.title}" style="color: #ba3f42; border-bottom: 1px solid #d9c5b2;" class="text-lg font-bold bg-transparent outline-none px-1 w-1/2" placeholder="章节标题" /> 
                                    <div class="flex gap-2 items-center">
                                        <label class="flex items-center gap-1 text-xs font-bold text-indigo-600 cursor-pointer bg-indigo-50 px-2 py-1.5 rounded border border-indigo-200 transition-colors hover:bg-indigo-100">
                                            <input type="checkbox" id="sme-chap-is-ending" ${activeChapter.isEnding ? 'checked' : ''}> 🎬 设为结局结算
                                        </label>
                                        <button id="sme-del-chapter" class="sme-btn-danger px-3 py-1.5 rounded text-xs font-bold">删除本章</button>
                                    </div>
                                </div>
                                ${chapterContentHtml}
                            </div>
                        </div>
                   <div id="sme-resource-container" style="border-left: 1px solid #e6d5b8; background-color: white;" class="w-80 flex flex-col z-10 overflow-hidden shadow-[-5px_0_15px_rgba(0,0,0,0.05)]">
                            <div style="background-color: #fdfaf5; border-bottom: 1px solid #e6d5b8; color: #ba3f42;" class="p-3 font-black text-sm flex flex-col gap-2">
                                <div>📦 全局资源映射库</div>
                               <div class="grid grid-cols-3 gap-2 w-full">
                                    <button id="sme-quick-upload-bg" style="background-color: #6366f1 !important; color: white !important; border: none !important;" class="text-[11px] py-1.5 rounded shadow hover:opacity-80 outline-none w-full whitespace-nowrap cursor-pointer">🖼️传场景</button>
                                    <button id="sme-quick-upload-sprite" style="background-color: #f59e0b !important; color: white !important; border: none !important;" class="text-[11px] py-1.5 rounded shadow hover:opacity-80 outline-none w-full whitespace-nowrap cursor-pointer">🎭传立绘</button>
                                    <button id="sme-quick-upload-bgm" style="background-color: #10b981 !important; color: white !important; border: none !important;" class="text-[11px] py-1.5 rounded shadow hover:opacity-80 outline-none w-full whitespace-nowrap cursor-pointer">🎵传音乐</button>
                                </div>
                                <input type="file" id="sme-quick-upload-file" class="hidden" accept="image/*,audio/*" />
                            </div>
                            <div class="flex-1 overflow-y-auto p-4 space-y-6 light-scrollbar">
                               <div>
                                    <div class="flex justify-between items-center mb-3 border-l-4 border-[#ba3f42] pl-2">
                                        <label style="color: #ba3f42;" class="font-bold text-xs">自定义场景映射池</label>
                                        <button id="sme-btn-add-scene" class="sme-btn-primary px-2 py-1 rounded shadow-sm text-[10px] font-bold">+ 添加场景</button>
                                    </div>
                                    ${(project.customScenes || []).map((sc, scIdx) => `
                                        <div class="mb-2 flex items-center gap-1 sme-custom-scene-row" data-scidx="${scIdx}">
                                            <input type="text" class="sme-custom-scene-name w-16 text-xs px-1 py-1.5 border border-[#d9c5b2] rounded outline-none" value="${sc.name}" placeholder="如:教室">
                                            <select class="sme-custom-scene-bg flex-1 text-[10px] px-1 py-1.5 border border-[#d9c5b2] rounded outline-none" onmouseover="window.showSmePreview(this, 'bg')" onmouseout="window.hideSmePreview()">
                                                <option value="">[绑背景图]</option>
                                                ${bgs.map(b => `<option value="${b.id}" ${sc.bgId === b.id ? 'selected' : ''}>🖼️ ${b.name}</option>`).join('')}
                                            </select>
                                            <button class="sme-custom-scene-del text-red-500 hover:text-red-700 text-xs px-1.5" data-scidx="${scIdx}">✖</button>
                                        </div>
                                    `).join('')}
                                </div>
                              <div>
                                    <label style="color: #ba3f42; border-left: 4px solid #ba3f42;" class="block font-bold mb-3 text-xs pl-2">直接环境映射</label>
                                    ${uniqueBgs.map(bg => `
                                    <div class="mb-2 relative group sme-env-map-row" data-bg="${bg}">
                                        <div class="flex justify-between items-center mb-1">
                                            <span style="color: #7a6b5d;" class="text-xs font-bold block">${bg}</span>
                                            <button class="sme-env-bg-del text-rose-500 hover:text-rose-700 text-[10px] sme-hover-show" data-bg="${bg}" title="将所有该场景引用清空">🗑️ 删除映射</button>
                                        </div>
                                        <select class="sme-bg-select w-full rounded text-xs p-1.5 outline-none" style="border: 1px solid #d9c5b2; background-color: #fdfaf5;" data-bg="${bg}" onmouseover="window.showSmePreview(this, 'bg')" onmouseout="window.hideSmePreview()">
                                            <option value="">[黑屏/无]</option>
                                            ${bgs.map(b => `<option value="${b.id}" ${project.bgConfigs[bg] === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                                        </select>
                                    </div>`).join('')}
                                </div>
                              <div>
                                    <div style="border-left: 4px solid #ba3f42;" class="flex justify-between items-center mb-2 pl-2">
                                        <label style="color: #ba3f42;" class="font-bold text-xs">🎭 角色管理与配音配置</label>
                                        <button id="sme-btn-add-char" class="sme-btn-primary px-2 py-1 rounded shadow-sm text-[10px] font-bold outline-none cursor-pointer">+ 添加角色</button>
                                    </div>

                                    <div class="mb-4 p-3 rounded-xl shadow-sm" style="background-color: #fdfaf5; border: 1px solid #d9c5b2;">
                                        <div class="flex items-center justify-between mb-2">
                                            <label class="text-xs font-bold text-[#4a4036] flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" id="sme-protagonist-toggle" ${project.protagonistEnabled ? 'checked' : ''} class="cursor-pointer">
                                                👑 开启主角自定义改名系统
                                            </label>
                                        </div>
                                        <div class="flex items-center gap-2 transition-all ${project.protagonistEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}" id="sme-protagonist-settings">
                                            <span class="text-[10px] text-gray-600 font-bold">设定主角:</span>
                                            <select id="sme-protagonist-select" class="flex-1 rounded text-[10px] p-1.5 outline-none font-bold" style="border: 1px solid #d9c5b2; color: #ba3f42; background-color: white;">
                                                <option value="">[请选择剧本中的主角]</option>
                                                ${allSpeakers.map(spk => `<option value="${spk}" ${project.protagonistId === spk ? 'selected' : ''}>${spk}</option>`).join('')}
                                            </select>
                                        </div>
                                    </div>

                                    <div class="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg mb-4 border border-amber-200 shadow-sm leading-relaxed">
                                        <strong class="text-amber-900 block mb-1">📢 机制说明：</strong>
                                        开启主角改名后，玩家在首次运行剧本时可自定义主角名，剧情中所有该角色的文本与名字将被自动替换。在台词框手动输入新角色将自动同步至此。
                                    </div>
                                    ${allSpeakers.map(spk => {
                                        const conf = project.charConfigs[spk] || {};
                                        return `
                                        <div style="background-color: #fdfaf5; border: 1px solid #d9c5b2;" class="mb-4 p-3 rounded-xl shadow-sm relative group">
                                            <button class="sme-btn-del-char absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow cursor-pointer outline-none" data-speaker="${spk}" title="删除角色">✖</button>
                                            <div class="flex justify-between items-center mb-2">
                                                <div style="background-color: #e8decb; color: #4a4036;" class="font-black text-sm px-2 py-0.5 rounded">${spk}</div>
                                                <button class="sme-btn-single-tts sme-btn-primary px-2 py-1 rounded shadow-sm text-[10px] font-bold" data-speaker="${spk}">单角配音</button>
                                            </div>
                                            <div class="flex gap-1 mb-2">
                                                <select class="sme-char-sprite flex-1 rounded text-[10px] p-1.5 outline-none" style="border: 1px solid #d9c5b2;" data-speaker="${spk}"><option value="">[此角色无立绘]</option>${sprites.map(s => `<option value="${s.id}" ${conf.spriteSetId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
                                                <select class="sme-char-version flex-1 rounded text-[10px] p-1.5 outline-none font-bold" style="border: 1px solid #d9c5b2; color: #ba3f42; background-color: #fdfaf5;" data-speaker="${spk}">
                                                    <option value="V2ProPlus" ${!conf.modelVersion || conf.modelVersion === 'V2ProPlus' ? 'selected' : ''}>V2ProPlus</option>
                                                    <option value="V2" ${conf.modelVersion === 'V2' ? 'selected' : ''}>引擎: V2</option>
                                                </select>
                                            </div>
                                            <div class="space-y-1 mb-2">
                                                <input type="text" class="sme-char-gpt w-full rounded text-[10px] p-1.5 outline-none" style="border: 1px solid #d9c5b2;" data-speaker="${spk}" value="${conf.gptModel || ''}" placeholder="GPT模型文件路径 (.ckpt等)">
                                                <input type="text" class="sme-char-sovits w-full rounded text-[10px] p-1.5 outline-none" style="border: 1px solid #d9c5b2;" data-speaker="${spk}" value="${conf.sovitsModel || ''}" placeholder="SoVITS模型文件路径 (.pth等)">
                                                <input type="text" class="sme-char-audio w-full rounded text-[10px] p-1.5 outline-none" style="border: 1px solid #d9c5b2;" data-speaker="${spk}" value="${conf.refAudio || ''}" placeholder="参考音频路径">
                                                <input type="text" class="sme-char-text w-full rounded text-[10px] p-1.5 outline-none" style="border: 1px solid #d9c5b2;" data-speaker="${spk}" value="${conf.refText || ''}" placeholder="参考音频文本">
                                            </div>
                                        </div>`;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                safeBind('sme-proj-name', 'onchange', (e) => { project.name = e.target.value.trim() || '未命名剧本'; ScriptDB.save(project); });
                safeBind('sme-btn-back', 'onclick', () => { 
                    if(activeView === 'text') saveProjectState(); 
                    ScriptDB.save(project); 
                    modal.classList.add('opacity-0'); setTimeout(() => { modal.remove(); openStorySelectorModal(); }, 300); 
                });
                
                safeBind('sme-btn-save', 'onclick', async (e) => { 
                    const btn = e.currentTarget; btn.disabled = true; const origHtml = btn.innerHTML; btn.innerHTML = '⏳ 正在写入...';
                    saveProjectState(); await ScriptDB.save(project); window.$GWC.showToast("已成功保存剧本修改！", "success"); 
                    btn.innerHTML = '✅ 保存成功'; btn.style.backgroundColor = '#10b981'; btn.style.color = '#ffffff';
                    setTimeout(() => { btn.innerHTML = origHtml; btn.style.backgroundColor = ''; btn.style.color = ''; btn.disabled = false; }, 1500);
                });
                
                safeBind('sme-btn-llm-config', 'onclick', openLLMConfigModal);
                
                safeBind('sme-manual-mode', 'onchange', (e) => {
                    project.manualMode = e.target.checked;
                    saveProjectState(); renderEditor();
                });

                safeBind('sme-view-flow-btn', 'onclick', () => {
                    if (activeView === 'text') saveProjectState();
                    activeView = 'flowchart'; renderEditor(); 
                });

                bindImportExportEvents();

                const isEndingBox = document.getElementById('sme-chap-is-ending');
                if (isEndingBox) {
                    isEndingBox.onchange = () => { saveProjectState(); renderEditor(); };
                }

                if (!activeChapter.isEnding) {
                    const linesContainer = document.getElementById('sme-lines-container');
                    if (linesContainer) {
                        let draggedItem = null; let draggedIdx = null;
                        linesContainer.querySelectorAll('.sme-line-item').forEach(item => {
                            item.ondragstart = (e) => {
                                draggedItem = item; draggedIdx = parseInt(item.getAttribute('data-lidx'));
                                e.dataTransfer.effectAllowed = "move";
                                setTimeout(() => item.classList.add('dragging'), 0);
                            };
                            item.ondragend = () => {
                                draggedItem.classList.remove('dragging'); draggedItem = null;
                                document.querySelectorAll('.sme-line-item').forEach(el => { el.style.borderTop = ''; el.style.borderBottom = ''; });
                            };
                            item.ondragover = (e) => {
                                e.preventDefault();
                                if (!draggedItem || draggedItem === item) return;
                                const rect = item.getBoundingClientRect(); const offset = e.clientY - rect.top;
                                if (offset > rect.height / 2) { item.style.borderBottom = '4px solid #ba3f42'; item.style.borderTop = ''; } 
                                else { item.style.borderTop = '4px solid #ba3f42'; item.style.borderBottom = ''; }
                            };
                            item.ondragleave = (e) => { item.style.borderTop = ''; item.style.borderBottom = ''; };
                            item.ondrop = (e) => {
                                e.preventDefault(); item.style.borderTop = ''; item.style.borderBottom = '';
                                if (!draggedItem || draggedItem === item) return;
                                saveProjectState(); 
                                const lines = project.chapters[activeChapterIdx].lines;
                                let targetIdx = parseInt(item.getAttribute('data-lidx'));
                                const rect = item.getBoundingClientRect(); const offset = e.clientY - rect.top;
                                if (offset > rect.height / 2) targetIdx++; 
                                
                                const [movedLine] = lines.splice(draggedIdx, 1);
                                if (targetIdx > draggedIdx) targetIdx--; 
                                lines.splice(targetIdx, 0, movedLine);
                                
                                renderEditor(); 
                            };
                        });
                    }

                    const modeEl = document.getElementById('sme-gen-mode');
                    if (modeEl) modeEl.onchange = (e) => { saveProjectState(); project.chapters[activeChapterIdx].genMode = e.target.value; renderEditor(); };

                    modal.querySelectorAll('.sme-line-add').forEach(btn => { btn.onclick = () => { saveProjectState(); const idx = parseInt(btn.getAttribute('data-lidx')); project.chapters[activeChapterIdx].lines.splice(idx + 1, 0, { type: 'dialogue', speaker: '新角色', emotion: '', cg: '', text: '输入新台词...' }); renderEditor(); }; });
                    modal.querySelectorAll('.sme-line-add-choice').forEach(btn => { btn.onclick = () => { saveProjectState(); const idx = parseInt(btn.getAttribute('data-lidx')); project.chapters[activeChapterIdx].lines.splice(idx + 1, 0, { type: 'choice', choices: [{text: '新的选项', target: ''}] }); renderEditor(); }; });
                    modal.querySelectorAll('.sme-line-add-label').forEach(btn => { btn.onclick = () => { saveProjectState(); const idx = parseInt(btn.getAttribute('data-lidx')); project.chapters[activeChapterIdx].lines.splice(idx + 1, 0, { type: 'label', labelId: 'node_' + Math.random().toString(36).substr(2,9), labelName: '' }); renderEditor(); }; });
                    modal.querySelectorAll('.sme-line-add-jump').forEach(btn => { btn.onclick = () => { saveProjectState(); const idx = parseInt(btn.getAttribute('data-lidx')); project.chapters[activeChapterIdx].lines.splice(idx + 1, 0, { type: 'jump', target: '' }); renderEditor(); }; });
                    modal.querySelectorAll('.sme-choice-add-opt').forEach(btn => { btn.onclick = (e) => { saveProjectState(); const idx = parseInt(btn.getAttribute('data-lidx')); if (!project.chapters[activeChapterIdx].lines[idx].choices) project.chapters[activeChapterIdx].lines[idx].choices = []; project.chapters[activeChapterIdx].lines[idx].choices.push({text: '新增选项', target: ''}); renderEditor(); }; });
                   modal.querySelectorAll('.sme-line-del').forEach(btn => { btn.onclick = () => { saveProjectState(); const idx = parseInt(btn.getAttribute('data-lidx')); project.chapters[activeChapterIdx].lines.splice(idx, 1); renderEditor(); }; });
                    
                    modal.querySelectorAll('.sme-line-audio-play').forEach(btn => { 
                        btn.onclick = (e) => { 
                            const idx = parseInt(e.currentTarget.getAttribute('data-lidx')); 
                            const blob = project.chapters[activeChapterIdx].lines[idx].audioBlob; 
                            if(blob) { 
                                const url = URL.createObjectURL(blob); 
                                if(activeEditorAudio && !activeEditorAudio.paused) { 
                                    activeEditorAudio.pause(); 
                                    if (activeEditorAudio.dataset?.idx == idx) return; 
                                } 
                                activeEditorAudio = new Audio(url); 
                                activeEditorAudio.dataset = { idx };
                                activeEditorAudio.play().catch(err => console.warn("播放拦截", err)); 
                            } 
                        }; 
                    });
                    modal.querySelectorAll('.sme-line-audio-del').forEach(btn => { btn.onclick = (e) => { saveProjectState(); const idx = parseInt(e.currentTarget.getAttribute('data-lidx')); project.chapters[activeChapterIdx].lines[idx].audioBlob = null; window.$GWC.showToast("已移除配音", "info"); renderEditor(); }; });
                    modal.querySelectorAll('.sme-line-audio-gen').forEach(btn => { btn.onclick = async (e) => { const idx = parseInt(e.currentTarget.getAttribute('data-lidx')); await doTTSForSingleLine(idx, e.currentTarget); }; });

                    modal.querySelectorAll('.sme-line-audio-upload').forEach(btn => {
                        btn.onclick = (e) => {
                            const idx = e.currentTarget.getAttribute('data-lidx');
                            const fileInput = modal.querySelector(`.sme-line-audio-file[data-lidx="${idx}"]`);
                            if (fileInput) fileInput.click();
                        };
                    });
                    modal.querySelectorAll('.sme-line-audio-file').forEach(input => {
                        input.onchange = (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const idx = parseInt(e.target.getAttribute('data-lidx'));
                            saveProjectState(); 
                            project.chapters[activeChapterIdx].lines[idx].audioBlob = file; 
                            window.$GWC.showToast("自定义音频导入成功！", "success");
                            renderEditor(); 
                        };
                    });

                 // ✨ 新增：自定义场景添加/删除，以及自动同步文件名与AI场景映射删除功能
                    safeBind('sme-btn-add-scene', 'onclick', () => {
                        saveProjectState();
                        if(!project.customScenes) project.customScenes = [];
                        project.customScenes.push({ id: 'sc_' + Date.now(), name: '新场景', bgId: '' });
                        renderEditor();
                    });
                    
                    modal.querySelectorAll('.sme-custom-scene-del').forEach(btn => {
                        btn.onclick = (e) => {
                            saveProjectState();
                            project.customScenes.splice(parseInt(e.currentTarget.getAttribute('data-scidx')), 1);
                            renderEditor();
                        };
                    });

                    // 修复：环境映射的自动同步，必须先改变 DOM 输入框的 value，否则 saveProjectState 会复写回去
                    modal.querySelectorAll('.sme-custom-scene-bg').forEach(sel => {
                        sel.onchange = (e) => {
                            const row = e.target.closest('.sme-custom-scene-row');
                            const scIdx = row.getAttribute('data-scidx');
                            const bgId = e.target.value;
                            const bgData = bgs.find(b => b.id === bgId);
                            if (bgData && project.customScenes[scIdx]) {
                                const nameInput = row.querySelector('.sme-custom-scene-name');
                                if (nameInput.value === '新场景' || nameInput.value === '') {
                                    const newName = bgData.name.replace(/\.[^/.]+$/, ""); 
                                    nameInput.value = newName; // 强制先改 DOM 防覆盖
                                    project.customScenes[scIdx].name = newName;
                                }
                                project.customScenes[scIdx].bgId = bgId;
                                saveProjectState();
                                renderEditor();
                            }
                        };
                    });

                   // 新增：彻底删除无用的AI场景映射节点
                    modal.querySelectorAll('.sme-env-bg-del').forEach(btn => {
                        btn.onclick = (e) => {
                            const targetBg = e.target.getAttribute('data-bg');
                            if(confirm(`确定要剥离全剧本中名为【${targetBg}】的虚假AI场景映射吗？\n涉及此场景的对白将退化为黑屏或沿用上一句。`)){
                                saveProjectState();
                                project.chapters.forEach(ch => {
                                    if(ch.lines) ch.lines.forEach(l => { if(l.bg === targetBg) l.bg = 'inherit'; });
                                });
                                if(project.bgConfigs) delete project.bgConfigs[targetBg];
                                renderEditor();
                            }
                        }
                    });

                   // ✨ 绑定主角系统设置事件
                    const proToggle = document.getElementById('sme-protagonist-toggle');
                    if (proToggle) {
                        proToggle.onchange = (e) => {
                            project.protagonistEnabled = e.target.checked;
                            saveProjectState();
                            renderEditor();
                        };
                    }
                    const proSelect = document.getElementById('sme-protagonist-select');
                    if (proSelect) {
                        proSelect.onchange = (e) => {
                            project.protagonistId = e.target.value;
                            saveProjectState();
                        };
                    }

                    // ✨ 新增：角色手动添加与删除事件
                    safeBind('sme-btn-add-char', 'onclick', () => {
                        const newName = prompt('请输入新角色名称：', '新角色');
                        if (newName && newName.trim() !== '' && newName !== '旁白') {
                            saveProjectState();
                            if (!project.charConfigs[newName.trim()]) project.charConfigs[newName.trim()] = {};
                            renderEditor();
                        }
                    });
                    
                    modal.querySelectorAll('.sme-btn-del-char').forEach(btn => {
                        btn.onclick = (e) => {
                            const spk = e.currentTarget.getAttribute('data-speaker');
                            if (confirm(`⚠️ 确定要从角色库中彻底删除【${spk}】吗？\n这会清空该角色的配音、立绘配置，并将剧本中所有该角色的对白强制降级为“旁白”！`)) {
                                saveProjectState();
                                delete project.charConfigs[spk];
                                project.chapters.forEach(ch => {
                                    if (ch.lines) ch.lines.forEach(l => { if (l.speaker === spk) l.speaker = '旁白'; });
                                });
                                renderEditor();
                            }
                        };
                    });
                    // 修复：为自定义场景选择器绑定 onchange，自动把文件名同步到场景名称
                    modal.querySelectorAll('.sme-custom-scene-bg').forEach(sel => {
                        sel.onchange = (e) => {
                            const scIdx = e.target.closest('.sme-custom-scene-row').getAttribute('data-scidx');
                            const bgId = e.target.value;
                            const bgData = bgs.find(b => b.id === bgId);
                            if (bgData && project.customScenes[scIdx]) {
                                if (project.customScenes[scIdx].name === '新场景' || project.customScenes[scIdx].name === '') {
                                    project.customScenes[scIdx].name = bgData.name.replace(/\.[^/.]+$/, ""); // 自动去后缀同步
                                }
                                project.customScenes[scIdx].bgId = bgId; // 同步图片ID
                                saveProjectState();
                                renderEditor();
                            }
                        };
                    });

                    // ✨ 新增：快速上传并写入核心数据库
                    let quickUploadType = '';
                    const quInput = document.getElementById('sme-quick-upload-file');
                    const triggerUpload = (t) => { quickUploadType = t; if(quInput) quInput.click(); };
                    safeBind('sme-quick-upload-bg', 'onclick', () => triggerUpload('bg'));
                    safeBind('sme-quick-upload-sprite', 'onclick', () => triggerUpload('sprite'));
                    safeBind('sme-quick-upload-bgm', 'onclick', () => triggerUpload('bgm'));
                    if (quInput) {
                        quInput.onchange = async (e) => {
                            const file = e.target.files[0]; if(!file) return;
                            window.$GWC.showToast("正在加密并写入系统深处...", "info");
                            const id = file.name.split('.')[0] + '_' + Date.now();
                            const api = window.__GWC_API;
                            const mid = getActiveMirrorId();
                            if (quickUploadType === 'bg') {
                                const fd = new FormData(); fd.append('file', file, file.name); fd.append('id', id); fd.append('name', file.name);
                                await fetch(`${API_BASE}/api/userdata/${mid}/bg_images`, { method: 'POST', body: fd }).catch(() => {});
                            } else if (quickUploadType === 'sprite') {
                                const fd = new FormData(); fd.append('file', file, file.name);
                                await fetch(`${API_BASE}/api/userdata/${mid}/plugins/sprite_sets/${id}_default/blob`, { method: 'POST', body: fd }).catch(() => {});
                                if (api) await api.setPluginJson('sprite_sets', `${id}_default`, { id: `${id}_default`, name: id, sprites: [{ name: 'default' }] });
                            } else if (quickUploadType === 'bgm') {
                                const fd = new FormData(); fd.append('file', file, file.name); fd.append('id', 'bgm_' + id); fd.append('name', file.name);
                                await fetch(`${API_BASE}/api/userdata/${mid}/bgm`, { method: 'POST', body: fd }).catch(() => {});
                            }
                            window.$GWC.showToast("资源上传同步成功！", "success");
                            renderEditor();
                        };
                    }

                    safeBind('sme-add-end-line', 'onclick', () => {
                        saveProjectState(); 
                        const lastLine = project.chapters[activeChapterIdx].lines[project.chapters[activeChapterIdx].lines.length - 1] || { bg: null }; 
                        project.chapters[activeChapterIdx].lines.push({ type: 'dialogue', speaker: '旁白', emotion: '', cg: '', text: '...', bg: lastLine.bg }); 
                        renderEditor(); 
                        const scrollContainer = document.getElementById('sme-lines-container'); 
                        if (scrollContainer) setTimeout(() => scrollContainer.scrollTop = scrollContainer.scrollHeight, 50); 
                    });
                    
                    safeBind('sme-btn-generate', 'onclick', async () => {
                        saveProjectState(); const targetIdx = activeChapterIdx; const outline = project.chapters[targetIdx].outline; const fanficPrompt = project.chapters[targetIdx].fanficPrompt; const mode = project.chapters[targetIdx].genMode || 'outline';
                        if (!outline && mode !== 'fanfic') return window.$GWC.showToast("输入内容不可为空", "info");
                        if (project.chapters[targetIdx].lines.length > 0 && mode !== 'script' && mode !== 'fanfic') { if(!confirm("执行全量生成将会覆盖当前章节现有的所有对白，是否继续？")) return; }
                        const btn = document.getElementById('sme-btn-generate'); btn.disabled = true; btn.innerHTML = '脑洞构思中...';
                        try { 
                            const lines = await generateScriptViaAI(outline, fanficPrompt, null, project.genPrompt, mode); 
                            project.chapters[targetIdx].lines = lines; await ScriptDB.save(project); window.$GWC.showToast("生成成功！", "success"); if (activeChapterIdx === targetIdx) renderEditor(); 
                        } catch(e) { window.$GWC.showToast(`失败: ${e.message}`, "error"); btn.disabled = false; btn.innerHTML = '✨ 执行生成'; }
                    });
                } 

              safeBind('sme-add-chapter', 'onclick', () => { saveProjectState(); project.chapters.push({ id: 'ch_' + Date.now(), title: `新章`, outline: '', lines: [], isEnding: false }); activeChapterIdx = project.chapters.length - 1; renderEditor(true); });
                safeBind('sme-del-chapter', 'onclick', () => { if (project.chapters.length > 1) { project.chapters.splice(activeChapterIdx, 1); activeChapterIdx = Math.max(0, activeChapterIdx - 1); renderEditor(true); } });
                
                // ✨ 绑定章节排序事件
                modal.querySelectorAll('.sme-btn-move-up').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                        if (idx > 0) {
                            saveProjectState();
                            const temp = project.chapters[idx];
                            project.chapters[idx] = project.chapters[idx - 1];
                            project.chapters[idx - 1] = temp;
                            if (activeChapterIdx === idx) activeChapterIdx = idx - 1;
                            else if (activeChapterIdx === idx - 1) activeChapterIdx = idx;
                            renderEditor();
                        }
                    };
                });
                modal.querySelectorAll('.sme-btn-move-down').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                        if (idx < project.chapters.length - 1) {
                            saveProjectState();
                            const temp = project.chapters[idx];
                            project.chapters[idx] = project.chapters[idx + 1];
                            project.chapters[idx + 1] = temp;
                            if (activeChapterIdx === idx) activeChapterIdx = idx + 1;
                            else if (activeChapterIdx === idx + 1) activeChapterIdx = idx;
                            renderEditor();
                        }
                    };
                });

                modal.querySelectorAll('div[data-idx]').forEach(el => { 
                    el.onclick = (e) => { 
                        if (e.target.closest('.sme-btn-move-up') || e.target.closest('.sme-btn-move-down')) return;
                        saveProjectState(); activeChapterIdx = parseInt(e.currentTarget.getAttribute('data-idx')); renderEditor(true); 
                    }; 
                });

                modal.querySelectorAll('.sme-char-version').forEach(el => { el.onchange = (e) => { saveProjectState(); }; });

                safeBind('sme-btn-batch-tts', 'onclick', async (e) => { await doTTSForSpeaker(null, e.currentTarget); });
                modal.querySelectorAll('.sme-btn-single-tts').forEach(btn => { btn.onclick = async (e) => { await doTTSForSpeaker(e.currentTarget.getAttribute('data-speaker'), e.currentTarget); }; });
                
                if (savedScrollTop > 0 || savedResScrollTop > 0) { 
                    setTimeout(() => { 
                        const newSc = document.getElementById('sme-lines-container'); 
                        if (newSc && savedScrollTop > 0) newSc.scrollTop = savedScrollTop; 
                        const newResSc = document.getElementById('sme-resource-container'); 
                        if (newResSc && savedResScrollTop > 0) newResSc.scrollTop = savedResScrollTop;
                    }, 10); 
                }
            }
        };

        const bindImportExportEvents = () => {
            const btnExport = document.getElementById('sme-btn-export');
            const btnImport = document.getElementById('sme-btn-import');
            const fileInput = document.getElementById('sme-file-import');

            if (btnExport) btnExport.onclick = async () => {
                if(activeView === 'text') saveProjectState(); 
                window.$GWC.showToast("正在执行内存深潜，解剖并打包所有资源，请勿关闭页面...", "info");
                
                const JSZip = await loadJSZip();
                const zip = new JSZip();
                const audioFolder = zip.folder("audio");
                
                let hasAudio = false;
                for (let c = 0; c < project.chapters.length; c++) {
                    const ch = project.chapters[c];
                    if (!ch.lines) continue;
                    for (let l = 0; l < ch.lines.length; l++) {
                        const line = ch.lines[l];
                        if (line.audioBlob instanceof Blob) {
                            try {
                                const b64 = await blobToBase64(line.audioBlob);
                                const b64Data = b64.includes(',') ? b64.split(',')[1] : b64;
                                const audioName = `audio_ch${c}_line${l}.mp3`;
                                audioFolder.file(audioName, b64Data, {base64: true});
                                line._audioRef = audioName; 
                                hasAudio = true;
                            } catch (e) { console.warn("音频转码失败跳过:", e); }
                        }
                    }
                }

                zip.file("project.json", JSON.stringify(project, null, 2));

                project.chapters.forEach(ch => {
                    if(ch.lines) ch.lines.forEach(l => { if (l._audioRef) delete l._audioRef; });
                });

                const usedChars = new Set();
                const usedBgs = new Set();
                const mappedSpriteSets = new Set();

                project.chapters.forEach(ch => { 
                    if (ch.isEnding && ch.endingBg) usedBgs.add(project.bgConfigs[ch.endingBg] || ch.endingBg);
                    if (ch.chapAnimBg) usedBgs.add(project.bgConfigs[ch.chapAnimBg] || ch.chapAnimBg);
                    if(ch.lines) ch.lines.forEach(l => { 
                        if (l.speaker && l.speaker !== '旁白') {
                            usedChars.add(l.speaker); 
                            if (project.charConfigs && project.charConfigs[l.speaker] && project.charConfigs[l.speaker].spriteSetId) {
                                mappedSpriteSets.add(project.charConfigs[l.speaker].spriteSetId);
                            }
                        }
                        if (l.forceSprite && l.forceSprite !== 'none') {
                            mappedSpriteSets.add(l.forceSprite.split(':::')[0]);
                        }
                        if (l.bg) usedBgs.add(project.bgConfigs[l.bg] || l.bg);
                        if (l.cg && l.cg !== 'clear') usedBgs.add(l.cg);
                    }); 
                });

                try {
                    const spriteFolder = zip.folder("sprites");
                    if (window.__allSpriteSets) {
                        window.__allSpriteSets.forEach(set => {
                            if (mappedSpriteSets.has(set.id) || usedChars.has(set.name) || usedChars.has(set.id)) {
                                set.sprites.forEach(sp => {
                                    if (sp.dataUrl) {
                                        const b64Data = sp.dataUrl.includes(',') ? sp.dataUrl.split(',')[1] : sp.dataUrl;
                                        spriteFolder.file(`${set.id}___${sp.name}.png`, b64Data, {base64: true});
                                    }
                                });
                            }
                        });
                    }
                } catch(e) { console.warn("立绘打包报错:", e); }

                try {
                    const bgFolder = zip.folder("backgrounds");
                    const bgs = await getMainBgs();
                    bgs.forEach(bg => {
                        if (usedBgs.has(bg.id) || usedBgs.has(bg.name)) {
                            const b64Data = bg.dataUrl.includes(',') ? bg.dataUrl.split(',')[1] : bg.dataUrl;
                            bgFolder.file(`${bg.id}___${bg.name || bg.id}.png`, b64Data, {base64: true});
                        }
                    });
                } catch(e) { console.warn("场景打包报错:", e); }

                window.$GWC.showToast("📦 资源封包完毕，正在生成下载...", "info");
                setTimeout(async () => {
                    try {
                        const content = await zip.generateAsync({type:"blob"});
                        const a = document.createElement("a"); a.href = URL.createObjectURL(content); a.download = `GWC_典藏工程_${project.name}.zip`;
                        document.body.appendChild(a); a.click(); document.body.removeChild(a);
                        window.$GWC.showToast("✅ 工程压缩包下载成功！", "success");
                    } catch (e) {
                        window.$GWC.showToast("生成压缩包失败：" + e.message, "error");
                    }
                }, 1000);
            };

            if (btnImport && fileInput) {
                btnImport.onclick = () => fileInput.click();
                fileInput.onchange = async (e) => {
                    if (!e.target.files[0]) return;
                    window.$GWC.showToast("📥 正在解包并向核心注入资源...", "info");
                    const JSZip = await loadJSZip();
                    try {
                        const zip = await JSZip.loadAsync(e.target.files[0]);
                        if (!zip.file("project.json")) throw new Error("缺失 project.json");
                        const importedProj = JSON.parse(await zip.file("project.json").async("string"));

                        if (zip.folder("audio")) {
                            for (let c = 0; c < importedProj.chapters.length; c++) {
                                const ch = importedProj.chapters[c];
                                if (!ch.lines) continue;
                                for (let l = 0; l < ch.lines.length; l++) {
                                    const line = ch.lines[l];
                                    if (line._audioRef) {
                                        const audioFile = zip.file(`audio/${line._audioRef}`);
                                        if (audioFile) {
                                            const b64 = await audioFile.async("base64");
                                            const byteCharacters = atob(b64);
                                            const byteNumbers = new Array(byteCharacters.length);
                                            for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                                            line.audioBlob = new Blob([new Uint8Array(byteNumbers)], {type: 'audio/mp3'});
                                        }
                                        delete line._audioRef; 
                                    }
                                }
                            }
                        }

                        const bgFiles = Object.keys(zip.files).filter(n => n.startsWith("backgrounds/") && n.endsWith(".png"));
                        const bgsToInject = [];
                        for (let name of bgFiles) {
                            const b64 = await zip.file(name).async("base64");
                            const rawName = name.replace('backgrounds/', '').replace('.png', '');
                            const parts = rawName.split('___');
                            bgsToInject.push({
                                id: parts[0],
                                name: parts[1] || parts[0],
                                dataUrl: `data:image/png;base64,${b64}`
                            });
                        }
                        // 上传背景图到服务端
                        const mid = getActiveMirrorId();
                        for (const bg of bgsToInject) {
                            const blob = await (await fetch(bg.dataUrl)).blob();
                            const fd = new FormData(); fd.append('file', blob, bg.name + '.png'); fd.append('id', bg.id); fd.append('name', bg.name);
                            await fetch(`${API_BASE}/api/userdata/${mid}/bg_images`, { method: 'POST', body: fd }).catch(() => {});
                        }

                        // 上传立绘到服务端
                        const spriteFiles = Object.keys(zip.files).filter(n => n.startsWith("sprites/") && n.endsWith(".png"));
                        const api = window.__GWC_API;
                        for (let name of spriteFiles) {
                            const b64 = await zip.file(name).async("base64");
                            const rawName = name.replace('sprites/', '').replace('.png', '');
                            const parts = rawName.split('___');
                            const spriteId = `${parts[0]}_${parts[1] || 'default'}`;
                            const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
                            const fd = new FormData(); fd.append('file', blob, `${spriteId}.png`);
                            await fetch(`${API_BASE}/api/userdata/${mid}/plugins/sprite_sets/${spriteId}/blob`, { method: 'POST', body: fd }).catch(() => {});
                            if (api) await api.setPluginJson('sprite_sets', spriteId, { id: spriteId, name: parts[0], sprites: [{ name: parts[1] || 'default' }] });
                        }

                        importedProj.id = getActiveMirrorId() + '_proj_' + Date.now();
                        importedProj.name = importedProj.name + ' (已解包)';
                        await ScriptDB.save(importedProj);

                        window.$GWC.showToast("🎉 资源与剧本全量注入成功！2秒后刷新...", "success");
                        setTimeout(() => window.location.reload(), 2000);
                    } catch (err) { alert("导入失败: " + err.message); }
                    fileInput.value = '';
                };
            }
        };

        requestAnimationFrame(() => modal.classList.remove('opacity-0')); 
        renderEditor(true); 
    };

    // ==========================================
    // 6. 全屏沉浸剧本播放器 (API 原生接管)
    // ==========================================
    let theaterState = { 
        active: false, project: null, chapterIdx: 0, lineIdx: 0, audioNode: null, bgs: [], 
        autoMode: false, ffMode: false, lastSpriteUrl: '', lastBgId: null, currentCg: null, visitedChapters: new Set(),
        hudInterval: null, skipChapterAnim: false, inSettlement: false, lastSpeaker: '',
        currentBgmNode: null, currentBgmId: null
    };

    const stopStoryPlayer = () => {
        theaterState.active = false;
        if (theaterState.audioNode) { theaterState.audioNode.pause(); theaterState.audioNode = null; }
        if (theaterState.currentBgmNode) { theaterState.currentBgmNode.pause(); theaterState.currentBgmNode = null; }
        clearInterval(typewriterTimer);
        if (theaterState.hudInterval) { clearInterval(theaterState.hudInterval); theaterState.hudInterval = null; }
        
        const overlay = document.getElementById('sm-choice-overlay'); if (overlay) overlay.remove();
        const mapOverlay = document.getElementById('sm-player-map-overlay'); if (mapOverlay) mapOverlay.remove();
        const hud = document.getElementById('sme-hud-group'); if (hud) hud.remove();
        
        const bar = document.querySelector('.w-full.flex.justify-end.mt-2 .flex.flex-wrap');
        if(bar) Array.from(bar.children).forEach(el => { if (el.textContent.includes('Auto(TTS)')) el.style.display = ''; });

        window.$GWC.updatePluginDialog({ visible: false, text: '' });
        window.$GWC.setPluginUI(null);

        if (typeof window.exitTheaterMode === 'function') window.exitTheaterMode();
        setTimeout(() => {
            let isClosed = false;
            document.querySelectorAll('button').forEach(btn => {
                const t = btn.innerText || ""; const h = btn.innerHTML || "";
                if (t.includes('主界面') || t.includes('退出') || h.includes('lucide-log-out') || h.includes('lucide-home')) {
                    btn.click(); isClosed = true;
                }
            });
            if (!isClosed) window.location.reload();
        }, 300);
    };

    const showChapterAnimation = (chapter, callback) => {
        const bgId = chapter.chapAnimBg ? (theaterState.project.bgConfigs[chapter.chapAnimBg] || chapter.chapAnimBg) : null;
        let bgUrl = '';
        if (bgId) {
            const bgData = theaterState.bgs.find(b => b.id === bgId);
            if (bgData) bgUrl = bgData.dataUrl;
        }
        const fontSizeStyle = chapter.chapTitleSize ? `font-size: ${chapter.chapTitleSize};` : 'font-size: 4rem;';
        const displayTitle = chapter.title || 'CHAPTER ' + (theaterState.chapterIdx + 1);

        const animOverlay = document.createElement('div');
        animOverlay.className = 'fixed inset-0 bg-black flex items-center justify-center z-[99999] transition-opacity duration-1000 opacity-0 pointer-events-none';
        
        animOverlay.innerHTML = `
            ${bgUrl ? `<div class="absolute inset-0 bg-cover bg-center opacity-40" style="background-image: url(${bgUrl})"></div>` : ''}
            <h1 class="relative text-white font-serif tracking-[0.5em] md:tracking-[1em] transform scale-95 transition-transform duration-[2500ms] ease-out opacity-0 text-center px-4 z-10" style="${fontSizeStyle}" id="sm-chap-anim-title">${displayTitle}</h1>
        `;
        document.body.appendChild(animOverlay);
        
        requestAnimationFrame(() => {
            animOverlay.classList.remove('opacity-0');
            setTimeout(() => {
                const text = document.getElementById('sm-chap-anim-title');
                if (text) {
                    text.classList.remove('opacity-0', 'scale-95');
                    text.classList.add('scale-100');
                }
                setTimeout(() => {
                    animOverlay.classList.add('opacity-0');
                    setTimeout(() => { animOverlay.remove(); callback(); }, 1000);
                }, 2500); 
            }, 800); 
        });
    };

    const showSettlement = (isEnding, chapter) => {
        if (isEnding && chapter) {
            const endingBgId = chapter.endingBg ? (theaterState.project.bgConfigs[chapter.endingBg] || chapter.endingBg) : null;
            const bgData = theaterState.bgs.find(b => b.id === endingBgId);
            const bgUrl = bgData ? bgData.dataUrl : '';
            
            const endOverlay = document.createElement('div');
            endOverlay.className = 'fixed inset-0 flex flex-col items-center justify-center z-[100000] bg-black bg-cover bg-center transition-opacity duration-1000 opacity-0 pointer-events-auto';
            if (bgUrl) endOverlay.style.backgroundImage = `url(${bgUrl})`;
            
            endOverlay.innerHTML = `
                <div class="absolute inset-0 ${bgUrl ? 'bg-black/60 backdrop-blur-sm' : 'bg-black'} z-0"></div>
                <div class="relative z-10 w-[90%] md:w-[80%] max-h-[70vh] overflow-y-auto hide-scrollbar flex flex-col items-center text-center px-4">
                    <p style="word-break: break-word;" class="text-white text-2xl md:text-5xl font-serif leading-loose tracking-widest whitespace-pre-wrap drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">${(chapter.endingText || '').replace(/\n/g, '<br/>')}</p>
                </div>
                <button class="absolute bottom-8 right-8 bg-white/20 hover:bg-white/40 text-white font-bold px-6 py-3 rounded-xl border border-white/30 backdrop-blur-md z-[200] text-sm tracking-widest transition-all outline-none" onclick="this.parentElement.remove(); window._triggerSettlementMenu();">点击继续 ➡</button>
            `;
            document.body.appendChild(endOverlay);
            requestAnimationFrame(() => endOverlay.classList.remove('opacity-0'));
            window._triggerSettlementMenu = () => renderSettlementMenu();
        } else {
            renderSettlementMenu();
        }
    };

    const renderSettlementMenu = () => {
        const menu = document.createElement('div');
        menu.className = 'fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-[100000] opacity-0 transition-opacity duration-500 pointer-events-auto';
        const now = new Date();
        const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
        
        menu.innerHTML = `
            <h1 class="text-5xl md:text-6xl text-white font-black tracking-[0.2em] mb-12 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">CLEAR</h1>
            <div class="flex flex-col gap-4 w-72 md:w-80 relative z-20">
                <button class="py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold tracking-widest text-base md:text-lg transition-colors border border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)] outline-none" onclick="window._settleAction('map')">🗺️ 查看流程图(回溯)</button>
                <button class="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold tracking-widest text-base md:text-lg transition-colors border border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] outline-none" onclick="window._settleAction('save')">💾 记录本次存档</button>
                <button class="py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold tracking-widest text-base md:text-lg transition-colors border border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] outline-none" onclick="window._settleAction('restart')">🔄 重新开始</button>
                <button class="py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold tracking-widest text-base md:text-lg transition-colors border border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.4)] outline-none" onclick="window._settleAction('exit')">🚪 返回主标题</button>
            </div>
            <div class="absolute bottom-6 right-8 text-white/40 text-xs md:text-sm font-mono tracking-wider">达成时间: ${dateStr}</div>
        `;
        document.body.appendChild(menu);
        requestAnimationFrame(() => menu.classList.remove('opacity-0'));
        
        window._settleAction = (action) => {
            if (action === 'map') {
                menu.style.display = 'none';
                theaterState.inSettlement = true; 
                showPlayerMap();
                const mapTimer = setInterval(() => {
                    const mapOverlay = document.getElementById('sm-player-map-overlay');
                    if (mapOverlay) {
                        clearInterval(mapTimer);
                        const closeBtn = mapOverlay.querySelector('#sm-map-close-btn');
                        if (closeBtn) {
                            closeBtn.onclick = (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                mapOverlay.remove();
                                menu.style.display = 'flex';
                                theaterState.inSettlement = false;
                            };
                        }
                    }
                }, 100);
            } else if (action === 'save') {
                menu.style.display = 'none';
                openStorySaveLoadUI('save');
                const saveTimer = setInterval(() => {
                    if (!document.getElementById('sm-story-save-ui')) {
                        clearInterval(saveTimer);
                        menu.style.display = 'flex';
                    }
                }, 500);
            } else if (action === 'restart') {
                menu.remove();
                startStoryPlayer(theaterState.project, 0, 0);
            } else if (action === 'exit') {
                menu.remove();
                stopStoryPlayer();
            }
        };
    };

   // 修复：废弃旧版时光地图，将编辑模式的UI复刻于此，保留原始图节点美学，禁用编辑能力并保留背景替换
 // 修复：重新实现播放模式下的地图逻辑，改为全屏独立页面，且强制使用人工连线
    const showPlayerMap = () => {
        let mapOverlay = document.getElementById('sm-player-map-overlay');
        if (mapOverlay) return mapOverlay.remove();
        
        mapOverlay = document.createElement('div');
        mapOverlay.id = 'sm-player-map-overlay';
        // 彻底全屏：强制写入内联底色防 Tailwind 漏编译导致全透明
        mapOverlay.className = 'fixed inset-0 flex justify-center items-center pointer-events-auto';
        mapOverlay.style.cssText = 'background-color: #0f172a; z-index: 2147483647;';
        
        const nodesHtml = theaterState.project.chapters.map((ch, idx) => {
            const isVisited = theaterState.visitedChapters && theaterState.visitedChapters.has(idx);
            const isCurrent = theaterState.chapterIdx === idx;
            const isEndingNode = ch.isEnding;

            const cardTheme = isEndingNode ? 'background-color: rgba(46,8,19,0.95) !important; border-color: #be123c !important;' : '';
            const activeGlow = isCurrent ? 'box-shadow: 0 0 25px rgba(245,158,11,0.6); border-color: #f59e0b !important; z-index: 100;' : (isVisited ? 'cursor: pointer; z-index: 90;' : 'opacity: 0.5; filter: grayscale(1); z-index: 80;');

            const choiceBlock = ch.lines && ch.lines.find(l => l.type === 'choice');
            let portsHtml = '';
            if (!isEndingNode) {
                if (choiceBlock && choiceBlock.choices && choiceBlock.choices.length > 0) {
                    portsHtml = choiceBlock.choices.map((opt, oIdx) => `
                        <div class="sme-port-out choice group" style="top: ${65 + oIdx * 25}px; pointer-events: none;"></div>
                    `).join('');
                } else {
                    portsHtml = `<div class="sme-port-out default group" style="pointer-events: none; background-color: #ef4444;"></div>`;
                }
            }

          return `
            <div class="sme-map-node-card sme-node-card absolute p-4 flex flex-col transition-all hover:-translate-y-1"
                 style="width: 220px; left: ${5000 + (ch.x || 0)}px; top: ${5000 + (ch.y || 0)}px; min-height: ${choiceBlock ? 60 + choiceBlock.choices.length * 25 : 90}px; ${cardTheme} ${activeGlow}" data-idx="${idx}">
                <div style="color: ${isEndingNode ? '#f43f5e' : '#94a3b8'};" class="text-[10px] font-bold mb-2 tracking-widest flex justify-between pointer-events-none">
                    <span>${isEndingNode ? '🏁 ENDING' : 'CHAPTER ' + (idx + 1)}</span>
                    ${idx === 0 && !isEndingNode ? '<span style="color: #34d399;">🏁 START</span>' : ''}
                </div>
                <div class="text-white font-black text-lg truncate flex-1 pointer-events-none" style="font-family: serif; letter-spacing: 0.1em;">${ch.title || '未命名章节'}</div>
                ${!isVisited ? '<div class="absolute inset-0 flex justify-center items-center backdrop-blur-sm bg-black/60 rounded-xl"><span class="text-2xl drop-shadow-md">🔒</span></div>' : ''}
                ${isCurrent ? '<div class="absolute -top-4 -right-4 text-3xl animate-bounce drop-shadow-lg">📍</div>' : ''}
                
                <div class="sme-port-in" style="pointer-events: none;"></div>
                ${portsHtml}
            </div>
            `;
        }).join('');
        
        let paths = `<defs>
            <marker id="arrowhead_gwc_dlc_434" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f59e0b"/></marker>
            <marker id="arrowhead_def_gwc_dlc_434" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#ef4444"/></marker>
        </defs>`;
        
const resolveTargetCh = (target, currentIdx) => {
            if (target === 'END') return null;
            if (!target || target === 'CONTINUE') { return null; /* 强制人工连线：切断播放路线图内视觉上的自动排队连线 */ }
            if (target.startsWith('ch_')) return theaterState.project.chapters.find(c => c.id === target);
            for (const c of theaterState.project.chapters) { if (c.lines && c.lines.some(l => l.type === 'label' && l.labelId === target)) return c; } return null;
        };

        theaterState.project.chapters.forEach((ch, idx) => {
            if (ch.isEnding) return;
            
            const isVisited = theaterState.visitedChapters && theaterState.visitedChapters.has(idx);
            const lineOpacity = isVisited ? "1" : "0.3";
            const lineDash = isVisited ? "" : "stroke-dasharray='5,5'";

            if (!ch.lines || ch.lines.length === 0) {
                const targetCh = resolveTargetCh('CONTINUE', idx);
                if (targetCh) {
                    const x1 = 5000 + (ch.x || 0) + 227; const y1 = 5000 + (ch.y || 0) + 67;
                    const x2 = 5000 + (targetCh.x || 0) - 7; const y2 = 5000 + (targetCh.y || 0) + 47;
                    const cx1 = x1 + Math.max(50, Math.abs(x2 - x1) * 0.4); const cx2 = x2 - Math.max(50, Math.abs(x2 - x1) * 0.4);
                    paths += `<path d="M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}" stroke="#ef4444" stroke-width="3" fill="none" opacity="${lineOpacity}" ${lineDash} marker-end="url(#arrowhead_def_gwc_dlc_434)"/>`;
                }
                return;
            }

            const choiceBlock = ch.lines.find(l => l.type === 'choice');
            if (choiceBlock && choiceBlock.choices) {
                choiceBlock.choices.forEach((opt, oIdx) => {
                    const targetCh = resolveTargetCh(opt.target, idx);
                    if (targetCh) {
                        const x1 = 5000 + (ch.x || 0) + 227; const y1 = 5000 + (ch.y || 0) + 65 + oIdx * 25 + 7; 
                        const x2 = 5000 + (targetCh.x || 0) - 7; const y2 = 5000 + (targetCh.y || 0) + 47; 
                        const cx1 = x1 + Math.max(50, Math.abs(x2 - x1) * 0.4); const cx2 = x2 - Math.max(50, Math.abs(x2 - x1) * 0.4);
                        paths += `<path d="M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}" stroke="#f59e0b" stroke-width="3" fill="none" opacity="${lineOpacity}" ${lineDash} marker-end="url(#arrowhead_gwc_dlc_434)"/>`;
                    }
                });
            } else {
                const jumpBlock = ch.lines.find(l => l.type === 'jump');
                const targetVal = jumpBlock ? jumpBlock.target : 'CONTINUE';
                const targetCh = resolveTargetCh(targetVal, idx);
                if (targetCh) {
                    const x1 = 5000 + (ch.x || 0) + 227; const y1 = 5000 + (ch.y || 0) + 67;
                    const x2 = 5000 + (targetCh.x || 0) - 7; const y2 = 5000 + (targetCh.y || 0) + 47;
                    const cx1 = x1 + Math.max(50, Math.abs(x2 - x1) * 0.4); const cx2 = x2 - Math.max(50, Math.abs(x2 - x1) * 0.4);
                    paths += `<path d="M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}" stroke="#ef4444" stroke-width="3" fill="none" opacity="${lineOpacity}" ${lineDash} marker-end="url(#arrowhead_def_gwc_dlc_434)"/>`;
                }
            }
        });
        
      mapOverlay.innerHTML = `
            <div class="w-full h-full overflow-hidden relative pointer-events-auto" id="sm-player-map-container" style="background-color: #0f172a; ${theaterState.project.flowBg ? `background-image: url(${theaterState.project.flowBg}); background-size: cover; background-position: center;` : `background-image: radial-gradient(#334155 1px, transparent 1px); background-size: 20px 20px;`}; z-index: 9999999;">
                <div class="absolute top-6 left-6 text-white font-black text-2xl drop-shadow-md flex items-center gap-2 bg-black/60 px-4 py-2 rounded-xl backdrop-blur pointer-events-none border border-white/10" style="z-index: 200;">🗺️ 时光路线图 (独立全屏页面)</div>
                <button type="button" id="sm-map-close-btn" class="absolute top-6 right-6 w-12 h-12 bg-rose-500 hover:bg-rose-400 text-white rounded-full flex justify-center items-center shadow-lg transition-colors cursor-pointer border-2 border-rose-300 outline-none" style="z-index: 200;">✖</button>
                
                <div class="absolute bottom-6 left-1/2 -translate-x-1/2 text-indigo-200 font-bold text-sm bg-black/80 px-6 py-2 rounded-full backdrop-blur pointer-events-none shadow-md border border-indigo-500/30" style="z-index: 200;">${theaterState.inSettlement ? '👆 请点击发光的卡片，您将跳跃时间线回到过去' : '👆 您只能点击「已解锁」的亮色卡片进行时光回溯'}</div>
                
                <div class="absolute bottom-6 right-6 flex gap-3 pointer-events-auto" style="z-index: 200;">
                    <button id="sme-map-bg-btn" onclick="document.getElementById('sme-map-bg-upload').click()" class="w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer outline-none" title="导入或更换流程图背景图">🖼️</button>
                    <button id="sme-map-bg-clear" class="w-12 h-12 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer outline-none" title="清除背景图">🗑️</button>
                    <button id="sme-map-reset" class="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center shadow-lg border border-slate-600 transition-colors cursor-pointer outline-none" title="复位画布">🎯</button>
                    <input type="file" id="sme-map-bg-upload" accept="image/*" class="hidden" />
                </div>

                <div id="sm-player-map-canvas" class="absolute origin-top-left" style="opacity: 0; transition: opacity 0.3s; width: 10000px; height: 10000px; left: -5000px; top: -5000px; z-index: 10;">
                     <svg class="absolute inset-0 w-full h-full pointer-events-none z-[5]" style="overflow: visible;">${paths}</svg>
                     ${nodesHtml}
                </div>
            </div>
        `;
        document.body.appendChild(mapOverlay);

        const closeBtn = mapOverlay.querySelector('#sm-map-close-btn');
        if (closeBtn) {
            closeBtn.onmousedown = (e) => { e.stopPropagation(); e.preventDefault(); };
            closeBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); mapOverlay.remove(); };
        }
        
        // 绑定底部按钮背景控制
        const bgInput = mapOverlay.querySelector('#sme-map-bg-upload');
        if (bgInput) {
            bgInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    theaterState.project.flowBg = ev.target.result;
                    ScriptDB.save(theaterState.project);
                    document.getElementById('sm-player-map-container').style.backgroundImage = `url(${ev.target.result})`;
                    document.getElementById('sm-player-map-container').style.backgroundSize = 'cover';
                };
                reader.readAsDataURL(file);
                bgInput.value = '';
            };
        }
        const bgClear = mapOverlay.querySelector('#sme-map-bg-clear');
        if (bgClear) {
            bgClear.onclick = (e) => {
                e.stopPropagation();
                if (theaterState.project.flowBg) {
                    theaterState.project.flowBg = null;
                    ScriptDB.save(theaterState.project);
                    document.getElementById('sm-player-map-container').style.backgroundImage = `radial-gradient(#334155 1px, transparent 1px)`;
                    document.getElementById('sm-player-map-container').style.backgroundSize = '20px 20px';
                }
            };
        }
        
        window.jumpToChapter = (idx) => {
            if (theaterState.inSettlement) {
                const menu = document.querySelector('.fixed.inset-0.bg-black\\/80');
                if (menu) menu.remove();
                theaterState.inSettlement = false;
            }
            if (confirm('⏳ 警告：时光回溯后，将强制覆盖当前正在进行的剧情状态。确定要跳回该章节吗？')) {
                mapOverlay.remove();
                theaterState.chapterIdx = idx;
                theaterState.lineIdx = 0;
                theaterState.skipChapterAnim = false;
                playNextTheaterLine();
            }
        };

        mapOverlay.querySelectorAll('.sme-map-node-card').forEach(card => {
            card.onclick = (e) => {
                e.stopPropagation();
                const idx = parseInt(card.getAttribute('data-idx'));
                if (theaterState.visitedChapters.has(idx) && theaterState.chapterIdx !== idx) {
                    window.jumpToChapter(idx);
                }
            };
        });
        
        let pTransform = { x: 0, y: 0, scale: 1 };
        const pContainer = document.getElementById('sm-player-map-container');
        const pCanvas = document.getElementById('sm-player-map-canvas');
        
       const resetCanvas = () => {
            const curCh = theaterState.project.chapters[theaterState.chapterIdx];
            if (curCh) {
                const rect = pContainer.getBoundingClientRect();
                // 修复：致命坐标系漏洞！原本的数学公式多减去了 5000，导致整个画布被推移到负 1 万像素外。现已精准归中
                pTransform.x = (rect.width / 2) - (curCh.x || 0) - 110; 
                pTransform.y = (rect.height / 2) - (curCh.y || 0) - 45; 
                pTransform.scale = 1;
                pCanvas.style.transform = `translate(${pTransform.x}px, ${pTransform.y}px) scale(${pTransform.scale})`;
            }
        };
        
        setTimeout(() => {
            resetCanvas();
            pCanvas.style.opacity = '1';
        }, 50);

        const resetBtn = mapOverlay.querySelector('#sme-map-reset');
        if (resetBtn) {
            resetBtn.onclick = (e) => { e.stopPropagation(); resetCanvas(); };
        }

        let isPanning = false; let startX, startY;
        pContainer.onmousedown = (e) => {
            if (e.target.closest('.sme-map-node-card') || e.target.closest('button')) return;
            isPanning = true; startX = e.clientX - pTransform.x; startY = e.clientY - pTransform.y;
        };
        pContainer.onmousemove = (e) => {
            if(isPanning) { 
                pTransform.x = e.clientX - startX; pTransform.y = e.clientY - startY; 
                pCanvas.style.transform = `translate(${pTransform.x}px, ${pTransform.y}px) scale(${pTransform.scale})`; 
            }
        };
        pContainer.onmouseup = () => { isPanning = false; };
        pContainer.onmouseleave = () => { isPanning = false; };
        pContainer.onwheel = (e) => {
            e.preventDefault();
            const xs = (e.clientX - pTransform.x) / pTransform.scale; const ys = (e.clientY - pTransform.y) / pTransform.scale;
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            pTransform.scale = Math.min(Math.max(0.2, pTransform.scale * zoomFactor), 2);
            pTransform.x = e.clientX - xs * pTransform.scale; pTransform.y = e.clientY - ys * pTransform.scale;
            pCanvas.style.transform = `translate(${pTransform.x}px, ${pTransform.y}px) scale(${pTransform.scale})`;
        };
    };

    const showChoiceOverlay = (choices, chapter) => {
        let overlay = document.getElementById('sm-choice-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'sm-choice-overlay';
        overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-md flex flex-col justify-center items-center pointer-events-auto gap-4 p-4 transition-opacity duration-300 opacity-0';
        overlay.style.zIndex = '95000';
        
        choices.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'w-full max-w-md py-4 px-6 bg-[#fdfaf5]/90 hover:bg-white text-[#ba3f42] text-lg font-black tracking-widest rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.4)] border-[3px] border-[#d9c5b2] hover:border-[#ba3f42] hover:-translate-y-1 transition-all cursor-pointer';
            btn.innerText = opt.text || '...';
            btn.onclick = () => {
                overlay.remove();
                if (opt.target === 'END') {
                    window.$GWC.updatePluginDialog({ visible: false, text: '' });
                    showSettlement(false, null);
                } else if (opt.target === 'CONTINUE' || !opt.target) {
                    theaterState.lineIdx++; playNextTheaterLine();
                } else if (opt.target.startsWith('ch_')) {
                    const targetChIdx = theaterState.project.chapters.findIndex(c => c.id === opt.target);
                    if (targetChIdx !== -1) { theaterState.chapterIdx = targetChIdx; theaterState.lineIdx = 0; theaterState.skipChapterAnim = false; playNextTheaterLine(); } 
                    else { window.$GWC.showToast("⚠️ 跳转错误：找不到目标章节", "error"); theaterState.lineIdx++; playNextTheaterLine(); }
                } else {
                    const targetIdx = chapter.lines.findIndex(l => l.type === 'label' && l.labelId === opt.target);
                    if (targetIdx !== -1) { theaterState.lineIdx = targetIdx + 1; playNextTheaterLine(); } 
                    else { window.$GWC.showToast("⚠️ 跳转错误：找不到目标节点", "error"); theaterState.lineIdx++; playNextTheaterLine(); }
                }
            };
            overlay.appendChild(btn);
        });
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.remove('opacity-0'));
    };

    const injectPlayerHUD = () => {
        const bar = document.querySelector('.w-full.flex.justify-end.mt-2 .flex.flex-wrap');
        if (bar && !document.getElementById('sme-hud-group')) {
            const group = document.createElement('div');
            group.id = 'sme-hud-group';
            group.className = 'flex items-center gap-3 ml-2 pl-3 border-l border-white/20 pointer-events-auto';
            group.innerHTML = `
                <button type="button" id="sme-hud-map" class="text-indigo-300 hover:text-white transition-colors flex items-center gap-1 font-bold text-sm cursor-pointer outline-none" title="剧情路线图"><span class="text-lg">🗺️</span>路线图</button>
                <button type="button" id="sme-hud-save" class="text-emerald-300 hover:text-white transition-colors flex items-center gap-1 font-bold text-sm cursor-pointer outline-none" title="保存剧情进度"><span class="text-lg">💾</span>存档</button>
                <button type="button" id="sme-hud-load" class="text-emerald-300 hover:text-white transition-colors flex items-center gap-1 font-bold text-sm cursor-pointer outline-none" title="读取剧情进度"><span class="text-lg">📂</span>读档</button>
                <button type="button" id="sme-hud-auto" class="text-white/80 transition-colors flex items-center gap-1 font-bold text-sm cursor-pointer outline-none" title="自动播放"><span class="text-lg">▶</span>自动</button>
                <button type="button" id="sme-hud-ff" class="text-white/80 transition-colors flex items-center gap-1 font-bold text-sm cursor-pointer outline-none" title="5x快进"><span class="text-lg">⏩</span>快进</button>
            `;
            bar.appendChild(group);

            Array.from(bar.children).forEach(el => {
                if (el.textContent.includes('Auto(TTS)')) el.style.display = 'none';
            });

            const stopProp = (e) => { e.preventDefault(); e.stopPropagation(); };
            
            const mapBtn = group.querySelector('#sme-hud-map');
            mapBtn.onmousedown = stopProp;
            mapBtn.onclick = (e) => { stopProp(e); showPlayerMap(); };

            const saveBtn = group.querySelector('#sme-hud-save');
            saveBtn.onmousedown = stopProp;
            saveBtn.onclick = (e) => { stopProp(e); openStorySaveLoadUI('save'); };

            const loadBtn = group.querySelector('#sme-hud-load');
            loadBtn.onmousedown = stopProp;
            loadBtn.onclick = (e) => { stopProp(e); openStorySaveLoadUI('load'); };
            
            const autoBtn = group.querySelector('#sme-hud-auto');
            autoBtn.onmousedown = stopProp;
            autoBtn.onclick = (e) => {
                stopProp(e);
                theaterState.autoMode = !theaterState.autoMode;
                e.currentTarget.style.color = theaterState.autoMode ? '#34d399' : '';
                if(theaterState.autoMode && !isTypewriting) playNextTheaterLine();
            };
            
            const ffBtn = group.querySelector('#sme-hud-ff');
            ffBtn.onmousedown = stopProp;
            ffBtn.onclick = (e) => {
                stopProp(e);
                theaterState.ffMode = !theaterState.ffMode;
                e.currentTarget.style.color = theaterState.ffMode ? '#fbbf24' : '';
                theaterState.autoMode = theaterState.ffMode;
                const autoUIBtn = document.getElementById('sme-hud-auto');
                if (autoUIBtn) autoUIBtn.style.color = theaterState.autoMode ? '#34d399' : '';
                
                if(theaterState.audioNode) theaterState.audioNode.playbackRate = theaterState.ffMode ? 5.0 : (window.$GWC.getSettings().ttsPlaybackRate || 1.0);
                if(theaterState.ffMode && !isTypewriting) playNextTheaterLine();
            };
        }
    };

    const startStoryPlayer = async (project, startChapterIdx = 0, startLineIdx = 0) => {
        theaterState.project = project; theaterState.chapterIdx = startChapterIdx; theaterState.lineIdx = startLineIdx;
        theaterState.bgs = await getMainBgs(); theaterState.active = true; theaterState.autoMode = false; theaterState.ffMode = false;
        theaterState.lastSpriteUrl = ''; theaterState.currentCg = null; theaterState.lastBgId = null;
        theaterState.visitedChapters = new Set([startChapterIdx]);
        theaterState.skipChapterAnim = false;
        theaterState.inSettlement = false;
        theaterState.lastSpeaker = ''; // 记录上一次说话的人
        
        theaterState.project.chapters.forEach((ch, idx) => {
            if (ch.x === undefined) ch.x = (idx % 5) * 300;
            if (ch.y === undefined) ch.y = Math.floor(idx / 5) * 200;
        });

        const hub = document.getElementById('sm-story-selector'); if (hub) hub.remove();
        const editor = document.getElementById('sm-editor-modal'); if (editor) editor.remove();
        const settingsCloseBtn = document.querySelector('.bg-\\[\\#efe6d5\\] button.border-l'); if (settingsCloseBtn) settingsCloseBtn.click();

        const allNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        while (allNodes.nextNode()) {
            if (allNodes.currentNode.nodeValue.trim() === 'CONTINUE') { allNodes.currentNode.parentElement.click(); break; }
            if (allNodes.currentNode.nodeValue.trim() === 'START') { allNodes.currentNode.parentElement.click(); break; }
        }

        theaterState.hudInterval = setInterval(injectPlayerHUD, 500);
        setTimeout(() => { window.$GWC.setPluginUI('story_mode_dlc'); playNextTheaterLine(); }, 100);
    };

    let typewriterTimer = null;
    let isTypewriting = false;
    let currentFullText = "";

    const playNextTheaterLine = async () => {
        if (!theaterState.active) return;
        if (isTypewriting) {
            clearInterval(typewriterTimer); window.$GWC.updatePluginDialog({ text: currentFullText, typing: false }); isTypewriting = false;
            if (theaterState.autoMode) setTimeout(playNextTheaterLine, theaterState.ffMode ? 200 : 2000);
            return;
        }

        const proj = theaterState.project;
        if (theaterState.chapterIdx >= proj.chapters.length) {
            window.$GWC.updatePluginDialog({ visible: false, text: '' });
            showSettlement(false, null);
            return;
        }

    // ✨ 自动拦截并触发主角自定义名称替换（在内存层面执行，绝对不会污染原始工程数据）
        if (proj.protagonistEnabled && proj.protagonistId && !proj.customProtagonistNameSet) {
            proj.customProtagonistNameSet = true; // 防御性标记，单次剧本生命周期内只触发一次
            
            // 如果没读档导致未赋值，说明这是真正的从头开始新游戏，拉起弹窗
            if (!proj.customProtagonistName) {
                const customName = prompt(`✨ 角色定制系统 ✨\n请输入您在游戏中想使用的名字：\n（如果不输入，将默认使用预设名：${proj.protagonistId}）`, proj.protagonistId);
                if (customName && customName.trim() !== '' && customName.trim() !== proj.protagonistId) {
                    proj.customProtagonistName = customName.trim();
                }
            }
            
            // 执行全局文本替换矩阵（深拷贝替换运行时数据）
            if (proj.customProtagonistName && proj.customProtagonistName !== proj.protagonistId) {
                const newName = proj.customProtagonistName;
                proj.chapters.forEach(ch => {
                    if (ch.lines) {
                        ch.lines.forEach(l => {
                            // 替换说话人名称
                            if (l.speaker === proj.protagonistId) l.speaker = newName;
                            // 替换对白文本
                            if (l.text) l.text = l.text.replace(new RegExp(proj.protagonistId, 'g'), newName);
                            // 替换选项按钮文本
                            if (l.choices) l.choices.forEach(opt => { if (opt.text) opt.text = opt.text.replace(new RegExp(proj.protagonistId, 'g'), newName); });
                        });
                    }
                });
                // 同步角色立绘/声学配置以防替换后变瞎变哑
                if (proj.charConfigs && proj.charConfigs[proj.protagonistId]) {
                    proj.charConfigs[newName] = JSON.parse(JSON.stringify(proj.charConfigs[proj.protagonistId]));
                }
            }
        }

        theaterState.visitedChapters.add(theaterState.chapterIdx);
        const chapter = proj.chapters[theaterState.chapterIdx];

        if (chapter.isEnding) {
            window.$GWC.updatePluginDialog({ visible: false, text: '' });
            showSettlement(true, chapter);
            return;
        }

        if (theaterState.lineIdx === 0 && !theaterState.skipChapterAnim) {
            theaterState.skipChapterAnim = true; 
            showChapterAnimation(chapter, playNextTheaterLine);
            return;
        }

        // 🎵 BGM 控制器
        const playBgm = (bgmId) => {
            if (bgmId === 'stop' || !bgmId) {
                if (theaterState.currentBgmNode) { theaterState.currentBgmNode.pause(); theaterState.currentBgmNode = null; }
                theaterState.currentBgmId = null;
                return;
            }
            if (theaterState.currentBgmId === bgmId) return;
            const api = window.__GWC_API;
            if (api) {
                const url = api.getPluginBlobUrl('audio', bgmId);
                if (theaterState.currentBgmNode) theaterState.currentBgmNode.pause();
                theaterState.currentBgmNode = new Audio(url);
                theaterState.currentBgmNode.loop = true;
                theaterState.currentBgmNode.play().catch(err=>{});
                theaterState.currentBgmId = bgmId;
            }
        };

        // 触发章节级音乐
        if (theaterState.lineIdx === 0 && chapter.chapBgm) playBgm(chapter.chapBgm);

        if (theaterState.lineIdx >= chapter.lines.length) { 
            theaterState.chapterIdx++; 
            theaterState.lineIdx = 0; 
            theaterState.skipChapterAnim = false; 
            playNextTheaterLine(); 
            return; 
        }

        const line = chapter.lines[theaterState.lineIdx];
        const type = line.type || 'dialogue';

        // 触发台词级音乐覆盖
        if (line.bgm && line.bgm !== 'inherit') playBgm(line.bgm);

        if (type === 'label') { theaterState.lineIdx++; playNextTheaterLine(); return; }

        if (type === 'jump') {
            if (line.target === 'END') {
                window.$GWC.updatePluginDialog({ visible: false, text: '' });
                showSettlement(false, null);
            } else if (line.target === 'CONTINUE' || !line.target) {
                theaterState.lineIdx++; playNextTheaterLine();
            } else if (line.target.startsWith('ch_')) {
                const targetChIdx = proj.chapters.findIndex(c => c.id === line.target);
                if (targetChIdx !== -1) { theaterState.chapterIdx = targetChIdx; theaterState.lineIdx = 0; theaterState.skipChapterAnim = false; playNextTheaterLine(); } 
                else { window.$GWC.showToast("⚠️ 跳转错误", "error"); theaterState.lineIdx++; playNextTheaterLine(); }
            } else {
                const targetIdx = chapter.lines.findIndex(l => l.type === 'label' && l.labelId === line.target);
                if (targetIdx !== -1) { theaterState.lineIdx = targetIdx + 1; playNextTheaterLine(); } 
                else { window.$GWC.showToast("⚠️ 跳转错误", "error"); theaterState.lineIdx++; playNextTheaterLine(); }
            }
            return;
        }

        if (type === 'choice') {
            theaterState.autoMode = false; clearInterval(typewriterTimer);
            const autoBtn = document.getElementById('sme-hud-auto'); if(autoBtn) autoBtn.style.color = '';
            const choices = line.choices && line.choices.length > 0 ? line.choices : [{text: '继续', target: 'CONTINUE'}];
            showChoiceOverlay(choices, chapter); return;
        }

        const spkConf = theaterState.project.charConfigs[line.speaker] || {};
        
        let targetBgId = line.bg;
        if (targetBgId && targetBgId !== 'inherit') {
            if (theaterState.project.customScenes) {
                const sc = theaterState.project.customScenes.find(s => s.id === targetBgId);
                if (sc) targetBgId = sc.bgId;
            }
            theaterState.lastBgId = theaterState.project.bgConfigs[targetBgId] || targetBgId;
        }
        
        if (line.cg) { if (line.cg === 'clear') theaterState.currentCg = null; else theaterState.currentCg = line.cg; }

        let finalSpriteUrl = '';
        let currentSpeaker = line.speaker || '旁白';
        
        // ⚡ V4.35 终极双层判定逻辑：强制指定 > 自动匹配 > 旁白无立绘
        if (line.forceSprite === 'none') {
            finalSpriteUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; 
        } else if (line.forceSprite && line.forceSprite.includes(':::')) {
            const [setId, spName] = line.forceSprite.split(':::');
            if (window.__allSpriteSets) {
                const set = window.__allSpriteSets.find(s => s.id === setId);
                if (set) {
                    const targetSprite = set.sprites.find(s => s.name === spName);
                    if (targetSprite) finalSpriteUrl = targetSprite.dataUrl;
                }
            }
        } else {
            if (currentSpeaker && currentSpeaker !== '旁白') {
                if (spkConf.spriteSetId && window.__allSpriteSets) {
                    const set = window.__allSpriteSets.find(s => s.id === spkConf.spriteSetId);
                    if (set) { 
                        let targetSprite = set.sprites.find(s => s.name === line.emotion) || set.sprites[0]; 
                        if (targetSprite) finalSpriteUrl = targetSprite.dataUrl; 
                    }
                }
                
                if (finalSpriteUrl === '' && currentSpeaker !== theaterState.lastSpeaker) {
                    // 如果新角色说话且没找到立绘，必须清空，绝不继承上一个人的幽灵立绘
                    finalSpriteUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                }
            } else {
                finalSpriteUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            }
        }

        if (finalSpriteUrl !== '') {
            theaterState.lastSpriteUrl = finalSpriteUrl;
        } else {
            finalSpriteUrl = theaterState.lastSpriteUrl; // 同一个人继续说话，继承立绘
        }

        theaterState.lastSpeaker = currentSpeaker; 
        
        let targetBgUrl = '';

        if (theaterState.currentCg) { const cgData = theaterState.bgs.find(b => b.id === theaterState.currentCg); if (cgData) targetBgUrl = cgData.dataUrl; finalSpriteUrl = ''; } 
        else if (theaterState.lastBgId) { const bgData = theaterState.bgs.find(b => b.id === theaterState.lastBgId); if (bgData) targetBgUrl = bgData.dataUrl; }

        currentFullText = line.text; isTypewriting = true; let charIdx = 0; clearInterval(typewriterTimer);
        
        window.$GWC.updatePluginDialog({ visible: true, speaker: line.speaker === '旁白' ? '' : line.speaker, text: '', bgUrl: targetBgUrl, spriteUrl: finalSpriteUrl, typing: true });
        
        if (theaterState.audioNode) { theaterState.audioNode.pause(); theaterState.audioNode = null; }

        const playRate = theaterState.ffMode ? 5.0 : (window.$GWC.getSettings().ttsPlaybackRate || 1.0);

        if (line.audioBlob) { 
            const audioUrl = URL.createObjectURL(line.audioBlob); 
            theaterState.audioNode = new Audio(audioUrl); 
            theaterState.audioNode.playbackRate = playRate;
            theaterState.audioNode.play().catch(e => {}); 
        } 
        else if (line.speaker !== '旁白' && theaterState.project.charConfigs[line.speaker]?.refAudio && window.$GWC.getSettings().ttsEnabled) {
            const spkConf = theaterState.project.charConfigs[line.speaker];
            const s = window.$GWC.getSettings(); let apiBase = "http://127.0.0.1:9880"; try { apiBase = new URL(s.ttsUrlTemplate).origin; } catch(e) {}
            try {
                if (spkConf.gptModel) await fetch(`${apiBase}/set_gpt_weights?weights_path=${safePathEncode(spkConf.gptModel)}`);
                if (spkConf.sovitsModel) await fetch(`${apiBase}/set_sovits_weights?weights_path=${safePathEncode(spkConf.sovitsModel)}`);
                let url = s.ttsUrlTemplate.replace('{text}', encodeURIComponent(line.text)).replace('{lang}', encodeURIComponent(s.ttsLanguage || 'zh')).replace('{ref_audio}', safePathEncode(spkConf.refAudio)).replace('{ref_text}', encodeURIComponent(spkConf.refText || ''))
                    .replace('{ref_lang}', encodeURIComponent(spkConf.refLang || 'zh'));
                url += `&speed_factor=${spkConf.speedFactor || 1.0}&text_split_method=${spkConf.textSplitMethod || 'cut5'}`;
                const modelVersion = spkConf.modelVersion || 'V2ProPlus';
                if (modelVersion === 'V4' || modelVersion.includes('ProPlus')) url += `&sample_steps=${spkConf.sampleSteps || 32}`;
                
                theaterState.audioNode = new Audio(url); 
                theaterState.audioNode.playbackRate = playRate;
                theaterState.audioNode.play().catch(e => {});
            } catch(e) {}
        }

        const typingSpeed = theaterState.ffMode ? 5 : (window.$GWC.getSettings().typingSpeed || 40);
        if (theaterState.skipMode) {
            window.$GWC.updatePluginDialog({ text: currentFullText, typing: false }); isTypewriting = false; setTimeout(playNextTheaterLine, theaterState.ffMode ? 100 : 200);
        } else {
            typewriterTimer = setInterval(() => {
                const currentText = currentFullText.substring(0, charIdx + 1); charIdx++;
                let isFinished = charIdx >= currentFullText.length;
                window.$GWC.updatePluginDialog({ text: currentText, typing: !isFinished });
                if (isFinished) {
                    clearInterval(typewriterTimer); isTypewriting = false;
                    if (theaterState.autoMode) { if (theaterState.audioNode && !theaterState.audioNode.ended) theaterState.audioNode.onended = () => setTimeout(playNextTheaterLine, theaterState.ffMode ? 100 : 500); else setTimeout(playNextTheaterLine, theaterState.ffMode ? 200 : 1500); }
                }
            }, typingSpeed);
        }
        theaterState.lineIdx++;
    };

    window.addEventListener('gwc-dialog-click', () => { if (theaterState.active) playNextTheaterLine(); });
    window.addEventListener('gwc-escape', (e) => { if (!theaterState.active) return; const ui = document.getElementById('sm-story-save-ui'); if (ui) { e.preventDefault(); ui.remove(); } });
    window.addEventListener('gwc-force-stop-plugin', () => { if (theaterState.active) stopStoryPlayer(); });

    const openStorySaveLoadUI = async (mode) => {
        let ui = document.getElementById('sm-story-save-ui');
        if (ui) ui.remove();

        const saves = await SaveDB.getAll();
        const slots = {};
        saves.forEach(s => {
            const numMatch = s.id.match(/_slot_(\d+)$/);
            if (numMatch) slots[parseInt(numMatch[1], 10)] = s;
        });

        ui = document.createElement('div');
        ui.id = 'sm-story-save-ui';
        ui.className = 'fixed inset-0 bg-gradient-to-b from-[#87CEEB] to-[#E0F6FF] flex flex-col font-sans select-none pointer-events-auto';
        ui.style.zIndex = '90000';

        let slPage = 1;

        const createSlotCard = (slotId, data) => {
            const card = document.createElement('div');
            card.className = 'group relative bg-[#8fbf8f] border-[2px] border-white/80 rounded-sm p-2 cursor-pointer hover:border-white hover:bg-[#7ebd7e] shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-all overflow-hidden flex flex-col justify-between min-h-[80px]';
            card.dataset.slot = slotId;

            const number = document.createElement('span');
            number.className = 'text-white font-black text-xs md:text-sm drop-shadow-md';
            number.textContent = `No.${String(slotId).padStart(3, '0')}`;

            const content = document.createElement('div');
            content.className = 'flex-1 flex items-center justify-center relative z-10 w-full';
            if (data) {
                const title = document.createElement('span');
                title.className = 'text-white text-sm md:text-2xl font-bold drop-shadow-md tracking-wider truncate px-1 md:px-4 w-full text-center';
                title.textContent = data.title;
                content.appendChild(title);
            } else {
                const empty = document.createElement('span');
                empty.className = 'text-white/80 text-lg md:text-3xl font-bold tracking-widest drop-shadow-sm opacity-60';
                empty.textContent = 'No Data';
                content.appendChild(empty);
            }

            const date = document.createElement('div');
            date.className = 'text-right text-white/80 text-[8px] md:text-xs font-bold tracking-wider h-3 md:h-4';
            date.textContent = data ? data.date || '' : '';

            card.appendChild(number);
            card.appendChild(content);
            card.appendChild(date);
            return card;
        };

        const createPageButton = (page) => {
            const item = document.createElement('div');
            item.className = 'cursor-pointer flex flex-col items-center group transition-all';
            item.dataset.page = String(page);

            const label = document.createElement('span');
            label.className = `text-[8px] md:text-[10px] font-bold ${slPage === page ? 'text-amber-500' : 'text-emerald-600'}`;
            label.textContent = 'Page';

            const circle = document.createElement('div');
            circle.className = `w-6 h-6 md:w-8 md:h-8 flex items-center justify-center font-black text-sm md:text-lg ${slPage === page ? 'bg-amber-400 text-white scale-110 shadow-lg' : 'bg-emerald-400/80 text-white'}`;
            circle.style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
            circle.textContent = String(page);

            item.appendChild(label);
            item.appendChild(circle);
            item.addEventListener('click', () => {
                slPage = page;
                renderUI();
            });
            return item;
        };

        const renderUI = () => {
            ui.innerHTML = '';

            const header = document.createElement('div');
            header.className = 'flex justify-between items-center md:items-end px-4 md:px-12 pt-6 md:pt-8 pb-2 md:pb-4 shrink-0';
            header.innerHTML = `<h1 class="text-4xl md:text-7xl font-bold text-white tracking-widest drop-shadow-md">STORY ${mode === 'save' ? 'SAVE' : 'LOAD'}</h1>`;

            const closeButton = document.createElement('button');
            closeButton.id = 'smsl-close';
            closeButton.className = 'px-4 md:px-6 py-1.5 md:py-2 bg-[#4fa0d8] text-white font-bold tracking-widest rounded-sm border border-white hover:bg-red-400 transition-colors shadow-md text-xs md:text-base';
            closeButton.textContent = '返回';
            closeButton.addEventListener('click', () => ui.remove());
            header.appendChild(closeButton);

            const grid = document.createElement('div');
            grid.className = 'flex-1 px-4 md:px-12 py-2 md:py-4 grid grid-cols-2 gap-x-2 md:gap-x-8 gap-y-2 md:gap-y-4 max-w-7xl mx-auto w-full overflow-y-auto light-scrollbar pb-4';
            Array.from({ length: 10 }).forEach((_, i) => {
                const slotId = (slPage - 1) * 10 + i + 1;
                const card = createSlotCard(slotId, slots[slotId]);
                card.addEventListener('click', async (e) => {
                    const currentSlotId = parseInt(card.dataset.slot, 10);
                    if (mode === 'save') {
                        try {
                            const data = {
                                projectId: theaterState.project.id,
                                chapterIdx: theaterState.chapterIdx,
                                lineIdx: theaterState.lineIdx,
                                title: `[${theaterState.project.name}] - 章${theaterState.chapterIdx + 1}句${theaterState.lineIdx}`,
                                protagonistName: theaterState.project.customProtagonistName
                            };
                            await SaveDB.save(data);
                            slots[currentSlotId] = data;
                            window.$GWC.showToast('已存入专属档位', 'success');
                            renderUI();
                        } catch (err) {
                            window.$GWC.showToast('存档失败: ' + err.message, 'error');
                        }
                    } else {
                        const data = slots[currentSlotId];
                        if (data) {
                            const loadData = async () => {
                                let proj = theaterState.project;
                                if (!proj || proj.id !== data.projectId) {
                                    proj = await ScriptDB.get(data.projectId);
                                }
                                if (proj) {
                                    window.$GWC.showToast('进度已加载', 'success');
                                    ui.remove();
                                    if (theaterState.active) stopStoryPlayer();
                                    if (data.protagonistName) {
                                        proj.customProtagonistName = data.protagonistName;
                                    }
                                    startStoryPlayer(proj, data.chapterIdx, data.lineIdx);
                                } else {
                                    window.$GWC.showToast('存档对应的剧本已被删除，无法读取！', 'error');
                                }
                            };
                            loadData();
                        }
                    }
                });
                grid.appendChild(card);
            });

            const pager = document.createElement('div');
            pager.className = 'flex justify-center items-center px-4 md:px-12 py-3 md:py-5 bg-white/30 backdrop-blur-md border-t-2 border-white/50 shrink-0';
            const pagerInner = document.createElement('div');
            pagerInner.className = 'flex gap-1 md:gap-1.5 items-end flex-wrap justify-center';
            Array.from({ length: 10 }).forEach((_, i) => {
                pagerInner.appendChild(createPageButton(i + 1));
            });
            pager.appendChild(pagerInner);

            ui.appendChild(header);
            ui.appendChild(grid);
            ui.appendChild(pager);
        };

        document.body.appendChild(ui);
        renderUI();
    };

    injectMainMenu();
    console.log("[Script Mode DLC] V4.35 已成功加载！");
})();