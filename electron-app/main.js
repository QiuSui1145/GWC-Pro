const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, desktopCapturer, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')
const { execSync, exec } = require('child_process')

const BACKEND_PORT = 5201
const ICON_PATH = path.join(__dirname, '..', 'tupian', 'icon.png')
const PET_CONFIG_PATH = path.join(__dirname, '..', 'userdata', 'pet_config.json')
const FRONTEND_SETTINGS_KEY = 'live2d_settings_v35'

let mainWindow = null
let tray = null

<<<<<<< HEAD
// ==========================================
// 调试日志：把渲染进程的 console / 崩溃 / 无响应 写入文件。
// 桌宠处于穿透模式时窗口拿不到键盘焦点（F12 到不了渲染进程），
// 渲染进程卡死时 DevTools 也开不起来，故用主进程侧落盘保证可诊断。
// ==========================================
const DEBUG_LOG_PATH = path.join(__dirname, '..', 'userdata', 'pet_debug.log')

function petLog(line) {
    try {
        const dir = path.dirname(DEBUG_LOG_PATH)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.appendFileSync(DEBUG_LOG_PATH, `[${new Date().toISOString()}] ${line}\n`, 'utf-8')
    } catch (e) {}
}

function initDebugLog() {
    try {
        // 超过 1MB 则重置，避免无限增长
        if (fs.existsSync(DEBUG_LOG_PATH) && fs.statSync(DEBUG_LOG_PATH).size > 1024 * 1024) {
            fs.writeFileSync(DEBUG_LOG_PATH, '', 'utf-8')
        }
    } catch (e) {}
    petLog('===== 桌宠启动 =====')
}

function attachDebugHooks(win) {
    // Electron 28 的 console-message 等级：0=verbose 1=info 2=warning 3=error
    const LEVELS = ['VERBOSE', 'INFO', 'WARN', 'ERROR']
    win.webContents.on('console-message', (e, level, message, line, sourceId) => {
        // 记录 info 及以上（保留加载流程上下文），跳过 verbose 噪声
        if (level >= 1) petLog(`[渲染进程][${LEVELS[level] || level}] ${message}  (${sourceId}:${line})`)
    })
    win.webContents.on('render-process-gone', (e, details) => petLog(`[渲染进程崩溃] ${JSON.stringify(details)}`))
    win.webContents.on('unresponsive', () => petLog('[渲染进程无响应] 主线程被阻塞'))
    win.webContents.on('responsive', () => petLog('[渲染进程恢复响应]'))
    win.webContents.on('preload-error', (e, p, err) => petLog(`[preload 错误] ${err && err.message}`))
}

=======
>>>>>>> 64b6d65c5a98416f5db9608a4493435ec5aca2bf
function loadPetConfig() {
    try { if (fs.existsSync(PET_CONFIG_PATH)) return JSON.parse(fs.readFileSync(PET_CONFIG_PATH, 'utf-8')) } catch (e) {}
    return { alwaysOnTop: true, visionModel: { enabled: false } }
}

