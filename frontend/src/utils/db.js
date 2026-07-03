// ==========================================
// GWC 数据存储层 - 服务端 API 版本
// 所有数据存储在 userdata/ 目录下，通过后端 API 访问
// ==========================================

const API_BASE = '';

export const initDB = () => Promise.resolve(); // 兼容性占位

export const getActiveMirrorId = () => localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin';

// --- 通用 fetch 封装 ---
async function apiFetch(path, options = {}) {
    try {
        const resp = await fetch(`${API_BASE}${path}`, options);
        if (!resp.ok) {
            if (resp.status === 404) return null;
            const text = await resp.text().catch(() => '');
            throw new Error(`API ${resp.status}: ${text}`);
        }
        const ct = resp.headers.get('content-type') || '';
        if (ct.includes('application/json')) return resp.json();
        return resp;
    } catch (e) {
        console.error(`[API] ${path}`, e);
        return null;
    }
}

// ==========================================
// 核心 JSON 数据读写 (settings, sessions, saves 等)
// ==========================================

export const saveCoreData = async (key, data) => {
    const mid = getActiveMirrorId();
    await apiFetch(`/api/userdata/${mid}/core/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};

export const loadCoreData = async (key) => {
    const mid = getActiveMirrorId();
    return await apiFetch(`/api/userdata/${mid}/core/${key}`);
};

export const loadBatchCoreData = async (keys, includeMedia = false) => {
    const mid = getActiveMirrorId();
    const keysStr = keys.join(',');
    const mediaParam = includeMedia ? '&media=true' : '';
    const result = await apiFetch(`/api/userdata/${mid}/batch?keys=${encodeURIComponent(keysStr)}${mediaParam}`);
    return result || {};
};

// ==========================================
// Live2D 模型
// ==========================================

export const saveMultiModelToDB = async (modelItem) => {
    const mid = getActiveMirrorId();
    const formData = new FormData();
    formData.append('id', modelItem.id);
    formData.append('name', modelItem.name);
    if (modelItem.files) {
        modelItem.files.forEach(f => {
            const blob = f.blob || f;
            const name = f.path || f.name || 'file';
            formData.append('files', blob, name);
        });
    }
    const resp = await fetch(`${API_BASE}/api/userdata/${mid}/models`, {
        method: 'POST',
        body: formData
    });
    if (!resp.ok) throw new Error(`Model upload failed: ${resp.status}`);
};

export const loadModelsListFromDB = async () => {
    const mid = getActiveMirrorId();
    const result = await apiFetch(`/api/userdata/${mid}/models`);
    return Array.isArray(result) ? result : [];
};

export const getMultiModelFromDB = async (id) => {
    const mid = getActiveMirrorId();
    // 先在当前镜像下查找
    let manifest = await apiFetch(`/api/userdata/${mid}/models/${id}`);
    let foundMid = mid;
    // 如果找不到，搜索所有用户目录（兼容老版本迁移的模型）
    if (!manifest) {
        const searchResult = await apiFetch(`/api/models/search/${id}`);
        if (searchResult && searchResult.found) {
            manifest = searchResult.manifest;
            foundMid = searchResult.mirror_id;
        }
    }
    if (!manifest) return null;
    return {
        ...manifest,
        baseUrl: `${API_BASE}/api/userdata/${foundMid}/models/${id}/files`
    };
};

export const deleteMultiModelFromDB = async (id) => {
    const mid = getActiveMirrorId();
    await apiFetch(`/api/userdata/${mid}/models/${id}`, { method: 'DELETE' });
};

// 旧版单模型文件加载（兼容性保留）
export const loadModelFilesFromDB = async () => {
    return null; // 不再支持旧版格式
};

// ==========================================
// BGM 音频
// ==========================================

export const saveBGMToDB = async (bgmItem) => {
    const mid = getActiveMirrorId();
    const formData = new FormData();
    formData.append('file', bgmItem.blob || bgmItem.file, bgmItem.name);
    formData.append('id', bgmItem.id);
    formData.append('name', bgmItem.name);
    const resp = await fetch(`${API_BASE}/api/userdata/${mid}/bgm`, {
        method: 'POST',
        body: formData
    });
    if (!resp.ok) throw new Error(`BGM upload failed: ${resp.status}`);
};

export const loadBGMFromDB = async () => {
    const mid = getActiveMirrorId();
    const items = await apiFetch(`/api/userdata/${mid}/bgm`);
    if (!Array.isArray(items)) return [];
    return items.map(item => ({
        ...item,
        url: `${API_BASE}/api/userdata/${mid}/bgm/${item.id}/file`
    }));
};

export const deleteBGMFromDB = async (id) => {
    const mid = getActiveMirrorId();
    await apiFetch(`/api/userdata/${mid}/bgm/${id}`, { method: 'DELETE' });
};

// ==========================================
// 图片/设置（标题背景等）
// ==========================================

export const saveImageToDB = async (key, fileOrBlob) => {
    const mid = getActiveMirrorId();
    if (!fileOrBlob) {
        await apiFetch(`/api/userdata/${mid}/app_image/${key}`, { method: 'DELETE' });
        return;
    }
    const formData = new FormData();
    formData.append('file', fileOrBlob, `${key}.png`);
    const resp = await fetch(`${API_BASE}/api/userdata/${mid}/app_image/${key}`, {
        method: 'POST',
        body: formData
    });
    if (!resp.ok) throw new Error(`Image upload failed: ${resp.status}`);
};

export const loadImageFromDB = async (key) => {
    const mid = getActiveMirrorId();
    const url = `${API_BASE}/api/userdata/${mid}/app_image/${key}`;
    // 直接返回 URL，让浏览器在实际渲染时加载图片（避免 HEAD/GET 超时阻塞启动）
    return url;
};

// ==========================================
// 背景图片
// ==========================================

export const saveBgItemToDB = async (bgItem) => {
    const mid = getActiveMirrorId();
    const formData = new FormData();
    formData.append('file', bgItem.file || bgItem.blob, bgItem.name);
    formData.append('id', bgItem.id);
    formData.append('name', bgItem.name);
    const resp = await fetch(`${API_BASE}/api/userdata/${mid}/bg_images`, {
        method: 'POST',
        body: formData
    });
    if (!resp.ok) throw new Error(`BG image upload failed: ${resp.status}`);
};

export const loadBgListFromDB = async () => {
    const mid = getActiveMirrorId();
    const items = await apiFetch(`/api/userdata/${mid}/bg_images`);
    if (!Array.isArray(items)) return [];
    return items.map(item => ({
        ...item,
        url: `${API_BASE}/api/userdata/${mid}/bg_images/${item.id}/file`
    }));
};

export const deleteBgItemFromDB = async (id) => {
    const mid = getActiveMirrorId();
    await apiFetch(`/api/userdata/${mid}/bg_images/${id}`, { method: 'DELETE' });
};

// ==========================================
// 前端插件 Mods
// ==========================================

export const saveModToDB = async (modItem) => {
    const mid = getActiveMirrorId();
    await apiFetch(`/api/userdata/${mid}/mods/${modItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modItem)
    });
};

export const loadModsFromDB = async () => {
    const mid = getActiveMirrorId();
    const result = await apiFetch(`/api/userdata/${mid}/mods`);
    return Array.isArray(result) ? result : [];
};

export const deleteModFromDB = async (id) => {
    const mid = getActiveMirrorId();
    await apiFetch(`/api/userdata/${mid}/mods/${id}`, { method: 'DELETE' });
};

// ==========================================
// 工具函数
// ==========================================

export const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(blob);
});
