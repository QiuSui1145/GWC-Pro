/**
 * 插件名称：👁️ 视觉感知：主动搭话增强模块 (V4 终极过滤版)
 * 兼容版本：GWC v3.14+ (内核版本 10+)
 * 功能描述：当触发主动搭话时，自动截取屏幕画面发送给 AI，使其能根据“所见”构思话题。
 * 修复说明：在 filter 中加入跨域图片与异常节点 (如 mod-sprite-layer) 的精准剥离逻辑，彻底根治 Event 报错。
 */

(function() {
    // 防重复挂载 (V4版本隔离)
    if (window.__GWC_VisionProactiveLoaded_V4) return;
    window.__GWC_VisionProactiveLoaded_V4 = true;

    const SETTING_KEY = 'GWC_PLUGIN_VISION_PROACTIVE_ENABLED';
    
    // 1. 动态引入现代截屏核心库 (html-to-image)
    const loadScript = (src) => new Promise(res => {
        const s = document.createElement('script'); s.src = src; s.onload = res; document.head.appendChild(s);
    });

    // 2. 核心逻辑：劫持 Fetch 请求
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = args[0];
        const options = args[1];

        // 判定是否为发往大模型的聊天请求，且开关已开启
        if (typeof url === 'string' && url.includes('/chat/completions') && localStorage.getItem(SETTING_KEY) === 'true') {
            try {
                const body = JSON.parse(options.body);
                const lastMsg = body.messages[body.messages.length - 1];

                // 探测是否为“主动搭话”或“日程提醒”的系统指令
                if (lastMsg && lastMsg.role === 'user' && lastMsg.content.includes('【系统自动触发')) {
                    
                    console.log("[Vision Plugin] 监测到主动搭话，正在执行静默感知...");
                    
                    // 确保现代截屏库已就绪
                    if (!window.htmlToImage) {
                        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js');
                    }
                    
                    try {
                        // 执行极高容错率的静默截屏
                        const base64 = await window.htmlToImage.toJpeg(document.body, {
                            quality: 0.6,
                            pixelRatio: 0.7, // 压缩分辨率以节省 Token
                            skipFonts: true, // 跳过字体解析
                            imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', // 破损图片透明兜底
                            filter: (node) => {
                                // 1. 忽略摄像头预览画面，保护隐私
                                if (node.tagName === 'VIDEO') return false; 
                                
                                // 2. ✨ 核心修复：精准剔除导致跨域崩溃的特效精灵图层
                                if (node.id === 'mod-sprite-layer') return false;

                                // 3. 强行过滤掉其他插件可能注入的无用且容易跨域的 iframe / object
                                if (node.tagName === 'IFRAME' || node.tagName === 'OBJECT') return false;

                                return true;
                            }
                        });

                        // 强行改写 Payload：将纯文本改为多模态内容
                        lastMsg.content = [
                            { type: "text", text: lastMsg.content + "\n\n【环境感知注入】这是玩家当前的屏幕截图。请观察画面中的细节（如当前的背景环境、角色的表情动态、或当前UI显示的文字信息），并以此作为切入点构思一个极其自然的话题。不要直接提到“我看到了截图”，要表现得像你正注视着这个世界。" },
                            { type: "image_url", image_url: { url: base64 } }
                        ];
                        
                        options.body = JSON.stringify(body);
                        console.log("[Vision Plugin] 画面数据已完美注入，AI 正在观察中...");

                    } catch (captureError) {
                        console.warn("[Vision Plugin] 截屏组件由于底层限制未能成功捕获画面，已回退为纯文字搭话模式。错误详情：", captureError);
                    }
                }
            } catch (e) {
                console.error("[Vision Plugin] Payload 解析拦截失败:", e);
            }
        }
        return originalFetch.apply(this, args);
    };

    // 3. UI 注入：在设置面板添加开关
    const injectSettingUI = () => {
        const observer = new MutationObserver(() => {
            const tabs = Array.from(document.querySelectorAll('button'));
            const textTabActive = tabs.find(b => b.textContent.includes('文本互动') && b.className.includes('text-[#c44a4a]'));
            
            if (textTabActive && !document.getElementById('gwc-vision-setting')) {
                const sections = document.querySelectorAll('h3');
                const targetSection = Array.from(sections).find(h => h.textContent.includes('主动搭话机制'));
                
                if (targetSection) {
                    const container = targetSection.parentElement;
                    const div = document.createElement('div');
                    div.id = 'gwc-vision-setting';
                    div.className = "mt-4 pt-4 border-t border-dashed border-[#e6d5b8]";
                    
                    const isEnabled = localStorage.getItem(SETTING_KEY) === 'true';
                    
                    div.innerHTML = `
                        <div class="flex flex-col gap-2">
                            <label class="text-[#ba3f42] font-bold flex items-center gap-1 text-sm">
                                <span class="text-xs">✱</span> 启用主动搭话视觉感知 (视觉大模型专用)
                            </label>
                            <div class="flex bg-[#e8decb] rounded-full p-1 w-max shadow-inner mt-1">
                                <button id="vision-on" class="px-6 py-1.5 rounded-full text-xs font-bold transition-all ${isEnabled ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-white/50'}">ON</button>
                                <button id="vision-off" class="px-6 py-1.5 rounded-full text-xs font-bold transition-all ${!isEnabled ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-white/50'}">OFF</button>
                            </div>
                            <p class="text-[10px] text-[#7a6b5d] leading-relaxed mt-1">
                                💡 开启后，AI在主动找你聊天时会“偷看”一眼屏幕。你需要确保使用的模型支持 <b>Vision(视觉能力)</b>，否则会导致请求报错。
                            </p>
                        </div>
                    `;
                    
                    targetSection.parentNode.insertBefore(div, targetSection.nextSibling);

                    document.getElementById('vision-on').onclick = () => {
                        localStorage.setItem(SETTING_KEY, 'true');
                        injectSettingUI(); // 刷新状态
                        if(window.$GWC) window.$GWC.showToast("视觉感知已开启，请确保模型支持多模态图片识别", "success");
                    };
                    document.getElementById('vision-off').onclick = () => {
                        localStorage.setItem(SETTING_KEY, 'false');
                        injectSettingUI();
                        if(window.$GWC) window.$GWC.showToast("视觉感知已关闭", "info");
                    };
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    injectSettingUI();
    console.log("[Plugin] 视觉感知模块 (V4 终极过滤版) 已就绪");
})();