function savePetConfig(cfg) {
    try { const dir = path.dirname(PET_CONFIG_PATH); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(PET_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8') } catch (e) {}
}

async function fetchFrontendSettings() {
    const USERDATA = path.join(__dirname, '..', 'userdata')
    const settingsFile = `${FRONTEND_SETTINGS_KEY}.json`

    // 方式1: 文件优先（user_Admin 优先）
    try {
        const dirs = fs.readdirSync(USERDATA)
        const searchDirs = []
        for (const d of dirs) {
            if (d === 'user_Admin') searchDirs.unshift(path.join(USERDATA, d, 'core'))
            else if (d.startsWith('user_')) searchDirs.push(path.join(USERDATA, d, 'core'))
        }
        for (const coreDir of searchDirs) {
            const fp = path.join(coreDir, settingsFile)
            try {
                if (fs.existsSync(fp)) {
                    const data = JSON.parse(fs.readFileSync(fp, 'utf-8'))
                    if (data && data.openaiBaseUrl && data.openaiApiKey) { console.log('[配置] 文件:', fp); return data }
                }
            } catch (e) {}
        }
    } catch (e) {}

    // 方式2: 后端 API 兜底
    try {
        const res = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/userdata/user_Admin/core/${FRONTEND_SETTINGS_KEY}`)
        if (res.ok) { const data = await res.json(); if (data && data.openaiBaseUrl && data.openaiApiKey) { console.log('[配置] API'); return data } }
    } catch (e) {}

    // 方式3: config.json
    try {
        const fp = path.join(USERDATA, 'config.json')
        if (fs.existsSync(fp)) {
            const data = JSON.parse(fs.readFileSync(fp, 'utf-8'))
            if (data?.providers) { const p = Object.values(data.providers)[0] || {}; if (p.api_base) return { openaiBaseUrl: p.api_base, openaiApiKey: p.api_key || '', aiModel: p.model || p.models?.[0] || '', aiTemperature: p.temperature || 0.7 } }
        }
    } catch (e) {}

    console.log('[配置] 未找到有效配置')
    return null
}

function loadVoiceSettings() {
    try {
        const USERDATA = path.join(__dirname, '..', 'userdata')
        const dirs = fs.readdirSync(USERDATA)
        const LEGACY = { ctrlright: 'ControlRight', ctrlleft: 'ControlLeft', mouse2: 'mouse2' }
        for (const d of dirs) {
            if (!d.startsWith('user_')) continue
            const fp = path.join(USERDATA, d, 'core', `${FRONTEND_SETTINGS_KEY}.json`)
            if (fs.existsSync(fp)) {
                const data = JSON.parse(fs.readFileSync(fp, 'utf-8'))
                if (data && data.enableVoiceInput !== undefined) {
                    const rawKey = data.voiceInputKey || 'ControlRight'
                    return { enabled: data.enableVoiceInput, key: LEGACY[rawKey] || rawKey, lang: data.voiceInputLang || 'zh-CN', mode: data.voiceInputMode || 'hold', silenceTimeout: data.voiceSilenceTimeout || 2.0, preview: data.voiceInputPreview !== false, global: data.voiceInputGlobal === true }
                }
            }
        }
    } catch (e) {}
    return { enabled: false, key: 'ControlRight', lang: 'zh-CN', mode: 'hold', silenceTimeout: 2.0, preview: true, global: false }
}

let voiceSettings = { enabled: false, key: 'ControlRight', lang: 'zh-CN', mode: 'hold', silenceTimeout: 2.0, preview: true, global: false }
let voiceRecording = false

function getVoiceAccelerator(key) {
    if (!key) return 'CommandOrControl+Shift+M'
    if (key.startsWith('F') && key.length <= 3 && /^F\d+$/.test(key)) return key
    if (['CapsLock', 'Space', 'Tab', 'Escape', 'Enter', 'Backspace', 'Delete'].includes(key)) return key
    if (key.startsWith('Digit')) return 'CommandOrControl+Shift+' + key.slice(5)
    if (key.startsWith('Key')) return 'CommandOrControl+Shift+' + key.slice(3)
    return 'CommandOrControl+Shift+M'
}

<<<<<<< HEAD
// 紧急恢复快捷键：当桌宠（如 MMD 渲染异常）夺走全屏鼠标导致无法操作时，
// 按 Ctrl+Shift+F12 强制恢复鼠标穿透并卸载 MMD。
// 注意：updateVoiceShortcut 会调用 unregisterAll()，之后必须重新注册本快捷键。
const EMERGENCY_ACCEL = 'CommandOrControl+Shift+F12'
const DEVTOOLS_ACCEL = 'CommandOrControl+Shift+F11'

// 以独立窗口打开 DevTools：桌宠是透明/无边框/置顶窗口，且穿透时无法获得焦点，
// 因此必须用 detach 模式，并从主进程调用（不依赖渲染进程按键）。
function openDevTools() {
    try {
        const wc = mainWindow?.webContents
        if (!wc) return
        if (wc.isDevToolsOpened()) wc.closeDevTools()
        else wc.openDevTools({ mode: 'detach' })
    } catch (e) { petLog(`[DevTools 打开失败] ${e.message}`) }
}

function registerEmergencyShortcut() {
    try {
        if (!globalShortcut.isRegistered(EMERGENCY_ACCEL)) {
            globalShortcut.register(EMERGENCY_ACCEL, () => {
                petLog('[急救] 强制恢复鼠标穿透')
                try { mainWindow?.setIgnoreMouseEvents(true, { forward: true }) } catch (e) {}
                mainWindow?.webContents.send('force-passthrough')
            })
        }
        if (!globalShortcut.isRegistered(DEVTOOLS_ACCEL)) {
            globalShortcut.register(DEVTOOLS_ACCEL, openDevTools)
        }
    } catch (e) { console.warn('[急救] 快捷键注册失败:', e.message) }
}

=======
>>>>>>> 64b6d65c5a98416f5db9608a4493435ec5aca2bf
function updateVoiceShortcut() {
    const vs = loadVoiceSettings()
    if (vs.enabled !== voiceSettings.enabled || vs.key !== voiceSettings.key || vs.mode !== voiceSettings.mode || vs.global !== voiceSettings.global) {
        globalShortcut.unregisterAll()
<<<<<<< HEAD
        registerEmergencyShortcut()
=======
>>>>>>> 64b6d65c5a98416f5db9608a4493435ec5aca2bf
        voiceSettings = vs
        mainWindow?.webContents.send('voice-settings', vs)
        if (vs.global && vs.enabled && vs.mode !== 'auto') {
            try {
                const accel = getVoiceAccelerator(vs.key)
                globalShortcut.register(accel, () => {
                    voiceRecording = !voiceRecording
                    mainWindow?.webContents.send('voice-key', voiceRecording, vs)
                })
                console.log(`[语音] 全局快捷键已注册: ${accel}`)
            } catch (e) { console.warn('[语音] 快捷键注册失败:', e.message) }
        }
    }
    if (vs.global && vs.enabled && vs.mode === 'auto') {
        mainWindow?.webContents.send('voice-settings', vs)
    }
}

function createPetWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    const petCfg = loadPetConfig()

    const win = new BrowserWindow({
        width, height, transparent: true, frame: false,
        alwaysOnTop: petCfg.alwaysOnTop !== false,
        backgroundColor: '#00000000', hasShadow: false, focusable: true,
        webPreferences: { nodeIntegration: true, contextIsolation: false, zoomFactor: 1.0 },
        resizable: true, movable: true, skipTaskbar: true, maximizable: false,
    })

    win.setAlwaysOnTop(petCfg.alwaysOnTop !== false, 'screen-saver')
    // 初始穿透，由 renderer 动态控制
    win.setIgnoreMouseEvents(true, { forward: true })
    win.setMenu(null)
    win.setPosition(0, 0)
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
    win.on('minimize', (e) => { e.preventDefault(); win.restore() })
    win.webContents.on('before-input-event', (e, input) => {
<<<<<<< HEAD
        if (input.key === 'F12') openDevTools()
    })
    attachDebugHooks(win)
=======
        if (input.key === 'F12') win.webContents.toggleDevTools()
    })
>>>>>>> 64b6d65c5a98416f5db9608a4493435ec5aca2bf

    // 保持置顶
    const iv = setInterval(() => { if (win.isDestroyed()) { clearInterval(iv); return }; if (loadPetConfig().alwaysOnTop !== false && !win.isAlwaysOnTop()) win.setAlwaysOnTop(true, 'screen-saver') }, 2000)

    return win
}

<<<<<<< HEAD
// ==========================================
// MMD 动作快速切换（共享动作库 mmd_models/_motions）
// ==========================================
let mmdMotions = []           // [{name, path}]
let currentMotionPath = ''    // '' 表示无动作
let autoSwitchTimer = null
let autoSwitchMinutes = 0     // 0 = 关闭
let mmdPhysicsOn = false      // 骨骼物理开关，托盘与渲染进程双向同步

let live2dModels = []         // [{name, path}]
let mmdModels = []            // [{name, path, motions}]

async function fetchMmdMotions() {
    try {
        const res = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/mmd_motions`)
        if (!res.ok) return false
        const data = await res.json()
        mmdMotions = Array.isArray(data.motions) ? data.motions : []
        petLog(`[托盘] 已加载共享动作 ${mmdMotions.length} 个`)
        return true
    } catch (e) {
        petLog(`[托盘] 获取动作列表失败: ${e.message}`)
        return false
    }
}

async function fetchModelLists() {
    let ok = false
    try {
        const r1 = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/models`)
        if (r1.ok) { const d = await r1.json(); live2dModels = Array.isArray(d.models) ? d.models : []; ok = true }
    } catch (e) { petLog(`[托盘] 获取 Live2D 模型失败: ${e.message}`) }
    try {
        const r2 = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/mmd_models`)
        if (r2.ok) { const d = await r2.json(); mmdModels = Array.isArray(d.models) ? d.models : []; ok = true }
    } catch (e) { petLog(`[托盘] 获取 MMD 模型失败: ${e.message}`) }
    petLog(`[托盘] 模型列表: Live2D ${live2dModels.length} 个, MMD ${mmdModels.length} 个`)
    return ok
}

