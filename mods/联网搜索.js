/**
 * 插件名称：联网搜索增强包 (AnySearch + DuckDuckGo + Wikipedia)
 * 兼容版本：GWC v1.7.0+ / v2.1.0+
 * 功能描述：
 * 1. AnySearch API 高质量搜索（需要 API Key）
 * 2. DuckDuckGo 免费搜索（跨域代理）
 * 3. Wikipedia 免费搜索
 * 4. 劫持 Fetch API，发往 LLM 前自动拼合搜索结果
 * 5. 高频轮询状态同步，解决 React 闭包陷阱
 */

(function() {
    if (window.__WebSearchModLoaded) return;
    window.__WebSearchModLoaded = true;

    try {
        console.log("[Web Search Mod] 插件开始初始化...");
        const GWC = window.$GWC;
        if (!GWC) throw new Error("GWC API 未就绪");

        // 初始化默认设置
        const defaults = {
            enableWebSearch: false,
            enableAnysearch: true,
            enableDuckDuckGo: true,
            enableWikipedia: true,
            maxSearchResults: 5
        };
        const settings = GWC.getSettings();
        for (const [k, v] of Object.entries(defaults)) {
            if (settings[k] === undefined) GWC.updateSettings({ [k]: v });
        }

        // --- 样式注入 ---
        const injectStyles = () => {
            const style = document.createElement('style');
            style.innerHTML = `
                .mod-search-btn { cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 4px; white-space: nowrap; flex-shrink: 0; font-bold; }
                .mod-search-btn.active { color: #60a5fa; text-shadow: 0 0 8px rgba(96,165,250,0.8); }
                .mod-search-btn.inactive { color: rgba(255, 255, 255, 0.5); }
                .mod-search-btn.inactive:hover { color: white; }
            `;
            document.head.appendChild(style);
        };
        injectStyles();

        // --- AnySearch API ---
        async function searchAnySearch(query, apiKey, maxResults) {
            if (!apiKey) return null;
            try {
                const res = await fetch('https://api.anysearch.com/v1/search', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        query: query,
                        max_results: maxResults || 5
                    }),
                    signal: AbortSignal.timeout(10000)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.code === 0 && data.data && data.data.results && data.data.results.length > 0) {
                        const lines = data.data.results.map(r => {
                            let line = `标题: ${r.title}`;
                            if (r.snippet) line += `\n摘要: ${r.snippet}`;
                            if (r.url) line += `\n来源: ${r.url}`;
                            return line;
                        });
                        return "【AnySearch 实时搜索结果】\n" + lines.join('\n\n');
                    }
                } else if (res.status === 429) {
                    console.warn("[Web Search] AnySearch rate limited");
                }
            } catch (e) {
                console.warn("[Web Search] AnySearch error:", e.message);
            }
            return null;
        }

        // --- 服务端搜索（通过后端 API，无 CORS 限制）---
        async function searchBackend(query, sources) {
            try {
                const src = sources.filter(s => s !== 'anysearch').join(',');
                const url = `/api/web/search?q=${encodeURIComponent(query)}&source=${encodeURIComponent(src)}`;
                const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
                if (!res.ok) return null;
                const data = await res.json();
                if (!data.results || data.results.length === 0) return null;
                const lines = data.results.map(r => {
                    let line = `标题: ${r.title}`;
                    if (r.snippet) line += `\n摘要: ${r.snippet}`;
                    if (r.url) line += `\n来源: ${r.url}`;
                    return line;
                });
                return "【实时搜索结果】\n" + lines.join('\n\n');
            } catch (e) { return null; }
        }

        // --- 统一搜索入口 ---
        async function performSearch(query) {
            const s = GWC.getSettings();
            const sources = ['ddg'];
            if (s.enableWikipedia !== false) sources.push('wiki');

            const tasks = [];

            // 服务端搜索（DDG + Wikipedia，无 CORS 问题）
            tasks.push(searchBackend(query, sources));

            // AnySearch（需要 API Key，客户端直连）
            if (s.enableAnysearch && s.anysearchApiKey) {
                tasks.push(searchAnySearch(query, s.anysearchApiKey, s.maxSearchResults || 5));
            }

            const results = await Promise.allSettled(tasks);
            const successful = results
                .filter(r => r.status === 'fulfilled' && r.value)
                .map(r => r.value);

            return successful.length > 0 ? successful.join('\n\n') : null;
        }

        // --- Fetch 拦截 ---
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const url = args[0] || '';
            const opts = args[1] || {};
            const isChatApi = typeof url === 'string' && url.includes('/v1/chat/completions') || (opts.body && typeof opts.body === 'string' && opts.body.includes('"messages"'));

            if (GWC.getSettings().enableWebSearch && isChatApi && opts.body) {
                try {
                    const bodyObj = JSON.parse(opts.body);
                    if (bodyObj.messages && bodyObj.messages.length > 0) {
                        const lastMsg = bodyObj.messages[bodyObj.messages.length - 1];
                        if (lastMsg.role === 'user') {
                            let queryText = lastMsg.content;
                            if (Array.isArray(queryText)) {
                                const textPart = queryText.find(p => p.type === 'text');
                                queryText = textPart ? textPart.text : '';
                            }

                            if (queryText && queryText.length >= 2) {
                                GWC.showToast("🌐 正在联网搜索实时资料...", "info", 3000);
                                const searchData = await performSearch(queryText);

                                if (searchData) {
                                    const injectedPrompt = `[系统底层强插：以下是系统刚刚通过网络检索到的实时资料，请充分参考这些资料来回复用户]\n\n${searchData}\n\n[用户的真实请求]：${queryText}`;
                                    if (Array.isArray(lastMsg.content)) {
                                        const textPart = lastMsg.content.find(p => p.type === 'text');
                                        if (textPart) textPart.text = injectedPrompt;
                                    } else {
                                        lastMsg.content = injectedPrompt;
                                    }
                                    opts.body = JSON.stringify(bodyObj);
                                    args[1] = opts;
                                    GWC.showToast("✅ 搜索完毕，已夹带在请求中", "success", 2000);
                                } else {
                                    GWC.showToast("⚠️ 搜索未返回结果，继续常规对话", "error", 2000);
                                }
                            }
                        }
                    }
                } catch(e) {}
            }
            return originalFetch.apply(this, args);
        };

        // --- UI 注入 ---
        const observer = new MutationObserver(() => {
            // 快捷栏按钮
            const shortcutContainers = Array.from(document.querySelectorAll('.flex.flex-wrap.justify-end'));
            const targetBar = shortcutContainers.find(el => el.textContent.includes('Log') || el.textContent.includes('TTS'));

            if (targetBar && !document.getElementById('mod-shortcut-search')) {
                const searchBtn = document.createElement('span');
                searchBtn.id = 'mod-shortcut-search';
                searchBtn.className = 'mod-search-btn inactive';
                searchBtn.onclick = (e) => {
                    e.stopPropagation();
                    const currentState = !!window.$GWC.getSettings().enableWebSearch;
                    window.$GWC.updateSettings({ enableWebSearch: !currentState });
                    window.$GWC.showToast(`联网搜索已${!currentState ? '开启' : '关闭'}`, !currentState ? 'success' : 'info');
                };
                targetBar.insertBefore(searchBtn, targetBar.lastChild);
            }

            // 设置面板
            const apiTitle = Array.from(document.querySelectorAll('h3')).find(h => h.textContent && h.textContent.includes('大语言模型 (LLM) 接口配置'));
            if (apiTitle && !document.getElementById('mod-settings-search')) {
                const container = apiTitle.parentElement.parentElement;
                const searchBlock = document.createElement('div');
                searchBlock.id = 'mod-settings-search';
                searchBlock.className = 'bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm animate-fade-in';
                searchBlock.innerHTML = `
                    <div class="flex flex-col gap-4">
                        <div class="flex justify-between items-center">
                            <div>
                                <label class="text-[#ba3f42] font-bold flex items-center gap-1 mb-1">
                                    <span class="text-sm">✱</span> 联网搜索引擎
                                </label>
                                <p class="text-xs text-[#7a6b5d]">发消息前自动搜索实时资料，注入到上下文中</p>
                            </div>
                            <div class="flex bg-[#e8decb] rounded-full p-1 w-max shadow-inner shrink-0">
                                <button id="mod-search-on" class="px-6 py-1.5 rounded-full text-sm font-bold transition-all">ON</button>
                                <button id="mod-search-off" class="px-6 py-1.5 rounded-full text-sm font-bold transition-all">OFF</button>
                            </div>
                        </div>
                        <div class="border-t border-dashed border-[#e6d5b8] pt-4 space-y-3">
                            <div>
                                <label class="text-xs font-bold text-[#7a6b5d] mb-1 block">AnySearch API Key（高质量搜索）</label>
                                 <input id="mod-anysearch-key" type="password" placeholder="留空则只用免费搜索源" autocomplete="off"
                                    readonly onfocus="this.removeAttribute('readonly')"
                                    class="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 text-sm outline-none shadow-inner focus:border-[#ba3f42]" />
                            </div>
                            <div class="flex flex-wrap gap-3 text-xs">
                                <label class="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" id="mod-enable-anysearch" class="accent-[#ba3f42]" />
                                    <span class="font-bold text-[#4a4036]">AnySearch</span>
                                </label>
                                <label class="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" id="mod-enable-ddg" class="accent-[#ba3f42]" checked />
                                    <span class="font-bold text-[#4a4036]">DuckDuckGo</span>
                                </label>
                                <label class="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" id="mod-enable-wiki" class="accent-[#ba3f42]" checked />
                                    <span class="font-bold text-[#4a4036]">Wikipedia</span>
                                </label>
                            </div>
                        </div>
                    </div>
                `;
                container.insertBefore(searchBlock, apiTitle.parentElement.nextSibling);

                // 绑定事件
                document.getElementById('mod-search-on').onclick = () => window.$GWC.updateSettings({ enableWebSearch: true });
                document.getElementById('mod-search-off').onclick = () => window.$GWC.updateSettings({ enableWebSearch: false });
                document.getElementById('mod-anysearch-key').oninput = (e) => {
                    const v = e.target.value;
                    if (v !== (window.$GWC.getSettings().anysearchApiKey || ''))
                        window.$GWC.updateSettings({ anysearchApiKey: v });
                };
                document.getElementById('mod-enable-anysearch').onchange = (e) => window.$GWC.updateSettings({ enableAnysearch: e.target.checked });
                document.getElementById('mod-enable-ddg').onchange = (e) => window.$GWC.updateSettings({ enableDuckDuckGo: e.target.checked });
                document.getElementById('mod-enable-wiki').onchange = (e) => window.$GWC.updateSettings({ enableWikipedia: e.target.checked });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // --- 状态同步轮询 ---
        setInterval(() => {
            if (!window.$GWC) return;
            const s = window.$GWC.getSettings();
            const isEnabled = !!s.enableWebSearch;

            // 快捷栏按钮
            const searchBtn = document.getElementById('mod-shortcut-search');
            if (searchBtn && searchBtn.dataset.currentState !== String(isEnabled)) {
                searchBtn.dataset.currentState = String(isEnabled);
                searchBtn.className = `mod-search-btn ${isEnabled ? 'active' : 'inactive'}`;
                searchBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${isEnabled ? 'animate-pulse' : ''}"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    ${isEnabled ? '联网:开' : '联网:关'}
                `;
            }

            // 设置面板按钮
            const btnOn = document.getElementById('mod-search-on');
            const btnOff = document.getElementById('mod-search-off');
            if (btnOn && btnOff && btnOn.dataset.currentState !== String(isEnabled)) {
                btnOn.dataset.currentState = String(isEnabled);
                btnOn.className = `px-6 py-1.5 rounded-full text-sm font-bold transition-all ${isEnabled ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-white/50'}`;
                btnOff.className = `px-6 py-1.5 rounded-full text-sm font-bold transition-all ${!isEnabled ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-white/50'}`;
            }

            // AnySearch 设置同步
            const keyInput = document.getElementById('mod-anysearch-key');
            if (keyInput && keyInput !== document.activeElement && keyInput.value !== (s.anysearchApiKey || '')) {
                const h = keyInput.oninput; keyInput.oninput = null;
                keyInput.value = s.anysearchApiKey || '';
                keyInput.oninput = h;
            }
            const cbAnysearch = document.getElementById('mod-enable-anysearch');
            if (cbAnysearch) cbAnysearch.checked = !!s.enableAnysearch;
            const cbDdg = document.getElementById('mod-enable-ddg');
            if (cbDdg) cbDdg.checked = s.enableDuckDuckGo !== false;
            const cbWiki = document.getElementById('mod-enable-wiki');
            if (cbWiki) cbWiki.checked = s.enableWikipedia !== false;
        }, 150);

        GWC.showToast("🌐 联网搜索扩展已激活 (含 AnySearch)", "success", 4000);
    } catch (err) {
        console.error("Web Search Mod 初始化失败:", err);
    }
})();
