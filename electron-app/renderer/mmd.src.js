// ==========================================
// 桌宠 MMD (3D) 渲染引擎
// three.js + MMDLoader + MMDAnimationHelper(含 MMDPhysics/ammo.js) + OutlineEffect
// 提供三渲二(卡通描边)与写实两种渲染方式；暴露 window.mmd 供 renderer.js 调用。
// ==========================================
// 注意：本文件是 ESM 源码，需打包成 IIFE(mmd.bundle.js) 后由 index.html 以普通
// <script> 引入。桌宠页面走 file:// 协议，Chromium 下 ESM 会被 CORS 阻断且静默失败，
// 因此不能直接用 <script type="module"> + importmap。
// 打包命令见 build-mmd.mjs。
import * as THREE from '../libs/three/three.module.js';
import { MMDLoader } from '../libs/three/jsm/loaders/MMDLoader.js';
import { MMDAnimationHelper } from '../libs/three/jsm/animation/MMDAnimationHelper.js';
import { OutlineEffect } from '../libs/three/jsm/effects/OutlineEffect.js';

const POS_BASE_KEY = 'gwc_mmd_position';
const BRIGHT_KEY = 'gwc_mmd_brightness';
const OUTLINE_KEY = 'gwc_mmd_outline';

// 当前加载的模型路径，用于按模型分别保存位置
let currentModelUrl = '';

function posKey() {
  // 用路径尾段（文件名/文件夹）做 key 后缀，不同模型位置互不干扰
  let slug = '';
  try {
    if (currentModelUrl) {
      slug = currentModelUrl.split('/').filter(Boolean).slice(-2).join('/');
      slug = slug.replace(/[^a-zA-Z0-9一-鿿_\-./]/g, '_');
    }
  } catch (e) { slug = ''; }
  return slug ? `${POS_BASE_KEY}_${slug}` : POS_BASE_KEY;
}

let outlineEnabled = (() => {
  try { return localStorage.getItem(OUTLINE_KEY) !== '0'; } catch (e) { return true; }
})();

// 描边粗细缩放：过粗会把鼻子等小面片糊成黑块，默认减半
// 约束求解迭代次数。注意：实测表明对 MMD 模型【调高反而更抖】——
// 因为 MMD 的刚体大量是“跟随骨骼”型，每帧被强制归位，求解器迭代越多
// 就越用力地与之对抗，反而往系统里注入能量。故默认保持 Bullet 原生的 10。
const SOLVER_KEY = 'gwc_mmd_solver';
let solverIterations = (() => {
  try {
    const v = parseInt(localStorage.getItem(SOLVER_KEY), 10);
    return isFinite(v) && v >= 4 ? Math.min(150, v) : 10;
  } catch (e) { return 10; }
})();

function setSolverIterations(v) {
  solverIterations = Math.max(4, Math.min(150, parseInt(v, 10) || 30));
  try { localStorage.setItem(SOLVER_KEY, String(solverIterations)); } catch (e) {}
  applyDamping();
}

// 物理阻尼覆盖值（0 = 沿用模型自带参数）
const DAMPING_KEY = 'gwc_mmd_damping';
let dampingOverride = (() => {
  try {
    const v = parseFloat(localStorage.getItem(DAMPING_KEY));
    return isFinite(v) ? Math.max(0, Math.min(0.99, v)) : 0;
  } catch (e) { return 0; }
})();

// 物理/动画固定更新步长（与渲染帧率解耦，锁定 60Hz）
const FIXED_STEP = 1 / 60;
const MAX_CATCHUP_STEPS = 3;
let physicsAcc = 0;
let engineListenersBound = false; // window 级监听只绑一次（引擎会销毁重建）
let texturesPending = false;      // 是否仍有贴图在加载

// === 演出支持：镜头动画 + 音频 ===
// MMD 镜头 VMD 按透视相机设计，故演出时切换为 PerspectiveCamera，
// 平时仍用正交相机（桌宠需要正面朝向，透视会畸变）。
let perfCamera = null;    // 演出用透视相机（仅在有镜头 VMD 时创建）
let audioCtx = null;      // Web Audio API 上下文（延迟初始化）
let audioSource = null;   // 当前播放的音频源
let audioBuffer = null;   // 已解码的音频缓冲

// 默认站姿手臂下垂角度
const RESTPOSE_KEY = 'gwc_mmd_restpose';
let restPoseAngle = (() => {
  try {
    const v = parseFloat(localStorage.getItem(RESTPOSE_KEY));
    return isFinite(v) ? Math.max(0, Math.min(70, v)) : 30;
  } catch (e) { return 30; }
})();

// 全局亮度：直接对画布做 CSS brightness 滤镜，等价于“屏幕整体变亮”。
// 用乘法所以纯黑仍是纯黑，卡通描边不会被冲淡。
const BRIGHT_GLOBAL_KEY = 'gwc_mmd_global_brightness';
let globalBrightness = (() => {
  try {
    const v = parseFloat(localStorage.getItem(BRIGHT_GLOBAL_KEY));
    return isFinite(v) ? Math.max(0.3, Math.min(3, v)) : 1.35;
  } catch (e) { return 1.35; }
})();

function applyGlobalBrightness() {
  const cv = document.getElementById('mmd-canvas');
  if (!cv) return;
  cv.style.filter = (Math.abs(globalBrightness - 1) < 0.01) ? '' : `brightness(${globalBrightness})`;
}

