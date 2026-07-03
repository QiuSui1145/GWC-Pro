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

function updateVoiceShortcut() {
    const vs = loadVoiceSettings()
    if (vs.enabled !== voiceSettings.enabled || vs.key !== voiceSettings.key || vs.mode !== voiceSettings.mode || vs.global !== voiceSettings.global) {
        globalShortcut.unregisterAll()
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
    // Load renderer (deskpet UI)
    win.setPosition(0, 0)
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
    win.on('minimize', (e) => { e.preventDefault(); win.restore() })
    win.webContents.on('before-input-event', (e, input) => {
        if (input.key === 'F12') win.webContents.toggleDevTools()
    })

    // 保持置顶
    const iv = setInterval(() => { if (win.isDestroyed()) { clearInterval(iv); return }; if (loadPetConfig().alwaysOnTop !== false && !win.isAlwaysOnTop()) win.setAlwaysOnTop(true, 'screen-saver') }, 2000)

    return win
}

function createTray() {
    let icon; try { icon = nativeImage.createFromPath(ICON_PATH) } catch (e) { icon = nativeImage.createEmpty() }
    tray = new Tray(icon); tray.setToolTip('GWC 桌宠')
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
                pids.forEach(pid => { try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }) } catch (e) {} })
            } catch (e) {}
            try { execSync('taskkill /F /FI "WINDOWTITLE eq GWC AI Backend*"', { stdio: 'ignore' }) } catch (e) {}
            setTimeout(() => {
                try {
                    const backendDir = path.join(__dirname, '..', 'backend')
                    const runtimePath = path.join(backendDir, 'runtime', 'python.exe')
                    const pythonExe = fs.existsSync(runtimePath) ? '.\\runtime\\python.exe' : 'python'
                    exec(`start "GWC AI Backend" cmd /k "cd /d "${backendDir}" && ${pythonExe} main.py"`)
                } catch (e2) { console.error('重启后端失败:', e2) }
            }, 2000)
        }},
        { label: '打开桌宠', click: () => mainWindow?.show() },
        { label: '关闭桌宠', click: () => mainWindow?.hide() },
        { label: '桌宠设置', click: () => mainWindow?.webContents.send('open-settings') },
        { type: 'separator' },
        { label: '桌宠复位', click: () => mainWindow?.webContents.send('reset-position') },
        { type: 'separator' },
        { label: '退出所有服务', click: () => {
            // 只杀 FastAPI 后端（端口 5201 的进程）
            try {
                const netstat = execSync('netstat -ano | findstr ":5201"', { encoding: 'utf-8' })
                const pids = new Set()
                netstat.split('\n').forEach(line => { const m = line.trim().match(/\s(\d+)$/); if (m && m[1] !== '0') pids.add(m[1]) })
                pids.forEach(pid => { try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }) } catch (e) {} })
            } catch (e) {}
            // 杀桌宠终端窗口
            try { execSync('taskkill /F /FI "WINDOWTITLE eq GWC DeskPet*"', { stdio: 'ignore' }) } catch (e) {}
            try { execSync('taskkill /F /FI "WINDOWTITLE eq GWC AI Backend*"', { stdio: 'ignore' }) } catch (e) {}
            app.quit()
        }}
    ]))
    tray.on('double-click', () => { if (mainWindow) { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show() } })
}

// ============ IPC ============
ipcMain.on('set-ignore-mouse-events', (e, data) => { if (mainWindow) mainWindow.setIgnoreMouseEvents(data.ignore, { forward: true }) })
ipcMain.on('save-model-position', (e, data) => { const cfg = loadPetConfig(); cfg.modelPosition = data; savePetConfig(cfg) })
ipcMain.on('open-settings', () => mainWindow?.webContents.send('open-settings'))
ipcMain.on('switch-model', (e, p) => mainWindow?.webContents.send('switch-model', p))
ipcMain.handle('take-screenshot', async () => { try { const s = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } }); if (s.length) return s[0].thumbnail.toDataURL() } catch (e) { console.error(e) }; return null })
ipcMain.handle('toggle-always-on-top', () => { if (!mainWindow) return true; const cfg = loadPetConfig(); cfg.alwaysOnTop = !cfg.alwaysOnTop; savePetConfig(cfg); mainWindow.setAlwaysOnTop(cfg.alwaysOnTop, 'screen-saver'); return cfg.alwaysOnTop })
ipcMain.handle('get-always-on-top', () => loadPetConfig().alwaysOnTop !== false)
ipcMain.handle('get-pet-config', () => loadPetConfig())
ipcMain.handle('save-pet-config', (e, cfg) => { savePetConfig(cfg); return true })
ipcMain.handle('get-frontend-settings', async () => await fetchFrontendSettings())
ipcMain.handle('get-voice-settings', () => voiceSettings)
ipcMain.handle('set-voice-settings', (e, vs) => { voiceSettings = { ...voiceSettings, ...vs }; updateVoiceShortcut(); return true })

app.whenReady().then(() => { mainWindow = createPetWindow(); createTray(); updateVoiceShortcut() })
app.on('will-quit', () => { globalShortcut.unregisterAll() })
app.on('window-all-closed', () => app.quit())
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) mainWindow = createPetWindow() })

setInterval(updateVoiceShortcut, 3000)
