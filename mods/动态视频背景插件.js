/**
 * 插件名称：🎬 动态视频背景扩展模块 (Video Background Mod)
 * 兼容版本：GWC v3.14+
 * 功能描述：允许上传 MP4/WebM 视频作为主标题的动态背景，支持镜像物理隔离与全局显示切换。
 */

(function() {
    // 防止重复加载，支持热重载
    if (window.__GWC_VideoBGLoaded) return;
    window.__GWC_VideoBGLoaded = true;

    // 通过服务端 API 存取视频数据
    const api = window.__GWC_API;

    const VideoDB = {
        getKey() {
            const mirrorId = localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin';
            return mirrorId + '_title_video';
        },
        async saveVideo(blob) {
            if (!api) { console.warn('[视频背景插件] API客户端未加载'); return; }
            const key = this.getKey();
            return api.uploadPluginBlob('video_bg', key, blob, 'video.mp4');
        },
        async loadVideo() {
            if (!api) { console.warn('[视频背景插件] API客户端未加载'); return null; }
            const key = this.getKey();
            const url = api.getPluginBlobUrl('video_bg', key);
            // HEAD 请求验证 blob 是否存在
            try {
                const resp = await fetch(url, { method: 'HEAD' });
                if (resp.ok) return url;
            } catch(e) {}
            return null;
        },
        async deleteVideo() {
            if (!api) { console.warn('[视频背景插件] API客户端未加载'); return; }
            const key = this.getKey();
            return api.deletePluginJson('video_bg', key);
        }
    };

    // 动态显隐逻辑
    function updateVideoVisibility() {
        const video = document.getElementById('gwc-plugin-bg-video');
        if (!video) return;
        const mirrorId = localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin';
        const isGlobal = localStorage.getItem(mirrorId + '_video_bg_global') === 'true';
        
        // 探测当前是否处于主标题界面 (查找是否存在 START 按钮)
        const isTitle = !!Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'START');
        
        if (isTitle || isGlobal) {
            video.style.opacity = '1';
        } else {
            video.style.opacity = '0';
        }
    }

    // 将视频元素注入到原生底层背景 div 中 (接受视频 URL 或 null)
    function injectVideoElement(videoUrl) {
        let video = document.getElementById('gwc-plugin-bg-video');
        if (!video) {
            video = document.createElement('video');
            video.id = 'gwc-plugin-bg-video';
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            // 使视频像 cover 图片一样完美平铺
            video.style.cssText = `
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                object-fit: cover;
                z-index: 1;
                pointer-events: none;
                transition: opacity 1.5s ease-in-out;
            `;

            const findBgAndInject = () => {
                // z-0 容器是 App.jsx 中定义的最底层背景图层
                const bgContainer = document.querySelector('div.z-0');
                if (bgContainer && !bgContainer.contains(video)) {
                    bgContainer.appendChild(video);
                    return true;
                }
                return false;
            };

            if (!findBgAndInject()) {
                const observer = new MutationObserver((mutations, obs) => {
                    if (findBgAndInject()) obs.disconnect();
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }
        }

        if (videoUrl) {
            video.src = videoUrl;
            video.play().catch(e => console.warn("视频自动播放受限:", e));
        } else {
            video.pause();
            video.src = '';
            video.style.opacity = '0';
        }
        updateVideoVisibility();
    }

    // 监控系统设置界面，向其中动态插入视频上传 UI
    const settingsObserver = new MutationObserver(() => {
        const labels = Array.from(document.querySelectorAll('label'));
        const targetLabel = labels.find(l => l.textContent.includes('主标题界面背景图') || l.textContent.includes('主标题背景'));
        
        if (targetLabel) {
            // 找到包裹背景图设置的网格容器
            const targetContainer = targetLabel.closest('.bg-white\\/60') || targetLabel.parentElement.parentElement;
            
            if (targetContainer && !document.getElementById('gwc-video-bg-setting')) {
                const mirrorId = localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin';
                const isGlobal = localStorage.getItem(mirrorId + '_video_bg_global') === 'true';

                const div = document.createElement('div');
                div.id = 'gwc-video-bg-setting';
                // 继承原版样式，使其能被 ATRI 主题包自动透明化
                div.className = "bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm mt-6";
                div.innerHTML = `
                    <label class="block font-bold text-[#ba3f42] mb-2"><span class="text-sm">✱</span> 动态视频背景</label>
                    <p class="text-xs text-[#7a6b5d] mb-4">上传 MP4 或 WebM 格式视频作为背景。视频将自动静音循环，其优先级高于静态背景图。</p>
                    <div class="flex flex-col gap-3">
                        <input type="file" accept="video/mp4,video/webm" id="gwc-video-upload-input" class="block w-full text-sm text-[#7a6b5d] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#ba3f42] file:text-white hover:file:bg-[#a63d3d] cursor-pointer"/>
                        <div class="flex flex-wrap items-center gap-4 mt-2 pt-4 border-t border-dashed border-[#e6d5b8]">
                            <button id="gwc-video-clear-btn" class="w-max px-4 py-1.5 bg-[#fdfaf5] hover:bg-[#efe6d5] border border-[#d9c5b2] text-[#4a4036] rounded-full text-xs font-bold transition-colors shadow-sm">清除动态视频</button>
                            <label class="flex items-center gap-2 text-sm font-bold text-[#1a5c9a] cursor-pointer">
                                <input type="checkbox" id="gwc-video-global-toggle" class="w-4 h-4 accent-[#5ab4ed]" ${isGlobal ? 'checked' : ''}>
                                全局显示 (使游戏内也显示该视频)
                            </label>
                        </div>
                    </div>
                `;
                
                // 将视频设置块平滑插入到背景图设置的下方
                targetContainer.parentNode.insertBefore(div, targetContainer.nextSibling);

                // 绑定上传事件
                document.getElementById('gwc-video-upload-input').onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 200 * 1024 * 1024) {
                        if(window.$GWC) window.$GWC.showToast("警告：视频文件超过 200MB，可能会导致浏览器内存崩溃，请压缩后再传！", "error", 6000);
                        e.target.value = '';
                        return;
                    }
                    if(window.$GWC) window.$GWC.showToast("正在上传视频至服务器...", "info");
                    try {
                        await VideoDB.saveVideo(file);
                        const videoUrl = await VideoDB.loadVideo();
                        injectVideoElement(videoUrl);
                        if(window.$GWC) window.$GWC.showToast("✅ 动态视频背景设置成功！", "success");
                    } catch(err) {
                        if(window.$GWC) window.$GWC.showToast("视频保存失败：" + err.message, "error");
                    }
                    e.target.value = '';
                };

                // 绑定清除事件
                document.getElementById('gwc-video-clear-btn').onclick = async () => {
                    await VideoDB.deleteVideo();
                    injectVideoElement(null);
                    if(window.$GWC) window.$GWC.showToast("已释放并清除视频背景", "info");
                };

                // 绑定全局开关事件
                document.getElementById('gwc-video-global-toggle').onchange = (e) => {
                    localStorage.setItem(mirrorId + '_video_bg_global', e.target.checked);
                    updateVideoVisibility();
                };
            }
        }
    });

    // 监听 DOM 树的变化，判断用户是否按下了 START 按钮进入了游戏，以此来淡出或保持视频
    const appStateObserver = new MutationObserver(() => {
        updateVideoVisibility();
    });

    // 启动插件流
    (async () => {
        settingsObserver.observe(document.body, { childList: true, subtree: true });
        appStateObserver.observe(document.body, { childList: true, subtree: true });
        
        try {
            const videoUrl = await VideoDB.loadVideo();
            if (videoUrl) {
                injectVideoElement(videoUrl);
            }
        } catch (err) {
            console.error("加载视频背景失败", err);
        }
        
        if(window.$GWC) window.$GWC.showToast("🎬 动态视频背景模块加载完毕", "success");
    })();

})();