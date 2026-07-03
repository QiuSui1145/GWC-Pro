# GWC Pro - GalGame Web Chat 全栈引擎

> 🎮 **次世代 AI 角色扮演全栈引擎** — 融合 Live2D 桌宠 + 剧情对话 + RAG 技能知识库 + OpenCode 工作模式的终极二次元 AI 伴侣平台。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-green.svg)](https://www.python.org/)
[![Node](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-19-blue.svg)](https://react.dev/)
[![Electron](https://img.shields.io/badge/electron-28-blue.svg)](https://www.electronjs.org/)

---

## English Introduction

**GWC Pro** is a next-generation AI role-playing full-stack engine combining Live2D desktop pet, visual novel-style dialogue, RAG skill knowledge base, and OpenCode work mode into one unified platform.

- 🎭 **Live2D Desktop Pet** — Interactive anime character on your desktop (Electron + PIXI.js + Cubism SDK 4)
- 💬 **Story Chat System** — Visual novel interface with save/load, branching plot options, memory compression
- 🧠 **RAG Skill Knowledge Base** — BM25 + vector hybrid retrieval with Admin review pipeline
- 💻 **OpenCode Work Mode** — One-click switch between "waifu chat" and professional coding assistant
- 🔊 **TTS Streaming** — Real-time text-to-speech with sentence-level audio queue
- 🎤 **Local ASR** — faster-whisper speech recognition with VAD (data stays on-device)
- 🌍 **Simultaneous Translation** — Bilingual output with VOICE/TEXT tag separation
- 🔌 **Plugin System** — Extensible JS mod system with API client

---

## 亮点介绍 | Highlights

### 🎭 Live2D 桌宠系统
- PIXI.js + Live2D Cubism SDK 4.x 高性能渲染
- 拖拽移动、滚轮缩放、点击互动（Tap + 表情切换）
- 全局鼠标穿透 + UI 区域智能检测
- 多模型热切换，自动扫描 `live2d_models/`

### 💬 剧情对话引擎
- 视觉小说风格界面，打字机效果
- 完整存档系统：手动 / 快速 / 自动存档
- 长期记忆压缩，突破上下文限制
- 剧情选项 AI 自动生成
- 角色卡系统：一键切换人设 / 世界观 / 技能包

### 🧠 RAG 技能知识库
- 支持 `.txt` `.md` `.json` 及 `.zip` 导入，ZIP 保留目录结构
- 公共库（共享）+ 私有库（专属）+ Admin 审核
- BM25 关键词 + 向量语义 + RRF 融合 + 可选 ReRank
- 核心设定（<3KB）全量注入，大型文档按需检索

### 💻 OpenCode 工作模式
- 一键切换角色扮演 / 编程助手双模式
- 后端启动 OpenCode CLI，前端实时轮询
- 完成后 AI 自动生成角色口吻总结（TTS 朗读）

### 🔊 实时 TTS + 🎤 本地 ASR
- 流式切句 + 音频预加载队列，延迟 < 50ms
- 支持 GPT-SoVITS / VITS / Edge-TTS 后端
- faster-whisper 本地语音识别，数据不出本机
- VAD 自动检测 + 按住/切换/自动三种模式

---

## 技术架构 | Architecture

```
┌──────────────────────────────────────────────────────┐
│                    GWC Pro 全栈架构                     │
├──────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────┐  ┌──────────────┐    │
│  │ Electron  │  │  React SPA  │  │  Mod Plugins  │    │
│  │ DeskPet   │  │  Frontend   │  │  JS Runtime   │    │
│  └─────┬─────┘  └──────┬──────┘  └──────┬───────┘    │
│        └───────────────┬┴─────────────────┘           │
│                        │ HTTP :5201                    │
│              ┌─────────▼──────────┐                    │
│              │  FastAPI Backend   │                    │
│              │  Python 3.11+      │                    │
│              ├───────────────────┤                    │
│              │ LLM Bridge / Skills / KB / ASR / TTS   │
│              │ OpenCode / QQ Bot / Userdata Store      │
│              └─────────┬──────────┘                    │
│                        │                               │
│              ┌─────────▼──────────┐                    │
│              │   File System     │                    │
│              │   userdata/       │                    │
│              └───────────────────┘                    │
└──────────────────────────────────────────────────────┘
```

### 技术栈 | Tech Stack

| 层级 | 技术 |
|------|------|
| **前端** | React 19 + Vite 8 + Tailwind CSS 4 + Lucide Icons + Framer Motion |
| **桌宠** | Electron 28 + PIXI.js 6 + Live2D Cubism SDK 4 |
| **后端** | Python 3.11+ + FastAPI + Uvicorn + httpx |
| **NLP** | jieba + rank_bm25 + faster-whisper + OpenCC |
| **向量检索** | Embedding API + Cosine Similarity + RRF Fusion |
| **语音** | GPT-SoVITS / VITS / Edge-TTS (external service) |
| **存储** | File-system JSON (no external DB required) |

---

## 快速开始 | Quick Start

### Environment Requirements

- **Python** 3.11+
- **Node.js** 18+ (frontend dev / Electron)
- **Windows 10/11** (Linux/macOS port in progress)
- **4GB+ RAM** (ASR model needs ~1.5GB extra)

### 1. Deploy Backend

```bash
cd backend
python -m venv runtime
runtime\Scripts\activate
pip install -r requirements.txt
python main.py
# Backend at http://127.0.0.1:5201
```

### 2. Deploy Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run build    # production build → dist/
# Or: npm run dev (development with hot reload)
```

### 3. Launch Desktop Pet

```bash
cd electron-app
npm install
npm start
```

### 4. One-Click Launch (Windows)

```bash
启动全栈环境.bat
```

### Access URLs

| Page | URL |
|------|-----|
| Main App | http://127.0.0.1:5201/app |
| Admin Panel | http://127.0.0.1:5201/admin |
| Pet Chat | http://127.0.0.1:5201/pet |
| API Docs | http://127.0.0.1:5201/docs |

---

## 使用说明 | User Guide

### Basic Operations

| Action | Key/Operation |
|--------|---------------|
| Send | Enter |
| New Line | Shift+Enter |
| Voice Input | Hold Right Ctrl (configurable) |
| Quick Toggles | Bottom status bar: Save/Load/QuickSave/QuickLoad/Skip/BGM/Model/Expression/Memo/WorkMode/Face/Hide/TTS/Log |

### Skill Pack Management

1. Settings → **Skills Console**
2. Select scope (Public / Private)
3. Upload `.zip` or individual `.md`/`.txt`/`.json` files
4. Expand skill pack → preview / enable / disable / delete files
5. Admin can approve/reject public uploads in review queue

### Character Cards

- Bind character name, user name, system prompt, and skill packs
- One-click character switching with auto world/personality loading
- Import/export character cards as JSON

### TTS Configuration

1. Deploy GPT-SoVITS or VITS (default: localhost:9880)
2. Settings → Sound → TTS URL Template
3. Format: `http://127.0.0.1:9880/tts?text={text}&text_lang={lang}`
4. Enable Auto(TTS) in bottom status bar

### Simultaneous Translation

1. Settings → Text → Enable **Translation Mode**
2. Select display language + voice language
3. AI outputs `<VOICE>` + `<TEXT>` bilingual format automatically

---

## 插件文档 | Plugin Documentation

### Built-in Plugins

| Plugin | Description |
|--------|-------------|
| **Script IDE** | Visual script editor with branching, conditions, variables |
| **Sprite Mode** | Traditional VN sprite mode, multi-character support |
| **Dynamic Video BG** | WebM/MP4 video background with alpha channel |
| **Web Search** | DuckDuckGo + Wikipedia real-time search |
| **Vision Enhance** | Screenshot/image recognition for multimodal interaction |

### Plugin API

Plugins access core APIs via `window.GWC_API`:

```javascript
const uid = GWC_API.getActiveMirrorId()  // "user_Admin"
const settings = await GWC_API.loadCoreData("live2d_settings_v35")
await GWC_API.saveCoreData("live2d_settings_v35", settings)
const res = await fetch(`/api/some-endpoint?user_id=${uid}`)
```

### Create Custom Plugin

1. Create `.js` file in `mods/` directory
2. Use IIFE pattern to avoid global pollution
3. Access backend via `fetch()` or `GWC_API`
4. Refresh page to load

```javascript
// mods/my-plugin.js
(function() {
    console.log("[My Plugin] Loading...")
    const uid = localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin'
    // Your code...
    console.log("[My Plugin] Ready!")
})()
```

---

## API Reference

### Chat & Bridge

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/chat/completions` | LLM Chat (OpenAI compat) |
| POST | `/api/bridge/push` | Push message to pet |
| GET | `/api/bridge/pull` | Pet polls messages |

### Skills & Knowledge Base

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/skills/packs` | List skill packs |
| GET | `/api/skills/retrieve` | RAG retrieval |
| POST | `/admin/api/skills/import` | Import skill files |
| POST | `/admin/api/skills/delete` | Delete skill file |
| POST | `/admin/api/skills/toggle` | Toggle single file |
| POST | `/admin/api/skills/approve` | Admin review |

### Voice & TTS

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/asr/transcribe` | Speech-to-text |
| GET | `/api/asr/model-status` | ASR model status |
| POST | `/api/tts_from_pet` | Pet TTS relay |

### OpenCode

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/opencode/run` | Start OpenCode |
| GET | `/api/opencode/poll/{id}` | Poll task status |
| GET | `/api/opencode/stream/{id}` | Get full output |

### User Data

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/userdata/{id}/core/{key}` | Read core data |
| PUT | `/api/userdata/{id}/core/{key}` | Write core data |
| GET | `/api/userdata/{id}/batch` | Batch read |

---

## Project Structure

```
GWC-Pro/
├── backend/                     # Python Backend
│   ├── main.py                  # FastAPI entry (~2500 lines)
│   ├── skills_engine.py         # RAG skill engine (BM25)
│   ├── knowledge_base_engine.py # Vector search + Rerank
│   ├── userdata_store.py        # File-system data store
│   ├── qq_bot_engine.py         # QQ bot bridge
│   ├── requirements.txt
│   └── web_static/              # Static admin pages
├── frontend/                    # React Frontend
│   ├── src/
│   │   ├── AppCore.jsx          # Core logic (~3800 lines)
│   │   ├── pages/               # Chat/Settings/Login/Title...
│   │   ├── components/          # Settings panels + UI widgets
│   │   ├── contexts/            # Global state
│   │   └── utils/               # db/auth/api/constants
│   ├── public/vendor/           # Live2D/PIXI/MediaPipe libs
│   └── vite.config.js
├── electron-app/                # Electron Desktop Pet
│   ├── main.js                  # Electron main process
│   ├── libs/                    # Live2D + PIXI SDK
│   └── renderer/                # Pet UI (HTML/JS/CSS)
├── mods/                        # User plugins
├── tupian/                      # Image assets
├── live2d_models/               # Live2D models (user-provided)
├── userdata/                    # Runtime user data
└── 启动全栈环境.bat              # One-click launcher
```

---

## FAQ

**Q: Backend crashes with "missing NLP library"?**
```bash
pip install jieba rank_bm25
```

**Q: ASR model download fails?**
Uses `hf-mirror.com` by default. Set `HF_ENDPOINT=https://hf-mirror.com` or manually download to `backend/asr_model/`.

**Q: Desktop pet not showing?**
1. Ensure backend is running on port 5201
2. Verify `live2d_models/` has `.model3.json` files
3. Press F12 for DevTools console errors

**Q: Frontend shows blank page?**
Run `npm run build` first, then access via `http://127.0.0.1:5201/app`.

**Q: How to backup data?**
Settings → Data → Export full backup, or manually copy `userdata/` directory.

---

## 社区 | Community

- 📺 **BiliBili**: [https://space.bilibili.com/1764510273](https://space.bilibili.com/1764510273)
- 💬 **QQ Group**: **1083739889**
- 🐙 **GitHub**: [https://github.com/QiuSui1145/GWC-Pro](https://github.com/QiuSui1145/GWC-Pro)

## Contributing

PRs welcome! Fork → Feature branch → Commit → Push → Pull Request.

## Credits

Live2D Cubism SDK · PIXI.js · faster-whisper · FastAPI · React · Electron · Tailwind CSS · GPT-SoVITS

---

<p align="center">
  <b>🌟 Star this project if you like it! 🌟</b><br>
  <sub>Made with ❤️ by QiuSui1145</sub>
</p>