async function refreshTrayData() {
    await Promise.all([fetchMmdMotions(), fetchModelLists()])
    buildTrayMenu()
}

function buildModelSubmenus() {
    const MAX = 30
    const l2d = live2dModels.length
        ? live2dModels.slice(0, MAX).map(m => ({
            label: m.name || m.path.split('/').pop(),
            click: () => mainWindow?.webContents.send('switch-live2d-model', m.path)
        }))
        : [{ label: '(未找到模型，请放入 live2d_models)', enabled: false }]

    const mmd = mmdModels.length
        ? mmdModels.slice(0, MAX).map(m => ({
            label: m.name,
            click: () => mainWindow?.webContents.send('mmd-load-model', { path: m.path, name: m.name, motions: m.motions || [] })
        }))
        : [{ label: '(未找到模型，请放入 mmd_models)', enabled: false }]

    return { l2d, mmd }
}

function applyMotion(motionPath) {
    currentMotionPath = motionPath || ''
    mainWindow?.webContents.send('mmd-set-motion', currentMotionPath)
    buildTrayMenu() // 刷新勾选状态
}

function pickRandomMotion() {
    if (!mmdMotions.length) return
    // 多于一个动作时避免连续抽到同一个
    let pool = mmdMotions
    if (mmdMotions.length > 1 && currentMotionPath) {
        pool = mmdMotions.filter(m => m.path !== currentMotionPath)
        if (!pool.length) pool = mmdMotions
    }
    const pick = pool[Math.floor(Math.random() * pool.length)]
    petLog(`[托盘] 随机切换动作: ${pick.name}`)
    applyMotion(pick.path)
}

