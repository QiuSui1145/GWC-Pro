"""
GWC 服务端用户数据存储层
将所有前端数据从浏览器 IndexedDB 迁移到 userdata/ 目录下的文件系统
"""
import os
import json
import time
import shutil
import tempfile
import re
from typing import Any, Optional

# MIME 类型映射
MIME_MAP = {
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
    '.mp4': 'video/mp4', '.webm': 'video/webm',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.json': 'application/json', '.js': 'application/javascript', '.txt': 'text/plain', '.md': 'text/markdown',
    '.moc3': 'application/octet-stream', '.model3.json': 'application/json',
}


class UserdataStore:
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        os.makedirs(base_dir, exist_ok=True)

    # ==========================================
    # 路径安全与工具
    # ==========================================

    def _sanitize(self, id_str: str) -> str:
        """清理 ID，防止目录穿越"""
        if not id_str:
            return 'default'
        # 只保留字母数字、下划线、连字符、点
        cleaned = re.sub(r'[^\w\-.]', '_', str(id_str))
        # 去掉连续的点（防 .. 穿越）
        cleaned = cleaned.replace('..', '_')
        return cleaned or 'default'

    def _user_dir(self, mirror_id: str) -> str:
        return os.path.join(self.base_dir, self._sanitize(mirror_id))

    def _ensure_dir(self, path: str):
        os.makedirs(path, exist_ok=True)

    def _atomic_write_json(self, filepath: str, data: Any):
        """原子写入 JSON 文件（先写临时文件再 rename，防损坏）"""
        self._ensure_dir(os.path.dirname(filepath))
        fd, tmp = tempfile.mkstemp(suffix='.tmp', dir=os.path.dirname(filepath))
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            shutil.move(tmp, filepath)
        except Exception:
            try:
                os.unlink(tmp)
            except OSError:
                pass
            raise

    def _atomic_write_bytes(self, filepath: str, data: bytes):
        """原子写入二进制文件"""
        self._ensure_dir(os.path.dirname(filepath))
        fd, tmp = tempfile.mkstemp(suffix='.tmp', dir=os.path.dirname(filepath))
        try:
            with os.fdopen(fd, 'wb') as f:
                f.write(data)
            shutil.move(tmp, filepath)
        except Exception:
            try:
                os.unlink(tmp)
            except OSError:
                pass
            raise

    def _read_json(self, filepath: str) -> Any:
        if not os.path.exists(filepath):
            return None
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return None

    def _list_json_dir(self, dirpath: str) -> list:
        """列出目录下所有 JSON 文件，返回 [{filename_without_ext: data}, ...]"""
        if not os.path.isdir(dirpath):
            return []
        result = []
        for fname in sorted(os.listdir(dirpath)):
            if fname.endswith('.json'):
                data = self._read_json(os.path.join(dirpath, fname))
                if data is not None:
                    result.append(data)
        return result

    # ==========================================
    # 核心 JSON 数据（settings, sessions, saves 等）
    # ==========================================

    def save_core(self, mirror_id: str, key: str, data: Any):
        """保存核心 JSON 数据"""
        mid = self._sanitize(mirror_id)
        safe_key = self._sanitize(key)
        filepath = os.path.join(self.base_dir, mid, 'core', f'{safe_key}.json')
        self._atomic_write_json(filepath, data)

    def load_core(self, mirror_id: str, key: str) -> Any:
        """加载核心 JSON 数据"""
        mid = self._sanitize(mirror_id)
        safe_key = self._sanitize(key)
        filepath = os.path.join(self.base_dir, mid, 'core', f'{safe_key}.json')
        return self._read_json(filepath)

    def delete_core(self, mirror_id: str, key: str):
        """删除核心 JSON 数据"""
        mid = self._sanitize(mirror_id)
        safe_key = self._sanitize(key)
        filepath = os.path.join(self.base_dir, mid, 'core', f'{safe_key}.json')
        if os.path.exists(filepath):
            os.remove(filepath)

    def list_cores(self, mirror_id: str) -> list:
        """列出所有核心数据键名"""
        mid = self._sanitize(mirror_id)
        core_dir = os.path.join(self.base_dir, mid, 'core')
        if not os.path.isdir(core_dir):
            return []
        return [f[:-5] for f in os.listdir(core_dir) if f.endswith('.json')]

    # ==========================================
    # BGM 文件
    # ==========================================

    def save_bgm(self, mirror_id: str, bgm_id: str, name: str, data: bytes) -> str:
        """保存 BGM 文件，返回文件名"""
        mid = self._sanitize(mirror_id)
        safe_id = self._sanitize(bgm_id)
        safe_name = self._sanitize(name)
        # 保存音频文件
        bgm_dir = os.path.join(self.base_dir, mid, 'bgm')
        ext = os.path.splitext(name)[1] or '.mp3'
        filename = f'{safe_id}{ext}'
        self._atomic_write_bytes(os.path.join(bgm_dir, filename), data)
        # 保存元数据
        meta = {'id': bgm_id, 'name': name, 'file': filename}
        meta_path = os.path.join(bgm_dir, f'{safe_id}.json')
        self._atomic_write_json(meta_path, meta)
        return filename

    def list_bgm(self, mirror_id: str) -> list:
        """列出所有 BGM"""
        mid = self._sanitize(mirror_id)
        bgm_dir = os.path.join(self.base_dir, mid, 'bgm')
        if not os.path.isdir(bgm_dir):
            return []
        result = []
        for fname in sorted(os.listdir(bgm_dir)):
            if fname.endswith('.json'):
                meta = self._read_json(os.path.join(bgm_dir, fname))
                if meta:
                    result.append(meta)
        return result

    def delete_bgm(self, mirror_id: str, bgm_id: str):
        """删除 BGM"""
        mid = self._sanitize(mirror_id)
        safe_id = self._sanitize(bgm_id)
        bgm_dir = os.path.join(self.base_dir, mid, 'bgm')
        meta_path = os.path.join(bgm_dir, f'{safe_id}.json')
        meta = self._read_json(meta_path)
        if meta:
            audio_path = os.path.join(bgm_dir, meta.get('file', ''))
            if os.path.exists(audio_path):
                os.remove(audio_path)
            if os.path.exists(meta_path):
                os.remove(meta_path)

    def get_bgm_path(self, mirror_id: str, bgm_id: str) -> Optional[str]:
        """获取 BGM 文件路径"""
        mid = self._sanitize(mirror_id)
        safe_id = self._sanitize(bgm_id)
        bgm_dir = os.path.join(self.base_dir, mid, 'bgm')
        meta = self._read_json(os.path.join(bgm_dir, f'{safe_id}.json'))
        if meta:
            path = os.path.join(bgm_dir, meta.get('file', ''))
            if os.path.exists(path):
                return path
        return None

    # ==========================================
    # 背景图片
    # ==========================================

    def save_bg_image(self, mirror_id: str, bg_id: str, name: str, data: bytes) -> str:
        """保存背景图片，返回文件名"""
        mid = self._sanitize(mirror_id)
        safe_id = self._sanitize(bg_id)
        bg_dir = os.path.join(self.base_dir, mid, 'bg_images')
        ext = os.path.splitext(name)[1] or '.png'
        filename = f'{safe_id}{ext}'
        self._atomic_write_bytes(os.path.join(bg_dir, filename), data)
        meta = {'id': bg_id, 'name': name, 'file': filename}
        self._atomic_write_json(os.path.join(bg_dir, f'{safe_id}.json'), meta)
        return filename

    def list_bg_images(self, mirror_id: str) -> list:
        mid = self._sanitize(mirror_id)
        bg_dir = os.path.join(self.base_dir, mid, 'bg_images')
        if not os.path.isdir(bg_dir):
            return []
        result = []
        for fname in sorted(os.listdir(bg_dir)):
            if fname.endswith('.json'):
                meta = self._read_json(os.path.join(bg_dir, fname))
                if meta:
                    result.append(meta)
        return result

    def delete_bg_image(self, mirror_id: str, bg_id: str):
        mid = self._sanitize(mirror_id)
        safe_id = self._sanitize(bg_id)
        bg_dir = os.path.join(self.base_dir, mid, 'bg_images')
        meta = self._read_json(os.path.join(bg_dir, f'{safe_id}.json'))
        if meta:
            img_path = os.path.join(bg_dir, meta.get('file', ''))
            if os.path.exists(img_path):
                os.remove(img_path)
            meta_path = os.path.join(bg_dir, f'{safe_id}.json')
            if os.path.exists(meta_path):
                os.remove(meta_path)

    def get_bg_image_path(self, mirror_id: str, bg_id: str) -> Optional[str]:
        mid = self._sanitize(mirror_id)
        safe_id = self._sanitize(bg_id)
        bg_dir = os.path.join(self.base_dir, mid, 'bg_images')
        meta = self._read_json(os.path.join(bg_dir, f'{safe_id}.json'))
        if meta:
            path = os.path.join(bg_dir, meta.get('file', ''))
            if os.path.exists(path):
                return path
        return None

    # ==========================================
    # 应用图片（标题背景等）
    # ==========================================

    def save_app_image(self, mirror_id: str, key: str, data: bytes, ext: str = '.png') -> str:
        mid = self._sanitize(mirror_id)
        safe_key = self._sanitize(key)
        assets_dir = os.path.join(self.base_dir, mid, 'assets')
        filename = f'{safe_key}{ext}'
        self._atomic_write_bytes(os.path.join(assets_dir, filename), data)
        return filename

    def get_app_image_path(self, mirror_id: str, key: str) -> Optional[str]:
        mid = self._sanitize(mirror_id)
        safe_key = self._sanitize(key)
        assets_dir = os.path.join(self.base_dir, mid, 'assets')
        if not os.path.isdir(assets_dir):
            return None
        for fname in os.listdir(assets_dir):
            if fname.startswith(safe_key) and not fname.endswith('.json'):
                return os.path.join(assets_dir, fname)
        return None

    def delete_app_image(self, mirror_id: str, key: str):
        path = self.get_app_image_path(mirror_id, key)
        if path and os.path.exists(path):
            os.remove(path)

    # ==========================================
    # Live2D 模型
    # ==========================================

    def save_model(self, mirror_id: str, model_id: str, name: str, file_list: list):
        """
        保存模型，file_list 是 [(relative_path, bytes), ...] 的列表
        """
        mid = self._sanitize(mirror_id)
        safe_mid = self._sanitize(model_id)
        model_dir = os.path.join(self.base_dir, mid, 'models', safe_mid)
        self._ensure_dir(model_dir)

        saved_files = []
        for rel_path, file_data in file_list:
            # 清理路径，保留子目录结构
            safe_rel = rel_path.replace('\\', '/').replace('..', '_')
            dest = os.path.join(model_dir, safe_rel)
            self._atomic_write_bytes(dest, file_data)
            saved_files.append(safe_rel)

        manifest = {'id': model_id, 'name': name, 'files': saved_files}
        self._atomic_write_json(os.path.join(model_dir, 'manifest.json'), manifest)

    def list_models(self, mirror_id: str) -> list:
        """列出所有模型（仅 id 和 name）"""
        mid = self._sanitize(mirror_id)
        models_dir = os.path.join(self.base_dir, mid, 'models')
        if not os.path.isdir(models_dir):
            return []
        result = []
        for d in sorted(os.listdir(models_dir)):
            manifest_path = os.path.join(models_dir, d, 'manifest.json')
            manifest = self._read_json(manifest_path)
            if manifest:
                result.append({'id': manifest['id'], 'name': manifest['name']})
        return result

    def get_model(self, mirror_id: str, model_id: str) -> Optional[dict]:
        """获取模型清单"""
        mid = self._sanitize(mirror_id)
        safe_mid = self._sanitize(model_id)
        manifest_path = os.path.join(self.base_dir, mid, 'models', safe_mid, 'manifest.json')
        return self._read_json(manifest_path)

    def delete_model(self, mirror_id: str, model_id: str):
        mid = self._sanitize(mirror_id)
        safe_mid = self._sanitize(model_id)
        model_dir = os.path.join(self.base_dir, mid, 'models', safe_mid)
        if os.path.isdir(model_dir):
            shutil.rmtree(model_dir)

    def get_model_file_path(self, mirror_id: str, model_id: str, file_path: str) -> Optional[str]:
        """获取模型内某个文件的路径"""
        mid = self._sanitize(mirror_id)
        safe_mid = self._sanitize(model_id)
        # 清理文件路径
        safe_rel = file_path.replace('\\', '/').replace('..', '_')
        full_path = os.path.join(self.base_dir, mid, 'models', safe_mid, safe_rel)
        if os.path.exists(full_path):
            return full_path
        return None

    # ==========================================
    # 前端插件 Mods
    # ==========================================

    def save_mod(self, mirror_id: str, mod_data: dict):
        mid = self._sanitize(mirror_id)
        mod_id = self._sanitize(mod_data.get('id', 'unknown'))
        mods_dir = os.path.join(self.base_dir, mid, 'mods')
        self._atomic_write_json(os.path.join(mods_dir, f'{mod_id}.json'), mod_data)

    def list_mods(self, mirror_id: str) -> list:
        mid = self._sanitize(mirror_id)
        mods_dir = os.path.join(self.base_dir, mid, 'mods')
        return self._list_json_dir(mods_dir)

    def delete_mod(self, mirror_id: str, mod_id: str):
        mid = self._sanitize(mirror_id)
        safe_id = self._sanitize(mod_id)
        path = os.path.join(self.base_dir, mid, 'mods', f'{safe_id}.json')
        if os.path.exists(path):
            os.remove(path)

    # ==========================================
    # 插件数据（通用 CRUD）
    # ==========================================

    def _plugin_dir(self, mirror_id: str, plugin_name: str) -> str:
        return os.path.join(self._user_dir(mirror_id), 'plugins', self._sanitize(plugin_name))

    def save_plugin_json(self, mirror_id: str, plugin_name: str, key: str, data: dict):
        pdir = self._plugin_dir(mirror_id, plugin_name)
        safe_key = self._sanitize(key)
        self._atomic_write_json(os.path.join(pdir, f'{safe_key}.json'), data)

    def load_plugin_json(self, mirror_id: str, plugin_name: str, key: str) -> Optional[dict]:
        pdir = self._plugin_dir(mirror_id, plugin_name)
        safe_key = self._sanitize(key)
        return self._read_json(os.path.join(pdir, f'{safe_key}.json'))

    def list_plugin_json(self, mirror_id: str, plugin_name: str) -> list:
        pdir = self._plugin_dir(mirror_id, plugin_name)
        return self._list_json_dir(pdir)

    def delete_plugin_json(self, mirror_id: str, plugin_name: str, key: str):
        pdir = self._plugin_dir(mirror_id, plugin_name)
        safe_key = self._sanitize(key)
        path = os.path.join(pdir, f'{safe_key}.json')
        if os.path.exists(path):
            os.remove(path)

    def save_plugin_blob(self, mirror_id: str, plugin_name: str, key: str, data: bytes, ext: str = '.bin') -> str:
        pdir = self._plugin_dir(mirror_id, plugin_name)
        safe_key = self._sanitize(key)
        filename = f'{safe_key}{ext}'
        self._atomic_write_bytes(os.path.join(pdir, filename), data)
        return filename

    def get_plugin_blob_path(self, mirror_id: str, plugin_name: str, key: str, ext: str = '.bin') -> Optional[str]:
        pdir = self._plugin_dir(mirror_id, plugin_name)
        safe_key = self._sanitize(key)
        path = os.path.join(pdir, f'{safe_key}{ext}')
        if os.path.exists(path):
            return path
        # 尝试查找任何匹配前缀的文件
        if os.path.isdir(pdir):
            for fname in os.listdir(pdir):
                if fname.startswith(safe_key) and not fname.endswith('.json'):
                    return os.path.join(pdir, fname)
        return None

    def delete_plugin_blob(self, mirror_id: str, plugin_name: str, key: str):
        path = self.get_plugin_blob_path(mirror_id, plugin_name, key)
        if path and os.path.exists(path):
            os.remove(path)

    # ==========================================
    # 用户认证
    # ==========================================

    def _users_file(self) -> str:
        return os.path.join(self.base_dir, 'users.json')

    def load_users(self) -> dict:
        data = self._read_json(self._users_file())
        return data if isinstance(data, dict) else {}

    def save_users(self, users: dict):
        self._atomic_write_json(self._users_file(), users)

    def get_user(self, username: str) -> Optional[dict]:
        users = self.load_users()
        return users.get(username)

    def save_user(self, username: str, user_data: dict):
        users = self.load_users()
        users[username] = user_data
        self.save_users(users)

    def delete_user(self, username: str):
        users = self.load_users()
        if username in users:
            del users[username]
            self.save_users(users)

    def list_usernames(self) -> list:
        return list(self.load_users().keys())

    # ==========================================
    # 批量迁移
    # ==========================================

    def migrate_core_data(self, mirror_id: str, items: list) -> int:
        """批量导入核心数据，items 是 [{key, value}, ...]"""
        count = 0
        for item in items:
            key = item.get('key')
            value = item.get('value')
            if key and value is not None:
                self.save_core(mirror_id, key, value)
                count += 1
        return count

    def get_mime_type(self, filename: str) -> str:
        """根据文件扩展名返回 MIME 类型"""
        for ext, mime in sorted(MIME_MAP.items(), key=lambda x: -len(x[0])):
            if filename.lower().endswith(ext):
                return mime
        return 'application/octet-stream'
