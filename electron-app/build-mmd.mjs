// ==========================================
// 打包桌宠 MMD 渲染引擎：ESM 源 -> 单文件 IIFE
//
// 为什么必须打包：桌宠窗口用 loadFile() 以 file:// 协议加载，Chromium 下
// ES module 会因 CORS(origin=null) 被阻断且静默失败，importmap 同样不可用。
// 打成传统 IIFE 后用普通 <script> 引入即可正常工作。
//
// 用法：node build-mmd.mjs        （在 electron-app 目录下执行）
// 依赖：使用 frontend/node_modules 里的 rolldown（vite 8 的打包内核）
// ==========================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIBS = path.join(__dirname, 'libs', 'three');
const INPUT = path.join(__dirname, 'renderer', 'mmd.src.js');
const OUTPUT = path.join(__dirname, 'renderer', 'mmd.bundle.js');

// 从 frontend/node_modules 加载 rolldown
const require = createRequire(path.join(__dirname, '..', 'frontend', 'node_modules', 'index.js'));
const { rolldown } = require('rolldown');

// three 的 jsm 模块内部用裸标识符 'three' 引入核心库，需解析到本地文件
const aliasThree = {
  name: 'alias-three',
  resolveId(source) {
    if (source === 'three') return path.join(LIBS, 'three.module.js');
    if (source.startsWith('three/addons/')) {
      return path.join(LIBS, 'jsm', source.slice('three/addons/'.length));
    }
    return null;
  },
};

const bundle = await rolldown({
  input: INPUT,
  plugins: [aliasThree],
});

await bundle.write({
  file: OUTPUT,
  format: 'iife',
  name: 'GWCMMDBundle',
});

await bundle.close();
console.log('✅ 已生成', path.relative(__dirname, OUTPUT));