function setAutoSwitch(minutes) {
    autoSwitchMinutes = minutes
    if (autoSwitchTimer) { clearInterval(autoSwitchTimer); autoSwitchTimer = null }
    if (minutes > 0) {
        autoSwitchTimer = setInterval(pickRandomMotion, minutes * 60 * 1000)
        petLog(`[托盘] 自动切换动作已开启，间隔 ${minutes} 分钟`)
    } else {
        petLog('[托盘] 自动切换动作已关闭')
    }
    buildTrayMenu()
}

function buildMotionSubmenu() {
    const items = []
    if (!mmdMotions.length) {
        items.push({ label: '(未找到动作，请放入 mmd_models/_motions)', enabled: false })
    } else {
        items.push({
            label: '无动作（静止站姿）',
            type: 'radio',
            checked: currentMotionPath === '',
            click: () => applyMotion('')
        })
        items.push({ type: 'separator' })
        // 动作过多时截断，避免菜单撑爆屏幕
        const MAX = 40
        mmdMotions.slice(0, MAX).forEach(m => {
            let label = m.name
            // 演出包标记：镜头 + 音频
            if (m.hasCamera) label += ' 🎥'
            if (m.hasAudio) label += ' 🔊'
            items.push({
                label: label,
                type: 'radio',
                checked: currentMotionPath === m.path,
                click: () => applyMotion(m.path)
            })
        })
        if (mmdMotions.length > MAX) {
            items.push({ label: `…另有 ${mmdMotions.length - MAX} 个，请在桌宠设置中选择`, enabled: false })
        }
    }
    items.push({ type: 'separator' })
    items.push({ label: '🎲 随机切换一次', enabled: mmdMotions.length > 0, click: pickRandomMotion })
    items.push({
        label: '⏱️ 自动定时切换',
        submenu: [0, 1, 3, 5, 10, 30].map(min => ({
            label: min === 0 ? '关闭' : `每 ${min} 分钟`,
            type: 'radio',
            checked: autoSwitchMinutes === min,
            enabled: min === 0 || mmdMotions.length > 0,
            click: () => setAutoSwitch(min)
        }))
    })
    items.push({ type: 'separator' })
    items.push({ label: '🔄 重新扫描动作库', click: refreshTrayData })
    items.push({ label: '📂 打开动作文件夹', click: () => {
        try {
            const dir = path.join(__dirname, '..', 'mmd_models', '_motions')
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
            require('electron').shell.openPath(dir)
        } catch (e) {}
    }})
    return items
}

