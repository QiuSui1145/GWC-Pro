// ============================================================
// GWC 主界面桌面版（Electron）
//
// 与 electron-app/（桌宠）相互独立。本程序负责：
//   1. 在 127.0.0.1:5202 启动一个本地 HTTP 服务：
//      - 托管 frontend/dist 静态资源（挂在 /app/ 下，与 vite base 一致）
//      - 将 /api、/v1、/models、/mmd_models、/admin 反向代理到后端 5201
//   2. 打开一个原生窗口加载 http://127.0.0.1:5202/app/
//
// 之所以用「本地 HTTP 服务 + 反代」而不是 file:// + 自定义协议，
// 是因为前端大量使用相对 /api 路径、SSE(EventSource)、fetch 流式读取、
// Cookie/Referer 鉴权。真实 HTTP 同源可让这些机制零改动直接复用。
// 后端已把 127.0.0.1:5202 加入 CORS 与 Referer 白名单，鉴权无缝衔接。
// ============================================================

const { app, BrowserWindow, Tray, Menu, nativeImage, shell, dialog } = require('electron')
const http = require('http')
const path = require('path')
const fs = require('fs')

const BACKEND_PORT = 5201
const LOCAL_PORT = 5202
const LOCAL_ORIGIN = `http://127.0.0.1:${LOCAL_PORT}`

const DIST_DIR = path.join(__dirname, '..', 'frontend', 'dist')
const ICON_PATH = path.join(__dirname, '..', 'tupian', 'icon.png')

let mainWindow = null
let tray = null
let localServer = null

// ============================================================
// 调试日志：主进程异常 / GPU 崩溃 / 渲染进程崩溃全部落盘，
// 避免「闪退」时没有任何线索可查。
// ============================================================
const DEBUG_LOG_PATH = path.join(__dirname, '..', 'userdata', 'frontend_debug.log')

function frontendLog(line) {
  try {
    const dir = path.dirname(DEBUG_LOG_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(DEBUG_LOG_PATH, `[${new Date().toISOString()}] ${line}\n`, 'utf-8')
  } catch (e) {}
}

function initDebugLog() {
  try {
    if (fs.existsSync(DEBUG_LOG_PATH) && fs.statSync(DEBUG_LOG_PATH).size > 1024 * 1024) {
      fs.writeFileSync(DEBUG_LOG_PATH, '', 'utf-8')
    }
  } catch (e) {}
  frontendLog('===== 前端启动 =====')
}

process.on('uncaughtException', (e) => {
  frontendLog(`[主进程未捕获异常] ${e && e.stack ? e.stack : e}`)
  try { dialog.showErrorBox('GWC 前端发生错误', (e && e.message) || String(e)) } catch (_) {}
})

process.on('unhandledRejection', (r) => {
  frontendLog(`[未处理的 Promise 拒绝] ${r && r.stack ? r.stack : r}`)
})

function attachDebugHooks(win) {
  win.webContents.on('render-process-gone', (e, details) => frontendLog(`[渲染进程崩溃] ${JSON.stringify(details)}`))
  win.webContents.on('unresponsive', () => frontendLog('[渲染进程无响应]'))
  win.webContents.on('preload-error', (e, p, err) => frontendLog(`[preload 错误] ${err && err.message}`))
}

// ============================================================
// 静态资源 MIME 映射
// ============================================================
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
}

function sendText(res, status, body, contentType) {
  res.writeHead(status, { 'Content-Type': contentType || 'text/plain; charset=utf-8' })
  res.end(body)
}

function streamFile(res, filePath, contentType) {
  try {
    const s = fs.createReadStream(filePath)
    s.on('error', () => { try { res.destroy() } catch (e) {} })
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' })
    s.pipe(res)
  } catch (e) {
    try { res.destroy() } catch (e2) {}
  }
}

// ============================================================
// 反向代理：把请求透传到后端 5201（流式转发，兼容 SSE / fetch 流 / 长轮询）
// ============================================================
function pipeProxy(req, res) {
  const target = `http://127.0.0.1:${BACKEND_PORT}`
  let u
  try {
    u = new URL(req.url, target)
  } catch (e) {
    return sendText(res, 400, JSON.stringify({ ok: false, msg: '非法请求路径' }), 'application/json')
  }

  const headers = { ...req.headers }
  delete headers.host
  delete headers.connection
  headers['x-forwarded-for'] = '127.0.0.1'
  headers['x-forwarded-proto'] = 'http'

  const proxyReq = http.request({
    hostname: u.hostname,
    port: u.port,
    path: u.pathname + u.search,
    method: req.method,
    headers,
  }, (proxyRes) => {
    const h = { ...proxyRes.headers }
    delete h['content-length'] // 流式转发时长度交给 Node 用 chunked 处理
    res.writeHead(proxyRes.statusCode || 200, h)
    proxyRes.pipe(res)
    proxyRes.on('error', () => { try { res.destroy() } catch (e) {} })
  })

  proxyReq.on('error', (e) => {
    if (res.headersSent) { try { res.destroy() } catch (err) {} return }
    sendText(res, 502, JSON.stringify({
      ok: false,
      msg: `后端服务未运行 (127.0.0.1:${BACKEND_PORT})`,
      detail: e.code === 'ECONNREFUSED' ? '连接被拒绝，请先启动后端' : e.message,
    }), 'application/json')
  })

  req.pipe(proxyReq)
  req.on('error', () => { try { proxyReq.destroy() } catch (e) {} })
}

