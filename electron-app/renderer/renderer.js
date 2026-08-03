// IPC 接口抽象：优先用 preload 暴露的 window.electronAPI；否则在 nodeIntegration
// 环境下用 ipcRenderer 构造；再不行则 no-op 兜底（保证 Live2D 仍能显示）。
const electronAPI = (function () {
  if (window.electronAPI) return window.electronAPI
  try {
    const { ipcRenderer } = require('electron')
    const RECV = ['open-settings', 'switch-model', 'reset-position', 'voice-settings', 'voice-key', 'force-passthrough',
                  'mmd-set-motion', 'mmd-load-model', 'switch-live2d-model', 'toggle-mode', 'mmd-rerender', 'mmd-set-physics']
    return {
      setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', { ignore }),
      saveModelPosition: (pos) => ipcRenderer.send('save-model-position', pos),
      getPetConfig: () => ipcRenderer.invoke('get-pet-config'),
      getFrontendSettings: () => ipcRenderer.invoke('get-frontend-settings'),
      takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
      getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
      toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
      savePetConfig: (cfg) => ipcRenderer.invoke('save-pet-config', cfg),
      log: (msg) => { try { ipcRenderer.send('pet-log', String(msg)) } catch (e) {} },
      send: (ch, ...args) => { try { ipcRenderer.send(ch, ...args) } catch (e) {} },
      on: (ch, listener) => {
        if (!RECV.includes(ch)) return () => {}
        const wrapped = (_e, ...args) => listener(...args)
        ipcRenderer.on(ch, wrapped)
        return () => ipcRenderer.removeListener(ch, wrapped)
      },
    }
  } catch (e) {
    console.warn('[GWC] IPC 不可用，桌宠功能降级（Live2D 仍可显示）', e)
    return {
      setIgnoreMouseEvents() {}, saveModelPosition() {},
      getPetConfig() { return Promise.resolve({ alwaysOnTop: true, visionModel: { enabled: false } }) },
      getFrontendSettings() { return Promise.resolve(null) },
      takeScreenshot() { return Promise.resolve(null) },
      getAlwaysOnTop() { return Promise.resolve(true) },
      toggleAlwaysOnTop() { return Promise.resolve(true) },
      savePetConfig() { return Promise.resolve(true) },
      log() {},
      on() { return () => {} },
    }
  }
})()

// 供 MMD 引擎(独立 bundle)写面包屑日志用
window.__petLog = (msg) => { try { electronAPI.log(msg) } catch (e) {} }

