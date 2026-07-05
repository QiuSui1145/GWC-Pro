# GWC Pro - GalGame Web Chat 全栈引擎 / Full-Stack AI Character Engine

> 🎮 **次世代 AI 角色扮演全栈引擎** — 融合 Live2D 桌宠 + 剧情对话 + RAG 技能知识库 + OpenCode Agent 工作模式的终极二次元 AI 伴侣平台。

[![Python](https://img.shields.io/badge/python-3.11+-green.svg)](https://www.python.org/)
[![Node](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-19-blue.svg)](https://react.dev/)
[![Electron](https://img.shields.io/badge/electron-28-blue.svg)](https://www.electronjs.org/)

<p align="center">
  <b>✨ 交流 QQ 群：1083739889 ✨</b><br>
  <b>📺 作者 BiliBili：<a href="https://space.bilibili.com/1764510273">@QiuSui1145</a></b>
</p>
<img width="1886" height="1230" alt="屏幕截图 2026-07-03 130920" src="https://github.com/user-attachments/assets/36956736-3410-49ef-83c4-60d4b13045b2" />

---

## 📖 目录 / Table of Contents

- [English Introduction](#english-introduction)
- [亮点介绍 / Highlights](#亮点介绍--highlights)
- [技术架构 / Architecture](#技术架构--architecture)
- [快速开始 / Quick Start](#快速开始--quick-start)
- [使用说明 / User Guide](#使用说明--user-guide)
- [插件文档 / Plugin Documentation](#插件文档--plugin-documentation)
- [API 参考 / API Reference](#api-参考--api-reference)
- [项目结构 / Project Structure](#项目结构--project-structure)
- [常见问题 / FAQ](#常见问题--faq)
- [社区与贡献 / Community & Contributing](#社区与贡献--community--contributing)

---

## English Introduction

**GWC Pro** is a next-generation AI role-playing full-stack engine that combines:

- 🎭 **Live2D Desktop Pet** — An interactive anime character living on your desktop (Electron + PIXI.js + Cubism SDK 4)
- 💬 **Story Chat System** — Immersive visual novel-style dialogue with save/load, branching plot options, and memory compression
- 🧠 **RAG Skill Knowledge Base** — BM25 + vector hybrid retrieval with Admin review pipeline
- 💻 **OpenCode Agent Work Mode** — One-click switch between "waifu chat" and professional coding assistant
- 🔊 **TTS Streaming** — Real-time text-to-speech with sentence-level audio queue
- 🎤 **Local ASR** — faster-whisper speech recognition with VAD (data stays on-device)
- 🌍 **Simultaneous Translation** — Bilingual output with VOICE/TEXT tag separation
- 🔌 **Plugin System** — Extensible JS mod system with API client
- 🖼️ **Vision** — Screenshot analysis, image understanding, multimodal interaction

---

## 亮点介绍 / Highlights

### 🎭 Live2D 桌宠系统
- PIXI.js + Live2D Cubism SDK 4.x 高性能渲染
- 拖拽移动、滚轮缩放、点击互动（Tap 动作 + 表情切换）
- 全局鼠标穿透 + UI 区域智能检测
- 多模型热切换，自动扫描 `live2d_models/` 目录
<img width="544" height="682" alt="屏幕截图 2026-07-03 130946" src="https://github.com/user-attachments/assets/7a7dc8fa-198b-4761-a545-154bc2e012d2" />

### 💬 剧情对话引擎
- 视觉小说风格界面，打字机效果
- 完整存档系统：手动 / 快速 / 自动存档
- 长期记忆压缩，突破上下文长度限制
- 剧情选项 AI 自动生成
- 角色卡系统：一键切换人设 / 世界观 / 技能包
<img width="1797" height="1221" alt="屏幕截图 2026-07-03 131101" src="https://github.com/user-attachments/assets/527ab07e-ffe2-4882-bbc0-da479848aeaa" />

### 🧠 RAG 技能知识库
- 支持 `.txt` `.md` `.json` 及 `.zip` 导入，ZIP 保留目录结构
- 公共库（共享）+ 私有库（专属）+ Admin 审核机制
- BM25 关键词 + 向量语义 + RRF 融合 + 可选 ReRank
- 核心设定（<3KB）全量注入系统提示词，大型文档按需检索
<img width="1800" height="1225" alt="屏幕截图 2026-07-03 131119" src="https://github.com/user-attachments/assets/04d018a6-ec61-4c95-8227-c71981e3f955" />

### 💻 OpenCode Agent 模式
- 一键切换角色扮演 / 编程助手双模式
- 后端启动 OpenCode CLI，前端实时轮询流式输出
- 完成后 AI 自动生成角色口吻总结（TTS 朗读）
<img width="1882" height="1213" alt="屏幕截图 2026-07-03 131021" src="https://github.com/user-attachments/assets/db42f982-5107-47f4-8180-60620d1a3ee2" />

### 🔊 实时 TTS + 🎤 本地 ASR
- 流式切句 + 音频预加载队列，延迟 < 50ms
- 支持 GPT-SoVITS / VITS / Edge-TTS 后端
- faster-whisper 本地语音识别，数据不出本机
- VAD 自动检测 + 按住/切换/自动三种模式
<img width="1793" height="1216" alt="屏幕截图 2026-07-03 131137" src="https://github.com/user-attachments/assets/4279a4e6-6e32-4551-aaaf-5e30b1c77159" />

---

## 技术架构 / Architecture

```
┌──────────────────────────────────────────────────────┐
│                    GWC Pro 全栈架构                     │
├──────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────┐  ┌──────────────┐    │
│  │ Electron  │  │  React SPA  │  │  Mod Plugins  │    │
│  │ DeskPet   │  │  Frontend   │  │  JS Runtime   │    │
│  └─────┬─────┘  └──────┬──────┘  └──────┬───────┘    │
│        └───────────────┬┴─────────────────┘           │
│                   HTTP :5201                           │
│              ┌─────────▼──────────┐                    │
│              │  FastAPI Backend   │                    │
│              │  Python 3.11+      │                    │
│              ├───────────────────┤                    │
│              │ LLM Bridge / Skills / KB / ASR / TTS   │
│              │ OpenCode / QQ Bot / Userdata Store      │
│              └─────────┬──────────┘                    │
│                        │                               │
│              ┌─────────▼──────────┐                    │
│              │   File System      │                    │
│              │   userdata/        │                    │
│              └───────────────────┘                    │
└──────────────────────────────────────────────────────┘
```

### 技术栈 / Tech Stack

| 层级 / Layer | 技术 / Technology |
|-------------|-------------------|
| **Frontend** | React 19 + Vite 8 + Tailwind CSS 4 + Lucide Icons + Framer Motion |
| **DeskPet** | Electron 28 + PIXI.js 6 + Live2D Cubism SDK 4 |
| **Backend** | Python 3.11+ + FastAPI + Uvicorn + httpx |
| **NLP** | jieba + rank_bm25 + faster-whisper + OpenCC |
| **Vector Search** | Embedding API + Cosine Similarity + RRF Fusion |
| **TTS** | GPT-SoVITS / VITS / Edge-TTS (external service) |
| **Storage** | File-system JSON (no external DB required) |

---

## 快速开始 / Quick Start

### 环境要求 / Requirements

- **Python** 3.11+
- **Node.js** 18+ (前端开发 / Electron 需要)
- **Windows 10/11** (Linux/macOS 移植中)
- **4GB+ RAM** (ASR 模型需额外 ~1.5GB)

### 方案一：快速开始
- 下载Release包
- 安装Node JS-https://nodejs.org/en/download
- 点击启动全栈环境
- 启动完成后访问 http://127.0.0.1:5201/app
<img width="272" height="499" alt="image" src="https://github.com/user-attachments/assets/a39a7014-ed77-4d62-9e9e-6c8d97af4bf8" />

### 方案二：手动部署

### 1. 部署后端 / Deploy Backend

```bash
cd backend
python -m venv runtime
runtime\Scripts\activate        # Windows
# source runtime/bin/activate   # Linux/macOS
pip install -r requirements.txt
python main.py
# 后端启动于 http://127.0.0.1:5201
# Backend at http://127.0.0.1:5201
```

### 2. 部署前端 / Deploy Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run build     # 生产构建 → dist/
# 或开发模式: npm run dev (热重载)
```

### 3. 启动桌宠 / Launch Desktop Pet

```bash
cd electron-app
npm install
npm start
```

### 4. 一键启动 / One-Click (Windows)

```batch
双击 / Double click: 启动全栈环境.bat
```
注：OpenCode会跟随程序启动，如出现错误可尝试使用OpenCode解决，运行中关闭OpenCode窗口不会影响程序运行。
### 访问地址 / Access URLs

| 页面 / Page | URL |
|------------|-----|
| 前端主界面 | http://127.0.0.1:5201/app |
| API 文档 | http://127.0.0.1:5201/docs |

---

## 使用说明 / User Guide

### 基础操作 / Basic Operations

| 功能 | 操作 |
|------|------|
| 发送消息 | Enter |
| 换行 | Shift+Enter |
| 语音输入 | 按住右 Ctrl（可在设置修改） |
| 快捷开关 | 底部状态栏：存档/读档/快存/快读/跳过/BGM/模型/表情/备忘/工作模式/人脸追踪/模型隐藏/TTS/Log |

### 技能包管理 / Skill Pack Management

1. 设置 → **技能控制台** / Settings → **Skills Console**
2. 选择存储位置（公共 / 私有）
3. 上传 `.zip` 或单个 `.md`/`.txt`/`.json` 文件
4. 展开技能包 → 预览 / 启用 / 停用 / 删除单个文件
5. Admin 可在待审核区通过/拒绝公共库上传

### 角色卡 / Character Cards

- 绑定：角色名 / 用户称谓 / 系统提示词 / 技能包组合
- 一键切换角色，自动加载对应世界观和技能包
- 支持导入/导出角色卡 JSON

### TTS 配置 / TTS Setup

1. 部署 GPT-SoVITS 或 VITS（默认 localhost:9880）
2. 设置 → 声音 → 填入 TTS URL 模板
3. 格式：`http://127.0.0.1:9880/tts?text={text}&text_lang={lang}`
4. 开启 Auto(TTS) 开关

### 同声传译 / Simultaneous Translation

1. 设置 → 文本互动 → 开启 **同声传译**
2. 选择显示语言 + 语音合成语言
3. AI 自动输出 `<VOICE>` + `<TEXT>` 双语格式

---

## 插件文档 / Plugin Documentation

### 内置插件 / Built-in Plugins

| 插件 | 功能 |
|------|------|
| **GWC-剧情IDE拓展包** | 可视化剧本编辑器，分支跳转、条件判断、变量系统 |
| **立绘模式拓展包** | 传统视觉小说立绘模式，多角色同屏 |
| **动态视频背景插件** | WebM/MP4 视频背景，透明通道 |
| **联网搜索** | DuckDuckGo + Wikipedia 实时搜索注入 |
| **视觉感知增强** | 截图/图片自动识图，多模态交互 |

### 插件 API

```javascript
// 核心 API 通过 window.GWC_API 访问
const uid = GWC_API.getActiveMirrorId();  // "user_Admin"
const settings = await GWC_API.loadCoreData("live2d_settings_v35");
await GWC_API.saveCoreData("live2d_settings_v35", settings);

// 后端请求
const res = await fetch(`/api/some-endpoint?user_id=${uid}`);
```

### 开发自定义插件 / Create Custom Plugin

1. 在 `mods/` 目录创建 `.js` 文件
2. 使用 IIFE 包裹，避免全局污染
3. 通过 `GWC_API` 或直接 `fetch()` 通信
4. 保存后刷新页面加载

```javascript
// mods/my-plugin.js
(function() {
    console.log("[My Plugin] Loading...");
    const uid = localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'user_Admin';
    // 你的代码...
    console.log("[My Plugin] Ready!");
})();
```

---

## API 参考 / API Reference

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
| POST | `/admin/api/skills/toggle_pack` | Toggle whole pack |
| POST | `/admin/api/skills/approve` | Admin review |

### Voice & TTS

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/asr/transcribe` | Speech-to-text |
| GET | `/api/asr/model-status` | ASR model status |
| POST | `/api/tts_from_pet` | Pet TTS relay |
| GET | `/api/tts_from_pet/poll` | TTS poll |

### OpenCode

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/opencode/run` | Start OpenCode |
| GET | `/api/opencode/poll/{id}` | Poll task status |
| GET | `/api/opencode/stream/{id}` | Get full output |
| POST | `/api/opencode/confirm` | Confirm/Reject action |

### User Data

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/userdata/{id}/core/{key}` | Read core data |
| PUT | `/api/userdata/{id}/core/{key}` | Write core data |
| GET | `/api/userdata/{id}/batch` | Batch read |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/models` | Scan Live2D models |
| GET | `/api/web/search` | Web search (DuckDuckGo) |
| POST | `/api/login-bg` | Upload login page background |
| GET | `/api/login-config` | Get login page config |
| POST | `/api/auto-backup` | Auto backup |

---

## 项目结构 / Project Structure

```
GWC-Pro/
├── backend/                     # Python 后端
│   ├── main.py                  # FastAPI 主入口 (~2500 行)
│   ├── skills_engine.py         # 技能引擎 (BM25 RAG)
│   ├── knowledge_base_engine.py # 知识库 (向量检索 + Rerank)
│   ├── userdata_store.py        # 文件系统数据存储层
│   ├── qq_bot_engine.py         # QQ 机器人桥接
│   ├── requirements.txt         # Python 依赖
│   └── web_static/              # 静态页面 (admin/pet/chat)
├── frontend/                    # React 前端
│   ├── src/
│   │   ├── AppCore.jsx          # 核心逻辑 (~3800 行)
│   │   ├── pages/               # 页面 (Chat/Login/Settings/Title...)
│   │   ├── components/          # 组件 (Settings panels + UI widgets)
│   │   ├── contexts/            # 全局状态上下文
│   │   └── utils/               # 工具函数 (db/auth/api/constants)
│   ├── public/vendor/           # 第三方库 (Live2D/PIXI/MediaPipe)
│   └── vite.config.js           # Vite 构建配置
├── electron-app/                # Electron 桌宠
│   ├── main.js                  # Electron 主进程
│   ├── libs/                    # Live2D + PIXI SDK
│   └── renderer/                # 桌宠 UI (HTML/JS/CSS)
├── mods/                        # 用户插件
├── tupian/                      # 图片资源
├── live2d_models/               # Live2D 模型 (需自行配置)
├── userdata/                    # 用户数据 (运行时生成)
├── WorkSpace/                   # OpenCode 工作区
└── 启动全栈环境.bat              # 一键启动脚本
```

---

## 常见问题 / FAQ

**Q: 后端启动报错 "缺少关键 NLP 库"？**
```bash
pip install jieba rank_bm25
```

**Q: ASR 模型下载失败？**
项目默认使用 `hf-mirror.com`。如失败请设置 `HF_ENDPOINT=https://hf-mirror.com` 或手动下载放入 `backend/asr_model/`。

**Q: 桌宠不显示？**
1. 确认后端已启动（:5201 可访问）
2. 确认 `live2d_models/` 下有 `.model3.json` 模型文件
3. 按 F12 查看 Console 错误

**Q: 前端页面空白？**
先执行 `npm run build`，再通过 `http://127.0.0.1:5201/app` 访问。

**Q: 如何备份？**
设置 → 数据管理 → 导出备份，或手动复制 `userdata/` 目录。

---

## Download / Download

> Out-of-box Release: [GWC-Pro-Release.zip](https://github.com/QiuSui1145/GWC-Pro/releases/download/v1.0.0/GWC-Pro-Release.zip) (652MB)
>
> Includes Python runtime + ASR model + prebuilt frontend + Electron deskpet.

---

## 社区 / Community

- 📺 **BiliBili**：[https://space.bilibili.com/1764510273](https://space.bilibili.com/1764510273)
- 💬 **QQ 群**：**1083739889**
- 🐙 **GitHub**：[https://github.com/QiuSui1145/GWC-Pro](https://github.com/QiuSui1145/GWC-Pro)

### 贡献 / Contributing

欢迎 PR！Fork → Feature branch → Commit → Push → Pull Request。

### 致谢 / Credits

Live2D Cubism SDK · PIXI.js · faster-whisper · FastAPI · React · Electron · Tailwind CSS · GPT-SoVITS · Framer Motion · Lucide Icons · jieba · rank-bm25 · OpenCC · OpenCode

---

<p align="center">
  <b>🌟 如果这个项目对你有帮助，请点亮 Star！ 🌟</b><br>
  <sub>Made with ❤️ by QiuSui1145</sub>
</p>