// ============================================================
// 静态资源托管：/app/* → frontend/dist/*
// ============================================================
function serveStatic(req, res) {
  const u = new URL(req.url, LOCAL_ORIGIN)
  let pathname
  try { pathname = decodeURIComponent(u.pathname) } catch (e) { pathname = u.pathname }

  // / 与 /app → /app/
  if (pathname === '/' || pathname === '/app') {
    res.writeHead(302, { Location: '/app/' })
    return res.end()
  }

  // 相对路径解析：/app/xxx → dist/xxx，其它（如 /favicon.svg）→ dist/ 根
  let rel
  if (pathname.startsWith('/app/')) rel = pathname.slice('/app/'.length)
  else rel = pathname.replace(/^\/+/, '')

  if (!rel) rel = 'index.html'

  const distRoot = path.resolve(DIST_DIR)
  let filePath = path.normalize(path.join(distRoot, rel))

  // 防目录穿越
  if (!filePath.startsWith(distRoot + path.sep) && filePath !== distRoot) {
    return sendText(res, 403, 'Forbidden')
  }

  let st
  try { st = fs.statSync(filePath) } catch (e) { st = null }

  if (st && st.isFile()) {
    const ext = path.extname(filePath).toLowerCase()
    const ct = MIME[ext] || 'application/octet-stream'
    return streamFile(res, filePath, ct)
  }

  if (st && st.isDirectory()) {
    filePath = path.join(filePath, 'index.html')
    try { if (fs.statSync(filePath).isFile()) { return streamFile(res, filePath, 'text/html; charset=utf-8') } } catch (e) {}
  }

  // SPA 回退：仅 /app 下的路径回退到 index.html，其余 404
  const isAppPath = pathname === '/app/' || pathname.startsWith('/app/')
  if (isAppPath) {
    const idx = path.join(distRoot, 'index.html')
    if (fs.existsSync(idx)) {
      return streamFile(res, idx, 'text/html; charset=utf-8')
    }
    return sendText(res, 500, '前端未构建，请先执行 frontend 的 npm run build')
  }

  sendText(res, 404, 'Not Found')
}

function isBackendPath(pathname) {
  return pathname.startsWith('/api/') ||
    pathname.startsWith('/v1/') ||
    pathname === '/api' ||
    pathname === '/v1' ||
    pathname.startsWith('/models') ||
    pathname.startsWith('/mmd_models') ||
    pathname.startsWith('/admin')
}

// ============================================================
// 本地 HTTP 服务启动
// ============================================================
function startLocalServer() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    dialog.showErrorBox('前端未构建', `未找到 frontend/dist/index.html。\n\n请先执行：\n  cd frontend\n  npm install --legacy-peer-deps\n  npm run build`)
  }

  const server = http.createServer((req, res) => {
    let pathname = '/'
    try { pathname = new URL(req.url, LOCAL_ORIGIN).pathname } catch (e) {}
    if (isBackendPath(pathname)) return pipeProxy(req, res)
    return serveStatic(req, res)
  })

  return new Promise((resolve, reject) => {
    server.once('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        reject(new Error(`端口 ${LOCAL_PORT} 已被占用（可能是 Vite dev server 正在运行）。请关闭后再启动。`))
      } else {
        reject(e)
      }
    })
    server.listen(LOCAL_PORT, '127.0.0.1', () => {
      localServer = server
      console.log(`[GWC Desktop] 本地服务已启动: ${LOCAL_ORIGIN}`)
      resolve(server)
    })
  })
}

// ============================================================
// 主窗口
// ============================================================
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: 'GWC',
    icon: fs.existsSync(ICON_PATH) ? nativeImage.createFromPath(ICON_PATH) : undefined,
    show: false,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  win.once('ready-to-show', () => win.show())
  win.loadURL(`${LOCAL_ORIGIN}/app/`)
  attachDebugHooks(win)

  // 外部链接用系统浏览器打开，不在应用内跳转
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.on('closed', () => { mainWindow = null })
  return win
}

// ============================================================
// 托盘
// ============================================================
function createTray() {
  let icon = nativeImage.createEmpty()
  try { if (fs.existsSync(ICON_PATH)) icon = nativeImage.createFromPath(ICON_PATH) } catch (e) {}

  tray = new Tray(icon)
  tray.setToolTip('GWC')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开 GWC 主界面', click: () => { if (!mainWindow) mainWindow = createWindow(); mainWindow.show(); mainWindow.focus() } },
    { label: '打开管理面板', click: () => shell.openExternal(`http://127.0.0.1:${BACKEND_PORT}/admin`) },
    { type: 'separator' },
    { label: '重新加载', click: () => mainWindow && mainWindow.webContents.reload() },
    { label: '开发者工具', click: () => mainWindow && mainWindow.webContents.toggleDevTools() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]))
  tray.on('double-click', () => { if (mainWindow) { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show() } })
}

// ============================================================
// 应用菜单（保留 DevTools / 重载等快捷键）
// ============================================================
function buildAppMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', click: () => mainWindow && mainWindow.webContents.reload() },
        { label: '开发者工具', accelerator: 'F12', click: () => mainWindow && mainWindow.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { label: '实际大小', role: 'resetZoom' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ============================================================
// 生命周期（单实例锁：避免重复启动）
// ============================================================
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus() }
  })

  app.whenReady().then(async () => {
    initDebugLog()
    buildAppMenu()

    try {
      await startLocalServer()
    } catch (e) {
      frontendLog(`[本地服务启动失败] ${e.message || e}`)
      dialog.showErrorBox('启动失败', e.message || String(e))
      app.quit()
      return
    }

    mainWindow = createWindow()
    createTray()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow()
    })
  })

  app.on('gpu-process-crashed', (e, killed) => {
    frontendLog(`[GPU 进程崩溃] killed=${killed}`)
  })

  app.on('window-all-closed', () => {
    app.quit()
  })

  app.on('will-quit', () => {
    if (localServer) { try { localServer.close() } catch (e) {} }
  })
}
