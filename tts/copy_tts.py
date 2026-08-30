# -*- coding: utf-8 -*-
"""
从原 GPT-SoVITS 目录复制「推理最小集」到项目 tts/ 下。
原目录保持只读、不做任何修改。

用 Python 驱动 robocopy：既拿到 robocopy 的速度与增量能力，
又避免 PowerShell 5.1 以 GBK 读取 UTF-8 脚本导致中文路径乱码。
"""
import os
import subprocess
import sys
import time

SRC = r"D:\GPT-SoVITS\GPT-SoVITS-v2pro-20250604"
DST = r"D:\GWC\GWC-Pro-End\tts"
SERVER = os.path.join(DST, "server")
LOG = os.path.join(DST, "copy.log")


def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def rc(src, dst, extra=None):
    """robocopy 包装。返回码 <8 均为成功（1=有复制, 0=无变化）。"""
    if not os.path.isdir(src):
        log(f"  跳过（源不存在）: {src}")
        return
    args = ["robocopy", src, dst, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/R:1", "/W:1"]
    if extra:
        args += extra
    p = subprocess.run(args, capture_output=True)
    if p.returncode >= 8:
        log(f"  !! robocopy 失败({p.returncode}): {src}")
    return p.returncode


def cp(src_file, dst_dir):
    if os.path.isfile(src_file):
        os.makedirs(dst_dir, exist_ok=True)
        subprocess.run(["robocopy", os.path.dirname(src_file), dst_dir,
                        os.path.basename(src_file), "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/R:1", "/W:1"],
                       capture_output=True)


def main():
    open(LOG, "w", encoding="utf-8").close()
    log("===== 开始复制推理最小集 =====")
    NOPY = ["/XD", "__pycache__"]

    # 1) 推理代码（体积小）
    for d in ["AR", "BigVGAN", "TTS_infer_pack", "module", "feature_extractor",
              "eres2net", "f5_tts", "configs"]:
        rc(os.path.join(SRC, "GPT_SoVITS", d), os.path.join(SERVER, "GPT_SoVITS", d), NOPY)
        log(f"代码 {d} 完成")

    # 2) GPT_SoVITS 顶层推理所需 .py
    for f in ["process_ckpt.py", "utils.py", "sv.py", "__init__.py"]:
        cp(os.path.join(SRC, "GPT_SoVITS", f), os.path.join(SERVER, "GPT_SoVITS"))
    log("顶层 py 完成")

    # 3) text：中文/多语文本前端（含 g2pw 等，约 667MB）
    rc(os.path.join(SRC, "GPT_SoVITS", "text"), os.path.join(SERVER, "GPT_SoVITS", "text"), NOPY)
    log("text 完成")

    # 4) tools：仅 i18n 与 AP_BWE_main（超分），其余为训练/标注工具，不需要
    rc(os.path.join(SRC, "tools", "i18n"), os.path.join(SERVER, "tools", "i18n"), NOPY)
    rc(os.path.join(SRC, "tools", "AP_BWE_main"), os.path.join(SERVER, "tools", "AP_BWE_main"), NOPY)
    for f in ["__init__.py", "audio_sr.py", "my_utils.py", "assets.py", "slicer2.py"]:
        cp(os.path.join(SRC, "tools", f), os.path.join(SERVER, "tools"))
    log("tools 完成")

    # 5) 底模：只取推理必需，跳过 v1/v3 专用大文件（s2Gv3/s2G488k/s2D488k/gsv-v2final 等）
    pm_src = os.path.join(SRC, "GPT_SoVITS", "pretrained_models")
    pm_dst = os.path.join(SERVER, "GPT_SoVITS", "pretrained_models")
    for d in ["chinese-roberta-wwm-ext-large", "chinese-hubert-base", "fast_langdetect",
              "gsv-v4-pretrained", "v2Pro", "sv"]:
        rc(os.path.join(pm_src, d), os.path.join(pm_dst, d))
        log(f"底模 {d} 完成")
    for f in ["s1v3.ckpt", ".gitignore"]:
        cp(os.path.join(pm_src, f), pm_dst)
    log("底模完成")

    # 6) 音色权重（当前在用的 v4）与参考音频
    rc(os.path.join(SRC, "GPT_weights_v4"), os.path.join(DST, "models", "gpt"))
    rc(os.path.join(SRC, "SoVITS_weights_v4"), os.path.join(DST, "models", "sovits"))
    log("音色权重(v4) 完成")

    # 参考音频目录名为中文，这里从源侧枚举而非硬编码，避免编码问题
    for name in os.listdir(SRC):
        p = os.path.join(SRC, name)
        if os.path.isdir(p) and any(ord(ch) > 127 for ch in name):
            rc(p, os.path.join(DST, "ref_audio"))
            log(f"参考音频目录 [{name}] 完成")
            break

    log("===== 全部完成 =====")


if __name__ == "__main__":
    main()
