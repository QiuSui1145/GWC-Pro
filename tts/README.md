# 内置配音 (GPT-SoVITS)

供 GWC 的「内置配音」功能使用的**推理最小集**，从完整的 GPT-SoVITS 安装精简而来。
**来源目录不会被修改**，仍可独立使用（含训练、WebUI）。

## 分发说明（重要）

为控制分发体积，**本目录的内容不随程序分发**（见 `.gitignore`）。
用户首次开启内置配音时，在设置里从本机已安装的 GPT-SoVITS **一键导入**：

> 设置 → 声音设定 → 开启「🎙️ 内置配音」→ 扫描本机 GPT-SoVITS → 勾选音色 → 开始导入

导入只复制推理必需的文件，并按所选音色自动判断需要哪些底模
（例如只选 v2ProPlus 音色时，不会复制 v4 的 788MB 底模）。
实测：单音色约 **2.85GB / 4 秒**（本机磁盘复制，无需联网）。

因此分发包本体只含代码与安装器，不含这数 GB 的模型。

## 目录结构

```
tts/
  server/                    推理服务（约 3.3GB）
    api_v2.py                GPT-SoVITS 原版 API + GWC 扩展端点
    gwc_voices.py            音色扫描/配对（GWC 新增）
    GPT_SoVITS/              推理核心 + 底模 + 文本前端
    tools/                   i18n 与音频超分
  models/                    音色权重（约 2.5GB）
    gpt/                     *.ckpt
    sovits/                  *.pth
  ref_audio/                 参考音频
  start_tts.bat              手动启动（也可在设置里一键启动）
  copy_tts.py                从原目录重新生成本目录
```

## 运行时是共享的

为节省约 6.6GB，**Python 运行时不复制**，而是共享原 GPT-SoVITS 安装：

```
D:\GPT-SoVITS\GPT-SoVITS-v2pro-20250604\runtime\python.exe
```

若该目录被移动或删除，内置配音将无法启动。此时可设置环境变量指向新的 runtime：

```
set GWC_SOVITS_RUNTIME=X:\path\to\runtime\python.exe
```

## 使用

**推荐**：GWC 设置 → 声音设定 → 打开「🎙️ 内置配音」，点「启动」，随后选择音色。
首次启动需加载模型，约 10–60 秒。

**手动**：双击 `start_tts.bat`，服务监听 `127.0.0.1:9880`，与设置里的 API URL 模板一致。

## 添加音色

把训练好的权重放入对应目录即可，命名沿用 GPT-SoVITS 训练产物的习惯：

- GPT：`models/gpt/<角色>-e<轮数>.ckpt`
- SoVITS：`models/sovits/<角色>_e<轮数>_s<步数>.pth`

角色名相同的两个文件会自动配对成一个音色；同角色有多个轮次时默认取轮数最大的。
**两者缺一则该音色显示为「权重不全」且不可选。**

## 精简掉了什么

不影响推理的部分未复制：训练脚本与 WebUI、`logs/`（训练日志 3.2GB）、
`tools/asr` 与 `tools/uvr5`（语音识别/人声分离，仅训练用，1.8GB）、
以及 v1/v2/v3 专用底模。

因此 `tts_infer.yaml` 中仅 `custom`、`v2Pro`、`v2ProPlus`、`v4` 可用；
**切换到 v1/v2/v3 会因缺少底模而失败**。当前音色均为 v2ProPlus / v4，不受影响。

> 注：服务启动时 GPT-SoVITS 会自动把 `tts_infer.yaml` 补全回所有版本段，
> 这是其正常行为；实际生效的是 `custom` 段。

## 重新生成本目录

```
backend\.venv\Scripts\python.exe tts\copy_tts.py
```

脚本使用 robocopy 增量复制，可安全重复运行。
