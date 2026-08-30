import React from 'react';
import { User, Heart, Code, Package } from 'lucide-react';

export default function AboutTab() {
  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in p-2 md:p-4">
      <h2 className="text-xl md:text-2xl font-black text-[#ba3f42] tracking-widest mb-6">关于 GWC</h2>

      <div className="bg-white rounded-2xl border border-[#e6d5b8] shadow-sm overflow-hidden p-6 md:p-8">
        <div className="mb-10">
          <h4 className="text-sm md:text-base font-bold text-[#ba3f42] mb-4 flex items-center gap-2">
            <User size={18} /> 开发者名单
          </h4>
          <div className="w-full text-xs md:text-sm text-[#4a4036]">
            <div className="flex bg-[#fdfaf5] p-3 rounded-t-lg font-bold text-[#7a6b5d] border-b border-[#e6d5b8]">
              <span className="w-12 md:w-16 text-center">序号</span>
              <span className="w-24 md:w-48 px-2 md:px-4">开发者名称</span>
              <span className="flex-1 text-right md:text-left">主要贡献</span>
            </div>
            <div className="flex p-3 items-center bg-white border-b border-[#f0ebe1]">
              <span className="w-12 md:w-16 text-center font-bold text-[#ba3f42]">01</span>
              <span className="w-24 md:w-48 px-2 md:px-4 font-bold text-[#4a4036]">【QYS】</span>
              <span className="flex-1 text-[#7a6b5d] text-right md:text-left">【架构设计 + 全栈开发 + Bug修复】</span>
            </div>
            <div className="flex p-3 items-center bg-[#fdfcf8] border-b border-[#f0ebe1]">
              <span className="w-12 md:w-16 text-center font-bold text-[#ba3f42]">02</span>
              <span className="w-24 md:w-48 px-2 md:px-4 font-bold text-[#4a4036]">【Mimo&Deepseek】</span>
              <span className="flex-1 text-[#7a6b5d] text-right md:text-left">【Live2D 动效】</span>
            </div>
            <div className="flex p-3 items-center">
              <span className="w-12 md:w-16 text-center font-bold text-[#ba3f42]">03</span>
              <span className="w-24 md:w-48 px-2 md:px-4 font-bold text-[#4a4036]">【Gemini-3/3.1-Pro/Claude】</span>
              <span className="flex-1 text-[#7a6b5d] text-right md:text-left">【海量Bug修复】</span>
            </div>
          </div>
        </div>

        <div className="mb-10">
          <h4 className="text-sm md:text-base font-bold text-[#ba3f42] mb-4 flex items-center gap-2">
            <Package size={18} /> 开源依赖
          </h4>
          <div className="space-y-4">
            {/* 前端框架 */}
            <div className="bg-gradient-to-r from-[#fdfcf8] to-white p-4 rounded-xl border border-[#f0ebe1]">
              <h5 className="text-xs font-bold text-[#7a6b5d] mb-2 uppercase tracking-wide">前端框架</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#4a4036]">
                <div><span className="font-bold text-[#ba3f42]">React 19</span> — UI 框架</div>
                <div><span className="font-bold text-[#ba3f42]">Vite 8</span> — 构建工具</div>
                <div><span className="font-bold text-[#ba3f42]">Tailwind CSS 4</span> — 样式框架</div>
                <div><span className="font-bold text-[#ba3f42]">React Router 7</span> — 路由管理</div>
                <div><span className="font-bold text-[#ba3f42]">Framer Motion 12</span> — 动画库</div>
                <div><span className="font-bold text-[#ba3f42]">Lucide React</span> — 图标库</div>
              </div>
            </div>

            {/* 后端框架 */}
            <div className="bg-gradient-to-r from-[#fdfcf8] to-white p-4 rounded-xl border border-[#f0ebe1]">
              <h5 className="text-xs font-bold text-[#7a6b5d] mb-2 uppercase tracking-wide">后端框架</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#4a4036]">
                <div><span className="font-bold text-[#ba3f42]">FastAPI</span> — 异步 Web 框架</div>
                <div><span className="font-bold text-[#ba3f42]">Uvicorn</span> — ASGI 服务器</div>
                <div><span className="font-bold text-[#ba3f42]">Pydantic</span> — 数据验证</div>
                <div><span className="font-bold text-[#ba3f42]">httpx</span> — 异步 HTTP 客户端</div>
                <div><span className="font-bold text-[#ba3f42]">WebSockets</span> — 实时通信</div>
                <div><span className="font-bold text-[#ba3f42]">pywebview</span> — 跨平台 WebView</div>
              </div>
            </div>

            {/* AI & NLP */}
            <div className="bg-gradient-to-r from-[#fdfcf8] to-white p-4 rounded-xl border border-[#f0ebe1]">
              <h5 className="text-xs font-bold text-[#7a6b5d] mb-2 uppercase tracking-wide">AI & NLP</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#4a4036]">
                <div><span className="font-bold text-[#ba3f42]">OpenCode</span> — Agent框架</div>
                <div><span className="font-bold text-[#ba3f42]">OpenAI SDK</span> — LLM 接口</div>
                <div><span className="font-bold text-[#ba3f42]">faster-whisper</span> — 语音识别</div>
                <div><span className="font-bold text-[#ba3f42]">jieba</span> — 中文分词</div>
                <div><span className="font-bold text-[#ba3f42]">rank_bm25</span> — 文本检索</div>
                <div><span className="font-bold text-[#ba3f42]">opencc-python</span> — 繁简转换</div>
                <div><span className="font-bold text-[#ba3f42]">soundfile & numpy</span> — 音频处理</div>
              </div>
            </div>

            {/* Live2D & 桌宠 */}
            <div className="bg-gradient-to-r from-[#fdfcf8] to-white p-4 rounded-xl border border-[#f0ebe1]">
              <h5 className="text-xs font-bold text-[#7a6b5d] mb-2 uppercase tracking-wide">Live2D & 桌宠</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#4a4036]">
                <div><span className="font-bold text-[#ba3f42]">Electron 28</span> — 桌面应用框架</div>
                <div><span className="font-bold text-[#ba3f42]">PixiJS 7</span> — 2D 渲染引擎</div>
                <div><span className="font-bold text-[#ba3f42]">pixi-live2d-display</span> — Live2D 集成</div>
                <div><span className="font-bold text-[#ba3f42]">Live2D Cubism Core</span> — Live2D 核心</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm md:text-base font-bold text-[#ba3f42] mb-4 flex items-center gap-2">
            <Heart size={18} /> 特别鸣谢
          </h4>
          <div className="space-y-3 text-xs md:text-sm text-[#7a6b5d] leading-relaxed">
            <p>
              感谢所有为 GWC 项目做出贡献的开发者和用户。GWC 是一个开源的 <span className="font-bold text-[#ba3f42]">GalGame风味AI聊天平台</span> 项目，
              旨在提供一个集 <span className="font-bold">Live2D 桌面宠物</span>、<span className="font-bold">AI 聊天</span>、
              <span className="font-bold">TTS 语音合成</span>、<span className="font-bold">知识库检索</span>、<span className="font-bold">AI Agent</span> 为一体的一站式解决方案。
            </p>
            <p className="pt-2 border-t border-[#f0ebe1]">
              本项目基于 <span className="font-bold text-[#ba3f42]">GPL 协议</span> 开源，感谢上述所有开源项目的维护者和贡献者。
              如有遗漏或版权问题，请通过 GitHub Issues 联系我们。
            </p>
            <div className="pt-3 flex items-center gap-2 text-[#ba3f42]">
              <Code size={16} />
              <a href="https://github.com/QiuSui1145/GWC-Pro" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">
                GitHub 仓库
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