const BACKEND_PORT = 5201
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`

let app = null, model = null
let interactionX = 0, interactionY = 0, interactionWidth = 0, interactionHeight = 0
let pendingScreenshot = null, frontendSettings = null, petConfig = null
let pendingAttachments = []
let mouseX = 0, mouseY = 0
let chatHistory = [] // 共享聊天记录

// ============ 穿透控制 ============
// 未捕获异常/Promise 拒绝统一打到 console.error，
// 由主进程写入 userdata/pet_debug.log（穿透时 DevTools 打不开也能诊断）
window.addEventListener('error', (e) => {
    console.error(`[未捕获异常] ${e.message} @ ${e.filename}:${e.lineno}  ${e.error && e.error.stack ? e.error.stack : ''}`)
})
window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    console.error(`[未处理的Promise拒绝] ${r && (r.stack || r.message) ? (r.stack || r.message) : r}`)
})

// 紧急穿透模式：由全局快捷键触发，强制让窗口穿透并卸载 MMD，
// 用于从“桌宠夺走全屏鼠标”的死锁中恢复。
let forcePassthrough = false

function setPT(on) { electronAPI.setIgnoreMouseEvents(on) }

function emergencyRecover() {
    forcePassthrough = true
    try { setPT(true) } catch (e) {}
    try { if (window.mmd && window.mmd.isActive()) window.mmd.unload() } catch (e) {}
    try {
        const s = document.getElementById('mmd-select'); if (s) s.value = ''
        currentMmdModel = null
    } catch (e) {}
    // 3 秒后解除强制穿透，恢复正常交互
    setTimeout(() => { forcePassthrough = false }, 3000)
    try { addSystemMsg('🆘 已强制恢复鼠标穿透并卸载 MMD') } catch (e) {}
}
window.__gwcEmergencyRecover = emergencyRecover
function isMouseOverUI() { return isOver('fullchat-panel') || isOver('settings-panel') || isOver('chat-container') }
function isOver(id) {
    const el = document.getElementById(id)
    if (!el || el.classList.contains('hidden')) return false
    const r = el.getBoundingClientRect()
    return mouseX >= r.left && mouseX <= r.right && mouseY >= r.top && mouseY <= r.bottom
}

function startMouseTracker() {
    document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY })
    setInterval(() => {
        // 故障安全：任何异常都必须恢复鼠标穿透，否则全屏透明窗口会夺走
        // 整个桌面的鼠标，让用户无法操作任何程序。
        try {
            if (forcePassthrough) { setPT(true); return }
            const mmdActive = window.mmd && window.mmd.isActive()
            const sx = mouseX * 2, sy = mouseY * 2
            const overModel = mmdActive
                ? window.mmd.hitTest(mouseX, mouseY)
                : (model && sx >= interactionX && sx <= interactionX + interactionWidth && sy >= interactionY && sy <= interactionY + interactionHeight)
            setPT(!(overModel || isMouseOverUI()))
        } catch (e) {
            console.warn('[桌宠] 鼠标追踪异常，已强制恢复穿透', e)
            try { setPT(true) } catch (e2) {}
        }
    }, 50)
}

// ============ PIXI ============
function initPIXI() {
    const cv = document.getElementById('canvas')
    // 诊断：浏览器对同时存活的 WebGL 上下文有上限，MMD(three.js) 的上下文
    // 可能挤掉 PIXI 的上下文，导致 Live2D 不再出画。这里记录下来以便确认。
    cv.addEventListener('webglcontextlost', (e) => {
        console.error('[桌宠] PIXI WebGL 上下文丢失！Live2D 将停止渲染')
        electronAPI.log('[桌宠] PIXI WebGL 上下文丢失')
    })
    cv.addEventListener('webglcontextrestored', () => {
        console.warn('[桌宠] PIXI WebGL 上下文已恢复')
        electronAPI.log('[桌宠] PIXI WebGL 上下文已恢复')
    })
    app = new PIXI.Application({ view: cv, autoStart: true, transparent: true, width: window.innerWidth * 2, height: window.innerHeight * 2 })
    app.stage.position.set(window.innerWidth / 2, window.innerHeight / 2)
    app.stage.pivot.set(window.innerWidth / 2, window.innerHeight / 2)
}

async function loadModel(url) {
    if (!app) initPIXI()
    currentModelPath = url // 记录当前模型，供退出 MMD 后重新加载
    try {
        if (model) { app.stage.removeChild(model); model.destroy() }
        model = await PIXI.live2d.Live2DModel.from(url)
        app.stage.addChild(model); setupInteraction()
        const s = 0.45, sx = (window.innerWidth * s) / model.internalModel.width, sy = (window.innerHeight * s) / model.internalModel.height
        model.scale.set(Math.min(sx, sy))
        if (petConfig?.modelPosition) { model.x = petConfig.modelPosition.x * window.innerWidth; model.y = petConfig.modelPosition.y * window.innerHeight; if (petConfig.modelPosition.scale) { const sc = petConfig.modelPosition.scale; model.scale.x = sc; model.scale.y = sc } } else { model.x = window.innerWidth * 0.75; model.y = window.innerHeight * 0.65 }
        updateIA()
    } catch (e) { console.error(e) }
}

function updateIA() {
    if (!model) return
    interactionWidth = model.width / 3; interactionHeight = model.height * 0.7
    interactionX = model.x + (model.width - interactionWidth) / 2
    interactionY = model.y + (model.height - interactionHeight) / 2
}

// MMD 激活时必须完全停手：否则这些 window 级监听会继续改写并保存
// Live2D 的位置/缩放，导致两套模型共用一套设置，退回 Live2D 时跑到屏幕角落。
function l2dLocked() { return !!(window.mmd && window.mmd.isActive()) }

let interactionBound = false // window 级监听只绑一次，防止每次换模型重复累积

function setupInteraction() {
    if (!model) return; model.interactive = true
    // --- 模型级监听：随模型重建，需每次绑定 ---
    model.containsPoint = (p) => p.x >= interactionX && p.x <= interactionX + interactionWidth && p.y >= interactionY && p.y <= interactionY + interactionHeight
    model.on('mousedown', (e) => { if (l2dLocked()) return; const p = e.data.global; if (model.containsPoint(p)) { model._d = true; model._ox = p.x - model.x; model._oy = p.y - model.y } })
    model.on('mousemove', (e) => { if (l2dLocked()) return; if (model._d) { model.x = e.data.global.x - model._ox; model.y = e.data.global.y - model._oy; updateIA() } })
    model.on('click', () => { if (l2dLocked()) return; if (model.containsPoint(app.renderer.plugins.interaction.mouse.global)) { model.motion('Tap'); model.expression() } })

    // --- window 级监听：只绑一次，避免每次切换模型重复累积 ---
    if (interactionBound) return
    interactionBound = true

    window.addEventListener('mouseup', () => {
        if (l2dLocked() || !model) return
        if (model._d) { model._d = false; electronAPI.saveModelPosition({ x: model.x / window.innerWidth, y: model.y / window.innerHeight, scale: model.scale.x }) }
    })
    window.addEventListener('contextmenu', (e) => e.preventDefault())
    // 滚轮缩放：仅在鼠标不在 UI 元素上、且 MMD 未激活时生效
    let wheelTimer = null
    window.addEventListener('wheel', (e) => {
        if (l2dLocked() || !model || isMouseOverUI()) return
        const f = e.deltaY > 0 ? 0.92 : 1.08
        const mx = app.renderer.plugins.interaction.mouse.global.x, my = app.renderer.plugins.interaction.mouse.global.y
        model.x -= (mx - model.x) * (f - 1); model.y -= (my - model.y) * (f - 1)
        model.scale.set(model.scale.x * f); updateIA()
        clearTimeout(wheelTimer)
        wheelTimer = setTimeout(() => { electronAPI.saveModelPosition({ x: model.x / window.innerWidth, y: model.y / window.innerHeight, scale: model.scale.x }) }, 500)
    }, { passive: false })
    window.addEventListener('resize', () => { if (app?.renderer) { app.renderer.resize(window.innerWidth * 2, window.innerHeight * 2); app.stage.position.set(window.innerWidth / 2, window.innerHeight / 2); app.stage.pivot.set(window.innerWidth / 2, window.innerHeight / 2); updateIA() } })
}

// 退出 MMD 返回 Live2D。
// 实测：单纯把 canvas 显示回来后 Live2D 常常不出画，必须重新加载模型才行
// （日志已排除 WebGL 上下文丢失）。既然“手动切换模型”能稳定生效，
// 这里就直接自动执行同样的动作，省去用户反复手动切换。
async function returnToLive2D() {
    try {
        if (currentModelPath) {
            electronAPI.log('[桌宠] 退出 MMD，重新加载 Live2D 模型')
            await loadModel(currentModelPath)
        }
    } catch (e) {
        console.error('[桌宠] 重新加载 Live2D 失败', e)
    }
    restoreLive2DPosition()
}

// 把 Live2D 恢复到它自己保存的位置（两套设置各自独立）。
// 会校验存档合法性：早期版本的 bug 可能把位置/缩放写坏（模型跑到屏幕外或缩成一点），
// 表现就是“切回 Live2D 好像没成功”，这里检测到异常值就回落到默认摆位。
function restoreLive2DPosition() {
    if (!model) return
    const W = window.innerWidth, H = window.innerHeight
    const p = petConfig?.modelPosition
    let x = null, y = null, s = null
    if (p && isFinite(p.x) && isFinite(p.y)) {
        x = p.x * W; y = p.y * H
        if (isFinite(p.scale) && p.scale > 0) s = p.scale
    }
    // 合法性检查：必须落在可视范围内（留出边距），缩放在合理区间
    const posOk = x !== null && x > -W * 0.5 && x < W * 1.5 && y > -H * 0.5 && y < H * 1.5
    const scaleOk = s === null || (s > 0.005 && s < 10)
    if (!posOk || !scaleOk) {
        x = W * 0.75; y = H * 0.65; s = null
        console.warn('[桌宠] Live2D 存档位置异常，已回落到默认摆位')
    }
    model.x = x; model.y = y
    if (s !== null) model.scale.set(s)
    // 画布尺寸可能在 MMD 期间随窗口变化，这里同步一次，避免显示异常
    if (app?.renderer) {
        app.renderer.resize(W * 2, H * 2)
        app.stage.position.set(W / 2, H / 2)
        app.stage.pivot.set(W / 2, H / 2)
    }
    updateIA()
}

async function initModels() {
    try { const r = await fetch(`${BACKEND_URL}/api/models`); const d = await r.json(); if (d.models?.length) await loadModel(d.models[0].path) } catch (e) { setTimeout(initModels, 2000) }
}

// ============ 轮询前端主动搭话消息，显示到桌宠聊天框 ============
async function pollPetMessages() {
    try {
        const r = await fetch(`${BACKEND_URL}/api/pet_chat/message/poll`);
        const d = await r.json();
        if (d.user_msg) {
            addMessage('user', d.user_msg);
            if (d.ai_msg) {
                // 取 AI 回复最后（最多 2 条）来简洁显示
                const lines = d.ai_msg.split('\n').filter(l => l.trim());
                const short = lines.slice(-4).join('\n');
                addMessage('assistant', short || d.ai_msg);
            }
        }
    } catch(e) {}
}
pollPetMessages();
setInterval(pollPetMessages, 2000);  // 每 2 秒轮询一次
async function loadConfigs() {
    try { petConfig = await electronAPI.getPetConfig() } catch (e) { petConfig = { alwaysOnTop: true, visionModel: { enabled: false } } }
    try { frontendSettings = await electronAPI.getFrontendSettings(); console.log('[配置]', frontendSettings?.openaiBaseUrl, frontendSettings?.aiModel) } catch (e) { frontendSettings = null }
}
function applyConfig() { if (petConfig?.hideChat) document.getElementById('chat-container').classList.add('hidden') }

// ============ 面板 ============
function openPanel(el) {
    el.classList.remove('hidden')
    document.getElementById('chat-container').classList.add('hidden')
    // 打开快捷面板时同步聊天记录
    if (el.id === 'fullchat-panel') syncFullchat()
}
function closePanel(el) {
    el.classList.add('hidden')
    const fp = document.getElementById('fullchat-panel'), sp = document.getElementById('settings-panel')
    if (fp.classList.contains('hidden') && sp.classList.contains('hidden') && !petConfig?.hideChat) document.getElementById('chat-container').classList.remove('hidden')
}

// ============ 消息系统 ============
// 添加消息到共享记录 + 桌面聊天框（3秒自动消失）+ 快捷面板（永久）
function addMessage(role, text) {
    chatHistory.push({ role, text, time: Date.now() })
    // 桌面聊天框：添加 + 3秒后淡出移除
    const el = document.getElementById('chat-messages')
    const d = document.createElement('div'); d.className = `msg ${role} fade-out`; d.textContent = text
    el.appendChild(d); el.scrollTop = el.scrollHeight
    setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 500) }, 3000)
    // 快捷面板：如果打开则同步
    const fp = document.getElementById('fullchat-panel')
    if (!fp.classList.contains('hidden')) syncFullchat()
}

// 同步全部记录到快捷面板
function syncFullchat() {
    const el = document.getElementById('fullchat-messages')
    el.innerHTML = ''
    chatHistory.forEach(m => {
        const d = document.createElement('div'); d.className = `msg ${m.role}`; d.textContent = m.text
        el.appendChild(d)
    })
    el.scrollTop = el.scrollHeight
}

// 系统消息（不消失，不进历史）
function addSystemMsg(text) {
    const el = document.getElementById('chat-messages')
    const d = document.createElement('div'); d.className = 'msg system'; d.textContent = text
    el.appendChild(d); el.scrollTop = el.scrollHeight
    setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 500) }, 3000)
}

// ============ 截图 ============
async function takeScreenshot() {
    const d = await electronAPI.takeScreenshot()
    if (d) { pendingScreenshot = d; document.getElementById('screenshot-img').src = d; document.getElementById('screenshot-preview').classList.remove('hidden'); addSystemMsg('📸 截图已捕获') }
}

// ============ 识图 ============
async function processVision(img) {
    const vm = petConfig?.visionModel
    if (vm?.enabled && vm.baseUrl && vm.model) {
        try {
            const h = { 'Content-Type': 'application/json' }; if (vm.apiKey) h['Authorization'] = `Bearer ${vm.apiKey}`
            const r = await fetch(`${vm.baseUrl}/v1/chat/completions`, { method: 'POST', headers: h, body: JSON.stringify({ model: vm.model, messages: [{ role: 'user', content: [{ type: 'text', text: '请详细描述这张图片。' }, { type: 'image_url', image_url: { url: img } }] }], stream: false }) })
            const d = await r.json(); return d.choices?.[0]?.message?.content || null
        } catch (e) {}
    }
    return null
}

// ============ LLM ============
async function callLLM(messages, includeSystem) {
    let msgs = [...messages]
    if (includeSystem && frontendSettings) {
        let systemPrompt = frontendSettings.customSystemPrompt || ''
        if (frontendSettings.aiName) systemPrompt = systemPrompt || `你是${frontendSettings.aiName}，一个友善的AI助手。`
        if (systemPrompt) msgs.unshift({ role: 'system', content: systemPrompt })
    }
    if (frontendSettings?.openaiBaseUrl && frontendSettings?.openaiApiKey) {
        const baseUrl = frontendSettings.openaiBaseUrl.replace(/\/+$/, '')
        const model = frontendSettings.aiModel || 'gpt-3.5-turbo'
        try {
            const r = await fetch(`${baseUrl}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${frontendSettings.openaiApiKey}` }, body: JSON.stringify({ model, messages, stream: false, temperature: frontendSettings.aiTemperature || 0.7 }) })
            if (r.ok) { const d = await r.json(); if (d.choices?.[0]?.message?.content) return d.choices[0].message.content }
        } catch (e) { console.warn('[LLM] 直接失败:', e.message) }
    }
    try {
        const r = await fetch(`${BACKEND_URL}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs, stream: false }) })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const raw = await r.text(); let reply = ''
        for (const line of raw.split('\n')) { const t = line.trim(); if (!t.startsWith('data: ')) continue; const p = t.slice(6); if (p === '[DONE]') break; try { const o = JSON.parse(p); reply += o.choices?.[0]?.delta?.content || o.choices?.[0]?.message?.content || '' } catch (e) {} }
        if (reply) return reply
    } catch (e) { console.error('[LLM] Bridge失败:', e.message) }
    return null
}

