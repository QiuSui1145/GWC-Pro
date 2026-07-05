/**
 * 插件名称：🎭 2D 立绘模式扩展 DLC (Sprite Mode) - V2.6 镜像隔离版
 * 兼容版本：GWC v2.1.0+ / IMAGE v4.4+
 * 功能描述：
 * 1. 允许玩家批量导入静态/GIF立绘作为虚拟角色形象。
 * 2. 自动劫持原生 Live2D 渲染器，完美复用原版的模型位置/缩放滑块。
 * 3. 引入“网络层窃听器”，在 JSON 解析阶段截获流式标签并瞬间换脸，彻底隐形。
 * 4. 【核心进化 V2.6】完美适配 IMAGE 镜像多开系统，实现立绘图包的绝对物理隔离！
 */

(function() {
    if (window.__SpriteModeDLCLoaded) return;
    window.__SpriteModeDLCLoaded = true;

    try {
        console.log("[Sprite Mode DLC] 核心模组开始初始化...");

        const getGWC = () => {
            if (!window.$GWC) throw new Error("GWC API 尚未就绪！");
            return window.$GWC;
        };

        // 获取当前活跃的镜像分身 ID
        const getActiveMirrorId = () => localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin';

        // --- 1. 立绘数据引擎（服务端 API）---
        const api = window.__GWC_API;

        const saveSpriteSet = async (set) => {
            if (!api) return;
            await api.setPluginJson('sprite_sets', set.id, set);
        };

        window.__allSpriteSets = [];
        const loadAllSpriteSets = async () => {
            if (!api) { window.__allSpriteSets = []; return window.__allSpriteSets; }
            const allData = await api.listPluginJson('sprite_sets') || [];
            const mid = api.getMirrorId();
            // 只显示属于当前镜像的立绘（防止跨镜像穿透）
            window.__allSpriteSets = allData.filter(s => s.id && s.id.startsWith(mid));
            return window.__allSpriteSets;
        };

        const deleteSpriteSet = async (id) => {
            if (!api) return;
            await api.deletePluginJson('sprite_sets', id);
        };

        const fileToBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const exportSpriteSet = async (id) => {
            const sets = await loadAllSpriteSets();
            const target = sets.find(s => s.id === id);
            if (!target) return;

            getGWC().showToast(`正在打包图包 [${target.name}]...`, "info", 3000);
            
            if (!window.JSZip) {
                await new Promise(resolve => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                    script.onload = resolve;
                    document.head.appendChild(script);
                });
            }

            try {
                const zip = new JSZip();
                target.sprites.forEach(sp => {
                    const base64Data = sp.dataUrl.split(',')[1];
                    const mimeMatch = sp.dataUrl.match(/data:(image\/[^;]+);/);
                    let ext = 'png';
                    if (mimeMatch && mimeMatch[1] === 'image/jpeg') ext = 'jpg';
                    if (mimeMatch && mimeMatch[1] === 'image/gif') ext = 'gif';
                    if (mimeMatch && mimeMatch[1] === 'image/webp') ext = 'webp';
                    
                    zip.file(`${sp.name}.${ext}`, base64Data, {base64: true});
                });
                
                const blob = await zip.generateAsync({type: "blob"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `SpriteDLC_${target.name}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                getGWC().showToast(`✅ 图包 [${target.name}] 导出成功！`, "success");
            } catch (err) {
                getGWC().showToast(`导出失败: ${err.message}`, "error");
            }
        };

        // --- 2. 全局状态与拦截器缓存管理 ---
        window.__spriteDLC = {
            enabled: false,
            activeSetId: null,
            activeSetData: null,
            currentEmotion: null,
            imageCache: {},
            isNewMessage: false,
            isBufferingTag: false,
            tagBuffer: ""
        };

        try {
            const s = getGWC().getSettings();
            if (s.spriteDlcEnabled === undefined) {
                getGWC().updateSettings({ 
                    spriteDlcEnabled: false, 
                    spriteDlcActiveId: null,
                    spriteDlcAutoSwitch: true, 
                    spriteDlcDefaultEmotions: {}, 
                    spriteDlcLastEmotions: {} 
                });
            }
        } catch(e) {}

        const changeEmotion = (emotion) => {
            if (!window.__spriteDLC || !window.__spriteDLC.activeSetData) return;
            const exists = window.__spriteDLC.activeSetData.sprites.some(sp => sp.name === emotion);
            if (!exists) return;
            
            window.__spriteDLC.currentEmotion = emotion;
            
            if (window.$GWC) {
                const s = window.$GWC.getSettings();
                const lastEmotions = s.spriteDlcLastEmotions || {};
                lastEmotions[window.__spriteDLC.activeSetId] = emotion;
                window.$GWC.updateSettings({ spriteDlcLastEmotions: lastEmotions });
            }
        };

        const preloadImages = (setData) => {
            window.__spriteDLC.imageCache = {};
            if (!setData || !setData.sprites) return;
            setData.sprites.forEach(sp => {
                const img = new Image();
                img.src = sp.dataUrl; 
                window.__spriteDLC.imageCache[sp.name] = sp.dataUrl;
            });
        };

        let isRefreshingDLC = false;
        const refreshDLCState = async () => {
            if (isRefreshingDLC || !window.$GWC) return; 
            
            const s = getGWC().getSettings();
            window.__spriteDLC.enabled = !!s.spriteDlcEnabled;
            
            const expectedId = s.spriteDlcActiveId;
            
            if (expectedId && expectedId !== window.__spriteDLC.activeSetId) {
                isRefreshingDLC = true;
                try {
                    const sets = await loadAllSpriteSets();
                    const target = sets.find(x => x.id === expectedId);
                    if (target) {
                        window.__spriteDLC.activeSetData = target;
                        window.__spriteDLC.activeSetId = target.id;
                        
                        const defEmotions = s.spriteDlcDefaultEmotions || {};
                        const lastEmotions = s.spriteDlcLastEmotions || {};
                        const defaultExp = defEmotions[target.id] || target.sprites[0]?.name;
                        
                        window.__spriteDLC.currentEmotion = lastEmotions[target.id] || defaultExp;
                        
                        preloadImages(target);
                        console.log(`[Sprite DLC] 图包 [${target.name}] 挂载成功 (恢复表情: ${window.__spriteDLC.currentEmotion})`);
                        setTimeout(() => { const p = document.getElementById('mod-sprite-dlc-panel'); if(p) p.remove(); }, 50);
                    } else {
                        window.__spriteDLC.activeSetData = null;
                        window.__spriteDLC.activeSetId = null;
                        getGWC().updateSettings({ spriteDlcActiveId: null, spriteDlcEnabled: false });
                    }
                } catch(e) {
                    console.error("[Sprite DLC] 底层数据唤醒失败:", e);
                }
                isRefreshingDLC = false;
            }
        };

        // --- 3. 底层渲染层劫持 (DOM 注入) ---
        const renderLoop = setInterval(() => {
            refreshDLCState();
            const canvasContainer = document.querySelector('.absolute.inset-0.z-10.overflow-hidden');
            const l2dCanvas = document.querySelector('canvas');
            
            if (!canvasContainer) return;

            let spriteImg = document.getElementById('mod-sprite-layer');
            if (!spriteImg) {
                spriteImg = document.createElement('img');
                spriteImg.id = 'mod-sprite-layer';
                spriteImg.className = 'absolute pointer-events-none transition-all duration-300';
                spriteImg.style.left = '50%';
                spriteImg.style.top = '50%';
                spriteImg.style.transformOrigin = 'center center';
                spriteImg.style.maxHeight = '180vh'; 
                canvasContainer.appendChild(spriteImg);
            }

            // 获取最新的 canvas 引擎（页面导航后 canvas 可能重建）
            const freshCanvas = document.querySelector('canvas');

            // 默认：立绘隐藏，Live2D 可见
            spriteImg.style.opacity = '0';
            spriteImg.style.zIndex = '0';
            if (freshCanvas) freshCanvas.style.opacity = '1';

            if (window.__spriteDLC.enabled && window.__spriteDLC.activeSetData) {
                if (!window.$GWC) return;
                const s = getGWC().getSettings();
                const isTitle = document.querySelector('h1') !== null && document.querySelector('h1').textContent === s.mainTitleText;

                // 标题界面：立绘跟随"隐藏主标题Live2D"设置
                if (isTitle && s.hideTitleLive2d) {
                    return; // 立绘和 Live2D 都隐藏
                }

                // 聊天界面：立绘激活时隐藏 Live2D
                if (!isTitle && freshCanvas) {
                    freshCanvas.style.opacity = '0';
                }

                spriteImg.style.opacity = '1';
                spriteImg.style.zIndex = '20';

                const currentEmotion = window.__spriteDLC.currentEmotion;
                const cachedUrl = window.__spriteDLC.imageCache[currentEmotion];
                if (cachedUrl && spriteImg.src !== cachedUrl) {
                    spriteImg.src = cachedUrl;
                }

                const conf = s.modelConfigs?.[s.currentModelId] || {
                    scale: s.live2dScale ?? 0.2, x: s.live2dX ?? 0, y: s.live2dY ?? 0,
                    titleScale: s.titleLive2dScale ?? 0.2, titleX: s.titleLive2dX ?? 0, titleY: s.titleLive2dY ?? 0
                };

                const scale = isTitle ? conf.titleScale : conf.scale;
                const x = isTitle ? conf.titleX : conf.x;
                const y = isTitle ? conf.titleY : conf.y;

                spriteImg.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`;
            }
            // else: 立绘关闭，Live2D 可见（已在上面设置）
        }, 100); 

        // --- 4. 终极无痕过滤：劫持 JSON.parse 拦截流式碎片 ---
        const originalParse = JSON.parse;
        window.JSON.parse = function(text, reviver) {
            const result = originalParse(text, reviver);
            try {
                if (window.__spriteDLC && window.__spriteDLC.enabled && window.__spriteDLC.activeSetData) {
                    if (result && result.choices && result.choices[0] && result.choices[0].delta && result.choices[0].delta.content !== undefined) {
                        let content = result.choices[0].delta.content;
                        if (window.__spriteDLC.isNewMessage) {
                            if (content.trim() === "") return result; 
                            window.__spriteDLC.isNewMessage = false;
                            if (content.trimStart().startsWith('[') || content.trimStart().startsWith('【')) {
                                window.__spriteDLC.isBufferingTag = true;
                            }
                        }

                        if (window.__spriteDLC.isBufferingTag) {
                            window.__spriteDLC.tagBuffer += content;
                            result.choices[0].delta.content = ""; 
                            
                            const bufferTrimmed = window.__spriteDLC.tagBuffer.trimStart();
                            if (bufferTrimmed.includes(']') || bufferTrimmed.includes('】')) {
                                window.__spriteDLC.isBufferingTag = false;
                                const match = bufferTrimmed.match(/^[【\[]([^】\]]+)[】\]]/);
                                
                                if (match) {
                                    const s = getGWC().getSettings();
                                    if (s.spriteDlcAutoSwitch !== false) {
                                        changeEmotion(match[1]);
                                        console.log(`[Sprite DLC] 底层截获情绪指令 -> ${match[1]}`);
                                    }
                                    result.choices[0].delta.content = bufferTrimmed.slice(match[0].length);
                                } else {
                                    result.choices[0].delta.content = window.__spriteDLC.tagBuffer; 
                                }
                                window.__spriteDLC.tagBuffer = "";
                                
                            } else if (window.__spriteDLC.tagBuffer.length > 25) {
                                window.__spriteDLC.isBufferingTag = false;
                                result.choices[0].delta.content = window.__spriteDLC.tagBuffer;
                                window.__spriteDLC.tagBuffer = "";
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("[Sprite DLC] JSON 过滤器异常:", e);
            }
            return result;
        };

        // --- 5. 暴力劫持 Fetch：给大模型洗脑，处理非流式返回 ---
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const url = args[0] || '';
            const opts = args[1] || {};

            const isChatApi = typeof url === 'string' && url.includes('/v1/chat/completions') || 
                              (opts.body && typeof opts.body === 'string' && opts.body.includes('"messages"'));

            const s = window.$GWC ? getGWC().getSettings() : {};
            if (isChatApi && window.__spriteDLC.enabled && window.__spriteDLC.activeSetData && s.spriteDlcAutoSwitch !== false) {
                try {
                    const bodyObj = JSON.parse(opts.body);
                    if (bodyObj.messages && bodyObj.messages.length > 0) {
                        const sysMsg = bodyObj.messages[0];
                        if (sysMsg.role === 'system') {
                            const emotions = window.__spriteDLC.activeSetData.sprites.map(s => s.name).join('、');
                            const injectPrompt = `\n\n【🎭 视觉立绘表情差分系统激活】\n当前系统已挂载你的立绘差分图，支持以下情绪状态切换：[${emotions}]。\n**请你务必在每次回复的最开头，用方括号严格标注你当前的情绪。**\n例如：\n[开心]指挥官，你终于回来啦！\n[愤怒]哼，你在看哪里啊！\n必须仅使用上述列表中的词汇放入方括号中，它将直接驱动你的屏幕形象变化！作为角色扮演，请让情绪跟随语境自然流露。`;
                            
                            sysMsg.content += injectPrompt;
                            opts.body = JSON.stringify(bodyObj);
                            args[1] = opts;
                            
                            window.__spriteDLC.isNewMessage = true;
                            window.__spriteDLC.isBufferingTag = false;
                            window.__spriteDLC.tagBuffer = "";
                        }
                    }
                } catch(e) {}
            }
            
            const response = await originalFetch.apply(this, args);
            
            if (isChatApi && window.__spriteDLC.enabled && window.__spriteDLC.activeSetData) {
                const originalJson = response.json;
                response.json = async function() {
                    const data = await originalJson.call(this);
                    try {
                        if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                            let content = data.choices[0].message.content;
                            const match = content.match(/^\s*[【\[]([^】\]]+)[】\]]/);
                            if (match) {
                                if (getGWC().getSettings().spriteDlcAutoSwitch !== false) {
                                    changeEmotion(match[1]);
                                }
                                data.choices[0].message.content = content.slice(match[0].length).trimStart();
                            }
                        }
                    } catch(e) {}
                    return data;
                };
            }
            return response;
        };

        // --- 6. 极致解耦的 UI 面板注入 ---
        const injectUI = async () => {
            await loadAllSpriteSets();

            const observer = new MutationObserver(async () => {
                if (!window.$GWC) return;

                // --- A. 在系统【视觉设定】模型列表下方注入立绘包 ---
                const modelLabel = Array.from(document.querySelectorAll('label')).find(l => l.textContent && l.textContent.includes('Live2D 模型库管理'));
                if (modelLabel) {
                    const parentDiv = modelLabel.parentElement;
                    let dlcContainer = parentDiv.querySelector('#dlc-settings-model-list');
                    
                    if (!dlcContainer && window.__allSpriteSets && window.__allSpriteSets.length > 0) {
                        dlcContainer = document.createElement('div');
                        dlcContainer.id = 'dlc-settings-model-list';
                        dlcContainer.className = 'max-h-32 overflow-y-auto light-scrollbar bg-[#fdfaf5] rounded-lg p-2 border border-[#e6d5b8] space-y-1 mt-3 shadow-inner';
                        parentDiv.appendChild(dlcContainer);
                    }
                    
                    if (dlcContainer && window.__allSpriteSets) {
                        let html = '';
                        const s = getGWC().getSettings();
                        window.__allSpriteSets.forEach(set => {
                            const isActive = s.spriteDlcEnabled && s.spriteDlcActiveId === set.id;
                            html += `<div class="flex justify-between items-center px-3 py-2 rounded text-xs group transition-colors cursor-pointer ${isActive ? 'bg-[#8fbf8f]/20 font-bold text-[#4a4036]' : 'hover:bg-black/5 text-[#7a6b5d]'}" data-dlc-id="${set.id}">
                                <span class="truncate pr-4 flex-1">${isActive ? '✨ ' : ''}${set.name} <span class="text-[#8fbf8f] ml-1 font-bold">[立绘]</span></span>
                            </div>`;
                        });
                        if (dlcContainer.innerHTML !== html) {
                            dlcContainer.innerHTML = html;
                            dlcContainer.querySelectorAll('div[data-dlc-id]').forEach(el => {
                                el.onclick = () => {
                                    const id = el.getAttribute('data-dlc-id');
                                    getGWC().updateSettings({ spriteDlcActiveId: id, spriteDlcEnabled: true });
                                    getGWC().showToast(`已无缝切换至立绘包：${window.__allSpriteSets.find(s=>s.id===id)?.name}`, 'success');
                                };
                            });
                        }
                    }
                }

                // --- B. 在游戏右下角的快捷切换模型菜单中注入立绘包 ---
                const shortcutTriggers = Array.from(document.querySelectorAll('span')).filter(s => s.getAttribute('title') === '切换Live2D模型');
                shortcutTriggers.forEach(trigger => {
                    const menu = trigger.nextElementSibling;
                    if (menu && menu.classList.contains('absolute') && menu.classList.contains('bottom-full')) {
                        const s = getGWC().getSettings();
                        let dlcSep = menu.querySelector('#dlc-shortcut-sep');
                        if (!dlcSep && window.__allSpriteSets && window.__allSpriteSets.length > 0) {
                            menu.insertAdjacentHTML('beforeend', '<div id="dlc-shortcut-sep" class="border-t border-white/20 my-1 mx-2"></div>');
                        }
                        
                        if (window.__allSpriteSets) {
                            window.__allSpriteSets.forEach(set => {
                                let btn = menu.querySelector(`button[data-dlc-id="${set.id}"]`);
                                if (!btn) {
                                    btn = document.createElement('button');
                                    btn.setAttribute('data-dlc-id', set.id);
                                    btn.onclick = () => {
                                        getGWC().updateSettings({ spriteDlcActiveId: set.id, spriteDlcEnabled: true });
                                        getGWC().showToast(`已无缝切换至立绘包：${set.name}`, 'success');
                                    };
                                    menu.appendChild(btn);
                                }
                                const isActive = s.spriteDlcEnabled && s.spriteDlcActiveId === set.id;
                                const expectedClass = `shrink-0 text-sm px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap overflow-hidden overflow-ellipsis leading-tight ${isActive ? 'bg-indigo-600/80 text-white font-bold' : 'hover:bg-white/10 text-white/80'}`;
                                if (btn.className !== expectedClass) btn.className = expectedClass;
                                
                                const expectedHTML = `${isActive ? '✨ ' : ''}${set.name} <span class="text-emerald-300 text-xs ml-1 opacity-80">[立绘]</span>`;
                                if (btn.innerHTML !== expectedHTML) btn.innerHTML = expectedHTML;
                            });
                        }
                    }
                });

                // --- C. 主立绘扩展控制面板 ---
                const l2dTitle = Array.from(document.querySelectorAll('h3')).find(h => h.textContent && h.textContent.includes('Live2D 模型管理'));
                if (l2dTitle && !document.getElementById('mod-sprite-dlc-panel')) {
                    const container = l2dTitle.parentElement.parentElement;
                    const dlcPanel = document.createElement('div');
                    dlcPanel.id = 'mod-sprite-dlc-panel';
                    dlcPanel.className = 'bg-white p-6 rounded-xl border border-[#d9c5b2] shadow-sm mb-8 relative overflow-hidden animate-fade-in';
                    
                    const sets = window.__allSpriteSets || [];
                    const s = getGWC().getSettings();
                    let currentActiveId = s.spriteDlcActiveId;
                    
                    if (sets.length > 0 && !sets.find(s => s.id === currentActiveId)) {
                        currentActiveId = sets[0].id;
                        getGWC().updateSettings({ spriteDlcActiveId: currentActiveId });
                    } else if (sets.length === 0 && currentActiveId !== null) {
                        currentActiveId = null;
                        getGWC().updateSettings({ spriteDlcActiveId: null, spriteDlcEnabled: false });
                    }

                    let setOptionsHtml = sets.map(s => `<option value="${s.id}" ${s.id === currentActiveId ? 'selected' : ''}>${s.name} (${s.sprites.length}个差分)</option>`).join('');
                    if (sets.length === 0) setOptionsHtml = '<option value="">暂无立绘集，请先导入</option>';

                    let expChipsHtml = '';
                    if (window.__spriteDLC.activeSetData && window.__spriteDLC.activeSetData.id === currentActiveId) {
                        const defEmotions = s.spriteDlcDefaultEmotions || {};
                        const defaultExp = defEmotions[currentActiveId] || window.__spriteDLC.activeSetData.sprites[0]?.name;

                        expChipsHtml = window.__spriteDLC.activeSetData.sprites.map(sp => {
                            const isDef = sp.name === defaultExp;
                            return `<div class="exp-chip-wrapper relative group flex items-center bg-white border border-[#d9c5b2] rounded-full shadow-sm pl-1 pr-1 transition-all" data-emotion="${sp.name}">
                                <button class="dlc-set-def-btn w-5 h-5 flex items-center justify-center rounded-full transition-colors shrink-0 ${isDef ? 'text-amber-500 opacity-100' : 'text-[#d9c5b2] hover:text-amber-400 opacity-0 group-hover:opacity-100'}" data-emotion="${sp.name}" title="设为默认初始表情">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="${isDef ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                </button>
                                <button class="exp-chip px-2 py-1.5 text-[#7a6b5d] text-xs font-bold transition-all hover:text-[#ba3f42] outline-none" data-emotion="${sp.name}">
                                    ${sp.name}
                                </button>
                                <button class="dlc-del-exp-btn w-5 h-5 flex items-center justify-center bg-red-100 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-colors opacity-0 group-hover:opacity-100 shrink-0" data-emotion="${sp.name}" title="删除此差分图">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>`;
                        }).join('');
                        
                        expChipsHtml += `
                            <label class="px-3 py-1.5 bg-[#e0f2fe] text-[#4fa0d8] border border-[#bae6fd] hover:bg-[#4fa0d8] hover:text-white text-xs font-bold rounded-full transition-all shadow-sm cursor-pointer flex items-center gap-1">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> 添加图片
                                <input type="file" accept="image/*" multiple hidden id="dlc-add-exp-input" />
                            </label>
                        `;
                    }

                    dlcPanel.innerHTML = `
                        <div class="absolute top-0 right-0 w-24 h-24 bg-[#4fa0d8]/10 rounded-bl-full pointer-events-none"></div>
                        <div class="flex items-center gap-4 mb-4">
                            <h3 class="text-lg font-black text-[#ba3f42] tracking-widest flex items-center gap-2">🎭 2D 立绘模式 (Sprite DLC)</h3>
                            <div class="flex-1 border-b-2 border-dashed border-[#e6d5b8]"></div>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 relative z-10">
                            <div class="flex flex-col gap-3">
                                <div class="flex justify-between items-center bg-[#fdfaf5] p-3 rounded-lg border border-[#e6d5b8] shadow-inner">
                                    <div>
                                        <label class="text-sm font-bold text-[#ba3f42]">接管屏幕并启用立绘模式</label>
                                        <p class="text-[10px] text-[#7a6b5d] mt-1">开启后将隐藏 Live2D，完美复用下方的滑块调整位置。</p>
                                    </div>
                                    <div class="flex bg-[#e8decb] rounded-full p-1 w-max shadow-inner">
                                        <button id="dlc-on" class="px-4 py-1 rounded-full text-xs font-bold transition-all">ON</button>
                                        <button id="dlc-off" class="px-4 py-1 rounded-full text-xs font-bold transition-all">OFF</button>
                                    </div>
                                </div>
                                
                                <label class="block text-xs font-bold text-[#ba3f42] mb-2">AI自动切换表情立绘</label>
                                <div class="flex justify-between items-center bg-[#fdfaf5] p-3 rounded-lg border border-[#e6d5b8] shadow-inner mt-1">
                                    <div>
                                        <label class="text-sm font-bold text-[#ba3f42]">AI 语境自动切换表情</label>
                                        <p class="text-[10px] text-[#7a6b5d] mt-1">关闭后锁定为设定的默认表情，仅支持手动切换。</p>
                                    </div>
                                    <div class="flex bg-[#e8decb] rounded-full p-1 w-max shadow-inner shrink-0">
                                        <button id="dlc-auto-on" class="px-4 py-1 rounded-full text-xs font-bold transition-all">ON</button>
                                        <button id="dlc-auto-off" class="px-4 py-1 rounded-full text-xs font-bold transition-all">OFF</button>
                                    </div>
                                </div>
                                
                                <div class="border-t border-dashed border-[#e6d5b8] pt-3 mt-1">
                                    <label class="block text-xs font-bold text-[#ba3f42] mb-2">切换当前立绘角色包</label>
                                    <div class="flex gap-2">
                                        <select id="dlc-set-select" class="flex-1 bg-white border border-[#d9c5b2] text-[#4a4036] text-sm font-bold rounded-md px-3 py-2 outline-none shadow-sm focus:border-[#ba3f42]">
                                            ${setOptionsHtml}
                                        </select>
                                        <button id="dlc-export-btn" class="px-3 bg-[#e0f2fe] hover:bg-[#4fa0d8] border border-[#bae6fd] text-[#4fa0d8] hover:text-white rounded-md transition-colors shadow-sm" title="将此图包打包为 ZIP 导出"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
                                        <button id="dlc-delete-btn" class="px-3 bg-red-50 hover:bg-red-500 border border-red-200 text-red-400 hover:text-white rounded-md transition-colors shadow-sm" title="删除选中立绘集"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                    </div>
                                </div>
                            </div>

                            <div class="flex flex-col justify-center bg-[#fdfaf5] p-4 rounded-xl border border-[#d9c5b2] shadow-sm">
                                <label class="block text-sm font-bold text-[#ba3f42] mb-2">📦 导入全新的立绘包</label>
                                <p class="text-xs text-[#7a6b5d] mb-3 leading-relaxed">支持一次性多选图片。文件名将自动作为情绪标签（如 <code>开心.png</code>）。</p>
                                <label class="w-full text-center py-2.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-sm rounded-lg cursor-pointer transition-colors shadow-md block">
                                    + 选择多张表情图并打包导入                            
                                    <input type="file" accept="image/*" multiple hidden id="dlc-upload-input" />
                                </label>
                            </div>
                        </div>

                        ${(window.__spriteDLC.activeSetData && window.__spriteDLC.activeSetData.id === currentActiveId) ? `
                        <div class="border-t border-dashed border-[#e6d5b8] pt-4 mt-2">
                            <label class="block text-xs font-bold text-[#ba3f42] mb-2 flex justify-between">
                                <span>🎨 当前图包的差分表情 (点击预览 / 设为默认开场)</span>
                                <span class="text-[#4fa0d8]">当前触发: <span id="dlc-current-emotion-text">${window.__spriteDLC.currentEmotion || '无'}</span></span>
                            </label>
                            <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 pt-1 pb-1">
                                ${expChipsHtml}
                            </div>
                        </div>
                        ` : ''}
                    `;
                    
                    container.insertBefore(dlcPanel, l2dTitle.parentElement);

                    document.getElementById('dlc-on').onclick = () => { 
                        const freshSettings = getGWC().getSettings();
                        let targetId = freshSettings.spriteDlcActiveId;
                        const selectEl = document.getElementById('dlc-set-select');
                        
                        if (!targetId && selectEl && selectEl.value) {
                            targetId = selectEl.value;
                            getGWC().updateSettings({ spriteDlcActiveId: targetId });
                        }

                        if (!targetId) return getGWC().showToast("⚠️ 请先导入并选择一个立绘图包！", "error");
                        
                        getGWC().updateSettings({ spriteDlcEnabled: true }); 
                        if (!window.__spriteDLC.activeSetData || window.__spriteDLC.activeSetData.id !== targetId) {
                            getGWC().showToast("⏳ 正在从底层存储唤醒图包数据，请稍等片刻...", "info", 2500);
                        }
                    };
                    document.getElementById('dlc-off').onclick = () => getGWC().updateSettings({ spriteDlcEnabled: false });

                    document.getElementById('dlc-auto-on').onclick = () => {
                        getGWC().updateSettings({ spriteDlcAutoSwitch: true });
                        getGWC().showToast("✅ 已允许 AI 自动管理表情差分", "success");
                    };
                    document.getElementById('dlc-auto-off').onclick = () => {
                        getGWC().updateSettings({ spriteDlcAutoSwitch: false });
                        const settingsNow = getGWC().getSettings();
                        const defs = settingsNow.spriteDlcDefaultEmotions || {};
                        const defEmotion = defs[settingsNow.spriteDlcActiveId] || window.__spriteDLC.activeSetData?.sprites[0]?.name;
                        if (defEmotion) {
                            changeEmotion(defEmotion);
                            getGWC().showToast(`已强制锁定为默认表情: ${defEmotion}`, "info");
                        }
                    };

                    document.getElementById('dlc-set-select').onchange = (e) => {
                        getGWC().updateSettings({ spriteDlcActiveId: e.target.value });
                        setTimeout(() => { const p = document.getElementById('mod-sprite-dlc-panel'); if(p) p.remove(); }, 50);
                    };

                    document.getElementById('dlc-export-btn').onclick = () => {
                        const targetId = document.getElementById('dlc-set-select').value;
                        if (!targetId) return getGWC().showToast("⚠️ 请先选择要导出的图包！", "error");
                        exportSpriteSet(targetId);
                    };

                    dlcPanel.querySelectorAll('.dlc-set-def-btn').forEach(btn => {
                        btn.onclick = (e) => {
                            e.stopPropagation();
                            const emotion = e.currentTarget.getAttribute('data-emotion');
                            const settingsNow = getGWC().getSettings();
                            const defs = settingsNow.spriteDlcDefaultEmotions || {};
                            defs[settingsNow.spriteDlcActiveId] = emotion;
                            getGWC().updateSettings({ spriteDlcDefaultEmotions: defs });
                            
                            if (settingsNow.spriteDlcAutoSwitch === false) {
                                changeEmotion(emotion);
                            }
                            getGWC().showToast(`⭐ 已将 [${emotion}] 设为默认开场表情`, "success");
                            setTimeout(() => { const p = document.getElementById('mod-sprite-dlc-panel'); if(p) p.remove(); }, 50);
                        };
                    });

                    dlcPanel.querySelectorAll('.dlc-del-exp-btn').forEach(btn => {
                        btn.onclick = async (e) => {
                            e.stopPropagation();
                            const emotion = e.currentTarget.getAttribute('data-emotion');
                            if (confirm(`确定要在本图包中删除表情 [${emotion}] 吗？`)) {
                                const targetSet = window.__spriteDLC.activeSetData;
                                if (targetSet.sprites.length <= 1) return getGWC().showToast("⚠️ 立绘包至少需要保留一张图片！", "error");
                                
                                targetSet.sprites = targetSet.sprites.filter(sp => sp.name !== emotion);
                                await saveSpriteSet(targetSet);
                                if (window.__spriteDLC.currentEmotion === emotion) {
                                    changeEmotion(targetSet.sprites[0]?.name || null);
                                }
                                await loadAllSpriteSets(); 
                                getGWC().showToast(`已成功删除差分: ${emotion}`, "success");
                                setTimeout(() => { const p = document.getElementById('mod-sprite-dlc-panel'); if(p) p.remove(); }, 50);
                            }
                        };
                    });

                    const addExpInput = document.getElementById('dlc-add-exp-input');
                    if (addExpInput) {
                        addExpInput.onchange = async (e) => {
                            const files = Array.from(e.target.files);
                            if (!files.length) return;
                            getGWC().showToast(`正在深度编码 ${files.length} 张新立绘...`, "info", 5000);
                            const targetSet = window.__spriteDLC.activeSetData;
                            
                            for (let f of files) {
                                try {
                                    const dataUrl = await fileToBase64(f);
                                    const expName = f.name.replace(/\.[^/.]+$/, "");
                                    const existingIdx = targetSet.sprites.findIndex(sp => sp.name === expName);
                                    if (existingIdx !== -1) targetSet.sprites[existingIdx] = { name: expName, dataUrl };
                                    else targetSet.sprites.push({ name: expName, dataUrl });
                                } catch(err) { console.error("读取图片失败", err); }
                            }
                            await saveSpriteSet(targetSet);
                            await loadAllSpriteSets(); 
                            preloadImages(targetSet);
                            getGWC().showToast(`✅ 成功追加新差分图入包！`, "success");
                            setTimeout(() => { const p = document.getElementById('mod-sprite-dlc-panel'); if(p) p.remove(); }, 50);
                        };
                    }

                    document.getElementById('dlc-delete-btn').onclick = async () => {
                        const targetId = document.getElementById('dlc-set-select').value;
                        if (!targetId) return;
                        if (confirm("确定要彻底删除整个立绘图包吗？")) {
                            await deleteSpriteSet(targetId);
                            const remainingSets = await loadAllSpriteSets();
                            const fallbackId = remainingSets.length > 0 ? remainingSets[0].id : null;
                            getGWC().updateSettings({ spriteDlcActiveId: fallbackId, spriteDlcEnabled: false });
                            if (!fallbackId) {
                                window.__spriteDLC.activeSetData = null;
                                window.__spriteDLC.activeSetId = null;
                            }
                            getGWC().showToast("已彻底删除该图包", "success");
                            setTimeout(() => { const p = document.getElementById('mod-sprite-dlc-panel'); if(p) p.remove(); }, 50);
                        }
                    };

                    document.getElementById('dlc-upload-input').onchange = async (e) => {
                        const files = Array.from(e.target.files);
                        if (!files.length) return;
                        
                        const charName = prompt("导入成功！请为这个立绘集命名（例如：亚托莉）：", files[0].name.split('.')[0] + "等立绘");
                        if (!charName) return;

                        getGWC().showToast(`正在深度编码 ${files.length} 张立绘图...`, "info", 5000);
                        const sprites = [];
                        for (let f of files) {
                            try {
                                const dataUrl = await fileToBase64(f);
                                const expName = f.name.replace(/\.[^/.]+$/, ""); 
                                sprites.push({ name: expName, dataUrl });
                            } catch(err) {}
                        }

                        // ✨ 核心修复：保存时为 ID 打上当前分身镜像的烙印
                        const mirrorId = getActiveMirrorId();
                        const newSet = { id: `${mirrorId}_${Date.now()}`, name: charName, sprites };
                        
                        await saveSpriteSet(newSet);
                        await loadAllSpriteSets(); 
                        getGWC().updateSettings({ spriteDlcActiveId: newSet.id, spriteDlcEnabled: true });
                        getGWC().showToast(`🎉 成功导入专属图包 [${charName}]！已自动开启立绘模式。`, "success", 5000);
                        setTimeout(() => { const p = document.getElementById('mod-sprite-dlc-panel'); if(p) p.remove(); }, 50);
                    };

                    dlcPanel.querySelectorAll('.exp-chip').forEach(chip => {
                        chip.onclick = (e) => {
                            e.stopPropagation();
                            const emotion = e.target.getAttribute('data-emotion');
                            changeEmotion(emotion);
                            getGWC().showToast(`已强制切换为表情：${emotion}`, "info", 2000);
                        };
                    });
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        };
        injectUI();

        // --- 7. 高频轮询同步引擎 (包含交叉切换互斥逻辑) ---
        setInterval(() => {
            if (!window.$GWC) return;
            const s = getGWC().getSettings();
            if (!s) return;

            if (window.__lastModelId === undefined) window.__lastModelId = s.currentModelId;
            if (s.currentModelId !== window.__lastModelId) {
                window.__lastModelId = s.currentModelId;
                // 切换模型时不禁用立绘，让用户自由选择
            }

            const isActive = !!s.spriteDlcEnabled;
            const btnOn = document.getElementById('dlc-on');
            const btnOff = document.getElementById('dlc-off');
            if (btnOn && btnOff && btnOn.dataset.state !== String(isActive)) {
                btnOn.dataset.state = String(isActive);
                btnOn.className = `px-4 py-1 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-[#efe6d5]'}`;
                btnOff.className = `px-4 py-1 rounded-full text-xs font-bold transition-all ${!isActive ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-[#efe6d5]'}`;
            }

            const isAutoActive = s.spriteDlcAutoSwitch !== false;
            const btnAutoOn = document.getElementById('dlc-auto-on');
            const btnAutoOff = document.getElementById('dlc-auto-off');
            if (btnAutoOn && btnAutoOff && btnAutoOn.dataset.state !== String(isAutoActive)) {
                btnAutoOn.dataset.state = String(isAutoActive);
                btnAutoOn.className = `px-4 py-1 rounded-full text-xs font-bold transition-all ${isAutoActive ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-[#efe6d5]'}`;
                btnAutoOff.className = `px-4 py-1 rounded-full text-xs font-bold transition-all ${!isAutoActive ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-[#efe6d5]'}`;
            }
            
            const selectEl = document.getElementById('dlc-set-select');
            if (selectEl && s.spriteDlcActiveId && selectEl.value !== s.spriteDlcActiveId) {
                if (Array.from(selectEl.options).some(opt => opt.value === s.spriteDlcActiveId)) {
                    selectEl.value = s.spriteDlcActiveId;
                }
            }

            if (window.__spriteDLC && window.__spriteDLC.currentEmotion) {
                const textEl = document.getElementById('dlc-current-emotion-text');
                if (textEl && textEl.innerText !== window.__spriteDLC.currentEmotion) textEl.innerText = window.__spriteDLC.currentEmotion;
                
                document.querySelectorAll('.exp-chip-wrapper').forEach(wrapper => {
                    const isMatch = wrapper.getAttribute('data-emotion') === window.__spriteDLC.currentEmotion;
                    if (wrapper.dataset.state !== String(isMatch)) {
                        wrapper.dataset.state = String(isMatch);
                        const btn = wrapper.querySelector('.exp-chip');
                        if (isMatch) {
                            wrapper.className = "exp-chip-wrapper relative group flex items-center rounded-full shadow-md pl-1 pr-1 transition-all bg-[#4fa0d8] border border-[#4fa0d8]";
                            if(btn) btn.className = "exp-chip px-2 py-1.5 text-xs font-bold transition-all outline-none text-white";
                        } else {
                            wrapper.className = "exp-chip-wrapper relative group flex items-center rounded-full shadow-sm pl-1 pr-1 transition-all bg-white border border-[#d9c5b2]";
                            if(btn) btn.className = "exp-chip px-2 py-1.5 text-xs font-bold transition-all hover:text-[#ba3f42] outline-none text-[#7a6b5d]";
                        }
                    }
                });
            }
        }, 150);

        getGWC().showToast("🎭 2D 立绘模式 (终极隔离版 V2.6) 已加载！", "success", 5000);
    } catch (err) {
        console.error("Sprite Mode DLC 初始化失败:", err);
    }
})();