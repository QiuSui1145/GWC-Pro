# -*- coding: utf-8 -*-
"""
内置配音按需安装器

分发包不携带 TTS 的推理代码与模型（数 GB），用户开启内置配音时按需安装。
安装来源优先级：
  1. 本机已有的 GPT-SoVITS 安装目录（秒级，仅文件复制，无需联网）
  2. 用户手动指定的目录

只做「复制」，绝不修改来源目录。
"""
import os
import shutil
import subprocess
import threading
import time

# ---- 推理最小集清单：从来源目录复制这些内容即可运行 ----
# (相对来源根的路径, 相对 tts/server 的目标路径, 是否必需)
CODE_DIRS = [
    ("GPT_SoVITS/AR", "GPT_SoVITS/AR", True),
    ("GPT_SoVITS/BigVGAN", "GPT_SoVITS/BigVGAN", True),
    ("GPT_SoVITS/TTS_infer_pack", "GPT_SoVITS/TTS_infer_pack", True),
    ("GPT_SoVITS/module", "GPT_SoVITS/module", True),
    ("GPT_SoVITS/feature_extractor", "GPT_SoVITS/feature_extractor", True),
    ("GPT_SoVITS/eres2net", "GPT_SoVITS/eres2net", True),
    ("GPT_SoVITS/f5_tts", "GPT_SoVITS/f5_tts", False),
    ("GPT_SoVITS/configs", "GPT_SoVITS/configs", True),
    ("GPT_SoVITS/text", "GPT_SoVITS/text", True),
    ("tools/i18n", "tools/i18n", True),
    ("tools/AP_BWE_main", "tools/AP_BWE_main", True),
]
CODE_FILES = [
    ("GPT_SoVITS/process_ckpt.py", "GPT_SoVITS"),
    ("GPT_SoVITS/utils.py", "GPT_SoVITS"),
    ("GPT_SoVITS/sv.py", "GPT_SoVITS"),
    ("GPT_SoVITS/__init__.py", "GPT_SoVITS"),
    ("tools/__init__.py", "tools"),
    ("tools/audio_sr.py", "tools"),
    ("tools/my_utils.py", "tools"),
    ("tools/assets.py", "tools"),
    ("api_v2.py", "."),
    ("config.py", "."),
]
# 底模：公共必需 + 按版本
PRETRAINED_COMMON = ["chinese-roberta-wwm-ext-large", "chinese-hubert-base", "fast_langdetect"]
PRETRAINED_BY_VER = {
    "v2ProPlus": ["v2Pro", "sv"],
    "v2Pro": ["v2Pro", "sv"],
    "v4": ["gsv-v4-pretrained"],
}
PRETRAINED_FILES = ["s1v3.ckpt"]

# 用于识别一个目录是否是有效的 GPT-SoVITS 安装
PROBE_PATHS = ["GPT_SoVITS/TTS_infer_pack/TTS.py", "GPT_SoVITS/pretrained_models"]

# 常见安装位置，用于自动探测
# 注意：raw string 不能以单个反斜杠结尾（r"D:\" 会转义掉引号），故盘符用正斜杠写法
COMMON_ROOTS = [
    r"D:\GPT-SoVITS", r"C:\GPT-SoVITS", r"E:\GPT-SoVITS", r"F:\GPT-SoVITS",
    "D:/", "E:/", "F:/", "C:/",
]


def is_valid_source(path):
    """判断给定目录是否为可用的 GPT-SoVITS 安装。"""
    if not path or not os.path.isdir(path):
        return False
    return all(os.path.exists(os.path.join(path, p)) for p in PROBE_PATHS)


def find_runtime(path):
    """来源目录内的 Python 运行时（整合包自带）。"""
    p = os.path.join(path, "runtime", "python.exe")
    return p if os.path.isfile(p) else None


def detect_sources(extra=None):
    """自动探测本机可用的 GPT-SoVITS 安装目录。"""
    found, seen = [], set()

    def consider(p):
        try:
            p = os.path.abspath(p)
        except Exception:
            return
        if p.lower() in seen or not is_valid_source(p):
            return
        seen.add(p.lower())
        found.append({
            "path": p,
            "runtime": find_runtime(p),
            "has_runtime": bool(find_runtime(p)),
        })

    if extra:
        consider(extra)
    for root in COMMON_ROOTS:
        if not os.path.isdir(root):
            continue
        consider(root)
        try:
            # 只扫一层子目录，避免遍历整盘
            for name in os.listdir(root):
                sub = os.path.join(root, name)
                if os.path.isdir(sub) and ("gpt" in name.lower() or "sovits" in name.lower()):
                    consider(sub)
        except Exception:
            continue
    return found


