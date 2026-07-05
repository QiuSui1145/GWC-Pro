const { ipcRenderer } = require('electron')

const BACKEND_PORT = 5201
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`

let app = null, model = null
let interactionX = 0, interactionY = 0, interactionWidth = 0, interactionHeight = 0
let pendingScreenshot = null, frontendSettings = null, petConfig = null
let pendingAttachments = []
let mouseX = 0, mouseY = 0
let chatHistory = [] // 共享聊天记录

// ============ 穿透控制 ============
function setPT(on) { ipcRenderer.send('set-ignore-mouse-events', { ignore: on }) }
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
        const sx = mouseX * 2, sy = mouseY * 2
        const overModel = model && sx >= interactionX && sx <= interactionX + interactionWidth && sy >= interactionY && sy <= interactionY + interactionHeight
        setPT(!(overModel || isMouseOverUI()))
    }, 50)
}

// ============ PIXI ============
function initPIXI() {
    app = new PIXI.Application({ view: document.getElementById('canvas'), autoStart: true, transparent: true, width: window.innerWidth * 2, height: window.innerHeight * 2 })
    app.stage.position.set(window.innerWidth / 2, window.innerHeight / 2)
    app.stage.pivot.set(window.innerWidth / 2, window.innerHeight / 2)
}

async function loadModel(url) {
    if (!app) initPIXI()
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

function setupInteraction() {
    if (!model) return; model.interactive = true
    model.containsPoint = (p) => p.x >= interactionX && p.x <= interactionX + interactionWidth && p.y >= interactionY && p.y <= interactionY + interactionHeight
    model.on('mousedown', (e) => { const p = e.data.global; if (model.containsPoint(p)) { model._d = true; model._ox = p.x - model.x; model._oy = p.y - model.y } })
    model.on('mousemove', (e) => { if (model._d) { model.x = e.data.global.x - model._ox; model.y = e.data.global.y - model._oy; updateIA() } })
    window.addEventListener('mouseup', () => { if (model._d) { model._d = false; ipcRenderer.send('save-model-position', { x: model.x / window.innerWidth, y: model.y / window.innerHeight, scale: model.scale.x }) } })
    model.on('click', () => { if (model.containsPoint(app.renderer.plugins.interaction.mouse.global)) { model.motion('Tap'); model.expression() } })
    window.addEventListener('contextmenu', (e) => e.preventDefault())
    // 滚轮缩放：仅在鼠标不在 UI 元素上时生效
    let wheelTimer = null
    window.addEventListener('wheel', (e) => {
        if (!model || isMouseOverUI()) return
        const f = e.deltaY > 0 ? 0.92 : 1.08
        const mx = app.renderer.plugins.interaction.mouse.global.x, my = app.renderer.plugins.interaction.mouse.global.y
        model.x -= (mx - model.x) * (f - 1); model.y -= (my - model.y) * (f - 1)
        model.scale.set(model.scale.x * f); updateIA()
        clearTimeout(wheelTimer)
        wheelTimer = setTimeout(() => { ipcRenderer.send('save-model-position', { x: model.x / window.innerWidth, y: model.y / window.innerHeight, scale: model.scale.x }) }, 500)
    }, { passive: false })
    window.addEventListener('resize', () => { if (app?.renderer) { app.renderer.resize(window.innerWidth * 2, window.innerHeight * 2); app.stage.position.set(window.innerWidth / 2, window.innerHeight / 2); app.stage.pivot.set(window.innerWidth / 2, window.innerHeight / 2); updateIA() } })
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
    try { petConfig = await ipcRenderer.invoke('get-pet-config') } catch (e) { petConfig = { alwaysOnTop: true, visionModel: { enabled: false } } }
    try { frontendSettings = await ipcRenderer.invoke('get-frontend-settings'); console.log('[配置]', frontendSettings?.openaiBaseUrl, frontendSettings?.aiModel) } catch (e) { frontendSettings = null }
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
    const d = await ipcRenderer.invoke('take-screenshot')
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
async function updateTopBtn() { const t = await ipcRenderer.invoke('get-always-on-top'); btnTop.classList.toggle('active', t) }
btnTop.addEventListener('click', async () => { const t = await ipcRenderer.invoke('toggle-always-on-top'); btnTop.classList.toggle('active', t) })

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
    await ipcRenderer.invoke('save-pet-config', petConfig)
    addSystemMsg('✅ 模型已切换')
})

// 设置面板
ipcRenderer.on('open-settings', async () => {
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
    openPanel(stPanel)
})
document.getElementById('settings-close').addEventListener('click', () => closePanel(stPanel))
document.getElementById('settings-save').addEventListener('click', async () => {
    if (!petConfig) petConfig = {}
    petConfig.visionModel = { enabled: document.getElementById('vision-enabled').checked, baseUrl: document.getElementById('vision-base-url').value.trim(), apiKey: document.getElementById('vision-api-key').value.trim(), model: document.getElementById('vision-model').value.trim() }
    petConfig.hideChat = document.getElementById('hide-chat').checked
    await ipcRenderer.invoke('save-pet-config', petConfig)
    if (petConfig.hideChat) chatContainer.classList.add('hidden'); else chatContainer.classList.remove('hidden')
    addSystemMsg('✅ 设置已保存'); closePanel(stPanel)
})

// IPC
ipcRenderer.on('switch-model', (e, p) => loadModel(p))
ipcRenderer.on('reset-position', () => { if (model) { model.x = window.innerWidth * 0.75; model.y = window.innerHeight * 0.65; updateIA() } })

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
ipcRenderer.on('voice-settings', (e, vs) => {
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

ipcRenderer.on('voice-key', (e, pressed, vs) => {
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