function setGlobalBrightness(v) {
  globalBrightness = Math.max(0.3, Math.min(3, Number(v)));
  applyGlobalBrightness();
  try { localStorage.setItem(BRIGHT_GLOBAL_KEY, String(globalBrightness)); } catch (e) {}
}

function setRestPoseAngle(v) {
  restPoseAngle = Math.max(0, Math.min(70, Number(v)));
  try { localStorage.setItem(RESTPOSE_KEY, String(restPoseAngle)); } catch (e) {}
  // 仅在静止站姿（无动作）时立即生效
  if (currentMesh && !currentAnim) {
    resetToBindPose(currentMesh);
    applyRestPose(currentMesh, restPoseAngle);
  }
}

const OUTLINE_SCALE_KEY = 'gwc_mmd_outline_scale';
let outlineScale = (() => {
  try {
    const v = parseFloat(localStorage.getItem(OUTLINE_SCALE_KEY));
    return isFinite(v) ? Math.max(0, Math.min(2, v)) : 0.5;
  } catch (e) { return 0.5; }
})();

// 自发光缩放系数，用于修正 MMD 模型在 three.js 下普遍发白的问题
let emissiveScale = (() => {
  try {
    const v = parseFloat(localStorage.getItem(BRIGHT_KEY));
    return isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.2;
  } catch (e) { return 0.2; }
})();

let renderer, effect, scene, camera, clock, helper, loader;
let group = null;          // 承载模型的容器，便于整体平移/缩放
let currentMesh = null;
let currentAnim = null;    // 当前 VMD 动画，切换物理时需要带回
let physicsOn = false;     // 物理是否启用，切换动作时需要保持
let active = false;
let rafId = null;
let renderMode = 'toon';
let ammoReady = false;
let toonLights = [], realLights = [];

// 正交视锥高度（世界单位）。模型按此高度等比缩放，缩放/位移由 group 承担。
const FRUSTUM_H = 30;

function makeOrthoCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const halfH = FRUSTUM_H / 2, halfW = halfH * aspect;
  const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 4000);
  cam.position.set(0, 0, 500); // 拉远以完整包含模型深度
  cam.lookAt(0, 0, 0);
  return cam;
}

function statusEl() { return document.getElementById('mmd-status'); }
function setStatus(msg) { const el = statusEl(); if (el) el.textContent = msg || ''; }

// 面包屑：同步写入 userdata/pet_debug.log。渲染进程硬崩溃时 console 日志会丢失，
// 这条通道能留下“死在哪一步”的证据。
function trace(msg) {
  try { if (window.__petLog) window.__petLog('[MMD] ' + msg); } catch (e) {}
  try { console.log('[MMD] ' + msg); } catch (e) {}
}

function ensureEngine() {
  trace('ensureEngine: 开始');

  // WebGL 渲染器只创建一次，永不销毁。
  // （dispose/forceContextLoss 会导致同 canvas 上建不了新上下文。）
  if (renderer) { trace('ensureEngine: 复用已有渲染器'); return; }

  const canvas = document.getElementById('mmd-canvas');
  if (!canvas) throw new Error('找不到 #mmd-canvas');
  trace('ensureEngine: 创建 WebGLRenderer（第二个 WebGL 上下文）');
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: false });
  trace('ensureEngine: WebGLRenderer 创建成功');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);
  applyGlobalBrightness();

  // window 级监听只绑一次
  if (!engineListenersBound) {
    engineListenersBound = true;
    window.addEventListener('resize', onResize);
    setupInteraction();
  }
  trace('ensureEngine: 完成（渲染循环将在模型加载后启动）');
}

// 每次加载/重载都重建场景（renderer 保持不动）
function ensureScene() {
  // 清理旧场景
  if (scene) {
    for (let i = scene.children.length - 1; i >= 0; i--) scene.remove(scene.children[i]);
  }
  scene = scene || new THREE.Scene();

  effect = new OutlineEffect(renderer, { defaultThickness: 0.0025, defaultColor: [0, 0, 0], defaultAlpha: 0.9 });
  camera = makeOrthoCamera();

  // 两套灯光：卡通用平光（弱阴影，保留赛璐璐感）；写实用强方向光 + 环境
  // 环境光不宜过强：MMD 材质自带 ambient 分量，叠加后极易整体发白
  const toonAmbient = new THREE.AmbientLight(0xffffff, 0.55);
  const toonDir = new THREE.DirectionalLight(0xffffff, 0.7); toonDir.position.set(-0.5, 1, 1).normalize();
  toonLights = [toonAmbient, toonDir];
  const realAmbient = new THREE.AmbientLight(0xffffff, 0.35);
  const realDir = new THREE.DirectionalLight(0xffffff, 1.0); realDir.position.set(0.4, 1, 0.8).normalize();
  const realDir2 = new THREE.DirectionalLight(0x99aaff, 0.35); realDir2.position.set(-0.6, 0.3, -0.7).normalize();
  realLights = [realAmbient, realDir, realDir2];

  applyLights();

  // 用 LoadingManager 追踪贴图加载
  const manager = new THREE.LoadingManager();
  manager.onStart = () => { texturesPending = true; };
  manager.onProgress = (url, loaded, total) => {
    texturesPending = true;
    setStatus(`正在加载贴图 ${loaded}/${total}…`);
    if (loaded === 1 || loaded % 10 === 0) trace(`贴图进度 ${loaded}/${total}`);
  };
  manager.onLoad = () => {
    trace('贴图全部加载完成');
    texturesPending = false;
    setStatus('加载完成');
    if (currentMesh) {
      applyRenderModeToMesh(currentMesh);
      currentMesh.visible = true;
      invalidateHitRegion();
    }
  };
  manager.onError = (url) => trace('资源加载失败: ' + url);
  loader = new MMDLoader(manager);

  clock = new THREE.Clock();
  helper = new MMDAnimationHelper({ afterglow: 2.0 });
  group = new THREE.Group();
  scene.add(group);
}

