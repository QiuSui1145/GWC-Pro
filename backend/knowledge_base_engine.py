import os
import sys
import json
import math
import time
import traceback
from datetime import datetime

try:
    import httpx
except ImportError:
    httpx = None
    print("⚠️ 警告: 缺少 httpx 库，知识库嵌入功能将不可用。")


class KnowledgeBaseEngine:
    def __init__(self, skills_engine, userdata_dir):
        self.skills_engine = skills_engine
        self.userdata_dir = userdata_dir
        self.vectors_file = os.path.join(userdata_dir, "knowledge_base_vectors.json")
        self.chunks = []  # [{source, text, embedding}]
        self.is_indexed = False
        self.indexed_at = None
        self.indexed_model = None
        self.indexed_dimensions = None
        self._load_vectors()

    def _load_vectors(self):
        if not os.path.exists(self.vectors_file):
            return
        try:
            with open(self.vectors_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.chunks = data.get("chunks", [])
            self.indexed_at = data.get("indexed_at", None)
            self.indexed_model = data.get("model", None)
            self.indexed_dimensions = data.get("dimensions", None)
            self.is_indexed = len(self.chunks) > 0
            if self.is_indexed:
                print(f"✅ 知识库向量加载成功: {len(self.chunks)} 个切片, 模型: {self.indexed_model}")
        except Exception as e:
            print(f"⚠️ 知识库向量文件加载失败: {e}")
            self.chunks = []

    def _save_vectors(self):
        try:
            data = {
                "model": self.indexed_model,
                "dimensions": self.indexed_dimensions,
                "chunks": self.chunks,
                "indexed_at": self.indexed_at
            }
            with open(self.vectors_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️ 知识库向量保存失败: {e}")

    def _normalize_url(self, base_url):
        url = base_url.rstrip('/')
        if url.endswith('/v1'):
            url = url[:-3]
        return url

    async def _get_embeddings(self, texts, config):
        if not httpx:
            raise RuntimeError("httpx 未安装，无法调用嵌入 API")

        base_url = config.get("base_url", "")
        api_key = config.get("api_key", "")
        model = config.get("model", "text-embedding-3-small")
        dimensions = config.get("dimensions", 1536)

        if not base_url:
            raise RuntimeError("未配置嵌入模型 Base URL")

        url = f"{self._normalize_url(base_url)}/v1/embeddings"
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        all_embeddings = []
        batch_size = 100

        async with httpx.AsyncClient(timeout=120.0) as client:
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                payload = {
                    "input": batch,
                    "model": model,
                }
                if dimensions:
                    payload["dimensions"] = dimensions

                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code != 200:
                    raise RuntimeError(f"嵌入 API 返回 {resp.status_code}: {resp.text[:500]}")

                result = resp.json()
                data = result.get("data", [])
                data.sort(key=lambda x: x.get("index", 0))
                for item in data:
                    all_embeddings.append(item["embedding"])

        return all_embeddings

    async def test_connection(self, config):
        try:
            embeddings = await self._get_embeddings(["测试连接"], config)
            if embeddings and len(embeddings[0]) > 0:
                return {"ok": True, "dimensions": len(embeddings[0]), "msg": f"连接成功! 向量维度: {len(embeddings[0])}"}
            return {"ok": False, "msg": "嵌入 API 返回了空结果"}
        except Exception as e:
            return {"ok": False, "msg": f"连接失败: {str(e)}"}

    async def index_documents(self, config):
        if not self.skills_engine:
            raise RuntimeError("技能引擎未加载")

        chunks = self.skills_engine.chunks
        if not chunks:
            raise RuntimeError("知识库中没有可索引的文档切片，请先在技能包中添加文档")

        texts = [c["text"] for c in chunks]
        sources = [c["source"] for c in chunks]

        embeddings = await self._get_embeddings(texts, config)

        self.chunks = []
        for i, (source, text, emb) in enumerate(zip(sources, texts, embeddings)):
            self.chunks.append({"source": source, "text": text, "embedding": emb})

        self.indexed_model = config.get("model", "text-embedding-3-small")
        self.indexed_dimensions = config.get("dimensions", 1536)
        self.indexed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.is_indexed = True

        self._save_vectors()
        return {"ok": True, "count": len(self.chunks), "indexed_at": self.indexed_at}

    def _cosine_similarity(self, a, b):
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def vector_search(self, query_embedding, top_k=5, pack_list=None):
        candidates = self.chunks
        if pack_list:
            candidates = [c for c in self.chunks if any(c["source"].startswith(p + "/") or c["source"].startswith(p + "\\") for p in pack_list)]

        if not candidates:
            return []

        scored = []
        for c in candidates:
            if not c.get("embedding"):
                continue
            sim = self._cosine_similarity(query_embedding, c["embedding"])
            scored.append({"source": c["source"], "text": c["text"], "score": sim})

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    async def rerank(self, query, results, config):
        if not httpx or not results:
            return results

        base_url = config.get("base_url", "")
        api_key = config.get("api_key", "")
        model = config.get("model", "")
        top_k = config.get("top_k", 3)

        if not base_url or not model:
            return results[:top_k]

        try:
            url = f"{self._normalize_url(base_url)}/v1/rerank"
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"

            documents = [r["text"] for r in results]
            payload = {
                "model": model,
                "query": query,
                "documents": documents,
                "top_n": top_k
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code != 200:
                    print(f"⚠️ 重排序 API 返回 {resp.status_code}，使用原始排序")
                    return results[:top_k]

                data = resp.json()
                reranked = []
                for item in data.get("results", []):
                    idx = item.get("index", 0)
                    if 0 <= idx < len(results):
                        entry = results[idx].copy()
                        entry["rerank_score"] = item.get("relevance_score", 0)
                        reranked.append(entry)
                return reranked[:top_k]
        except Exception as e:
            print(f"⚠️ 重排序失败: {e}，使用原始排序")
            return results[:top_k]

    async def hybrid_retrieve(self, query, config, pack_list=None):
        top_k = config.get("top_k", 5)
        rerank_top_k = config.get("rerank_top_k", 3)
        use_rerank = config.get("use_rerank", False)
        embedding_config = config.get("embedding", {})
        rerank_config = config.get("rerank", {})

        bm25_results = []
        if self.skills_engine:
            try:
                bm25_text = self.skills_engine.retrieve(query, top_k=top_k, pack_list=pack_list)
                if bm25_text:
                    for block in bm25_text.strip().split("[(引用) "):
                        block = block.strip()
                        if not block:
                            continue
                        if "]:" in block:
                            src, text = block.split("]:", 1)
                            bm25_results.append({"source": src.strip(), "text": text.strip(), "score": 0})
            except Exception:
                pass

        vector_results = []
        if self.is_indexed and embedding_config.get("base_url"):
            try:
                query_embeddings = await self._get_embeddings([query], embedding_config)
                if query_embeddings:
                    vector_results = self.vector_search(query_embeddings[0], top_k=top_k, pack_list=pack_list)
            except Exception as e:
                print(f"⚠️ 向量检索失败，降级为纯 BM25: {e}")

        if not vector_results:
            combined = bm25_results[:top_k]
        elif not bm25_results:
            combined = vector_results[:top_k]
        else:
            combined = self._rrf_fusion(bm25_results, vector_results, k=60, top_k=top_k)

        if use_rerank and rerank_config.get("base_url") and rerank_config.get("model"):
            combined = await self.rerank(query, combined, rerank_config)
            final_top_k = rerank_top_k
        else:
            final_top_k = top_k

        result_text = ""
        core_rules = ""
        if self.skills_engine:
            core_rules = self.skills_engine.get_core_rules(pack_list)

        for c in combined[:final_top_k]:
            result_text += f"[(引用) {c['source']}]:\n{c['text']}\n\n"

        return {"core_rules": core_rules, "results": result_text}

    def _rrf_fusion(self, bm25_results, vector_results, k=60, top_k=5):
        scores = {}
        source_map = {}

        for rank, r in enumerate(bm25_results):
            key = r["source"] + "::" + r["text"][:100]
            scores[key] = scores.get(key, 0) + 1.0 / (k + rank + 1)
            source_map[key] = r

        for rank, r in enumerate(vector_results):
            key = r["source"] + "::" + r["text"][:100]
            scores[key] = scores.get(key, 0) + 1.0 / (k + rank + 1)
            source_map[key] = r

        sorted_keys = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        result = []
        for key in sorted_keys[:top_k]:
            entry = source_map[key].copy()
            entry["rrf_score"] = scores[key]
            result.append(entry)
        return result

    def get_status(self):
        return {
            "is_indexed": self.is_indexed,
            "chunk_count": len(self.chunks),
            "indexed_at": self.indexed_at,
            "model": self.indexed_model,
            "dimensions": self.indexed_dimensions
        }
