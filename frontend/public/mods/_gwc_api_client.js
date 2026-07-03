/**
 * GWC 插件 API 客户端
 * 为插件模组提供统一的服务端数据访问接口
 */
(function() {
  const API_BASE = '';

  function getActiveUserId() {
    return localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin';
  }

  async function apiFetch(path, options = {}) {
    try {
      const resp = await fetch(`${API_BASE}${path}`, options);
      if (!resp.ok) {
        if (resp.status === 404) return null;
        throw new Error(`API ${resp.status}`);
      }
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) return resp.json();
      return resp;
    } catch (e) {
      console.warn(`[GWC_API] ${path}`, e.message);
      return null;
    }
  }

  window.__GWC_API = {
    base: API_BASE,
    getActiveUserId,
    getMirrorId: getActiveUserId, // 兼容旧插件

    // --- 核心数据 ---
    async getCore(key) {
      return await apiFetch(`/api/userdata/${getActiveUserId()}/core/${key}`);
    },
    async setCore(key, data) {
      return await apiFetch(`/api/userdata/${getActiveUserId()}/core/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },

    // --- 插件 JSON 数据 CRUD ---
    async listPluginJson(pluginName) {
      return await apiFetch(`/api/userdata/${getActiveUserId()}/plugins/${pluginName}`) || [];
    },
    async getPluginJson(pluginName, key) {
      return await apiFetch(`/api/userdata/${getActiveUserId()}/plugins/${pluginName}/${key}`);
    },
    async setPluginJson(pluginName, key, data) {
      return await apiFetch(`/api/userdata/${getActiveUserId()}/plugins/${pluginName}/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    async deletePluginJson(pluginName, key) {
      return await apiFetch(`/api/userdata/${getActiveUserId()}/plugins/${pluginName}/${key}`, {
        method: 'DELETE'
      });
    },

    // --- 插件二进制数据 ---
    async uploadPluginBlob(pluginName, key, blob, filename) {
      const mid = getActiveUserId();
      const formData = new FormData();
      formData.append('file', blob, filename || 'blob');
      const resp = await fetch(`${API_BASE}/api/userdata/${mid}/plugins/${pluginName}/${key}/blob`, {
        method: 'POST',
        body: formData
      });
      return resp.json();
    },
    getPluginBlobUrl(pluginName, key) {
      return `${API_BASE}/api/userdata/${getActiveUserId()}/plugins/${pluginName}/${key}/blob`;
    },

    // --- 读取其他用户的数据 ---
    async getCoreForUser(userId, key) {
      return await apiFetch(`/api/userdata/${userId}/core/${key}`);
    },
    getCoreForMirror: async function(mirrorId, key) {
      return await apiFetch(`/api/userdata/${mirrorId}/core/${key}`);
    },

    // --- 删除用户全部数据 ---
    async deleteAllUserData(userId) {
      return await apiFetch(`/api/userdata/${userId}/all`, { method: 'DELETE' });
    }
  };
})();