function applyLights() {
  if (!scene) return; // 引擎已销毁（卸载后）
  toonLights.forEach(l => scene.remove(l));
  realLights.forEach(l => scene.remove(l));
  (renderMode === 'realistic' ? realLights : toonLights).forEach(l => scene.add(l));
}

function onResize() {
  if (!renderer) return;
  const aspect = window.innerWidth / window.innerHeight;
  const halfH = FRUSTUM_H / 2, halfW = halfH * aspect;
  camera.left = -halfW; camera.right = halfW;
  camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  invalidateHitRegion();
}

function animate() {
  // 未激活时彻底停掉循环（而非空转），把 GPU/CPU 完全还给 Live2D
  if (!active) { rafId = null; return; }
  rafId = requestAnimationFrame(animate);
  // 固定步长更新：MMDPhysics 在 delta < unitStep 时会强制按 1/60 推进一步，
  // 于是在 144Hz 等高刷屏上物理会比真实时间快 2 倍以上，表现为头发裙摆疯狂抽动。
  // 这里用累加器把物理/动画锁定在真正的 60Hz，与渲染帧率解耦。
  const delta = Math.min(clock.getDelta(), 0.1); // 限幅，防卡顿后一次补太多步
  if (helper && currentMesh) {
    physicsAcc += delta;
    let steps = 0;
    try {
      while (physicsAcc >= FIXED_STEP && steps < MAX_CATCHUP_STEPS) {
        helper.update(FIXED_STEP);
        physicsAcc -= FIXED_STEP;
        steps++;
      }
      // 落后太多就丢弃积压，避免持续追帧导致雪崩
      if (physicsAcc > FIXED_STEP * MAX_CATCHUP_STEPS) physicsAcc = 0;
    } catch (e) { console.warn('[MMD] 动画/物理更新异常', e); }
  }
  try { render(); } catch (e) { console.warn('[MMD] 渲染异常', e); }
}

function render() {
  // 始终用正交相机渲染桌宠画面。
  // 镜头 VMD 驱动的透视相机仅作后台参考（音频同步等），不参与视觉输出，
  // 否则相机会绕模型运动，在桌宠场景下表现为模型飞出屏幕/忽大忽小。
  if (renderMode === 'toon' && outlineEnabled) effect.render(scene, camera);
  else renderer.render(scene, camera);
}

function setOutline(on) {
  outlineEnabled = !!on;
  try { localStorage.setItem(OUTLINE_KEY, outlineEnabled ? '1' : '0'); } catch (e) {}
}

// 物理阻尼：抖动本质是刚体能量无法耗散而持续振荡，提高阻尼可迅速收敛。
// 0 表示沿用模型 PMX 里自带的阻尼参数，>0 则统一覆盖。
function applyDamping() {
  if (!currentMesh || !helper) { trace('物理调优: 跳过（无模型或引擎已卸载）'); return; }
  const objs = helper.objects.get(currentMesh);
  const physics = objs && objs.physics;
  if (!physics) { trace('物理调优: 跳过（物理未启用）'); return; }

  // 【抖动主因】头发/裙摆是大量关节串联的约束链，Bullet 默认只做 10 次求解迭代，
  // 往往无法收敛，表现为持续抖动。提高迭代次数是 Bullet 里对付关节抖动的正解，
  // 比单纯加阻尼有效得多（阻尼只衰减速度，治不了约束不收敛）。
  try {
    if (physics.world && physics.world.getSolverInfo) {
      const info = physics.world.getSolverInfo();
      if (info.set_m_numIterations) info.set_m_numIterations(solverIterations);
      trace('物理调优: 求解器迭代次数 = ' + solverIterations);
    } else {
      trace('物理调优: 无法访问求解器 (world=' + !!physics.world + ')');
    }
  } catch (e) {
    trace('物理调优: 设置求解器失败 ' + (e && e.message));
  }

  // 阻尼：0 表示沿用模型 PMX 自带参数
  try {
    if (dampingOverride > 0 && physics.bodies) {
      let n = 0;
      physics.bodies.forEach(rb => {
        try {
          if (rb && rb.body && rb.body.setDamping) { rb.body.setDamping(dampingOverride, dampingOverride); n++; }
        } catch (e) {}
      });
      trace('物理调优: 阻尼 ' + dampingOverride + ' 已应用于 ' + n + ' 个刚体');
    } else {
      trace('物理调优: 阻尼=0，沿用模型自带参数（共 ' + (physics.bodies ? physics.bodies.length : 0) + ' 个刚体）');
    }
  } catch (e) {
    trace('物理调优: 设置阻尼失败 ' + (e && e.message));
  }
}

function setDamping(v) {
  dampingOverride = Math.max(0, Math.min(0.99, Number(v)));
  try { localStorage.setItem(DAMPING_KEY, String(dampingOverride)); } catch (e) {}
  applyDamping();
}

function setOutlineScale(v) {
  outlineScale = Math.max(0, Math.min(2, Number(v)));
  applyRenderModeToMesh(currentMesh);
  try { localStorage.setItem(OUTLINE_SCALE_KEY, String(outlineScale)); } catch (e) {}
}

