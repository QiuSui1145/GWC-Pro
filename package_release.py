# -*- coding: utf-8 -*-
"""分发打包 v2：可靠的文件排除逻辑。"""
import os, shutil, fnmatch

SRC = r'D:\GWC\GWC-Pro-End'
DST = r'D:\GWC\GWC-Pro-Github'

# 强制删除旧目录（逐个文件删除避免权限问题）
if os.path.exists(DST):
    for root, dirs, files in os.walk(DST, topdown=False):
        for f in files:
            try: os.unlink(os.path.join(root, f))
            except: pass
        for d in dirs:
            try: os.rmdir(os.path.join(root, d))
            except: pass
    try: os.rmdir(DST)
    except: pass

os.makedirs(DST, exist_ok=True)

# ---- 排除规则 ----
# 在任何层级排除的目录名
SKIP_DIR_NAMES = {
    '__pycache__', '.git', '.venv', 'node_modules', '.vscode', '.idea',
    'userdata', 'live2d_models', 'CRASH_LOG.txt',
}

# 特定路径排除（相对于 SRC 根）
SKIP_PATHS = {
    'backend/runtime',
    'backend/asr_model',
    'backend/llama_cpp',
    'backend/.venv',
    'index.html',
}

# 特定路径下只保留的文件扩展名或文件名
PATH_WHITELIST = {
    'tts': {'start_tts.bat', 'copy_tts.py', 'README.md'},  # tts 根目录
    'mmd_models': {'.txt'},  # mmd_models 下所有层级只保留 .txt
}


def normalize(rel):
    return rel.replace('\\', '/')

def should_skip(rel_path, is_dir, fname=''):
    """返回 True 表示跳过"""
    rel = normalize(rel_path)
    parts = rel.split('/') if rel else []

    # 1) 目录名/文件名在全局排除列表
    if is_dir:
        if parts and parts[-1] in SKIP_DIR_NAMES:
            return True
    else:
        if fname in SKIP_DIR_NAMES:
            return True

    # 2) 精确路径匹配
    for sp in SKIP_PATHS:
        if rel == sp or rel.startswith(sp + '/'):
            return True

    # 3) 路径白名单：tts/ 子目录全部跳过，根目录只保留白名单文件
    if parts and parts[0] == 'tts':
        if len(parts) > 1:
            return True  # 跳过 tts 所有子目录
        if not is_dir and fname not in PATH_WHITELIST['tts']:
            return True  # tts 根目录只保留白名单文件

    # 4) mmd_models: 只保留 .txt 文件
    if parts and parts[0] == 'mmd_models':
        if not is_dir:
            ext = os.path.splitext(fname)[1].lower()
            if ext not in PATH_WHITELIST['mmd_models']:
                return True

    # 5) 文件扩展名排除
    if not is_dir:
        ext = os.path.splitext(fname)[1].lower()
        if ext in {'.pyc', '.log'}:
            return True

    return False


count = 0
for root, dirs, files in os.walk(SRC, topdown=True):
    rel = normalize(os.path.relpath(root, SRC))
    if rel == '.':
        rel = ''

    # 先过滤目录
    dirs[:] = [d for d in dirs if not should_skip((rel + '/' + d).strip('/'), True, d)]

    # 创建目标目录
    dst_dir = os.path.join(DST, rel) if rel else DST
    os.makedirs(dst_dir, exist_ok=True)

    # 复制文件
    for f in files:
        if should_skip(rel, False, f):
            continue
        try:
            shutil.copy2(os.path.join(root, f), os.path.join(dst_dir, f))
            count += 1
        except Exception as e:
            print(f'  SKIP: {rel}/{f}: {e}')

print(f'Copied {count} files')

# 补拷 frontend/dist（构建产物）
print('Copying frontend/dist...')
dist_src = os.path.join(SRC, 'frontend', 'dist')
dist_dst = os.path.join(DST, 'frontend', 'dist')
if os.path.exists(dist_src):
    if os.path.exists(dist_dst):
        shutil.rmtree(dist_dst)
    shutil.copytree(dist_src, dist_dst)
    print('  frontend/dist OK')

# 验数
print()
for path in ['userdata', 'backend/.venv', 'backend/runtime', 'backend/asr_model',
             'electron-app/node_modules', 'frontend/node_modules', 'tts/server',
             'tts/models', 'mmd_models/满穗']:
    p = os.path.join(DST, path)
    print(f'  {"GONE" if not os.path.exists(p) else "KEPT!":6s}  {path}')

for path in ['frontend/dist/index.html', 'electron-app/renderer/mmd.bundle.js',
             'backend/main.py', 'README.md', '启动全栈环境.bat']:
    p = os.path.join(DST, path)
    print(f'  {"OK" if os.path.exists(p) else "MISSING":7s}  {path}')

# 总大小
total = 0
for root, dirs, files in os.walk(DST):
    for f in files:
        try: total += os.path.getsize(os.path.join(root, f))
        except: pass
print(f'\nDistribution size: {total / 1024 / 1024:.1f} MB')
