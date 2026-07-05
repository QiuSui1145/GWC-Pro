import os
import sys
import json
import traceback

# ==========================================
# 🛡️ 依赖项柔性降级：如果没有库，引擎依然能启动，只是不启用 RAG
# ==========================================
try:
    import jieba
    from rank_bm25 import BM25Okapi
except ImportError as e:
    jieba = None
    BM25Okapi = None
    print(f"⚠️ 警告: 缺少关键 NLP 库 ({e})，知识库 RAG 检索功能将失效。")

class SkillsEngine:
    def __init__(self):
        # 1. 绝对路径防护 (穿透一切便携版迷之寻址)
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.userdata_dir = os.path.join(os.path.dirname(self.base_dir), "userdata")
        self.library_dir = os.path.join(self.userdata_dir, "skills_library")

        self.chunks = []
        self.bm25 = None
        self.core_rules = ""
        self.core_rules_by_pack = {}  # {pack_name: core_rules_text}
        self.chunks_by_pack = {}      # {pack_name: [chunks]}
        self.files_list = []

        # Per-user cache: {user_id: {chunks, bm25, core_rules, ...}}
        self._user_cache = {}
        self._default_loaded = False

        try:
            os.makedirs(self.library_dir, exist_ok=True)
        except Exception as e:
            print(f"⚠️ 无法创建技能目录: {e}")

        # 2. 安全启动拦截 (load Admin user data at startup)
        try:
            self.reload_library("user_Admin")
            self._default_loaded = True
        except Exception as e:
            print(f"❌ 知识库初始化发生了未捕获异常: {e}")

    def _get_status_file(self, user_id="default"):
        """返回用户独立的状态文件路径（仅用于私有 Skill）"""
        return os.path.join(self.userdata_dir, f"skills_status_{user_id}.json")

    def _get_public_status_file(self):
        """返回公共 Skill 库的全局审核状态文件"""
        return os.path.join(self.userdata_dir, "skills_status_public.json")

    def _get_private_library_dir(self, user_id="default"):
        """返回用户私有技能库目录"""
        return os.path.join(self.userdata_dir, user_id, "skills_library")

    def get_public_status(self):
        """获取公共 Skill 库的全局审核状态"""
        status_file = self._get_public_status_file()
        if os.path.exists(status_file):
            try:
                with open(status_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️ 公共技能状态文件损坏: {e}")
                return {}
        return {}

    def save_public_status(self, status):
        """保存公共 Skill 库的全局审核状态"""
        status_file = self._get_public_status_file()
        try:
            with open(status_file, 'w', encoding='utf-8') as f:
                json.dump(status, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️ 保存公共技能状态失败: {e}")

    def get_status(self, user_id="default"):
        """获取用户独立的审核状态（用于私有 Skill 或向后兼容）"""
        status_file = self._get_status_file(user_id)
        if os.path.exists(status_file):
            try:
                with open(status_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️ 技能状态文件损坏，系统已自动重置。报错: {e}")
                return {}
        return {}

    def save_status(self, status, user_id="default"):
        """保存用户独立的审核状态"""
        status_file = self._get_status_file(user_id)
        try:
            with open(status_file, 'w', encoding='utf-8') as f:
                json.dump(status, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️ 保存技能状态失败: {e}")

    def toggle_skills(self, updates, user_id="default"):
        status = self.get_status(user_id)
        public_status = self.get_public_status()
        for u in updates:
            key = u["path"]
            # 公共库文件使用全局状态，私有库文件使用用户独立状态
            if key.startswith("@private/"):
                status[key] = u["enabled"]
            else:
                public_status[key] = u["enabled"]
        self.save_status(status, user_id)
        self.save_public_status(public_status)
        self.reload_library(user_id, force=True)

    def reload_library(self, user_id="default", force=False):
        # Return cached data if available and not forced
        if not force and user_id in self._user_cache:
            cache = self._user_cache[user_id]
            self.chunks = cache["chunks"]
            self.bm25 = cache["bm25"]
            self.core_rules = cache["core_rules"]
            self.core_rules_by_pack = cache["core_rules_by_pack"]
            self.chunks_by_pack = cache["chunks_by_pack"]
            self.files_list = cache["files_list"]
            self.bm25_by_pack = cache["bm25_by_pack"]
            return

        self.chunks = []
        self.core_rules = ""
        self.core_rules_by_pack = {}
        self.chunks_by_pack = {}
        self.files_list = []
        private_status = self.get_status(user_id)
        public_status = self.get_public_status()  # 全局审核状态

        added_core = 0
        added_ref = 0

        try:
            # 扫描目录列表: [(目录路径, scope标记, 显示前缀)]
            scan_targets = []
            if os.path.exists(self.library_dir):
                scan_targets.append((self.library_dir, "public", ""))
            private_dir = self._get_private_library_dir(user_id)
            if os.path.exists(private_dir):
                scan_targets.append((private_dir, "private", "🔒 "))

            for lib_path, scope, display_prefix in scan_targets:
                for root, dirs, files in os.walk(lib_path):
                    dirs[:] = [d for d in dirs if not d.startswith('.')]
                    for filename in files:
                        if filename.startswith('.') or not filename.endswith(('.txt', '.md', '.json')):
                            continue

                        filepath = os.path.join(root, filename)
                        rel_path = os.path.relpath(filepath, lib_path).replace('\\', '/')
                        # 公共文件使用全局审核状态，私有文件使用用户独立状态
                        status_key = f"@private/{rel_path}" if scope == "private" else rel_path
                        is_enabled = private_status.get(status_key, True) if scope == "private" else public_status.get(rel_path, True)

                        try:
                            with open(filepath, 'r', encoding='utf-8') as f:
                                text = f.read().strip()
                        except Exception as e:
                            print(f"⚠️ 读取档案 [{rel_path}] 失败，可能不是 UTF-8 编码，已跳过。报错: {e}")
                            continue

                        pack_name = rel_path.split("/")[0] if "/" in rel_path else "(root)"
                        display_pack = f"{display_prefix}{pack_name}"

                        self.files_list.append({
                            "path": rel_path,
                            "name": filename,
                            "pack": display_pack,
                            "pack_raw": pack_name,
                            "enabled": is_enabled,
                            "size": len(text),
                            "scope": scope,
                        })

                        if not text or not is_enabled:
                            continue

                        is_core = len(text) < 3000 and filename.endswith(('.md', '.json'))

                        if is_core:
                            entry = f"--- [核心设定: {rel_path}] ---\n{text}\n\n"
                            self.core_rules += entry
                            self.core_rules_by_pack.setdefault(display_pack, "")
                            self.core_rules_by_pack[display_pack] += entry
                            added_core += 1
                        else:
                            pack_chunks = []
                            paragraphs = text.split('\n')
                            current_chunk = ""
                            for p in paragraphs:
                                p = p.strip()
                                if not p: continue
                                if len(current_chunk) + len(p) > 600:
                                    pack_chunks.append({"source": rel_path, "text": current_chunk})
                                    current_chunk = p
                                else:
                                    current_chunk += ("\n" + p) if current_chunk else p
                            if current_chunk:
                                pack_chunks.append({"source": rel_path, "text": current_chunk})
                            self.chunks.extend(pack_chunks)
                            self.chunks_by_pack.setdefault(display_pack, []).extend(pack_chunks)
                            added_ref += 1

            # 构建全局 BM25 和按包 BM25
            if self.chunks and jieba and BM25Okapi:
                tokenized_corpus = [list(jieba.cut(c["text"])) for c in self.chunks]
                self.bm25 = BM25Okapi(tokenized_corpus)

            self.bm25_by_pack = {}
            if jieba and BM25Okapi:
                for pack_name, pack_chunks in self.chunks_by_pack.items():
                    if pack_chunks:
                        tokenized = [list(jieba.cut(c["text"])) for c in pack_chunks]
                        self.bm25_by_pack[pack_name] = BM25Okapi(tokenized)

            # Cache the loaded state for this user
            self._user_cache[user_id] = {
                "chunks": self.chunks,
                "bm25": self.bm25,
                "core_rules": self.core_rules,
                "core_rules_by_pack": self.core_rules_by_pack,
                "chunks_by_pack": self.chunks_by_pack,
                "files_list": self.files_list,
                "bm25_by_pack": self.bm25_by_pack,
            }

            print(f"✅ 知识库加载成功! 核心常驻: {added_core}个, 巨型参考切片: {added_ref}个 (user: {user_id})")

        except Exception as e:
            print(f"❌ 知识库深度扫描时崩溃: {e}")
            traceback.print_exc()

    def get_skill_packs(self):
        """按顶层文件夹分组返回 Skill 包列表"""
        packs = {}
        for f in self.files_list:
            pack_name = f["pack"]
            if pack_name not in packs:
                packs[pack_name] = {"name": pack_name, "files": [], "enabled_count": 0, "total_count": 0}
            packs[pack_name]["files"].append(f)
            packs[pack_name]["total_count"] += 1
            if f["enabled"]:
                packs[pack_name]["enabled_count"] += 1
        return list(packs.values())

    def get_core_rules(self, pack_list=None):
        """返回核心规则，支持按包过滤"""
        if not pack_list:
            return self.core_rules
        result = ""
        for pack_name in pack_list:
            if pack_name in self.core_rules_by_pack:
                result += self.core_rules_by_pack[pack_name]
        return result

    def retrieve(self, query, top_k=3, pack_list=None):
        if not query or not jieba:
            return ""
        try:
            # 按包过滤时，使用对应包的 chunks 和 bm25
            if pack_list:
                merged_chunks = []
                for pack_name in pack_list:
                    if pack_name in self.chunks_by_pack:
                        merged_chunks.extend(self.chunks_by_pack[pack_name])
                if not merged_chunks:
                    return ""
                tokenized_query = list(jieba.cut(query))
                tokenized_corpus = [list(jieba.cut(c["text"])) for c in merged_chunks]
                bm25 = BM25Okapi(tokenized_corpus)
                top_chunks = bm25.get_top_n(tokenized_query, merged_chunks, n=top_k)
            else:
                if not self.bm25:
                    return ""
                tokenized_query = list(jieba.cut(query))
                top_chunks = self.bm25.get_top_n(tokenized_query, self.chunks, n=top_k)
            res = ""
            for c in top_chunks:
                res += f"[(引用) {c['source']}]:\n{c['text']}\n\n"
            return res
        except Exception as e:
            print(f"⚠️ 知识库检索过程失败: {e}")
            return ""