// 依模型包围盒把相机对准模型中部、并把模型缩放到合适高度
function fitModel(mesh) {
  // 先把 group 变换归零，保证测得的包围盒是模型自身尺寸
  group.scale.setScalar(1);
  group.position.set(0, 0, 0);
  group.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);

  // 【重要】绝不缩放 group：MMDPhysics 明确要求 mesh 的世界缩放为 (1,1,1)，
  // 否则它每帧都要临时摘掉父节点做缩放换算，既拖慢又影响物理稳定性（抖动来源之一）。
  // 视觉大小改由正交相机的 zoom 控制——纯投影变换，不触碰模型世界矩阵。
  // 可视高度 = FRUSTUM_H / zoom，令模型高度约占视口 72%。
  camera.zoom = size.y > 0.001 ? (FRUSTUM_H * 0.72) / size.y : 1;
  camera.updateProjectionMatrix();

  // 仅做平移（平移不改变缩放，不会触发上述换算）
  group.position.set(-center.x, -center.y, 0);

  restorePosition();
  invalidateHitRegion();
}

function applyRenderModeToMesh(mesh) {
  if (!mesh) return;
  mesh.traverse(o => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (!m) return;
      // 备份原始值，供反复切换时还原
      if (m.userData._origGradient === undefined) m.userData._origGradient = m.gradientMap || null;
      if (m.userData._origEmissive === undefined) {
        m.userData._origEmissive = m.emissive ? m.emissive.clone() : null;
      }

      // 【发白修正】MMDLoader 会把 PMX 材质的 ambient(环境色) 映射为 emissive(自发光)，
      // 很多模型 ambient 接近纯白，导致模型整体自发光而“洗白”。按系数压低即可恢复正常明暗。
      if (m.emissive && m.userData._origEmissive) {
        m.emissive.copy(m.userData._origEmissive).multiplyScalar(emissiveScale);
      }

      // 【描边黑块修正】MMDLoader 依 PMX 的 edgeSize 为每个材质设定描边粗细。
      // 鼻子这类很小的面片，描边一粗就会把整块糊成黑点。按系数统一缩放即可，
      // 同时保留模型自身“该不该描边”的设定（outlineParameters.visible）。
      const op = m.userData.outlineParameters;
      if (op) {
        if (op._origThickness === undefined) op._origThickness = op.thickness;
        op.thickness = op._origThickness * outlineScale;
      }

      if (renderMode === 'realistic') {
        m.gradientMap = null;          // 关闭 toon 阶梯 → 平滑渐变
        if ('shininess' in m) m.shininess = 30;
      } else {
        m.gradientMap = m.userData._origGradient; // 恢复卡通阶梯
      }
      m.needsUpdate = true;
    });
  });
}

// 亮度/发白修正系数：0=完全去除自发光(最暗最有立体感)，1=模型原始值(最白)
function setBrightness(v) {
  emissiveScale = Math.max(0, Math.min(1, Number(v)));
  applyRenderModeToMesh(currentMesh);
  try { localStorage.setItem(BRIGHT_KEY, String(emissiveScale)); } catch (e) {}
}

async function ensureAmmo() {
  if (ammoReady) return true;
  if (typeof window.Ammo !== 'function') { trace('ensureAmmo: window.Ammo 不是函数，物理不可用'); return false; }
  try {
    // 用 WASM 版 ammo（asm.js 版会在主线程同步编译 1.7MB 并分配 64MB，直接卡死十几秒）。
    // file:// 下无法 fetch .wasm，故借助 Electron 的 Node 能力直接读取二进制，
    // 通过 Emscripten 的 wasmBinary 选项传入，完全跳过网络加载。
    let wasmBinary;
    try {
      const req = window.require; // nodeIntegration 提供；避免被打包器静态解析
      if (req) {
        const fs = req('fs');
        // 从页面 URL 推导绝对路径（比 __dirname 在打包产物中更可靠）
        let p = new URL('../libs/three/jsm/libs/ammo.wasm.wasm', window.location.href).pathname;
        p = decodeURIComponent(p);
        if (/^\/[A-Za-z]:/.test(p)) p = p.slice(1); // Windows: /D:/... -> D:/...
        wasmBinary = fs.readFileSync(p);
        trace('ensureAmmo: 已读取 ammo.wasm.wasm (' + wasmBinary.length + ' 字节)');
      }
    } catch (e) {
      trace('ensureAmmo: 读取 wasm 失败，回退默认加载方式 ' + (e && e.message));
    }

    trace('ensureAmmo: 开始实例化 ammo');
    const inst = wasmBinary ? window.Ammo({ wasmBinary }) : window.Ammo();
    window.Ammo = (inst && typeof inst.then === 'function') ? await inst : inst;
    ammoReady = true;
    trace('ensureAmmo: 实例化完成');
    return true;
  } catch (e) {
    console.warn('[MMD] ammo 初始化失败', e);
    trace('ensureAmmo: 失败 ' + (e && e.message));
    return false;
  }
}

// ===================== 演出镜头动画 =====================
// MMD 镜头 VMD 由 author 按透视相机编排（包含 position / target / fov / roll）。
// 演出期间切换到 PerspectiveCamera 以获得正确的构图，演出结束恢复正交。
function createPerfCamera() {
  if (perfCamera) return perfCamera;
  const aspect = window.innerWidth / window.innerHeight;
  perfCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 4000);
  perfCamera.position.set(0, 0, 35);
  perfCamera.isCamera = true; // 供 MMDLoader.loadAnimation 识别
  return perfCamera;
}

