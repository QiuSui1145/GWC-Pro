# GWC Pro — Full-Stack AI Character Engine / 全栈 AI 角色扮演引擎

> 🎮 **Next-gen AI role-playing engine** — Live2D desktop pet + visual novel dialogue + RAG skill knowledge base + OpenCode agent + MMD 3D support.
> 🎮 **次世代 AI 角色扮演全栈引擎** — Live2D 桌宠 + 视觉小说对话 + RAG 技能知识库 + OpenCode 编程代理 + MMD 3D 支持。

<p align="center">
  <a href="#english">🇺🇸 English</a> &nbsp;|&nbsp;
  <a href="#chinese">🇨🇳 中文</a>
</p>

[![Python](https://img.shields.io/badge/python-3.11+-green.svg)](https://www.python.org/)
[![Node](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-19-blue.svg)](https://react.dev/)
[![Electron](https://img.shields.io/badge/electron-28-blue.svg)](https://www.electronjs.org/)
[![Version](https://img.shields.io/badge/version-7.23-orange.svg)](https://github.com/QiuSui1145/GWC-Pro/releases)

<p align="center">
  <b>✨ QQ Group / QQ 群：1083739889 ✨</b><br>
  <b>📺 BiliBili：<a href="https://space.bilibili.com/1764510273">@QiuSui1145</a></b>
</p>

<img width="1886" height="1230" alt="screenshot" src="https://github.com/user-attachments/assets/36956736-3410-49ef-83c4-60d4b13045b2" />

---

<span id="english"></span>
## 🇺🇸 English

### What is GWC Pro?

**GWC Pro** is a full-stack AI character engine that brings anime characters to life:

- 🎭 **Live2D Desktop Pet** — Interactive anime character on your desktop (Electron + PIXI.js + Cubism SDK 4/5)
- 🖥️ **Native Electron Desktop App** — The chat/roleplay UI runs as a standalone Electron app (local server + API proxy), no browser needed
- 🗂️ **All-in-One Console** — Backend / frontend / desktop pet logs merged into one window with isolated panes
- 🔓 **Local Mode** — Passwordless login for any account (optional), with password field auto-hidden
- 🧊 **MMD 3D Support** — Full PMX/PMD model rendering with toon shading, physics, camera & audio sync
- 💬 **Visual Novel Chat** — Immersive dialogue with save/load slots, branching plot options, long-term memory
- 🧠 **RAG Knowledge Base** — BM25 + vector hybrid retrieval, Admin review pipeline, per-character skill packs
- 💻 **OpenCode Agent** — One-click toggle between character chat and professional coding assistant
- 🔊 **TTS Streaming** — Real-time text-to-speech with sentence-level audio queue (GPT-SoVITS / VITS / Edge-TTS)
- 🎤 **Local ASR** — faster-whisper speech recognition + VAD (data stays on-device)
- 🌍 **Bilingual Translation** — Simultaneous dual-language output with VOICE/TEXT tags
- 🔌 **Plugin System** — Extensible JS mod system (script editor, sprite engine, video backgrounds, web search, vision)
- 🎨 **Dark Mode** — Light / Dark / System-follow themes
- 🖼️ **Vision** — Screenshot analysis, image understanding, face tracking

### Quick Start

**Requirements:** Python 3.11+, Node.js 18+, Windows 10/11

**Method 1 — Release Package:**
1. Download the latest [Release](https://github.com/QiuSui1145/GWC-Pro/releases)
2. Install [Node.js](https://nodejs.org/en/download)
3. Double-click `启动全栈环境.bat`
4. Open http://127.0.0.1:5201/app

**Method 2 — Manual Setup:**

```bash
# Backend
cd backend
python -m venv runtime
runtime\Scripts\activate
pip install -r requirements.txt
python main.py              # → http://127.0.0.1:5201

# Frontend
cd frontend
npm install --legacy-peer-deps
npm run build               # production build → dist/

# Desktop Pet
cd electron-app
npm install
npm start
```

**One-click (Windows):** Double-click `启动全栈环境.bat`

### Project Structure

```
GWC-Pro/
├── backend/                      # FastAPI backend
│   ├── main.py                   # Core server (LLM proxy, auth, API routes)
│   ├── auth_tokens.py            # HMAC-signed stateless token auth
│   ├── skills_engine.py          # RAG skill retrieval engine
│   ├── knowledge_base_engine.py  # Full-text knowledge base
│   ├── userdata_store.py         # File-system JSON storage
│   ├── tts_installer.py          # GPT-SoVITS on-demand installer
│   ├── qq_bot_engine.py          # QQ bot integration
│   ├── requirements.txt          # Python dependencies
│   └── web_static/               # Admin panel & pet HTML
├── frontend/                     # React 19 + Vite 8 SPA
│   ├── src/
│   │   ├── AppCore.jsx           # Main app logic (chat, sessions, saves, LLM calls)
│   │   ├── pages/                # ChatPage, LoginPage, SettingsPage, LogPage...
│   │   ├── components/           # settings/, chat/, modals/, ui/
│   │   ├── builtin/              # Merged core plugins (script mode, sprite mode)
│   │   ├── utils/                # authFetch, authToken, auth, db, theme, api
│   │   └── theme-dark.css        # Dark mode palette remapping
│   ├── public/
│   │   ├── vendor/               # Live2D / PIXI / MediaPipe SDK
│   │   └── mods/                 # User plugin scripts
│   ├── dist/                     # Built frontend (served by backend)
│   └── vite.config.js
├── electron-app/                 # Electron desktop pet
│   ├── main.js                   # Main process (tray, IPC, shortcuts)
│   ├── renderer/
│   │   ├── renderer.js           # Pet UI logic (Live2D + MMD switching)
│   │   ├── mmd.src.js            # MMD 3D engine source (ESM)
│   │   └── mmd.bundle.js         # Built MMD engine (IIFE)
│   ├── libs/                     # three.js + MMD modules + Live2D/PIXI SDK
│   └── build-mmd.mjs             # rolldown bundler for MMD engine
├── desktop-app/                  # Electron chat/roleplay desktop app
│   ├── main.js                   # Local HTTP server + API proxy + window
│   ├── renderer/                 # (frontend/dist served under /app)
│   └── 启动.bat                   # Standalone launcher
├── console-app/                  # All-in-one window combiner (logs in panes)
│   ├── main.js                   # Spawns backend/frontend/pet, streams logs
│   ├── renderer/                 # Tabbed log panels
│   └── 启动.bat                   # Standalone launcher
├── mods/                         # Legacy mod scripts (compatibility)
├── tts/                          # Built-in TTS (GPT-SoVITS inference subset)
│   ├── server/                   # GPT-SoVITS API server (installed on-demand)
│   ├── models/                   # Voice weights (installed on-demand)
│   ├── start_tts.bat             # Manual TTS launcher
│   └── copy_tts.py               # Regenerate TTS directory from source
├── tupian/                       # Image assets (icon, background)
├── mmd_models/                   # MMD 3D models & motions (user-provided)
│   └── _motions/                 # Shared motion library (camera + audio bundles)
├── live2d_models/                # Live2D models (user-provided)
├── userdata/                     # User data (generated at runtime)
├── WorkSpace/                    # OpenCode working directory
├── 启动全栈环境.bat               # One-click launcher
├── package_release.py            # Distribution packaging script
├── VERSION                       # Version number
└── README.md
```

### Access URLs

| Page | URL |
|------|-----|
| Frontend | http://127.0.0.1:5201/app |
| API Docs (Swagger) | http://127.0.0.1:5201/docs |
| Admin Panel | http://127.0.0.1:5201/admin |

### Key Features

#### 🎭 Live2D Desktop Pet
- PIXI.js + Live2D Cubism SDK 4/5 rendering
- Drag to move, scroll to zoom, click for interactions (tap motions + expressions)
- Global mouse passthrough with smart UI region detection
- Multi-model hot-swap, auto-scan from `live2d_models/`
- Position persistence per model

#### 🧊 MMD 3D Support (v7.21+)
- Full PMX/PMD loading with toon shading (OutlineEffect) and physics (ammo.js WASM)
- Orthographic camera rendering (no perspective distortion on desktop pet)
- **Performance bundles**: bone motion + camera VMD + audio (.wav) sync playback
- Shared motion library `mmd_models/_motions/` with auto camera/audio pairing
- Fixed-timestep physics (60Hz), per-material outline scale
- Physics toggle in tray menu (bi-directional sync with settings panel)
- Per-model position save (no more flying off-screen on model switch)
- WebGL context reuse (no more broken rendering after Live2D↔MMD toggle)

#### 💬 Visual Novel Chat
- Typing animation with configurable speed
- Manual save (100 slots) + Quick Save + Auto Save
- Long-term memory compression (LLM-driven summarization)
- AI-generated plot branching options
- Character card system (persona / world setting / skill packs)
- `isError` messages excluded from save history

#### 🧠 RAG Skills & Knowledge Base
- Supports `.txt`, `.md`, `.json`, `.zip` imports
- Public library (shared) + Private library (per-user) + Admin moderation
- BM25 keyword + vector semantic + RRF fusion + optional ReRank
- Core rules (<3KB) injected into system prompt; large docs retrieved on-demand

#### 💻 OpenCode Agent Mode
- One-click toggle between character roleplay and coding assistant
- Backend spawns OpenCode CLI, frontend polls streaming output
- On completion, AI summarizes in-character (TTS spoken)

#### 🔐 Authentication & Security
- HMAC-signed stateless tokens (no server-side sessions)
- Token transport: Authorization header + Cookie + Query parameter
- Referer-based auth bypass for native browser resource loads (CSS bg, images, audio)
- Path traversal prevention, command injection fixes, CORS restricted to local origins
- Anonymous access tiers for public endpoints (pet chat, ASR, model list)

#### 🎨 Dark Mode, TTS, ASR & More
- **Dark Mode**: Light / Dark / System-follow with CSS palette remapping
- **TTS**: GPT-SoVITS on-demand installer (import from local install, no network needed)
- **ASR**: faster-whisper local speech recognition with VAD
- **Vision**: Screenshot capture, image uploads, face tracking (MediaPipe)

### Changelog

<details>
<summary><b>v7.23 (2026-08-30)</b> — Native Electron desktop app + all-in-one console + local mode</summary>

- 🖥️ Chat/roleplay UI converted to a standalone **Electron desktop app** (local HTTP server + `/api` proxy to backend), no browser required
- 🗂️ New **all-in-one console** (`console-app/`): backend / frontend / desktop pet logs merged into one window with isolated, color-coded panes
- 🚀 `启动全栈环境.bat` now launches everything through the console and auto-closes after startup; closing the launcher no longer kills running apps
- 🔓 **Local Mode** in Account Security: login to any account without a password, password field auto-hidden, "remember me" now lasts until manual logout
- ✨ Page transition animations (fade / slide / center-expand) with a global **animation speed** slider
- 🔊 Custom **button click sound** (global, applies to every button)
- 🐛 Fixed Live2D engine loading deadlock (sequential script loading + auto-retry, no more stuck "loading engine")

</details>

<details>
<summary><b>v7.22 (2026-08-01)</b> — Resource auth fix + LLM error display + MMD polish</summary>

- 🔗 Backend Referer same-origin bypass for native resource loads (CSS bg, img, audio)
- 🔧 authFetch covers all channels: fetch + EventSource + XHR + img.src + audio.src
- 📋 13 HTTP error codes → Chinese explanations (429→rate limit, 402→balance, etc.)
- 🗑️ `isError` messages excluded from all save types
- 🎥 MMD camera VMD runs in background, ortho rendering unchanged
- 📍 MMD position saved per model path
- 🔄 WebGL context reuse (fixes Live2D↔MMD re-render bug)
- 🦴 Physics toggle in tray menu

</details>

<details>
<summary><b>v7.21 (2026-08-01)</b> — MMD performance bundles + camera + audio</summary>

- 🎥 Full MMD performance: bone motion + camera VMD + audio sync
- 🔊 Web Audio API playback synced to animation
- 📁 Shared motion library `_motions/` with subdirectory bundles
- 🦴 Physics checkbox in tray (bi-directional settings sync)
- 🔄 Restart pet option in tray (kills old cmd window)
- 🛡️ Security: token auth + cookie sync + path traversal + CORS

</details>

### FAQ

**Q: Backend fails with missing NLP libraries?**
```bash
pip install jieba rank_bm25
```

**Q: ASR model download failed?**
Set `HF_ENDPOINT=https://hf-mirror.com` or manually download to `backend/asr_model/`.

**Q: Desktop pet not showing?**
1. Verify backend is running at :5201
2. Check `live2d_models/` for `.model3.json` files
3. Press F12 for console errors
4. Press Ctrl+Shift+F11 to open DevTools (detached window)

**Q: Frontend page blank?**
Run `npm run build` first, then visit `http://127.0.0.1:5201/app`.

**Q: How to add MMD performances with camera + music?**
Place the entire folder (containing `.vmd` motions, `camera *.vmd`, and `.wav` audio) under `mmd_models/_motions/`. The system auto-detects and pairs them.

**Q: How to backup?**
Settings → Data Management → Export, or manually copy `userdata/` directory.

**Q: Live2D textures not loading (401 errors)?**
Update to v7.22+ — Referer-based auth bypass handles native browser resource loads.

---

<span id="chinese"></span>
## 🇨🇳 中文

### GWC Pro 是什么？

**GWC Pro** 是一个让二次元角色"活过来"的全栈 AI 引擎：

- 🎭 **Live2D 桌宠** — 桌面上的互动动漫角色（Electron + PIXI.js + Cubism SDK 4/5）
- 🖥️ **原生 Electron 桌面应用** — 聊天/角色扮演界面独立 Electron 应用运行（本地服务 + API 反代），无需浏览器
- 🗂️ **一体化控制台** — 后端 / 前端 / 桌宠日志合并进一个窗口，分面板隔离显示
- 🔓 **本地模式** — 登录任何账号无需密码（可选），自动隐藏密码输入框
- 🧊 **MMD 3D 支持** — 完整 PMX/PMD 渲染、卡通描边、物理引擎、镜头+音频同步
- 💬 **视觉小说对话** — 沉浸式对话，支持存档/读档、剧情选项、长期记忆压缩
- 🧠 **RAG 知识库** — BM25 + 向量混合检索，Admin 审核机制，分角色技能包
- 💻 **OpenCode 编程代理** — 一键切换角色扮演 / 编程助手双模式
- 🔊 **TTS 语音合成** — 实时切句流式播放（GPT-SoVITS / VITS / Edge-TTS）
- 🎤 **本地 ASR** — faster-whisper 语音识别，数据不出本机
- 🌍 **同声传译** — 双语言输出，VOICE/TEXT 标签分离
- 🔌 **插件系统** — 可扩展 JS 模组（剧情编辑器、立绘引擎、视频背景、联网搜索、视觉感知）
- 🎨 **暗色模式** — 亮色 / 暗色 / 跟随系统
- 🖼️ **视觉感知** — 截图分析、图片理解、人脸追踪

### 快速开始

**环境要求：** Python 3.11+、Node.js 18+、Windows 10/11

**方案一 — Release 包：**
1. 下载最新 [Release](https://github.com/QiuSui1145/GWC-Pro/releases)
2. 安装 [Node.js](https://nodejs.org/en/download)
3. 双击 `启动全栈环境.bat`
4. 访问 http://127.0.0.1:5201/app

**方案二 — 手动部署：**

```bash
# 后端
cd backend
python -m venv runtime
runtime\Scripts\activate
pip install -r requirements.txt
python main.py              # → http://127.0.0.1:5201

# 前端
cd frontend
npm install --legacy-peer-deps
npm run build               # 生产构建 → dist/

# 桌宠
cd electron-app
npm install
npm start
```

**一键启动 (Windows)：** 双击 `启动全栈环境.bat`

### 项目结构

```
GWC-Pro/
├── backend/                      # FastAPI 后端
│   ├── main.py                   # 核心服务（LLM 代理、鉴权、API 路由）
│   ├── auth_tokens.py            # HMAC 签名无状态令牌鉴权
│   ├── skills_engine.py          # RAG 技能检索引擎
│   ├── knowledge_base_engine.py  # 全文知识库引擎
│   ├── userdata_store.py         # 文件系统 JSON 存储
│   ├── tts_installer.py          # GPT-SoVITS 按需安装器
│   ├── qq_bot_engine.py          # QQ 机器人集成
│   ├── requirements.txt          # Python 依赖
│   └── web_static/               # 管理面板 & 桌宠 HTML
├── frontend/                     # React 19 + Vite 8 前端
│   ├── src/
│   │   ├── AppCore.jsx           # 主应用逻辑（聊天、会话、存档、LLM 调用）
│   │   ├── pages/                # ChatPage、LoginPage、SettingsPage、LogPage...
│   │   ├── components/           # settings/、chat/、modals/、ui/
│   │   ├── builtin/              # 已合并内核插件（剧情 IDE、立绘模式）
│   │   ├── utils/                # authFetch、authToken、auth、db、theme、api
│   │   └── theme-dark.css        # 暗色模式 CSS 调色板
│   ├── public/
│   │   ├── vendor/               # Live2D / PIXI / MediaPipe SDK
│   │   └── mods/                 # 用户插件脚本
│   ├── dist/                     # 构建产物（后端托管）
│   └── vite.config.js
├── electron-app/                 # Electron 桌宠
│   ├── main.js                   # 主进程（托盘、IPC、快捷键）
│   ├── renderer/
│   │   ├── renderer.js           # 桌宠 UI 逻辑（Live2D + MMD 切换）
│   │   ├── mmd.src.js            # MMD 3D 引擎源码（ESM）
│   │   └── mmd.bundle.js         # MMD 引擎打包产物（IIFE）
│   ├── libs/                     # three.js + MMD 模块 + Live2D/PIXI SDK
│   └── build-mmd.mjs             # rolldown 打包脚本
├── desktop-app/                  # Electron 聊天/角色扮演桌面应用
│   ├── main.js                   # 本地 HTTP 服务 + API 反代 + 窗口
│   └── 启动.bat                   # 独立启动器
├── console-app/                  # 一体化窗口合并器（多面板日志）
│   ├── main.js                   # 拉起后端/前端/桌宠并流式显示日志
│   ├── renderer/                 # 分面板日志界面
│   └── 启动.bat                   # 独立启动器
├── mods/                         # 旧版模组脚本（兼容保留）
├── tts/                          # 内置配音（GPT-SoVITS 推理最小集）
│   ├── server/                   # GPT-SoVITS API 服务（按需安装）
│   ├── models/                   # 音色权重（按需安装）
│   ├── start_tts.bat             # 手动启动 TTS
│   └── copy_tts.py               # 从源目录重新生成 TTS
├── tupian/                       # 图片资源（图标、背景）
├── mmd_models/                   # MMD 3D 模型 & 动作（用户自行放置）
│   └── _motions/                 # 共享动作库（支持镜头 + 音频演出包）
├── live2d_models/                # Live2D 模型（用户自行放置）
├── userdata/                     # 用户数据（运行时生成）
├── WorkSpace/                    # OpenCode 工作目录
├── 启动全栈环境.bat               # 一键启动脚本
├── package_release.py            # 分发打包脚本
├── VERSION                       # 版本号
└── README.md
```

### 访问地址

| 页面 | URL |
|------|-----|
| 前端主界面 | http://127.0.0.1:5201/app |
| API 文档 (Swagger) | http://127.0.0.1:5201/docs |
| 管理面板 | http://127.0.0.1:5201/admin |

### 核心功能详解

#### 🎭 Live2D 桌宠系统
- PIXI.js + Live2D Cubism SDK 4/5 高性能渲染
- 拖拽移动、滚轮缩放、点击互动（Tap 动作 + 表情切换）
- 全局鼠标穿透 + UI 区域智能检测
- 多模型热切换，自动扫描 `live2d_models/` 目录
- 位置按模型分别持久化

#### 🧊 MMD 3D 桌宠（v7.21+）
- 完整 PMX/PMD 加载，卡通描边 (OutlineEffect) + Bullet 物理 (ammo.js WASM)
- **正交相机渲染**（桌宠场景下无透视畸变，正面始终朝向用户）
- **演出包支持**：骨骼动画 + 镜头 VMD + 音频 (.wav) 三合一同步播放
- 共享动作库 `mmd_models/_motions/`，自动识别同目录下的镜头和音频文件
- 固定步长物理 (60Hz)、按材质独立描边粗细
- 托盘菜单骨骼物理开关（设置面板双向同步）
- 按模型路径分别保存位置（切换模型不再飞出屏幕）
- WebGL 上下文不复毁（修复 Live2D↔MMD 反复切换后模型不渲染）

#### 💬 剧情对话引擎
- 打字机动画效果，速度可调
- 手动存档 100 格 + 快捷存档 + 自动存档
- 长期记忆压缩（LLM 驱动的摘要）
- AI 自动生成剧情分支选项
- 角色卡系统：一键切换人设 / 世界观 / 技能包
- 报错消息（`isError`）不进入任何存档

#### 🧠 RAG 技能知识库
- 支持 `.txt`、`.md`、`.json`、`.zip` 导入
- 公共库（共享）+ 私有库（专属）+ Admin 审核机制
- BM25 关键词 + 向量语义 + RRF 融合 + 可选 ReRank
- 核心设定（<3KB）全量注入系统提示词，大型文档按需检索

#### 💻 OpenCode Agent 模式
- 一键切换角色扮演 / 编程助手双模式
- 后端启动 OpenCode CLI，前端实时轮询流式输出
- 完成后 AI 自动生成角色口吻总结（TTS 朗读）

#### 🔐 鉴权与安全
- HMAC 签名无状态令牌（服务端无需保存会话）
- 令牌传输三通道：Authorization 头 + Cookie + 查询参数 `_token`
- Referer 同源校验：CSS 背景图、`<img>`、`<audio>` 等浏览器原生加载自动放行
- 路径穿越防护、命令注入修复、CORS 收敛到本地来源
- 公开端点匿名访问分级（桌宠聊天、ASR、模型列表等）

#### 🎨 暗色模式、TTS、ASR 等
- **暗色模式**：亮色 / 暗色 / 跟随系统，CSS 变量调色板覆写
- **内置配音**：GPT-SoVITS 按需安装向导（从本机已有安装导入，无需联网）
- **本地 ASR**：faster-whisper 语音识别 + VAD 静音检测
- **视觉感知**：截图捕获、图片上传、MediaPipe 人脸追踪

### API 参考

<details>
<summary><b>LLM 代理 & 桥接</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/chat/completions` | LLM 代理（支持流式/非流式，透传 api_base/api_key） |
| GET | `/api/bridge/pull` | 桌宠桥接拉取（长轮询 2s） |
| POST | `/api/bridge/push` | 桌宠桥接推送 |
| GET | `/api/bridge/history` | 桌宠桥接历史 |
| POST | `/api/pet_chat/message` | 桌宠消息推送 |

</details>

<details>
<summary><b>鉴权 / Auth</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | 登录（返回 HMAC token） |
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/setup_default` | 自动创建默认账号 |
| GET | `/api/login-config` | 登录页配置 |
| GET | `/api/login-bg` | 登录页背景 |

</details>

<details>
<summary><b>用户数据 / Userdata</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/userdata/{id}/core/{key}` | 读取核心数据 |
| PUT | `/api/userdata/{id}/core/{key}` | 写入核心数据 |
| GET | `/api/userdata/{id}/batch` | 批量读取 |
| GET | `/api/userdata/{id}/models/{mid}/files/{*path}` | 模型文件（.json / .moc3 / .png） |
| GET | `/api/userdata/{id}/app_image/{key}` | 应用图片资源 |
| GET | `/api/userdata/{id}/bgm/{key}/file` | BGM 音频资源 |
| GET | `/api/userdata/{id}/bg_images/{key}/file` | 背景图片资源 |
| GET | `/api/userdata/{id}/plugins/{*path}` | 插件资源 |

</details>

<details>
<summary><b>MMD & 模型 / MMD & Models</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/models` | 扫描 Live2D 模型列表 |
| GET | `/api/mmd_models` | 扫描 MMD 模型列表（含自带动作 + 共享动作） |
| GET | `/api/mmd_motions` | 扫描共享动作库（含镜头/音频配对信息） |

</details>

<details>
<summary><b>TTS & ASR</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tts/status` | TTS 服务状态 |
| POST | `/api/tts/start` | 启动 TTS 服务 |
| POST | `/api/tts/stop` | 停止 TTS 服务 |
| GET | `/api/tts/voices` | 可用音色列表 |
| POST | `/api/tts/set_voice` | 切换音色 |
| GET | `/api/tts/install/sources` | 扫描本机 GPT-SoVITS 安装 |
| POST | `/api/tts/install` | 开始按需安装 |
| GET | `/api/tts/install/progress` | 安装进度 |
| POST | `/api/asr/transcribe` | 语音转文字 |
| GET | `/api/asr/model-status` | ASR 模型状态 |
| POST | `/api/tts_from_pet` | 桌宠 TTS 中继 |
| GET | `/api/tts_from_pet/poll` | 桌宠 TTS 轮询 |

</details>

<details>
<summary><b>技能 & 知识库 / Skills & KB</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/skills/retrieve` | 技能检索 |
| GET | `/api/skills/packs` | 技能包列表 |
| POST | `/api/kb/retrieve` | 知识库检索 |
| GET | `/admin/api/skills` | Admin: 技能文件管理 |
| GET | `/admin/api/fetch_models` | Admin: 模型探测 |

</details>

<details>
<summary><b>OpenCode & 其他</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/opencode/run` | 启动 OpenCode 任务 |
| GET | `/api/opencode/poll/{id}` | 轮询任务状态 |
| GET | `/api/opencode/stream/{id}` | 获取完整输出 |
| POST | `/api/opencode/confirm` | 确认/拒绝操作 |
| GET | `/api/launcher-config` | 启动器配置 |
| GET | `/api/web/search` | 网页搜索 |
| POST | `/api/screenshot/capture` | 屏幕截图 |

</details>

### 更新日志

<details>
<summary><b>v7.23 (2026-08-30)</b> — 原生 Electron 桌面应用 + 一体化控制台 + 本地模式</summary>

- 🖥️ 聊天/角色扮演界面改造为独立 **Electron 桌面应用**（本地 HTTP 服务 + `/api` 反代后端），无需浏览器
- 🗂️ 新增 **一体化控制台**（`console-app/`）：后端 / 前端 / 桌宠日志合并进一个窗口，分面板隔离显示
- 🚀 `启动全栈环境.bat` 统一经控制台拉起全部服务，启动完成后自动关闭；关闭启动器不再误杀运行中的应用
- 🔓 账号安全新增 **本地模式**：登录任何账号无需密码、自动隐藏密码输入框、记住登录持续到手动退出
- ✨ 页面切换过渡动画（淡入 / 横移 / 中心扩散）+ 全局 **动画速率** 调节
- 🔊 自定义 **按钮点击音效**（全局生效）
- 🐛 修复 Live2D 引擎加载死锁（脚本顺序加载 + 自动重试，不再卡在「加载引擎中」）

</details>

<details>
<summary><b>v7.22 (2026-08-01)</b> — 资源加载修复 + LLM 错误展示 + MMD 完善</summary>

- 🔗 后端 Referer 同源放行，原生资源加载不再 401
- 🔧 authFetch 全通道覆盖（fetch / EventSource / XHR / img.src / audio.src）
- 📋 LLM 错误码中文解释（13 种），红色边框，不计入存档
- 🎥 MMD 镜头 VMD 后台运行，不干扰桌宠正交渲染
- 📍 MMD 位置按模型路径分别保存
- 🔄 WebGL 不复毁，Live2D↔MMD 切换稳定
- 🦴 托盘菜单骨骼物理开关

</details>

<details>
<summary><b>v7.21 (2026-08-01)</b> — MMD 演出包 + 镜头动画 + 音频同步</summary>

- 🎥 完整 MMD 演出包：骨骼动画 + 镜头 VMD + 音频同步
- 🔊 Web Audio API 音频播放，与动画实时同步
- 📁 共享动作库支持子目录演出包（自动配对镜头/音频）
- 🦴 托盘骨骼物理复选框
- 🔄 托盘「重启桌宠」选项
- 🛡️ 全栈安全加固

</details>

### 常见问题

**Q: 后端启动报错「缺少关键 NLP 库」？**
```bash
pip install jieba rank_bm25
```

**Q: ASR 模型下载失败？**
设置环境变量 `HF_ENDPOINT=https://hf-mirror.com` 或手动下载放入 `backend/asr_model/`。

**Q: 桌宠不显示？**
1. 确认后端已启动（:5201 可访问）
2. 确认 `live2d_models/` 下有 `.model3.json` 模型文件
3. 按 F12 查看 Console 错误
4. 按 Ctrl+Shift+F11 打开独立 DevTools 窗口

**Q: 前端页面空白？**
先执行 `npm run build`，再通过 `http://127.0.0.1:5201/app` 访问。

**Q: Live2D 模型贴图 401 加载失败？**
升级到 v7.22+ — 后端 Referer 同源校验已解决原生资源加载鉴权问题。

**Q: 如何导入带镜头和音乐的 MMD 演出？**
将整个文件夹（含 `.vmd` 动作、`camera *.vmd` 镜头、`.wav` 音频）放入 `mmd_models/_motions/`，系统自动识别并配对。

**Q: MMD 模型切换后飞到屏幕外？**
v7.21+ 已修复——位置现在按模型路径分别保存，互不干扰。也可以点「桌宠复位」重置。

**Q: 如何备份？**
设置 → 数据管理 → 导出备份，或手动复制 `userdata/` 目录。

---

## Download / 下载

> **Latest Release: v7.23** — [GWC-Pro Releases](https://github.com/QiuSui1145/GWC-Pro/releases)
>
> Source distribution (~51 MB). Python runtime, TTS models, ASR models, MMD/Live2D models are set up on first run.

---

## 社区 / Community

- 📺 **BiliBili**：[https://space.bilibili.com/1764510273](https://space.bilibili.com/1764510273)
- 💬 **QQ 群**：**1083739889**
- 🐙 **GitHub**：[https://github.com/QiuSui1145/GWC-Pro](https://github.com/QiuSui1145/GWC-Pro)

### 贡献 / Contributing

欢迎 PR！Fork → Feature branch → Commit → Push → Pull Request。

### 致谢 / Credits

Live2D Cubism SDK · PIXI.js · three.js · ammo.js · faster-whisper · FastAPI · React · Electron · Tailwind CSS · GPT-SoVITS · Framer Motion · Lucide Icons · jieba · rank-bm25 · OpenCC · OpenCode

---

<p align="center">
  <b>🌟 如果这个项目对你有帮助，请点亮 Star！ 🌟</b><br>
  <b>If this project helps you, please give it a Star!</b><br>
  <sub>Made with ❤️ by QiuSui1145</sub>
</p>