function buildTrayMenu() {
    if (!tray) return
    const models = buildModelSubmenus()
=======
function createTray() {
    let icon; try { icon = nativeImage.createFromPath(ICON_PATH) } catch (e) { icon = nativeImage.createEmpty() }
    tray = new Tray(icon); tray.setToolTip('GWC 桌宠')
>>>>>>> 64b6d65c5a98416f5db9608a4493435ec5aca2bf
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: '打开前端界面', click: () => require('electron').shell.openExternal(`http://127.0.0.1:${BACKEND_PORT}/app`) },
        { label: '打开 OpenCode', click: () => {
            try { exec(`start "" cmd /k "cd /d "${path.join(__dirname, '..')}" && opencode"`) } catch (e) {}
        }},
        { label: '重启后端 (端口5201)', click: () => {
            try {
                const netstat = execSync('netstat -ano | findstr ":5201"', { encoding: 'utf-8' })
                const pids = new Set()
                netstat.split('\n').forEach(line => { const m = line.trim().match(/\s(\d+)$/); if (m && m[1] !== '0') pids.add(m[1]) })
                pids.forEach(pid => { try { exec(`taskkill /F /PID ${pid}`, () => {}) } catch (e) {} })
            } catch (e) {}
            setTimeout(() => {
                try {
                    const backendDir = path.join(__dirname, '..', 'backend')
                    const runtimePath = path.join(backendDir, 'runtime', 'python.exe')
                    const pythonExe = fs.existsSync(runtimePath) ? '.\\runtime\\python.exe' : 'python'
                    exec(`start "GWC AI Backend" cmd /k "cd /d "${backendDir}" && ${pythonExe} main.py"`)
                } catch (e2) { console.error('重启后端失败:', e2) }
            }, 2000)
        }},
<<<<<<< HEAD
        { label: '🔄 重启桌宠', click: () => {
            petLog('[托盘] 用户触发桌宠重启')
            app.relaunch()
            // 杀掉旧 cmd 窗口（"GWC DeskPet"），去掉 pause 卡住的问题
            try {
                execSync('taskkill /FI "WINDOWTITLE eq GWC DeskPet*" /F', { encoding: 'utf-8' })
            } catch (e) {}
            app.exit(0)
        }},
=======
>>>>>>> 64b6d65c5a98416f5db9608a4493435ec5aca2bf
        { label: '打开桌宠', click: () => mainWindow?.show() },
        { label: '关闭桌宠', click: () => mainWindow?.hide() },
        { label: '桌宠设置', click: () => mainWindow?.webContents.send('open-settings') },
        { type: 'separator' },
<<<<<<< HEAD
        { label: '🔀 2D / 3D 模式切换', click: () => mainWindow?.webContents.send('toggle-mode') },
        { label: '🎭 Live2D 模型', submenu: models.l2d },
        { label: '🧊 MMD 模型', submenu: models.mmd },
        { label: '🕺 MMD 动作', submenu: buildMotionSubmenu() },
        { label: '🦴 骨骼物理', type: 'checkbox', checked: mmdPhysicsOn, click: () => {
            mmdPhysicsOn = !mmdPhysicsOn
            mainWindow?.webContents.send('mmd-set-physics', mmdPhysicsOn)
            buildTrayMenu()
        }},
        { label: '🎬 重新渲染 MMD 模型', click: () => mainWindow?.webContents.send('mmd-rerender') },
        { label: '🔄 重新扫描模型/动作', click: refreshTrayData },
        { type: 'separator' },
        { label: '桌宠复位', click: () => mainWindow?.webContents.send('reset-position') },
        { label: '🆘 强制恢复鼠标穿透 (Ctrl+Shift+F12)', click: () => {
            try { mainWindow?.setIgnoreMouseEvents(true, { forward: true }) } catch (e) {}
            mainWindow?.webContents.send('force-passthrough')
        }},
        { label: '🔧 开发者工具 (Ctrl+Shift+F11)', click: openDevTools },
        { label: '📄 打开调试日志', click: () => {
            try {
                if (!fs.existsSync(DEBUG_LOG_PATH)) fs.writeFileSync(DEBUG_LOG_PATH, '(暂无日志)\n', 'utf-8')
                require('electron').shell.openPath(DEBUG_LOG_PATH)
            } catch (e) {}
        }},
=======
        { label: '桌宠复位', click: () => mainWindow?.webContents.send('reset-position') },
>>>>>>> 64b6d65c5a98416f5db9608a4493435ec5aca2bf
        { type: 'separator' },
        { label: '退出所有服务', click: () => {
            try {
                const netstat = execSync('netstat -ano | findstr ":5201"', { encoding: 'utf-8' })
                const pids = new Set()
                netstat.split('\n').forEach(line => { const m = line.trim().match(/\s(\d+)$/); if (m && m[1] !== '0') pids.add(m[1]) })
                pids.forEach(pid => { try { exec(`taskkill /F /PID ${pid}`, () => {}) } catch (e) {} })
            } catch (e) {}
            app.quit()
        }}
    ]))