async function loadCameraAnimation(vmdUrl) {
  if (!vmdUrl) { clearCameraAnimation(); return; }
  // 卸载旧镜头动画（helper 只允许挂一个 Camera）
  clearCameraAnimation();
  trace('loadCameraAnimation: ' + vmdUrl);
  try {
    const cam = createPerfCamera();
    const clip = await new Promise((resolve, reject) => {
      loader.loadAnimation(vmdUrl, cam, resolve, undefined, reject);
    });
    if (!clip) { trace('loadCameraAnimation: 镜头 VMD 无关键帧，跳过'); return false; }
    // 重新获取相机（异步期间可能已被清除）
    if (!perfCamera) return false;
    helper.add(perfCamera, { animation: clip });
    trace('loadCameraAnimation: 镜头动画已挂载');
    return true;
  } catch (e) {
    trace('loadCameraAnimation: 失败 ' + (e && e.message));
    clearCameraAnimation();
    return false;
  }
}

function clearCameraAnimation() {
  if (!perfCamera) return;
  try { helper.remove(perfCamera); } catch (e) {}
  perfCamera = null;
  trace('clearCameraAnimation: 已清除镜头动画');
}

// ===================== 演出音频 =====================
async function loadAudioFile(url) {
  if (!url) { stopAudio(); return; }
  trace('loadAudioFile: ' + url);
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // 暂停中的 AudioContext 需先恢复（浏览器自动播放策略）
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const arrayBuf = await resp.arrayBuffer();
    audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
    trace('loadAudioFile: 已解码，时长 ' + audioBuffer.duration.toFixed(1) + ' 秒');
  } catch (e) {
    console.warn('[MMD] 加载音频失败', e);
    trace('loadAudioFile: 失败 ' + (e && e.message));
    audioBuffer = null;
  }
}

function playAudio() {
  if (!audioBuffer || !audioCtx) return;
  stopAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  audioSource = audioCtx.createBufferSource();
  audioSource.buffer = audioBuffer;
  audioSource.connect(audioCtx.destination);
  audioSource.start(0);
  trace('playAudio: 开始播放');
}

function stopAudio() {
  if (audioSource) {
    try { audioSource.stop(); } catch (e) {}
    audioSource.disconnect();
    audioSource = null;
  }
}

function clearCurrent() {
  if (currentMesh) {
    try { helper.remove(currentMesh); } catch (e) {}
    group.remove(currentMesh);
    currentMesh.traverse(o => {
      if (o.isMesh) {
        if (o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => m && m.dispose && m.dispose());
      }
    });
    currentMesh = null;
  }
}

// 物理参数：
// - warmup 是同步循环（连跑 N 步模拟）。默认 60 在 asm.js 版 ammo 上会卡死主线程；
//   换用 wasm 后单步开销极小，保留少量预热可让头发裙摆一开始就处于自然下垂状态，
//   避免从零位猛地弹开。
// - maxStepNum 控制单帧允许的最大子步数。设为 1 会让模拟无法稳定收敛（抖动），
//   保持默认的 3 更稳；单帧总开销已由上层固定步长累加器兜住。
function physicsParams(extra) {
  return Object.assign({ warmup: 12, maxStepNum: 3, unitStep: FIXED_STEP }, extra);
}

function loadPromise(url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}
function loadAnimPromise(url, mesh) {
  return new Promise((resolve, reject) => loader.loadAnimation(url, mesh, resolve, undefined, reject));
}