// ============ 发送消息 ============
async function sendMsg(text, atts, inputEl) {
    if (!text.trim() && !atts?.length && !pendingScreenshot) return
    let display = text.trim(); if (pendingScreenshot || atts?.length) display = (display || '[图片]') + ' 📎'
    addMessage('user', display); if (inputEl) inputEl.value = ''
    let content = text.trim(), shot = pendingScreenshot, files = atts ? [...atts] : []
    pendingScreenshot = null; document.getElementById('screenshot-preview').classList.add('hidden'); document.getElementById('screenshot-img').src = ''
    try {
        const imgs = []; if (shot) imgs.push(shot); files.forEach(f => { if (f.type === 'image') imgs.push(f.data) })
        if (imgs.length > 0) {
            const descs = []; for (const img of imgs) { const d = await processVision(img); if (d) descs.push(d) }
            if (descs.length) content = `[图片内容]:\n${descs.join('\n')}\n\n${text.trim()}`
            else if (!text.trim()) { addSystemMsg('⚠️ 未配置识图模型'); return }
            else addSystemMsg('⚠️ 未配置识图模型，图片已忽略')
        }
        let doc = ''; files.forEach(f => { if (f.type === 'document') doc += `\n--- ${f.name} ---\n${f.data}\n` }); if (doc) content += `\n\n【附件】:${doc}`
        const messages = [...chatHistory, { role: 'user', content }]
        const reply = await callLLM(messages, true)
        if (reply) { chatHistory.push({ role: 'user', content }, { role: 'assistant', content: reply }); if (chatHistory.length > 40) chatHistory = chatHistory.slice(-40); addMessage('assistant', reply); fetch(`${BACKEND_URL}/api/tts_from_pet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: reply }) }).catch(() => {}); if (model) model.motion('Tap') }
        else addSystemMsg('⚠️ 未收到回复')
    } catch (e) { addSystemMsg('失败: ' + e.message) }
}

// ============ DOM ============
const chatInput = document.getElementById('chat-input')
const chatContainer = document.getElementById('chat-container')
const fcPanel = document.getElementById('fullchat-panel'), fcInput = document.getElementById('fullchat-input')
const stPanel = document.getElementById('settings-panel')
const fcAtt = document.getElementById('fullchat-attachments'), fcAttList = document.getElementById('fullchat-attachment-list')
const fileInput = document.getElementById('file-input')

// 桌面聊天框
document.getElementById('chat-send').addEventListener('click', () => sendMsg(chatInput.value, null, chatInput))
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(chatInput.value, null, chatInput) } })

// 语音按钮（桌面聊天框 + 快捷面板）
document.getElementById('btn-mic').addEventListener('click', () => { isRecordingVoice ? stopVoiceRecording() : startVoiceRecording() })
if (document.getElementById('btn-mic-fullchat')) { document.getElementById('btn-mic-fullchat').addEventListener('click', () => { isRecordingVoice ? stopVoiceRecording() : startVoiceRecording() }) }

// 截图
document.getElementById('btn-screenshot').addEventListener('click', takeScreenshot)
document.getElementById('btn-screenshot-inline').addEventListener('click', takeScreenshot)
document.getElementById('screenshot-cancel').addEventListener('click', () => { pendingScreenshot = null; document.getElementById('screenshot-preview').classList.add('hidden'); document.getElementById('screenshot-img').src = '' })

// 快捷聊天面板
document.getElementById('btn-open-fullchat').addEventListener('click', () => openPanel(fcPanel))
document.getElementById('fullchat-close').addEventListener('click', () => { closePanel(fcPanel); pendingAttachments = []; fcAtt.classList.add('hidden'); fcAttList.innerHTML = '' })
document.getElementById('fullchat-send').addEventListener('click', () => { sendMsg(fcInput.value, pendingAttachments, fcInput); pendingAttachments = []; fcAtt.classList.add('hidden'); fcAttList.innerHTML = '' })
fcInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(fcInput.value, pendingAttachments, fcInput); pendingAttachments = []; fcAtt.classList.add('hidden'); fcAttList.innerHTML = '' } })

// 快捷面板拖动
let fcDrag = false, fcDX = 0, fcDY = 0
document.querySelector('.fullchat-header').addEventListener('mousedown', (e) => { if (e.target.tagName === 'BUTTON') return; const rect = fcPanel.getBoundingClientRect(); fcPanel.style.left = rect.left + 'px'; fcPanel.style.top = rect.top + 'px'; fcPanel.style.bottom = 'auto'; fcPanel.style.transform = 'none'; fcDrag = true; fcDX = e.clientX - rect.left; fcDY = e.clientY - rect.top; e.preventDefault() })
window.addEventListener('mousemove', (e) => { if (fcDrag) { fcPanel.style.left = (e.clientX - fcDX) + 'px'; fcPanel.style.top = (e.clientY - fcDY) + 'px'; fcPanel.style.transform = 'none' } })
window.addEventListener('mouseup', () => { fcDrag = false })

// 文件上传
document.getElementById('btn-upload').addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', async (e) => {
    for (const f of e.target.files) {
        if (f.type.startsWith('image/')) { const d = await new Promise(r => { const rd = new FileReader(); rd.onload = ev => r(ev.target.result); rd.readAsDataURL(f) }); pendingAttachments.push({ type: 'image', name: f.name, data: d }) }
        else pendingAttachments.push({ type: 'document', name: f.name, data: await f.text() })
    }
    renderAtt(); fileInput.value = ''
})
function renderAtt() {
    fcAttList.innerHTML = ''; if (!pendingAttachments.length) { fcAtt.classList.add('hidden'); return }; fcAtt.classList.remove('hidden')
    pendingAttachments.forEach((a, i) => { const d = document.createElement('div'); d.className = 'att-item'; d.innerHTML = a.type === 'image' ? `<img src="${a.data}" class="att-thumb"><span>${a.name}</span><button class="att-rm" data-i="${i}">✕</button>` : `<span class="att-doc">📄 ${a.name}</span><button class="att-rm" data-i="${i}">✕</button>`; fcAttList.appendChild(d) })
    document.querySelectorAll('.att-rm').forEach(b => b.addEventListener('click', () => { pendingAttachments.splice(+b.dataset.i, 1); renderAtt() }))
}

// 桌面聊天框拖动
let chatDrag = false, chatDX = 0, chatDY = 0
chatContainer.addEventListener('mousedown', (e) => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return; chatDrag = true; chatDX = e.clientX - chatContainer.offsetLeft; chatDY = e.clientY - chatContainer.offsetTop; e.preventDefault() })
window.addEventListener('mousemove', (e) => { if (chatDrag) { chatContainer.style.left = (e.clientX - chatDX) + 'px'; chatContainer.style.top = 'auto'; chatContainer.style.bottom = (window.innerHeight - e.clientY + chatDY - chatContainer.offsetHeight) + 'px'; chatContainer.style.right = 'auto' } })
window.addEventListener('mouseup', () => { chatDrag = false })

// 置顶
const btnTop = document.getElementById('btn-topmost')
async function updateTopBtn() { const t = await electronAPI.getAlwaysOnTop(); btnTop.classList.toggle('active', t) }
btnTop.addEventListener('click', async () => { const t = await electronAPI.toggleAlwaysOnTop(); btnTop.classList.toggle('active', t) })

// Live2D 模型切换（设置面板内）
let availableModels = []
let currentModelPath = null

async function loadModelList() {
    const sel = document.getElementById('model-select')
    const refreshBtn = document.getElementById('model-refresh')
    if (!sel) return
    refreshBtn?.classList.add('spinning')
    try {
        const r = await fetch(`${BACKEND_URL}/api/models`)
        const d = await r.json()
        availableModels = d.models || []
        sel.innerHTML = ''
        if (!availableModels.length) {
            sel.innerHTML = '<option value="">未找到模型（放入 live2d_models 文件夹）</option>'
        } else {
            availableModels.forEach(m => {
                const opt = document.createElement('option')
                opt.value = m.path
                opt.textContent = m.name || m.path.split('/').pop()
                if (m.path === currentModelPath) opt.selected = true
                sel.appendChild(opt)
            })
        }
    } catch (e) {
        sel.innerHTML = '<option value="">加载失败，请检查后端连接</option>'
    }
    refreshBtn?.classList.remove('spinning')
}

document.getElementById('model-refresh')?.addEventListener('click', loadModelList)
document.getElementById('model-select')?.addEventListener('change', async (e) => {
    const path = e.target.value
    if (!path) return
    currentModelPath = path
    await loadModel(path)
    if (!petConfig) petConfig = {}
    petConfig.currentModel = path
    await electronAPI.savePetConfig(petConfig)
    addSystemMsg('✅ 模型已切换')
})

// ============ MMD (3D) 模型 ============
let availableMmd = []
let currentMmdModel = null
// 动作元数据索引：path → { camera, cameras, audio, hasCamera, hasAudio }
let motionMetaMap = {}

async function loadMmdList() {
    const sel = document.getElementById('mmd-select')
    if (!sel) return
    const refreshBtn = document.getElementById('mmd-refresh')
    refreshBtn?.classList.add('spinning')
    try {
        const r = await fetch(`${BACKEND_URL}/api/mmd_models`)
        const d = await r.json()
        availableMmd = d.models || []
        const keep = sel.value
        sel.innerHTML = '<option value="">（未选择 / 使用 Live2D）</option>'
        availableMmd.forEach((m, i) => {
            const opt = document.createElement('option')
            opt.value = String(i)
            opt.textContent = m.name || `模型${i + 1}`
            sel.appendChild(opt)
        })
        if (keep && sel.querySelector(`option[value="${keep}"]`)) sel.value = keep
    } catch (e) {
        sel.innerHTML = '<option value="">扫描失败，请检查后端</option>'
    }
    refreshBtn?.classList.remove('spinning')
}

function fillMotionSelect(model) {
    const ms = document.getElementById('mmd-motion-select')
    if (!ms) return
    motionMetaMap = {}
    ms.innerHTML = '<option value="">无（静止站姿）</option>'
    ;(model?.motions || []).forEach(mo => {
        const opt = document.createElement('option')
        opt.value = mo.path
        // 共享动作库（_motions）里的动作加标记，与模型自带动作区分
        let label = mo.shared ? `🌐 ${mo.name}` : mo.name
        // 有镜头/音频的演出包加标记
        const extras = []
        if (mo.hasCamera) extras.push('🎥')
        if (mo.hasAudio) extras.push('🔊')
        if (extras.length) label += ' ' + extras.join('')
        opt.textContent = label
        ms.appendChild(opt)
        // 记录元数据，供 applyMotion 查找镜头/音频
        motionMetaMap[mo.path] = {
            camera: mo.camera || null,
            cameras: mo.cameras || null,
            audio: mo.audio || null,
            hasCamera: mo.hasCamera || false,
            hasAudio: mo.hasAudio || false,
        }
    })
}

async function loadCurrentMmd() {
    if (!currentMmdModel) return
    if (!window.mmd) {
        // 静默失败是上次难以定位问题的根源，这里必须给出可见反馈
        console.error('[MMD] 渲染引擎未加载：mmd.bundle.js 未执行或加载失败')
        addSystemMsg('❌ MMD 引擎未加载，请重新生成 mmd.bundle.js（node build-mmd.mjs）')
        const el = document.getElementById('mmd-status')
        if (el) el.textContent = 'MMD 引擎未加载（mmd.bundle.js 缺失或执行失败）'
        return
    }
    const mode = document.getElementById('mmd-render-mode')?.value || 'toon'
    const physics = document.getElementById('mmd-physics')?.checked === true
    const vmd = document.getElementById('mmd-motion-select')?.value || null
    const meta = vmd ? motionMetaMap[vmd] : null
    const opts = { renderMode: mode, physics }
    if (meta && meta.camera) opts.cameraUrl = meta.camera
    if (meta && meta.audio) opts.audioUrl = meta.audio
    electronAPI.log(`[MMD] 即将加载: ${currentMmdModel.path} (mode=${mode}, physics=${physics}, camera=${!!meta?.camera}, audio=${!!meta?.audio})`)
    try {
        await window.mmd.load(currentMmdModel.path, vmd, opts)
        addSystemMsg('✅ MMD 模型已加载')
    } catch (e) {
        addSystemMsg('❌ MMD 加载失败，详见控制台')
    }
}

document.getElementById('mmd-select')?.addEventListener('change', async (e) => {
    const v = e.target.value
    if (v === '') { currentMmdModel = null; if (window.mmd?.isActive()) { window.mmd.unload(); returnToLive2D() } return }
    currentMmdModel = availableMmd[parseInt(v, 10)] || null
    fillMotionSelect(currentMmdModel)
    await loadCurrentMmd()
})
const RELOAD_ON_MOTION_KEY = 'gwc_mmd_reload_on_motion'
function reloadOnMotion() {
    try { return localStorage.getItem(RELOAD_ON_MOTION_KEY) === '1' } catch (e) { return false }
}

// 统一的动作切换入口：设置面板与托盘菜单都走这里
async function applyMotion(motionPath) {
    if (!window.mmd || !window.mmd.isActive()) {
        addSystemMsg('请先加载 MMD 模型再切换动作')
        return false
    }
    const vmd = motionPath || null
    // 查找该动作的演出元数据（镜头/音频）
    const meta = vmd ? motionMetaMap[vmd] : null
    const perfOpts = meta ? { cameraUrl: meta.camera, audioUrl: meta.audio } : undefined
    let ok
    if (reloadOnMotion() && currentMmdModel) {
        // 用户选择了「切换动作时重新渲染模型」：走完整重载
        addSystemMsg('🎬 正在重新渲染模型并切换动作…')
        const mode = document.getElementById('mmd-render-mode')?.value || 'toon'
        const physics = document.getElementById('mmd-physics')?.checked === true
        try {
            await window.mmd.reload(currentMmdModel.path, vmd, { renderMode: mode, physics, ...perfOpts })
            window.mmd.resetRotation() // 重载后同样回正朝向
            ok = true
        } catch (e) { ok = false }
    } else {
        ok = await window.mmd.setMotion(vmd, perfOpts) // 轻量路径：只换动作，方向自动回正
    }
    const hasCamera = meta && meta.hasCamera
    const hasAudio = meta && meta.hasAudio
    const extras = []
    if (hasCamera) extras.push('镜头')
    if (hasAudio) extras.push('音频')
    const extraStr = extras.length ? `（含${extras.join('+')}）` : ''
    addSystemMsg(ok ? (vmd ? `🕺 动作已切换${extraStr}` : '⏹️ 已停止动作') : '❌ 动作切换失败')
    if (ok) {
        const ms = document.getElementById('mmd-motion-select')
        if (ms && [...ms.options].some(o => o.value === (motionPath || ''))) ms.value = motionPath || ''
    }
    return ok
}

document.getElementById('mmd-motion-select')?.addEventListener('change', async (e) => {
    if (window.mmd?.isActive()) { await applyMotion(e.target.value); return }
    await loadCurrentMmd()
})
document.getElementById('mmd-reload-on-motion')?.addEventListener('change', (e) => {
    try { localStorage.setItem(RELOAD_ON_MOTION_KEY, e.target.checked ? '1' : '0') } catch (err) {}
})
document.getElementById('mmd-render-mode')?.addEventListener('change', (e) => { window.mmd?.setRenderMode(e.target.value) })
document.getElementById('mmd-brightness')?.addEventListener('input', (e) => { window.mmd?.setBrightness(e.target.value) })
document.getElementById('mmd-outline')?.addEventListener('change', (e) => { window.mmd?.setOutline(e.target.checked) })
document.getElementById('mmd-outline-scale')?.addEventListener('input', (e) => { window.mmd?.setOutlineScale(e.target.value) })
document.getElementById('mmd-damping')?.addEventListener('input', (e) => { window.mmd?.setDamping(e.target.value) })
document.getElementById('mmd-global-brightness')?.addEventListener('input', (e) => { window.mmd?.setGlobalBrightness(e.target.value) })
document.getElementById('mmd-restpose')?.addEventListener('input', (e) => { window.mmd?.setRestPoseAngle(e.target.value) })
document.getElementById('mmd-solver')?.addEventListener('input', (e) => { window.mmd?.setSolverIterations(e.target.value) })
document.getElementById('mmd-physics')?.addEventListener('change', (e) => {
    const on = e.target.checked
    window.mmd?.setPhysics(on)
    electronAPI.send('sync-physics', on) // 同步托盘勾选状态
})
document.getElementById('mmd-refresh')?.addEventListener('click', loadMmdList)
document.getElementById('mmd-unload')?.addEventListener('click', () => {
    currentMmdModel = null
    const s = document.getElementById('mmd-select'); if (s) s.value = ''
    window.mmd?.unload()
    returnToLive2D() // 重新加载 Live2D 并恢复其自身位置
})

async function rerenderMmd() {
    if (!currentMmdModel || !window.mmd) { addSystemMsg('请先选择一个 MMD 模型'); return false }
    const mode = document.getElementById('mmd-render-mode')?.value || 'toon'
    const physics = document.getElementById('mmd-physics')?.checked === true
    const vmd = document.getElementById('mmd-motion-select')?.value || null
    addSystemMsg('🎬 正在重新渲染模型…')
    try {
        await window.mmd.reload(currentMmdModel.path, vmd, { renderMode: mode, physics })
        addSystemMsg('✅ 模型已重新渲染')
        return true
    } catch (e) {
        addSystemMsg('❌ 重新渲染失败，详见调试日志')
        return false
    }
}
document.getElementById('mmd-rerender')?.addEventListener('click', rerenderMmd)

// 设置面板
electronAPI.on('open-settings', async () => {
    if (!stPanel.classList.contains('hidden')) { closePanel(stPanel); return }
    await loadConfigs()
    const info = []; if (frontendSettings) { info.push(`API: ${frontendSettings.openaiBaseUrl || '(未配置)'}`); info.push(`模型: ${frontendSettings.aiModel || '(未配置)'}`); info.push(`Key: ${frontendSettings.openaiApiKey ? '已配置' : '(未配置)'}`) } else info.push('(未读取到前端配置)')
    document.getElementById('llm-info').textContent = info.join('\n')
    document.getElementById('tts-info').textContent = frontendSettings ? (frontendSettings.ttsEnabled ? '已启用' : '未启用') : '(未读取到前端配置)'
    const vm = petConfig?.visionModel || {}
    document.getElementById('vision-enabled').checked = vm.enabled || false; document.getElementById('vision-base-url').value = vm.baseUrl || ''; document.getElementById('vision-api-key').value = vm.apiKey || ''; document.getElementById('vision-model').value = vm.model || ''
    document.getElementById('hide-chat').checked = petConfig?.hideChat || false
    currentModelPath = petConfig?.currentModel || currentModelPath
    await loadModelList()
    await loadMmdList()
    // 同步 MMD 控件到已保存的实际值，避免显示成默认值
    if (window.mmd) {
        const b = document.getElementById('mmd-brightness'); if (b) b.value = window.mmd.getBrightness()
        const o = document.getElementById('mmd-outline'); if (o) o.checked = window.mmd.getOutline()
        const os = document.getElementById('mmd-outline-scale'); if (os) os.value = window.mmd.getOutlineScale()
        const dp = document.getElementById('mmd-damping'); if (dp) dp.value = window.mmd.getDamping()
        const sv = document.getElementById('mmd-solver'); if (sv) sv.value = window.mmd.getSolverIterations()
        const rm = document.getElementById('mmd-reload-on-motion'); if (rm) rm.checked = reloadOnMotion()
        const gb = document.getElementById('mmd-global-brightness'); if (gb) gb.value = window.mmd.getGlobalBrightness()
        const rp = document.getElementById('mmd-restpose'); if (rp) rp.value = window.mmd.getRestPoseAngle()
    }
    openPanel(stPanel)
})
document.getElementById('settings-close').addEventListener('click', () => closePanel(stPanel))
document.getElementById('settings-save').addEventListener('click', async () => {
    if (!petConfig) petConfig = {}
    petConfig.visionModel = { enabled: document.getElementById('vision-enabled').checked, baseUrl: document.getElementById('vision-base-url').value.trim(), apiKey: document.getElementById('vision-api-key').value.trim(), model: document.getElementById('vision-model').value.trim() }
    petConfig.hideChat = document.getElementById('hide-chat').checked
    await electronAPI.savePetConfig(petConfig)
    if (petConfig.hideChat) chatContainer.classList.add('hidden'); else chatContainer.classList.remove('hidden')
    addSystemMsg('✅ 设置已保存'); closePanel(stPanel)
})

// IPC
electronAPI.on('switch-model', (p) => loadModel(p))
electronAPI.on('reset-position', () => { if (window.mmd && window.mmd.isActive()) { window.mmd.resetPosition(); return } if (model) { model.x = window.innerWidth * 0.75; model.y = window.innerHeight * 0.65; updateIA() } })
electronAPI.on('force-passthrough', () => emergencyRecover())

// 托盘：MMD 动作快速切换
electronAPI.on('mmd-set-motion', (motionPath) => applyMotion(motionPath))

// 托盘：骨骼物理开关
electronAPI.on('mmd-set-physics', (on) => {
    const cb = document.getElementById('mmd-physics')
    if (cb) cb.checked = on
    window.mmd?.setPhysics(on)
})

// 托盘：重新渲染当前 MMD 模型
electronAPI.on('mmd-rerender', () => rerenderMmd())

// 托盘：切换 Live2D 模型（若正处于 MMD 模式则先退出）
electronAPI.on('switch-live2d-model', async (modelPath) => {
    if (window.mmd?.isActive()) { window.mmd.unload(); currentMmdModel = null }
    if (modelPath) {
        await loadModel(modelPath)
        if (!petConfig) petConfig = {}
        petConfig.currentModel = modelPath
        await electronAPI.savePetConfig(petConfig)
    }
    restoreLive2DPosition()
    addSystemMsg('✅ 已切换 Live2D 模型')
})

// 托盘：加载指定 MMD 模型
electronAPI.on('mmd-load-model', async (payload) => {
    const p = typeof payload === 'string' ? { path: payload, name: '' } : (payload || {})
    if (!p.path) return
    if (!window.mmd) { addSystemMsg('❌ MMD 引擎未加载'); return }
    currentMmdModel = { name: p.name || '', path: p.path, motions: p.motions || [] }
    fillMotionSelect(currentMmdModel)
    const s = document.getElementById('mmd-select')
    if (s) { const i = availableMmd.findIndex(m => m.path === p.path); if (i >= 0) s.value = String(i) }
    addSystemMsg('正在加载 MMD 模型…')
    await loadCurrentMmd()
})

// 托盘：2D/3D 双模式一键切换
electronAPI.on('toggle-mode', async () => {
    if (window.mmd?.isActive()) {
        window.mmd.unload()
        returnToLive2D()
        addSystemMsg('↩️ 已切换到 Live2D 模式')
        return
    }
    if (!currentMmdModel) {
        // 没选过 MMD 模型时，自动用第一个
        if (!availableMmd.length) await loadMmdList()
        if (!availableMmd.length) { addSystemMsg('未找到 MMD 模型，请放入 mmd_models 文件夹'); return }
        currentMmdModel = availableMmd[0]
        fillMotionSelect(currentMmdModel)
        const s = document.getElementById('mmd-select'); if (s) s.value = '0'
    }
    addSystemMsg('正在切换到 MMD 模式…')
    await loadCurrentMmd()
})

// ============ 语音输入（全局快捷键 + 本地 ASR） ============
let mediaRecorder = null, audioChunks = [], isRecordingVoice = false
let voiceLang = 'zh', voiceMode = 'hold', voiceSilenceTimeout = 2.0, voicePreview = true
let vadAudioCtx = null, vadStream = null, vadAnimFrame = null, vadSpeaking = false, vadSilenceStart = null

function setMicBtnActive(active) { 
    const btn = document.getElementById('btn-mic'); if (btn) btn.classList.toggle('recording', active);
    const btn2 = document.getElementById('btn-mic-fullchat'); if (btn2) btn2.classList.toggle('recording', active);
}

function setVoiceLang(lang) {
    const m = { 'zh-CN': 'zh', 'en-US': 'en', 'ja': 'ja', 'ko': 'ko', 'zh': 'zh', 'en': 'en' }
    voiceLang = m[lang] || lang || 'zh'
}

async function startVoiceRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
        mediaRecorder = new MediaRecorder(stream, { mimeType })
        audioChunks = []
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data) }
        mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop())
            if (audioChunks.length === 0) return
            const blob = new Blob(audioChunks, { type: mimeType })
            await processVoiceBlob(blob)
        }
        mediaRecorder.start(250)
        isRecordingVoice = true
        setMicBtnActive(true)
        if (voiceMode !== 'auto') addSystemMsg('🎤 录音中...')
    } catch (e) {
        addSystemMsg('⚠️ 无法访问麦克风: ' + e.message)
    }
}

function stopVoiceRecording() {
    if (mediaRecorder && isRecordingVoice) {
        mediaRecorder.stop()
        isRecordingVoice = false
        setMicBtnActive(false)
    }
}

async function processVoiceBlob(blob) {
    try {
        const form = new FormData()
        form.append('file', blob, 'voice.webm')
        form.append('language', voiceLang)
        const r = await fetch(`${BACKEND_URL}/api/asr/transcribe`, { method: 'POST', body: form })
        const d = await r.json()
        if (d.text && d.text.trim()) {
            const txt = d.text.trim()
            addSystemMsg('🎤 识别: ' + txt)
            if (voicePreview) {
                chatInput.value = txt
                fcInput.value = txt
            } else {
                await sendMsg(txt, null, null)
            }
            // 中继到前端
            fetch(`${BACKEND_URL}/api/voice-result`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: txt, ts: Date.now() })
            }).catch(() => {})
        } else {
            addSystemMsg('⚠️ 未识别到语音内容' + (d.error ? ': ' + d.error : ''))
        }
    } catch (e) {
        addSystemMsg('⚠️ ASR 请求失败: ' + e.message)
    }
}

// ============ 自动语音检测 (VAD) - 仅 auto 模式 ============
function startAutoVAD() {
    if (vadStream) return
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        vadStream = stream
        vadAudioCtx = new AudioContext()
        const source = vadAudioCtx.createMediaStreamSource(stream)
        const analyser = vadAudioCtx.createAnalyser()
        analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.3
        source.connect(analyser)
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        const threshold = 18
        vadSpeaking = false; vadSilenceStart = null
        setMicBtnActive(false)
        function check() {
            analyser.getByteFrequencyData(dataArray)
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
            if (avg > threshold) {
                if (!vadSpeaking && !isRecordingVoice) {
                    vadSpeaking = true
                    startVoiceRecording()
                }
                vadSilenceStart = null
            } else if (vadSpeaking && isRecordingVoice) {
                if (!vadSilenceStart) vadSilenceStart = Date.now()
                else if (Date.now() - vadSilenceStart > voiceSilenceTimeout * 1000) {
                    stopVoiceRecording()
                    vadSpeaking = false
                    vadSilenceStart = null
                }
            }
            vadAnimFrame = requestAnimationFrame(check)
        }
        check()
    }).catch(e => addSystemMsg('⚠️ VAD 麦克风访问失败: ' + e.message))
}

function stopAutoVAD() {
    if (vadAnimFrame) { cancelAnimationFrame(vadAnimFrame); vadAnimFrame = null }
    if (vadAudioCtx) { vadAudioCtx.close(); vadAudioCtx = null }
    if (vadStream) { vadStream.getTracks().forEach(t => t.stop()); vadStream = null }
    stopVoiceRecording()
    setMicBtnActive(false)
}

// ============ IPC ============
electronAPI.on('voice-settings', (vs) => {
    if (vs.lang) setVoiceLang(vs.lang)
    const oldMode = voiceMode
    voiceMode = vs.mode || 'hold'
    if (vs.silenceTimeout != null) voiceSilenceTimeout = vs.silenceTimeout
    if (vs.preview !== undefined) voicePreview = vs.preview
    // 模式切换时清理
    if (oldMode !== voiceMode) {
        stopVoiceRecording()
        if (oldMode === 'auto') stopAutoVAD()
        if (voiceMode === 'auto') startAutoVAD()
        else if (voiceMode !== 'auto' && vadStream) stopAutoVAD()
    }
})

electronAPI.on('voice-key', (pressed, vs) => {
    if (vs?.lang) setVoiceLang(vs.lang)
    if (voiceMode === 'auto') return
    isRecordingVoice ? stopVoiceRecording() : startVoiceRecording()
})

// 清理
window.addEventListener('beforeunload', () => { stopAutoVAD(); stopVoiceRecording() })

// ============ ASR 模型状态轮询 ============
let asrModelReady = false
async function pollAsrStatus() {
    try {
        const r = await fetch(`${BACKEND_URL}/api/asr/model-status`)
        const s = await r.json()
        if (s.status === 'downloading' && !asrModelReady) {
            addSystemMsg('🔄 ASR 模型下载中 (~150MB)...')
        } else if (s.status === 'ready' && !asrModelReady) {
            asrModelReady = true
            addSystemMsg('✅ ASR 模型就绪，语音输入可用')
        } else if (s.status === 'error') {
            addSystemMsg('⚠️ ASR 模型加载失败: ' + (s.message || ''))
        }
    } catch (e) {}
}
setInterval(pollAsrStatus, 5000)
pollAsrStatus()

// 启动
loadConfigs().then(() => { applyConfig(); initModels(); updateTopBtn(); startMouseTracker() })