def scan_voices(src):
    """列出来源目录中的音色权重（供用户勾选，避免全量复制）。"""
    out = []
    for kind, prefix in (("gpt", "GPT_weights"), ("sovits", "SoVITS_weights")):
        for name in sorted(os.listdir(src)):
            if not name.startswith(prefix):
                continue
            d = os.path.join(src, name)
            if not os.path.isdir(d):
                continue
            for f in sorted(os.listdir(d)):
                if f.lower().endswith((".ckpt", ".pth")):
                    out.append({
                        "kind": kind,
                        "dir": name,
                        "file": f,
                        "size": os.path.getsize(os.path.join(d, f)),
                        "rel": f"{name}/{f}",
                    })
    return out


class InstallProgress:
    """安装进度（供前端轮询）。"""

    def __init__(self):
        self.lock = threading.Lock()
        self.reset()

    def reset(self):
        with self.lock:
            self.running = False
            self.done = False
            self.ok = False
            self.step = ""
            self.percent = 0
            self.error = ""
            self.started_at = 0

    def set(self, **kw):
        with self.lock:
            for k, v in kw.items():
                setattr(self, k, v)

    def snapshot(self):
        with self.lock:
            return {
                "running": self.running, "done": self.done, "ok": self.ok,
                "step": self.step, "percent": self.percent, "error": self.error,
                "elapsed": int(time.time() - self.started_at) if self.started_at else 0,
            }


PROGRESS = InstallProgress()


def _robocopy(src, dst):
    if not os.path.isdir(src):
        return
    os.makedirs(dst, exist_ok=True)
    subprocess.run(
        ["robocopy", src, dst, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/R:1", "/W:1",
         "/XD", "__pycache__"],
        capture_output=True,
    )


def _copy_file(src, dst_dir):
    if os.path.isfile(src):
        os.makedirs(dst_dir, exist_ok=True)
        shutil.copy2(src, dst_dir)


def install_from_source(src, tts_dir, voices=None, versions=None, progress=PROGRESS):
    """从本机 GPT-SoVITS 目录安装推理最小集。

    voices  : [{'kind','dir','file'}]，为空则不复制任何音色
    versions: 需要支持的模型版本列表，决定复制哪些底模
    """
    server = os.path.join(tts_dir, "server")
    versions = versions or ["v2ProPlus"]
    progress.reset()
    progress.set(running=True, started_at=time.time(), step="准备中", percent=1)

    try:
        if not is_valid_source(src):
            raise RuntimeError(f"不是有效的 GPT-SoVITS 目录: {src}")

        # 1) 推理代码
        total = len(CODE_DIRS)
        for i, (rel, dst_rel, required) in enumerate(CODE_DIRS):
            s = os.path.join(src, rel.replace("/", os.sep))
            if not os.path.isdir(s):
                if required:
                    raise RuntimeError(f"来源缺少必需目录: {rel}")
                continue
            progress.set(step=f"复制推理代码 {rel}", percent=1 + int(24 * i / total))
            _robocopy(s, os.path.join(server, dst_rel.replace("/", os.sep)))

        for rel, dst_rel in CODE_FILES:
            _copy_file(os.path.join(src, rel.replace("/", os.sep)),
                       os.path.join(server, dst_rel.replace("/", os.sep)))
        progress.set(step="推理代码完成", percent=25)

        # 2) 底模
        pm_src = os.path.join(src, "GPT_SoVITS", "pretrained_models")
        pm_dst = os.path.join(server, "GPT_SoVITS", "pretrained_models")
        need = list(PRETRAINED_COMMON)
        for v in versions:
            need += PRETRAINED_BY_VER.get(v, [])
        need = list(dict.fromkeys(need))  # 去重且保持顺序
        for i, d in enumerate(need):
            progress.set(step=f"复制底模 {d}", percent=25 + int(50 * i / max(1, len(need))))
            _robocopy(os.path.join(pm_src, d), os.path.join(pm_dst, d))
        for f in PRETRAINED_FILES:
            _copy_file(os.path.join(pm_src, f), pm_dst)
        progress.set(step="底模完成", percent=75)

        # 3) 音色（用户勾选的）
        if voices:
            for i, v in enumerate(voices):
                progress.set(step=f"复制音色 {v['file']}", percent=75 + int(20 * i / len(voices)))
                s = os.path.join(src, v["dir"], v["file"])
                _copy_file(s, os.path.join(tts_dir, "models", v["kind"]))
        progress.set(step="音色完成", percent=95)

        # 4) 参考音频（目录名可能含中文，从源侧枚举）
        for name in os.listdir(src):
            p = os.path.join(src, name)
            if os.path.isdir(p) and any(ord(c) > 127 for c in name):
                _robocopy(p, os.path.join(tts_dir, "ref_audio"))
                break

        # 5) 记录来源，供运行时定位共享的 Python 运行时
        os.makedirs(tts_dir, exist_ok=True)
        with open(os.path.join(tts_dir, "install_source.txt"), "w", encoding="utf-8") as f:
            f.write(src)

        progress.set(step="安装完成", percent=100, ok=True)
    except Exception as e:
        progress.set(error=str(e), ok=False)
    finally:
        progress.set(running=False, done=True)

    return progress.snapshot()