async function load(pmxUrl, vmdUrl, opts = {}) {
  const cameraUrl = opts.cameraUrl || null;
  const audioUrl = opts.audioUrl || null;
  trace(`load: 开始 model=${pmxUrl} motion=${vmdUrl || '无'} camera=${cameraUrl || '无'} audio=${audioUrl || '无'} mode=${opts.renderMode} physics=${opts.physics}`);
  currentModelUrl = pmxUrl || '';
  ensureEngine();
  ensureScene();
  renderMode = opts.renderMode || renderMode;
  const wantPhysics = opts.physics === true; // 物理默认关闭，确认模型能显示后再手动开启
  setStatus('正在加载 MMD 模型…');
  try {
    if (wantPhysics) { trace('load: 初始化 ammo 物理引擎'); await ensureAmmo(); trace('load: ammo 就绪=' + ammoReady); }
    trace('load: 开始解析 PMX（大模型可能耗时较久）');
    const mesh = await loadPromise(pmxUrl);
    trace('load: PMX 解析完成');
    clearCurrent();
    currentMesh = mesh;
    group.add(mesh);
    trace('load: 应用渲染模式 ' + renderMode);
    applyRenderModeToMesh(mesh);
    applyLights();
    fitModel(mesh);
    trace('load: 模型已适配（缩放/居中）');

    const physics = wantPhysics && ammoReady;
    physicsOn = physics;
    if (vmdUrl) {
      setStatus('正在加载动作…');
      trace('load: 解析 VMD 动作');
      currentAnim = await loadAnimPromise(vmdUrl, mesh);
      trace('load: VMD 解析完成，构建动画/物理（physics=' + physics + '）');
      helper.add(mesh, physicsParams({ animation: currentAnim, physics }));
    } else {
      currentAnim = null;
      trace('load: 构建动画/物理（physics=' + physics + '）');
      applyRestPose(mesh, restPoseAngle); // 默认站姿：双手自然垂落
      helper.add(mesh, physicsParams({ physics }));
    }
    trace('load: helper.add 完成');

    // 镜头动画
    if (cameraUrl) {
      trace('load: 加载镜头 VMD');
      await loadCameraAnimation(cameraUrl);
    }

    // 音频预加载
    if (audioUrl) {
      trace('load: 预加载音频');
      await loadAudioFile(audioUrl);
    }

    // 显示 MMD 层，隐藏 Live2D 层
    document.getElementById('mmd-canvas').style.display = 'block';
    const l2d = document.getElementById('canvas'); if (l2d) l2d.style.display = 'none';
    active = true;
    clock.getDelta();
    physicsAcc = 0;
    if (physics) applyDamping();
    if (rafId === null) animate(); // 启动渲染循环

    // 演出包：音频与动画同步开始
    if (audioUrl && audioBuffer) playAudio();

    setStatus(`已加载${vmdUrl ? '（含动作）' : ''}${cameraUrl ? ' + 镜头' : ''}${audioUrl ? ' + 音频' : ''}${physics ? ' + 物理' : ''}`);
    trace('load: ✅ 全部完成，模型已显示');

    // 贴图未齐时材质只有描边/纯色，观感很差（高清模型可能要十几秒）。
    // 因此先隐藏模型，等 LoadingManager.onLoad 到齐后再显示；
    // 若该模型压根没有贴图（onLoad 不会触发），1.5 秒后兜底显示。
    mesh.visible = false;
    setTimeout(() => {
      if (currentMesh === mesh && !texturesPending) {
        mesh.visible = true;
        applyRenderModeToMesh(mesh);
        invalidateHitRegion();
      }
    }, 1500);
    // 兜底：极端情况下贴图事件异常，也不能让模型永远不显示
    setTimeout(() => { if (currentMesh === mesh && !mesh.visible) { mesh.visible = true; trace('贴图超时，强制显示模型'); } }, 60000);
  } catch (e) {
    // console.error 会被主进程捕获并写入 userdata/pet_debug.log，便于无 DevTools 时诊断
    const detail = e && (e.stack || e.message) ? (e.stack || e.message) : String(e);
    console.error(`[MMD] 加载失败 model=${pmxUrl} motion=${vmdUrl || '无'} :: ${detail}`);
    setStatus('加载失败：' + (e && e.message ? e.message : e));
    throw e;
  }
}

function unload() {
  active = false; // 使渲染循环在下一帧自行停止
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }

  // 停止并清理音频
  stopAudio();
  audioBuffer = null;

  // 清理镜头动画
  clearCameraAnimation();

  clearCurrent();
  currentAnim = null;
  hitBox2D = null;

  // 不销毁 renderer / scene。下一轮 load 时 ensureEngine 复用 renderer，
  // ensureScene 清空 scene 子节点后重建内容。
  camera = null; helper = null; loader = null; group = null; clock = null;
  perfCamera = null; audioBuffer = null; audioSource = null;

  const mc = document.getElementById('mmd-canvas'); if (mc) mc.style.display = 'none';
  const l2d = document.getElementById('canvas'); if (l2d) l2d.style.display = 'block';
  setStatus('已卸载，返回 Live2D');
  trace('unload: 已清场并返回 Live2D');
}

function setRenderMode(mode) {
  renderMode = (mode === 'realistic') ? 'realistic' : 'toon';
  applyRenderModeToMesh(currentMesh);
  applyLights();
}

// MMD 标准手臂骨骼名（含常见英文命名的模型）
const ARM_BONE_NAMES = ['左腕', '右腕', 'arm_L', 'arm_R', 'Left arm', 'Right arm', '左肩', '右肩'];
const ARM_MAIN = ['左腕', '右腕', 'arm_L', 'arm_R', 'Left arm', 'Right arm'];

// 把骨骼与表情复位到绑定姿势。
// 【关键】切换动作时必须做这一步：新动作没有关键帧的骨骼会保留上一个动作的姿势，
// 所以从“躺”切到别的动作时，模型会继续躺着。
function resetToBindPose(mesh) {
  if (!mesh) return;
  try {
    if (typeof mesh.pose === 'function') mesh.pose();          // 骨骼回到绑定姿势
    else if (mesh.skeleton && mesh.skeleton.pose) mesh.skeleton.pose();
    mesh.traverse(o => {
      if (o.isMesh && o.morphTargetInfluences) {
        for (let i = 0; i < o.morphTargetInfluences.length; i++) o.morphTargetInfluences[i] = 0; // 清除上个动作的表情
      }
    });
    mesh.updateMatrixWorld(true);
  } catch (e) { trace('resetToBindPose 异常: ' + (e && e.message)); }
}

// 默认站姿：让双手自然垂落。
// MMD 模型的绑定姿势多为 A/T 姿势（手臂外张），静止时看起来很别扭。
// 这里把手臂骨骼朝“世界下方”旋转指定角度——用方向叉乘求旋转轴，
// 因此不依赖模型的坐标系朝向与左右命名习惯，正负号不会搞反。
function applyRestPose(mesh, angleDeg) {
  if (!mesh || !mesh.skeleton || !(angleDeg > 0)) return;
  const angle = angleDeg * Math.PI / 180;
  const down = new THREE.Vector3(0, -1, 0);
  mesh.updateMatrixWorld(true);
  let n = 0;
  mesh.skeleton.bones.forEach(bone => {
    if (!ARM_MAIN.includes(bone.name)) return;
    const child = bone.children.find(c => c.isBone);
    if (!child) return;
    const bw = new THREE.Vector3(), cw = new THREE.Vector3();
    bone.getWorldPosition(bw); child.getWorldPosition(cw);
    const dir = cw.sub(bw);
    if (dir.lengthSq() < 1e-8) return;
    dir.normalize();
    const axis = new THREE.Vector3().crossVectors(dir, down);
    if (axis.lengthSq() < 1e-8) return; // 已经朝下，无需旋转
    axis.normalize();
    // 世界空间旋转轴 → 骨骼父空间
    const pq = new THREE.Quaternion();
    if (bone.parent) bone.parent.getWorldQuaternion(pq);
    const axisLocal = axis.applyQuaternion(pq.invert()).normalize();
    bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axisLocal, angle));
    bone.updateMatrixWorld(true);
    n++;
  });
  if (n) { mesh.updateMatrixWorld(true); trace(`applyRestPose: 已放下 ${n} 根手臂骨骼 (${angleDeg}°)`); }
  else trace('applyRestPose: 未找到标准手臂骨骼，跳过');
}