<<<<<<< HEAD
}

function createTray() {
    let icon; try { icon = nativeImage.createFromPath(ICON_PATH) } catch (e) { icon = nativeImage.createEmpty() }
    tray = new Tray(icon); tray.setToolTip('GWC 桌宠')
    buildTrayMenu()
    tray.on('double-click', () => { if (mainWindow) { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show() } })
    // 后端可能比桌宠启动晚，稍后再拉一次列表并刷新菜单
    refreshTrayData()
    setTimeout(refreshTrayData, 8000)
}

// ============ IPC ============
// 渲染进程面包屑日志：同步写盘。console-message 经 IPC 异步转发，
// 进程崩溃时会丢失，故关键步骤走这条通道以保证崩溃前的记录落盘。
ipcMain.on('pet-log', (e, msg) => petLog(`[渲染进程][步骤] ${msg}`))

=======
    tray.on('double-click', () => { if (mainWindow) { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show() } })
}

// ============ IPC ============
>>>>>>> 64b6d65c5a98416f5db9608a4493435ec5aca2bf
ipcMain.on('set-ignore-mouse-events', (e, data) => { if (mainWindow) mainWindow.setIgnoreMouseEvents(data.ignore, { forward: true }) })
ipcMain.on('save-model-position', (e, data) => { const cfg = loadPetConfig(); cfg.modelPosition = data; savePetConfig(cfg) })
ipcMain.on('open-settings', () => mainWindow?.webContents.send('open-settings'))
ipcMain.on('switch-model', (e, p) => mainWindow?.webContents.send('switch-model', p))
<<<<<<< HEAD
ipcMain.on('sync-physics', (e, on) => { mmdPhysicsOn = !!on; buildTrayMenu() })
=======
>>>>>>> 64b6d65c5a98416f5db9608a4493435ec5aca2bf
ipcMain.handle('take-screenshot', async () => { try { const s = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } }); if (s.length) return s[0].thumbnail.toDataURL() } catch (e) { console.error(e) }; return null })
ipcMain.handle('toggle-always-on-top', () => { if (!mainWindow) return true; const cfg = loadPetConfig(); cfg.alwaysOnTop = !cfg.alwaysOnTop; savePetConfig(cfg); mainWindow.setAlwaysOnTop(cfg.alwaysOnTop, 'screen-saver'); return cfg.alwaysOnTop })
ipcMain.handle('get-always-on-top', () => loadPetConfig().alwaysOnTop !== false)
ipcMain.handle('get-pet-config', () => loadPetConfig())
ipcMain.handle('save-pet-config', (e, cfg) => { savePetConfig(cfg); return true })
ipcMain.handle('get-frontend-settings', async () => await fetchFrontendSettings())
ipcMain.handle('get-voice-settings', () => voiceSettings)
ipcMain.handle('set-voice-settings', (e, vs) => { voiceSettings = { ...voiceSettings, ...vs }; updateVoiceShortcut(); return true })

<<<<<<< HEAD
app.whenReady().then(() => { initDebugLog(); mainWindow = createPetWindow(); createTray(); registerEmergencyShortcut(); updateVoiceShortcut() })
=======
app.whenReady().then(() => { mainWindow = createPetWindow(); createTray(); updateVoiceShortcut() })
>>>>>>> 64b6d65c5a98416f5db9608a4493435ec5aca2bf
app.on('will-quit', () => { globalShortcut.unregisterAll() })
app.on('window-all-closed', () => app.quit())
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) mainWindow = createPetWindow() })

setInterval(updateVoiceShortcut, 3000)
