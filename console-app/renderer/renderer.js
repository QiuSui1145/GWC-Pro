const { ipcRenderer } = require('electron')

const MAX_LINES = 3000
const panes = {} // id -> { body, dot, stopBtn, restartBtn, lines }

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function createPane(svc) {
  const el = document.createElement('div')
  el.className = 'pane'
  el.style.setProperty('--accent', svc.color)
  el.innerHTML = `
    <div class="pane-header">
      <span class="dot"></span>
      <span class="pane-title">${esc(svc.name)}</span>
      <span class="pane-status">已停止</span>
      <div class="pane-actions">
        <button class="mini restart">重启</button>
        <button class="mini stop">停止</button>
        <button class="mini terminal">独立终端</button>
      </div>
    </div>
    <div class="pane-body"></div>
  `
  document.getElementById('panes').appendChild(el)

  const body = el.querySelector('.pane-body')
  const dot = el.querySelector('.dot')
  const status = el.querySelector('.pane-status')

  panes[svc.id] = { body, dot, status, lines: 0 }

  el.querySelector('.stop').addEventListener('click', () => ipcRenderer.send('stop-service', svc.id))
  el.querySelector('.restart').addEventListener('click', () => ipcRenderer.send('restart-service', svc.id))
  el.querySelector('.terminal').addEventListener('click', () => ipcRenderer.send('open-terminal', svc.id))
}

function appendLine(id, line, isErr) {
  const p = panes[id]
  if (!p) return
  const div = document.createElement('div')
  div.className = 'log-line' + (isErr ? ' err' : '')
  div.textContent = line
  p.body.appendChild(div)
  p.lines++

  while (p.lines > MAX_LINES) {
    const first = p.body.firstChild
    if (first) { p.body.removeChild(first); p.lines-- }
  }

  const nearBottom = p.body.scrollHeight - p.body.scrollTop - p.body.clientHeight < 60
  if (nearBottom) p.body.scrollTop = p.body.scrollHeight
}

function setStatus(id, running) {
  const p = panes[id]
  if (!p) return
  p.dot.classList.toggle('on', running)
  p.status.textContent = running ? '运行中' : '已停止'
  p.status.classList.toggle('running', running)
}

ipcRenderer.on('service', (e, msg) => {
  const { id, type } = msg
  if (!panes[id]) return
  if (type === 'log') appendLine(id, msg.line, msg.err)
  else if (type === 'status') setStatus(id, msg.running)
  else if (type === 'exit') {
    setStatus(id, false)
    appendLine(id, `> 进程退出 (code=${msg.code}, signal=${msg.signal || 'none'})`, true)
  }
})

async function init() {
  const services = await ipcRenderer.invoke('get-services')
  for (const svc of services) createPane(svc)
}

document.getElementById('btn-start-all').addEventListener('click', () => ipcRenderer.send('start-all'))
document.getElementById('btn-stop-all').addEventListener('click', () => ipcRenderer.send('stop-all'))

init()