// 只替换动作，不重新加载模型与贴图。
// 高清模型贴图要十几秒，切动作若走完整重载会难以忍受，故必须走这条轻量路径。
// 第二个参数可选：{ cameraUrl, audioUrl } 用于演出包切换。
async function setMotion(vmdUrl, perfOpts) {
  const cameraUrl = perfOpts && perfOpts.cameraUrl || null;
  const audioUrl = perfOpts && perfOpts.audioUrl || null;
  if (!currentMesh) { trace('setMotion: 无模型，忽略'); return false; }
  const mesh = currentMesh;
  try {
    // 先停音频，避免上个演出的声音继续播放
    stopAudio();

    if (vmdUrl) {
      trace('setMotion: 加载动作 ' + vmdUrl);
      setStatus('正在加载动作…');
      const anim = await loadAnimPromise(vmdUrl, mesh);
      if (currentMesh !== mesh) return false; // 加载期间模型已被换掉
      currentAnim = anim;
      helper.remove(mesh);
      resetToBindPose(mesh); // 先清掉上个动作残留的姿势（否则”躺”会带到下一个动作）
      helper.add(mesh, physicsParams({ animation: anim, physics: physicsOn }));
    } else {
      trace('setMotion: 停止动作');
      currentAnim = null;
      helper.remove(mesh);
      resetToBindPose(mesh);
      applyRestPose(mesh, restPoseAngle); // 无动作时恢复自然站姿（双手垂落）
      helper.add(mesh, physicsParams({ physics: physicsOn }));
    }

    // 镜头动画
    if (cameraUrl) {
      await loadCameraAnimation(cameraUrl);
    } else {
      // 无镜头 VMD → 清除镜头，恢复正交相机
      clearCameraAnimation();
    }

    // 音频
    if (audioUrl) {
      await loadAudioFile(audioUrl);
      playAudio(); // 与动作同步开始
    }

    clock.getDelta();
    physicsAcc = 0;
    applyDamping();
    // 每次切换动作自动把模型方向回正（动作大多是面向正前方编排的）
    resetRotation();
    setStatus(vmdUrl ? '动作已切换' : '已停止动作');
    trace('setMotion: 完成，方向已回正');
    return true;
  } catch (e) {
    console.error('[MMD] 切换动作失败', e);
    trace('setMotion: 失败 ' + (e && e.message));
    setStatus('动作加载失败');
    return false;
  }
}

async function setPhysics(on) {
  if (!currentMesh) return;
  trace('setPhysics: ' + on);
  if (on) await ensureAmmo();
  try {
    physicsOn = !!on && ammoReady;
    helper.remove(currentMesh);
    // 重新 add 时必须带回原动作，否则切换物理会把 VMD 动画丢掉
    const opts = { physics: physicsOn };
    if (currentAnim) opts.animation = currentAnim;
    helper.add(currentMesh, physicsParams(opts));
    clock.getDelta(); // 丢弃切换期间累积的时间，避免首帧大 delta
    physicsAcc = 0;
    applyDamping();
    trace('setPhysics: 完成 physics=' + (!!on && ammoReady));
  } catch (e) {
    console.warn('[MMD] 切换物理失败', e);
    trace('setPhysics: 失败 ' + (e && e.message));
  }
}

// ---------- 交互：拖拽平移、滚轮缩放、位置持久化 ----------
// 正交投影下屏幕像素与世界单位是固定比例（与深度无关），换算精确
function worldPerPixel() {
  return ((camera.top - camera.bottom) / camera.zoom) / window.innerHeight;
}

function savePosition() {
  try {
    localStorage.setItem(posKey(), JSON.stringify({
      x: group.position.x, y: group.position.y, zoom: camera.zoom, rotY: group.rotation.y
    }));
  } catch (e) {}
}

// 方向回正：把模型转回正面朝向用户
function resetRotation(save = true) {
  if (!group) return;
  group.rotation.y = 0;
  invalidateHitRegion();
  if (save) savePosition();
}
function restorePosition() {
  try {
    const raw = localStorage.getItem(posKey());
    if (!raw) return;
    const p = JSON.parse(raw);
    if (typeof p.x === 'number' && isFinite(p.x)) group.position.x = p.x;
    if (typeof p.y === 'number' && isFinite(p.y)) group.position.y = p.y;
    if (typeof p.zoom === 'number' && isFinite(p.zoom) && p.zoom > 0.01) {
      camera.zoom = Math.max(0.05, Math.min(50, p.zoom));
      camera.updateProjectionMatrix();
    }
    if (typeof p.rotY === 'number' && isFinite(p.rotY)) group.rotation.y = p.rotY;
  } catch (e) {}
}
function resetPosition() {
  if (!currentMesh) return;
  try { localStorage.removeItem(posKey()); } catch (e) {}
  fitModel(currentMesh); // 重新按当前视口居中并复位缩放
  resetRotation(false);  // 一并回正朝向
  savePosition();
}

function setupInteraction() {
  let dragging = false, rotating = false, lastX = 0, lastY = 0;
  window.addEventListener('mousedown', (e) => {
    if (!active) return;
    if (!hitTest(e.clientX, e.clientY)) return;
    if (e.button === 2) {
      // 右键按住拖动 = 绕 Y 轴自由旋转（360°）。
      // 只绕 Y 轴是有意为之：重力方向不变，物理表现不受影响。
      rotating = true;
    } else if (e.button === 0) {
      dragging = true;
    } else return;
    lastX = e.clientX; lastY = e.clientY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!active) return;
    if (rotating) {
      // 横向拖动一屏宽 ≈ 转一整圈
      group.rotation.y += ((e.clientX - lastX) / window.innerWidth) * Math.PI * 2;
      lastX = e.clientX; lastY = e.clientY;
      invalidateHitRegion();
      return;
    }
    if (!dragging) return;
    const wpp = worldPerPixel();
    group.position.x += (e.clientX - lastX) * wpp;
    group.position.y -= (e.clientY - lastY) * wpp;
    lastX = e.clientX; lastY = e.clientY;
    invalidateHitRegion(); // 位置变了，命中区立即失效
  });
  window.addEventListener('mouseup', () => {
    if (dragging || rotating) { dragging = false; rotating = false; savePosition(); invalidateHitRegion(); }
  });
  window.addEventListener('wheel', (e) => {
    if (!active) return;
    if (!hitTest(e.clientX, e.clientY)) return;
    const f = e.deltaY > 0 ? 0.94 : 1.06;
    // 缩放走相机 zoom，保持模型世界缩放为 1（物理要求）
    camera.zoom = Math.max(0.05, Math.min(50, camera.zoom * f));
    camera.updateProjectionMatrix();
    savePosition();
    invalidateHitRegion();
  }, { passive: true });
}

// 命中检测：绝不能用 raycaster 逐三角求交——MMD 是数万面的蒙皮网格，
// 以 20Hz 调用会直接卡死主线程，进而让鼠标穿透卡在“不穿透”，
// 导致全屏透明窗口夺走整个桌面的鼠标。这里改为把包围盒 8 个角投影到
// 屏幕求 2D 包围框，成本 O(8)，并做 250ms 缓存。
let hitBox2D = null, lastHitCalc = 0;

function invalidateHitRegion() { hitBox2D = null; }

function computeHitRegion() {
  hitBox2D = null;
  if (!currentMesh) return;
  const box = new THREE.Box3().setFromObject(currentMesh); // 用几何体缓存的包围盒，不遍历顶点
  if (!isFinite(box.min.x) || !isFinite(box.max.x)) return;
  const W = window.innerWidth, H = window.innerHeight;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const v = new THREE.Vector3();
  const cam = camera;
  for (let i = 0; i < 8; i++) {
    v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
    v.project(cam);
    const sx = (v.x + 1) / 2 * W, sy = (-v.y + 1) / 2 * H;
    if (sx < minX) minX = sx; if (sx > maxX) maxX = sx;
    if (sy < minY) minY = sy; if (sy > maxY) maxY = sy;
  }
  if (!isFinite(minX) || !isFinite(minY)) return;
  hitBox2D = { minX, minY, maxX, maxY };
}

function hitTest(cssX, cssY) {
  try {
    if (!active || !currentMesh) return false;
    const now = (performance && performance.now) ? performance.now() : Date.now();
    if (!hitBox2D || now - lastHitCalc > 250) { computeHitRegion(); lastHitCalc = now; }
    if (!hitBox2D) return false;
    return cssX >= hitBox2D.minX && cssX <= hitBox2D.maxX && cssY >= hitBox2D.minY && cssY <= hitBox2D.maxY;
  } catch (e) {
    console.warn('[MMD] hitTest 异常，按未命中处理以保证鼠标穿透', e);
    return false; // 故障安全：出错时一律判定未命中 → 保持穿透，绝不锁死桌面
  }
}

console.log('[MMD] 渲染引擎脚本已加载，three.js r' + THREE.REVISION);

window.mmd = {
  isActive: () => active,
  hitTest,
  load,
  unload,
  setRenderMode,
  setPhysics,
  resetPosition,
  setBrightness,
  getBrightness: () => emissiveScale,
  setOutline,
  getOutline: () => outlineEnabled,
  setOutlineScale,
  getOutlineScale: () => outlineScale,
  setDamping,
  getDamping: () => dampingOverride,
  setSolverIterations,
  getSolverIterations: () => solverIterations,
  setMotion,
  resetRotation,
  getRotation: () => (group ? group.rotation.y : 0),
  setGlobalBrightness,
  getGlobalBrightness: () => globalBrightness,
  setRestPoseAngle,
  getRestPoseAngle: () => restPoseAngle,
  hasPerfCamera: () => !!perfCamera,
  // 重新渲染：完全丢弃当前模型与材质缓存后重新加载（贴图异常/显示不正常时使用）
  reload: async (pmxUrl, vmdUrl, opts) => {
    trace('reload: 重新渲染模型');
    clearCurrent();
    currentAnim = null;
    texturesPending = false;
    stopAudio();
    audioBuffer = null;
    clearCameraAnimation();
    return load(pmxUrl, vmdUrl, opts);
  },
};
