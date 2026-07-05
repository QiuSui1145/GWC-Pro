import sys
import os
import json
import traceback
import uvicorn
import time
import asyncio
import datetime
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse, Response, RedirectResponse

# CORS headers for file-serving endpoints
CORS_HEADERS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Credentials": "true"}
from pydantic import BaseModel
from urllib.parse import quote

if sys.stdout.encoding and sys.stdout.encoding.lower().replace('-', '') != 'utf8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding and sys.stderr.encoding.lower().replace('-', '') != 'utf8':
    sys.stderr.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path: sys.path.append(BASE_DIR)

def global_crash_handler(exctype, value, tb):
    crash_log_path = os.path.join(BASE_DIR, "CRASH_LOG.txt")
    with open(crash_log_path, "w", encoding="utf-8") as f: traceback.print_exception(exctype, value, tb, file=f)
    sys.__excepthook__(exctype, value, tb)
sys.excepthook = global_crash_handler

try:
    from skills_engine import SkillsEngine
    skills_engine = SkillsEngine()
except Exception as e:
    print(f"⚠️ 技能引擎加载失败: {e}")
    skills_engine = None

try:
    from knowledge_base_engine import KnowledgeBaseEngine
    kb_engine = KnowledgeBaseEngine(skills_engine, os.path.join(os.path.dirname(BASE_DIR), "userdata"))
except Exception as e:
    print(f"⚠️ 知识库引擎加载失败: {e}")
    kb_engine = None

try:
    from qq_bot_engine import QQBotEngine
    qq_bot = QQBotEngine(skills_engine, kb_engine)
except Exception as e:
    print(f"⚠️ QQ 机器人引擎加载失败: {e}")
    qq_bot = None

app = FastAPI(title="GWC AI Backend (Bridge Mode)")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ==========================================
# 大模型通讯桥接（前端主脑模式）
# ==========================================
bridge_queue = asyncio.Queue()
bridge_responses = {}
frontend_last_seen = 0
shared_chat_history = []

class ChatMessage(BaseModel):
    role: str
    content: str | list

class ChatRequest(BaseModel):
    model: str = "gpt-3.5-turbo"
    messages: list[ChatMessage]
    stream: bool = False
    temperature: float = 0.7
    max_tokens: int = 4096
    context_mode: str = "independent"
    api_base: str = ""
    api_key: str = ""

@app.get("/api/bridge/pull")
async def bridge_pull():
    global frontend_last_seen
    frontend_last_seen = time.time()
    try:
        task = await asyncio.wait_for(bridge_queue.get(), timeout=2.0)
        return task
    except asyncio.TimeoutError:
        return {"task_id": None}

class BridgePush(BaseModel):
    task_id: str
    chunk: str = ""
    done: bool = False
    error: str = None

@app.post("/api/bridge/push")
async def bridge_push(req: BridgePush):
    if req.task_id in bridge_responses:
        if req.error: await bridge_responses[req.task_id].put(f"[ERROR]{req.error}")
        elif req.done: await bridge_responses[req.task_id].put("[DONE]")
        else: await bridge_responses[req.task_id].put(req.chunk)
    return {"status": "ok"}

@app.get("/api/bridge/history")
async def get_bridge_history():
    return {"messages": shared_chat_history}

@app.post("/api/bridge/history")
async def post_bridge_history(req: Request):
    global shared_chat_history
    data = await req.json()
    shared_chat_history = data.get("messages", [])
    return {"status": "ok"}

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    global frontend_last_seen

    if request.api_base:
        import httpx
        api_base = request.api_base.strip().rstrip("/")
        if api_base.endswith('/v1'):
            api_base = api_base[:-3]
        api_key = request.api_key
        model = request.model or "gpt-3.5-turbo"
        req_messages = [{"role": m.role, "content": m.content} for m in request.messages]
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        if request.stream:
            payload = {"model": model, "messages": req_messages, "stream": True, "temperature": request.temperature}

            async def direct_proxy_stream():
                try:
                    import sys
                    print(f"[代理] 请求 NewAPI: {api_base}/v1/chat/completions, model={model}, msgs={len(req_messages)}", flush=True)
                    async with httpx.AsyncClient(timeout=120.0) as client:
                        async with client.stream("POST", f"{api_base}/v1/chat/completions", json=payload, headers=headers) as resp:
                            print(f"[代理] NewAPI 响应状态: {resp.status_code}", flush=True)
                            if resp.status_code >= 400:
                                err_text = await resp.aread()
                                err_msg = err_text.decode("utf-8", errors="replace")[:500]
                                print(f"[代理] NewAPI 错误: {err_msg}", flush=True)
                                yield f"data: {json.dumps({'choices': [{'delta': {'content': f'[API错误 {resp.status_code}] {err_msg}'}}]})}\n\n"
                                yield "data: [DONE]\n\n"
                                return
                            line_count = 0
                            buffer = ""
                            async for text in resp.aiter_text():
                                buffer += text
                                lines = buffer.split("\n")
                                buffer = lines.pop()
                                for line in lines:
                                    trimmed = line.strip()
                                    if trimmed:
                                        line_count += 1
                                        if line_count <= 3:
                                            print(f"[代理] 转发 #{line_count}: {trimmed[:200]}", flush=True)
                                        yield trimmed + "\n\n"
                            if buffer.strip():
                                line_count += 1
                                yield buffer.strip() + "\n\n"
                            print(f"[代理] 转发完毕, 共 {line_count} 行", flush=True)
                except Exception as e:
                    yield f"data: {json.dumps({'choices': [{'delta': {'content': f'[代理异常] {str(e)}'}}]})}\n\n"
                    yield "data: [DONE]\n\n"

            return StreamingResponse(direct_proxy_stream(), media_type="text/event-stream",
                                     headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"})
        else:
            try:
                payload = {"model": model, "messages": req_messages, "stream": False, "temperature": request.temperature}
                async with httpx.AsyncClient(timeout=120.0) as client:
                    resp = await client.post(f"{api_base}/v1/chat/completions", json=payload, headers=headers)
                    if resp.status_code >= 400:
                        err_text = resp.text[:500]
                        return {"error": {"message": f"[API错误 {resp.status_code}] {err_text}"}}
                    return resp.json()
            except Exception as e:
                return {"error": {"message": f"[代理异常] {str(e)}"}}

    if time.time() - frontend_last_seen <= 10:
        import uuid
        task_id = str(uuid.uuid4())
        bridge_responses[task_id] = asyncio.Queue()
        api_messages = [{"role": m.role, "content": m.content} for m in request.messages]
        await bridge_queue.put({"task_id": task_id, "messages": api_messages, "context_mode": request.context_mode})

        async def bridge_stream():
            while True:
                chunk = await bridge_responses[task_id].get()
                if chunk == "[DONE]":
                    yield "data: [DONE]\n\n"
                    break
                elif chunk.startswith("[ERROR]"):
                    yield f"data: {json.dumps({'choices': [{'delta': {'content': chunk}}]})}\n\n"
                    break
                else:
                    yield f"data: {json.dumps({'choices': [{'delta': {'content': chunk}}]})}\n\n"
            del bridge_responses[task_id]

        return StreamingResponse(bridge_stream(), media_type="text/event-stream")

    # 前端主脑未在线时，尝试直接调用 LLM
    USERDATA_DIR = os.path.join(os.path.dirname(BASE_DIR), "userdata")
    config_path = os.path.join(USERDATA_DIR, "config.json")
    provider = None
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            active = config.get("active", "")
            providers = config.get("providers", {})
            if active and active in providers:
                p = providers[active]
                if p.get("api_base") and p["api_base"] != "-":
                    provider = p
        except Exception:
            pass

    if not provider:
        async def error_stream():
            yield f"data: {json.dumps({'choices': [{'delta': {'content': '[系统阻断] 前端主脑未运行，且后端未配置有效的 LLM 接口。请开启网页端的【后端通讯】功能。'}}]})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    import httpx
    api_base = provider["api_base"].rstrip("/")
    api_key = provider.get("api_key", "")
    model = provider.get("model", "gpt-3.5-turbo")

    # RAG 技能检索注入
    system_messages = [m for m in request.messages if m.role == "system"]
    user_messages = [m for m in request.messages if m.role != "system"]
    if skills_engine:
        last_user = next((m for m in reversed(request.messages) if m.role == "user"), None)
        if last_user:
            query = last_user.content if isinstance(last_user.content, str) else str(last_user.content)
            extra = ""
            if kb_engine and kb_engine.is_indexed:
                try:
                    kb_result = await kb_engine.hybrid_retrieve(query, {"top_k": 5, "use_rerank": False, "embedding": {}})
                    if kb_result.get("core_rules"): extra += f"\n\n【核心技能设定】\n{kb_result['core_rules']}"
                    if kb_result.get("results"): extra += f"\n\n【相关知识检索】\n{kb_result['results']}"
                except Exception:
                    core = skills_engine.core_rules
                    rag = skills_engine.retrieve(query)
                    if core: extra += f"\n\n【核心技能设定】\n{core}"
                    if rag: extra += f"\n\n【相关知识检索】\n{rag}"
            else:
                core = skills_engine.core_rules
                rag = skills_engine.retrieve(query)
                if core: extra += f"\n\n【核心技能设定】\n{core}"
                if rag: extra += f"\n\n【相关知识检索】\n{rag}"
            if extra:
                if system_messages:
                    sys_msg = system_messages[0]
                    patched = [ChatMessage(role=sys_msg.role, content=sys_msg.content + extra)] + user_messages
                else:
                    patched = [ChatMessage(role="system", content=extra.strip())] + user_messages
            else:
                patched = list(request.messages)
        else:
            patched = list(request.messages)
    else:
        patched = list(request.messages)

    api_messages = [{"role": m.role, "content": m.content} for m in patched]

    async def direct_stream():
        try:
            headers = {"Content-Type": "application/json"}
            if api_key and api_key != "-":
                headers["Authorization"] = f"Bearer {api_key}"
            payload = {"model": model, "messages": api_messages, "stream": True, "temperature": request.temperature}
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream("POST", f"{api_base}/v1/chat/completions", json=payload, headers=headers) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        yield f"data: {json.dumps({'choices': [{'delta': {'content': f'[LLM 错误] HTTP {resp.status_code}: {body.decode()[:200]}'}}]})}\n\n"
                        yield "data: [DONE]\n\n"
                        return
                    buffer = ""
                    async for chunk in resp.aiter_text():
                        buffer += chunk
                        lines = buffer.split("\n")
                        buffer = lines.pop()
                        for line in lines:
                            trimmed = line.strip()
                            if trimmed:
                                yield trimmed + "\n\n"
                    if buffer.strip():
                        yield buffer.strip() + "\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'choices': [{'delta': {'content': f'[LLM 连接错误] {str(e)}'}}]})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(direct_stream(), media_type="text/event-stream")

@app.get("/v1/models")
async def proxy_models(api_base: str = "", api_key: str = ""):
    if not api_base:
        return {"data": [{"id": "no-base-url-configured", "object": "model"}]}
    try:
        import httpx
        api_base = api_base.strip().rstrip("/")
        if api_base.endswith('/v1'):
            api_base = api_base[:-3]
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{api_base}/v1/models", headers=headers)
            return resp.json()
    except Exception as e:
        return {"data": [{"id": f"error: {str(e)}", "object": "model"}]}

# ==========================================
# 桌宠 TTS 转发：chat.html → 后端 → 前端合成语音
# ==========================================
pet_tts_queue = asyncio.Queue()

@app.post("/api/tts_from_pet")
async def tts_from_pet(req: Request):
    data = await req.json()
    await pet_tts_queue.put(data.get("text", ""))
    return {"status": "ok"}

@app.get("/api/tts_from_pet/poll")
async def tts_from_pet_poll():
    try:
        text = await asyncio.wait_for(pet_tts_queue.get(), timeout=5.0)
        return {"text": text}
    except asyncio.TimeoutError:
        return {"text": None}

# ==========================================
# 前端语音消息转发到桌宠聊天框
# ==========================================
pet_chat_msg_queue = asyncio.Queue()

class PetChatMessage(BaseModel):
    user_msg: str
    ai_msg: str = ""

@app.post("/api/pet_chat/message")
async def pet_chat_message(msg: PetChatMessage):
    await pet_chat_msg_queue.put({"user_msg": msg.user_msg, "ai_msg": msg.ai_msg})
    return {"status": "ok"}

@app.get("/api/pet_chat/message/poll")
async def pet_chat_message_poll():
    try:
        msg = await asyncio.wait_for(pet_chat_msg_queue.get(), timeout=5.0)
        return msg
    except asyncio.TimeoutError:
        return {"user_msg": None}

# ==========================================
# 管理面板与静态资源路由
# ==========================================
def get_path(folder_name):
    p1 = os.path.join(BASE_DIR, folder_name)
    p2 = os.path.join(os.path.dirname(BASE_DIR), folder_name)
    return p1 if os.path.exists(p1) else p2

MODELS_DIR = get_path("live2d_models")
os.makedirs(MODELS_DIR, exist_ok=True)

@app.get("/api/models")
async def scan_local_models():
    result = []
    for root, _, files in os.walk(MODELS_DIR):
        for file in files:
            if file.endswith((".model3.json", ".model.json")):
                rel_path = os.path.relpath(os.path.join(root, file), MODELS_DIR).replace('\\', '/')
                encoded_path = '/'.join(quote(seg, safe='') for seg in rel_path.split('/'))
                result.append({"name": os.path.basename(os.path.dirname(os.path.join(root, file))), "path": f"http://127.0.0.1:5201/models/{encoded_path}"})
    return {"models": result}

@app.post("/admin/api/fetch_models")
async def dummy_fetch_models(req: Request):
    return {"data": [{"id": "请在主前端页面探测模型"}]}

@app.get("/api/skills/retrieve")
async def retrieve_skills(q: str, top_k: int = 3, packs: str = "", user_id: str = "default"):
    if not skills_engine:
        return {"core_rules": "", "results": ""}
    skills_engine.reload_library(user_id)
    pack_list = [p.strip() for p in packs.split(",") if p.strip()] if packs else None
    return {
        "core_rules": skills_engine.get_core_rules(pack_list),
        "results": skills_engine.retrieve(q, top_k, pack_list)
    }

@app.get("/api/skills/packs")
async def get_skill_packs(user_id: str = "default"):
    if not skills_engine:
        return {"packs": []}
    skills_engine.reload_library(user_id)
    return {"packs": skills_engine.get_skill_packs()}

@app.get("/admin/api/skills")
async def get_skills(user_id: str = "default"):
    if skills_engine:
        skills_engine.reload_library(user_id)
    return {"files": skills_engine.files_list if skills_engine else []}

@app.post("/admin/api/skills/toggle")
async def toggle_skill(req: Request):
    if skills_engine:
        data = await req.json()
        updates = data.get("updates", [])
        user_id = data.get("user_id", "default")
        # 为每个 update 生成 scope-aware 的 status key
        scoped_updates = []
        for u in updates:
            scope = u.get("scope", "public")
            key = f"@private/{u['path']}" if scope == "private" else u["path"]
            scoped_updates.append({"path": key, "enabled": u["enabled"]})
        skills_engine.toggle_skills(scoped_updates, user_id)
    return {"status": "ok"}

@app.post("/admin/api/skills/toggle_pack")
async def toggle_skill_pack(req: Request):
    if skills_engine:
        data = await req.json()
        pack_name = data.get("pack", "")
        enabled = data.get("enabled", True)
        user_id = data.get("user_id", "default")
        updates = []
        for f in skills_engine.files_list:
            if f["pack"] == pack_name:
                key = f"@private/{f['path']}" if f.get("scope") == "private" else f["path"]
                updates.append({"path": key, "enabled": enabled})
        skills_engine.toggle_skills(updates, user_id)
    return {"status": "ok"}

@app.get("/admin/api/file_content")
async def get_file_content(path: str, scope: str = "public", user_id: str = "default"):
    if not skills_engine: return {"error": "技能引擎未加载"}
    if scope == "private":
        lib_dir = os.path.abspath(skills_engine._get_private_library_dir(user_id))
    else:
        lib_dir = os.path.abspath(skills_engine.library_dir)
    target = os.path.abspath(os.path.join(lib_dir, path))
    if not target.startswith(lib_dir): return {"error": "非法路径访问"}
    try:
        with open(target, 'r', encoding='utf-8') as f: return {"content": f.read(10000)}
    except Exception as e: return {"error": str(e)}

import zipfile
import io

ALLOWED_EXTENSIONS = {'.txt', '.md', '.json'}

@app.post("/admin/api/skills/import")
async def import_skills(files: list[UploadFile] = File(...), target_dir: str = Form(""), user_id: str = Form("default"), scope: str = Form("public")):
    if not skills_engine:
        return {"ok": False, "msg": "技能引擎未加载"}
    # 根据 scope 选择目标目录
    if scope == "private":
        lib_dir = os.path.abspath(skills_engine._get_private_library_dir(user_id))
    else:
        lib_dir = os.path.abspath(skills_engine.library_dir)
    dest_dir = os.path.normpath(os.path.join(lib_dir, target_dir)) if target_dir else lib_dir
    if not dest_dir.startswith(lib_dir):
        return {"ok": False, "msg": "非法路径访问"}
    os.makedirs(dest_dir, exist_ok=True)

    imported = []
    errors = []

    for upload in files:
        filename = upload.filename or ""
        ext = os.path.splitext(filename)[1].lower()

        if ext == '.zip':
            try:
                content = await upload.read()
                with zipfile.ZipFile(io.BytesIO(content)) as zf:
                    for info in zf.infolist():
                        if info.is_dir():
                            continue
                        member_ext = os.path.splitext(info.filename)[1].lower()
                        if member_ext not in ALLOWED_EXTENSIONS:
                            continue
                        # 保留 ZIP 内的目录结构，过滤掉 .. 防止路径穿越
                        rel_path = info.filename.replace('\\', '/')
                        rel_path = '/'.join(p for p in rel_path.split('/') if p and p != '..')
                        if not rel_path:
                            continue
                        file_dest = os.path.normpath(os.path.join(dest_dir, rel_path))
                        if not file_dest.startswith(os.path.normpath(dest_dir)):
                            continue
                        os.makedirs(os.path.dirname(file_dest), exist_ok=True)
                        with zf.open(info) as src, open(file_dest, 'wb') as dst:
                            dst.write(src.read())
                        rel = os.path.relpath(file_dest, lib_dir).replace('\\', '/')
                        imported.append(rel)
            except zipfile.BadZipFile:
                errors.append(f"{filename}: 不是有效的 ZIP 文件")
            except Exception as e:
                errors.append(f"{filename}: {str(e)}")

        elif ext in ALLOWED_EXTENSIONS:
            try:
                content = await upload.read()
                text = content.decode('utf-8')
                file_dest = os.path.join(dest_dir, filename)
                with open(file_dest, 'w', encoding='utf-8') as f:
                    f.write(text)
                rel = os.path.relpath(file_dest, lib_dir).replace('\\', '/')
                imported.append(rel)
            except UnicodeDecodeError:
                errors.append(f"{filename}: 文件编码不是 UTF-8，已跳过")
            except Exception as e:
                errors.append(f"{filename}: {str(e)}")
        else:
            errors.append(f"{filename}: 不支持的格式 ({ext})，仅支持 .txt .md .json")

    if skills_engine:
        skills_engine.reload_library(user_id, force=True)

    # 记录上传元数据
    if imported and scope == "public":
        _save_upload_meta(user_id, imported, target_dir)

    return {"ok": True, "imported": imported, "errors": errors, "count": len(imported)}


def _get_upload_meta_path():
    return os.path.join(skills_engine.userdata_dir, "skills_uploads.json") if skills_engine else None

def _load_upload_meta():
    path = _get_upload_meta_path()
    if path and os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f: return json.load(f)
        except: pass
    return {}

def _save_upload_meta(user_id, files, target_dir=""):
    path = _get_upload_meta_path()
    if not path: return
    meta = _load_upload_meta()
    for f in files:
        meta[f] = {"uploaded_by": user_id, "time": int(time.time() * 1000), "dir": target_dir}
    try:
        with open(path, 'w', encoding='utf-8') as fh:
            json.dump(meta, fh, indent=2, ensure_ascii=False)
    except: pass


@app.post("/admin/api/skills/delete")
async def delete_skill(req: Request):
    """删除技能文件（私有随便删，公共需 Admin 或上传者）"""
    data = await req.json()
    path = (data.get("path") or "").strip()
    scope = data.get("scope", "public")
    user_id = (data.get("user_id") or "").strip()
    if not path:
        return {"ok": False, "msg": "路径不能为空"}
    if not skills_engine:
        return {"ok": False, "msg": "技能引擎未加载"}

    if scope == "private":
        lib_dir = os.path.abspath(skills_engine._get_private_library_dir(user_id))
    else:
        lib_dir = os.path.abspath(skills_engine.library_dir)
        # 权限检查：Admin 或上传者才能删公共文件
        meta = _load_upload_meta()
        uploader = meta.get(path, {}).get("uploaded_by", "")
        if user_id != "Admin" and uploader != user_id:
            return {"ok": False, "msg": "只有 Admin 或上传者才能删除公共技能文件"}

    target = os.path.normpath(os.path.join(lib_dir, path))
    if not target.startswith(os.path.normpath(lib_dir)):
        return {"ok": False, "msg": "非法路径"}
    if not os.path.exists(target):
        return {"ok": False, "msg": "文件不存在"}

    try:
        if os.path.isfile(target):
            os.remove(target)
        elif os.path.isdir(target):
            shutil.rmtree(target)
        # 清理空父目录
        parent = os.path.dirname(target)
        while parent != lib_dir:
            if os.path.isdir(parent) and not os.listdir(parent):
                os.rmdir(parent)
                parent = os.path.dirname(parent)
            else:
                break
        # 清理上传元数据
        if scope == "public":
            meta = _load_upload_meta()
            meta.pop(path, None)
            p = _get_upload_meta_path()
            if p:
                with open(p, 'w', encoding='utf-8') as fh:
                    json.dump(meta, fh, indent=2, ensure_ascii=False)
        skills_engine.reload_library(user_id, force=True)
        return {"ok": True, "msg": "已删除"}
    except Exception as e:
        return {"ok": False, "msg": f"删除失败: {e}"}


@app.post("/admin/api/skills/approve")
async def approve_skill(req: Request):
    """Admin 审核公共技能文件（通过/拒绝）"""
    data = await req.json()
    path = (data.get("path") or "").strip()
    action = data.get("action", "approve")  # approve / reject
    operator = (data.get("operator") or "").strip()
    if operator != "Admin":
        return {"ok": False, "msg": "仅 Admin 可审核"}
    if not path or not skills_engine:
        return {"ok": False, "msg": "参数错误"}

    lib_dir = os.path.abspath(skills_engine.library_dir)
    target = os.path.normpath(os.path.join(lib_dir, path))
    if not target.startswith(os.path.normpath(lib_dir)):
        return {"ok": False, "msg": "非法路径"}

    if action == "reject":
        if os.path.exists(target):
            if os.path.isfile(target):
                os.remove(target)
            elif os.path.isdir(target):
                shutil.rmtree(target)
        meta = _load_upload_meta()
        meta.pop(path, None)
        p = _get_upload_meta_path()
        if p:
            with open(p, 'w', encoding='utf-8') as fh:
                json.dump(meta, fh, indent=2, ensure_ascii=False)
        skills_engine.reload_library("user_Admin", force=True)
        return {"ok": True, "msg": "已拒绝并删除"}

    # approve: 文件已在公共目录，只需标记为已审核
    meta = _load_upload_meta()
    if path in meta:
        meta[path]["approved"] = True
        p = _get_upload_meta_path()
        if p:
            with open(p, 'w', encoding='utf-8') as fh:
                json.dump(meta, fh, indent=2, ensure_ascii=False)
    return {"ok": True, "msg": "已通过审核"}


@app.get("/admin/api/skills/pending")
async def get_pending_skills(operator: str = ""):
    """Admin 获取待审核的公共技能文件列表"""
    if operator != "Admin":
        return {"ok": False, "pending": []}
    if not skills_engine:
        return {"ok": False, "pending": []}
    meta = _load_upload_meta()
    pending = []
    for path, info in meta.items():
        if not info.get("approved", False):
            pending.append({
                "path": path,
                "uploaded_by": info.get("uploaded_by", ""),
                "time": info.get("time", 0),
                "dir": info.get("dir", "")
            })
    pending.sort(key=lambda x: x["time"], reverse=True)
    return {"ok": True, "pending": pending}

# ==========================================
# 知识库 (Knowledge Base) API
# ==========================================

class KBConfig(BaseModel):
    base_url: str = ""
    api_key: str = ""
    model: str = "text-embedding-3-small"
    dimensions: int = 1536

class KBRerankConfig(BaseModel):
    base_url: str = ""
    api_key: str = ""
    model: str = ""
    top_k: int = 3

class KBRetrieveRequest(BaseModel):
    q: str
    top_k: int = 5
    packs: str = ""
    use_kb: bool = True
    rerank: bool = False
    embedding_base_url: str = ""
    embedding_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    rerank_base_url: str = ""
    rerank_api_key: str = ""
    rerank_model: str = ""

class KBIndexRequest(BaseModel):
    embedding_base_url: str = ""
    embedding_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    user_id: str = "default"

@app.get("/api/kb/status")
async def kb_status():
    if not kb_engine:
        return {"ok": False, "msg": "知识库引擎未加载"}
    return {"ok": True, **kb_engine.get_status()}

@app.post("/api/kb/test-embedding")
async def kb_test_embedding(req: KBConfig):
    if not kb_engine:
        return {"ok": False, "msg": "知识库引擎未加载"}
    config = {"base_url": req.base_url, "api_key": req.api_key, "model": req.model, "dimensions": req.dimensions}
    return await kb_engine.test_connection(config)

@app.post("/api/kb/reindex")
async def kb_reindex(req: KBIndexRequest):
    if not kb_engine:
        return {"ok": False, "msg": "知识库引擎未加载"}
    if skills_engine:
        skills_engine.reload_library(req.user_id, force=True)
    config = {"base_url": req.embedding_base_url, "api_key": req.embedding_api_key, "model": req.embedding_model, "dimensions": req.embedding_dimensions}
    try:
        return await kb_engine.index_documents(config)
    except Exception as e:
        return {"ok": False, "msg": f"索引失败: {str(e)}"}

@app.post("/api/kb/retrieve")
async def kb_retrieve(req: KBRetrieveRequest):
    if not kb_engine:
        if skills_engine:
            pack_list = [p.strip() for p in req.packs.split(",") if p.strip()] if req.packs else None
            return {"core_rules": skills_engine.get_core_rules(pack_list), "results": skills_engine.retrieve(req.q, req.top_k, pack_list)}
        return {"core_rules": "", "results": ""}

    pack_list = [p.strip() for p in req.packs.split(",") if p.strip()] if req.packs else None
    config = {
        "top_k": req.top_k,
        "rerank_top_k": 3,
        "use_rerank": req.rerank,
        "embedding": {
            "base_url": req.embedding_base_url,
            "api_key": req.embedding_api_key,
            "model": req.embedding_model,
            "dimensions": req.embedding_dimensions
        },
        "rerank": {
            "base_url": req.rerank_base_url,
            "api_key": req.rerank_api_key,
            "model": req.rerank_model,
            "top_k": 3
        }
    }
    try:
        return await kb_engine.hybrid_retrieve(req.q, config, pack_list)
    except Exception as e:
        print(f"⚠️ 知识库检索失败，降级为纯 BM25: {e}")
        if skills_engine:
            return {"core_rules": skills_engine.get_core_rules(pack_list), "results": skills_engine.retrieve(req.q, req.top_k, pack_list)}
        return {"core_rules": "", "results": ""}

# ==========================================
# QQ 机器人 (OneBot V11)
# ==========================================

class QQBotConfig(BaseModel):
    wsMode: str = "forward"
    wsUrl: str = "ws://127.0.0.1:3001"
    reverseWsHost: str = "0.0.0.0"
    reverseWsPort: int = 6700
    token: str = ""
    adminQQ: str = ""
    privateWhitelistEnabled: bool = False
    privateWhitelist: str = ""
    groupWhitelistEnabled: bool = False
    groupWhitelist: str = ""
    persona: str = ""
    contextLength: int = 20
    activeReplyRate: int = 5
    botApiBaseUrl: str = ""
    botApiKey: str = ""
    botApiModel: str = "gpt-3.5-turbo"
    botApiTemperature: float = 0.7
    sessions: dict = {}
    contextGroups: dict = {}

@app.get("/api/qqbot/status")
async def qqbot_status():
    if not qq_bot:
        return {"ok": False, "msg": "QQ 机器人引擎未加载"}
    return {"ok": True, **qq_bot.get_status()}

@app.get("/api/qqbot/logs")
async def qqbot_logs(since: int = 0):
    if not qq_bot:
        return {"ok": False, "msg": "QQ 机器人引擎未加载"}
    logs = qq_bot.get_logs(since)
    return {"ok": True, "logs": logs, "total": len(qq_bot._logs)}

@app.get("/api/qqbot/contexts")
async def qqbot_contexts():
    if not qq_bot:
        return {"ok": False, "msg": "QQ 机器人引擎未加载"}
    result = []
    for sid, msgs in qq_bot._contexts.items():
        result.append({
            "id": sid,
            "message_count": len(msgs),
            "display_name": sid,
        })
    result.sort(key=lambda x: x["id"])
    return {"ok": True, "contexts": result}

@app.post("/api/qqbot/context/delete")
async def qqbot_context_delete(req: dict):
    if not qq_bot:
        return {"ok": False, "msg": "QQ 机器人引擎未加载"}
    sid = req.get("id", "")
    if sid in qq_bot._contexts:
        del qq_bot._contexts[sid]
        qq_bot.save_contexts()
        return {"ok": True, "msg": f"已删除 {sid} 的聊天记录"}
    return {"ok": False, "msg": "未找到该会话"}

@app.post("/api/qqbot/context/export")
async def qqbot_context_export(req: dict):
    if not qq_bot:
        return {"ok": False, "msg": "QQ 机器人引擎未加载"}
    sid = req.get("id", "")
    if sid not in qq_bot._contexts:
        return {"ok": False, "msg": "未找到该会话"}
    return {"ok": True, "id": sid, "messages": qq_bot._contexts[sid]}

@app.get("/api/qqbot/config")
async def qqbot_get_config():
    if not qq_bot:
        return {"ok": False, "msg": "QQ 机器人引擎未加载"}
    return {"ok": True, "config": qq_bot.load_config()}

@app.get("/api/qqbot/plugins")
async def qqbot_plugins():
    if not qq_bot:
        return {"ok": False, "msg": "QQ 机器人引擎未加载"}
    if not qq_bot._plugin_manager:
        return {"ok": True, "plugins": [], "plugin_dir": "", "msg": "插件管理器未加载"}
    plugins = qq_bot._plugin_manager.get_plugin_list()
    plugin_dir = qq_bot._plugin_manager.plugin_dir
    return {"ok": True, "plugins": plugins, "plugin_dir": plugin_dir}

@app.post("/api/qqbot/plugins/reload")
async def qqbot_plugins_reload():
    if not qq_bot:
        return {"ok": False, "msg": "QQ 机器人引擎未加载"}
    if not qq_bot._plugin_manager:
        return {"ok": False, "msg": "插件管理器未加载"}
    qq_bot._plugin_manager.load_plugins()
    count = len(qq_bot._plugin_manager.plugins)
    return {"ok": True, "msg": f"已重新加载 {count} 个插件", "count": count}

class QQBotPluginToggleReq(BaseModel):
    name: str
    enabled: bool

@app.post("/api/qqbot/plugins/toggle")
async def qqbot_plugin_toggle(req: QQBotPluginToggleReq):
    if not qq_bot:
        return {"ok": False, "msg": "QQ 机器人引擎未加载"}
    if not qq_bot._plugin_manager:
        return {"ok": False, "msg": "插件管理器未加载"}
    ok = qq_bot._plugin_manager.toggle_plugin(req.name, req.enabled)
    return {"ok": ok, "msg": f"插件 {req.name} 已{'启用' if req.enabled else '禁用'}" if ok else "未找到该插件"}

@app.post("/api/qqbot/config")
async def qqbot_save_config(req: QQBotConfig):
    if not qq_bot:
        return {"ok": False, "msg": "QQ 机器人引擎未加载"}
    config = req.model_dump()
    qq_bot.save_config(config)
    if qq_bot.is_running:
        qq_bot.update_config(config)
    return {"ok": True}

@app.post("/api/qqbot/start")
async def qqbot_start(req: QQBotConfig):
    if not qq_bot:
        return {"ok": False, "msg": "QQ 机器人引擎未加载"}
    config = req.model_dump()
    return await qq_bot.start(config)

@app.post("/api/qqbot/stop")
async def qqbot_stop():
    if not qq_bot:
        return {"ok": False, "msg": "QQ 机器人引擎未加载"}
    return await qq_bot.stop()

class QQBotTestReq(BaseModel):
    wsUrl: str = "ws://127.0.0.1:3001"
    token: str = ""
    wsMode: str = "forward"

@app.post("/api/qqbot/test")
async def qqbot_test(req: QQBotTestReq):
    if not qq_bot:
        return {"ok": False, "msg": "QQ 机器人引擎未加载"}
    return await qq_bot.test_connection(req.wsUrl, req.token, req.wsMode)

class QQBotFetchModelsReq(BaseModel):
    baseUrl: str = ""
    apiKey: str = ""

@app.post("/api/qqbot/fetch_models")
async def qqbot_fetch_models(req: QQBotFetchModelsReq):
    if not req.baseUrl:
        return {"ok": False, "msg": "请先输入接口地址"}
    import httpx as _httpx
    url = req.baseUrl.rstrip("/")
    if not url.endswith("/v1/models"):
        url += "/v1/models"
    headers = {"Content-Type": "application/json"}
    if req.apiKey:
        headers["Authorization"] = f"Bearer {req.apiKey}"
    try:
        async with _httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            if data and data.get("data") and isinstance(data["data"], list):
                models = sorted([m["id"] for m in data["data"] if "id" in m])
                return {"ok": True, "models": models}
            return {"ok": False, "msg": "接口返回格式异常"}
    except Exception as e:
        return {"ok": False, "msg": f"获取失败: {str(e)[:100]}"}

STATIC_DIR = get_path("web_static")

# ==========================================
# 服务端数据导出/导入 API（供前端全量备份使用）
# ==========================================
USERDATA_DIR = os.path.join(os.path.dirname(BASE_DIR), "userdata")


@app.get("/api/server-data/export")
async def export_server_data():
    """导出 userdata 目录下所有数据"""
    import glob as globmod
    result = {"json_files": {}, "skills_library": {}, "bot_plugins": {}}

    # 1. JSON 配置文件（包含 config.json）
    json_files = ['config.json', 'qq_bot_config.json', 'qq_bot_contexts.json', 'ui_config.json', 'knowledge_base_vectors.json']
    for fname in json_files:
        fpath = os.path.join(USERDATA_DIR, fname)
        if os.path.exists(fpath):
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    result["json_files"][fname] = json.load(f)
            except Exception:
                pass

    # 2. 所有 skills_status*.json（修复：支持 per-user 文件名）
    for fpath in globmod.glob(os.path.join(USERDATA_DIR, 'skills_status*.json')):
        fname = os.path.basename(fpath)
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                result["json_files"][fname] = json.load(f)
        except Exception:
            pass

    # 3. skills_library 文档
    skills_dir = os.path.join(USERDATA_DIR, "skills_library")
    if os.path.isdir(skills_dir):
        for root, _, files in os.walk(skills_dir):
            for f in files:
                fpath = os.path.join(root, f)
                rel = os.path.relpath(fpath, USERDATA_DIR).replace('\\', '/')
                try:
                    with open(fpath, 'r', encoding='utf-8') as fh:
                        result["skills_library"][rel] = fh.read()
                except Exception:
                    try:
                        import base64
                        with open(fpath, 'rb') as fh:
                            result["skills_library"][rel] = {"__binary__": True, "data": base64.b64encode(fh.read()).decode()}
                    except Exception:
                        pass

    # 4. 自定义 QQ Bot 插件（排除内置文件）
    bot_plugins_dir = os.path.join(BASE_DIR, "bot_plugins")
    if os.path.isdir(bot_plugins_dir):
        for f in os.listdir(bot_plugins_dir):
            if f.endswith('.py') and f not in ('__init__.py', 'example_plugin.py'):
                fpath = os.path.join(bot_plugins_dir, f)
                try:
                    with open(fpath, 'r', encoding='utf-8') as fh:
                        result["bot_plugins"][f] = fh.read()
                except Exception:
                    pass

    return {"ok": True, "data": result}


class ServerDataImport(BaseModel):
    json_files: dict = {}
    skills_library: dict = {}

@app.post("/api/server-data/import")
async def import_server_data(req: ServerDataImport):
    """恢复 userdata 目录数据"""
    os.makedirs(USERDATA_DIR, exist_ok=True)
    count = 0
    # 恢复 JSON 配置文件
    for fname, content in req.json_files.items():
        fpath = os.path.join(USERDATA_DIR, fname)
        try:
            with open(fpath, 'w', encoding='utf-8') as f:
                json.dump(content, f, ensure_ascii=False, indent=2)
            count += 1
        except Exception:
            pass
    # 恢复 skills_library 文档
    for rel, content in req.skills_library.items():
        fpath = os.path.join(USERDATA_DIR, rel)
        os.makedirs(os.path.dirname(fpath), exist_ok=True)
        try:
            if isinstance(content, dict) and content.get("__binary__"):
                import base64
                with open(fpath, 'wb') as f:
                    f.write(base64.b64decode(content["data"]))
            else:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(content)
            count += 1
        except Exception:
            pass
    return {"ok": True, "msg": f"已恢复 {count} 个服务端数据文件", "count": count}


# ==========================================
# 用户数据服务端存储 API
# ==========================================
from userdata_store import UserdataStore
store = UserdataStore(USERDATA_DIR)

# --- 认证 API ---

@app.post("/api/auth/setup_default")
async def auth_setup_default():
    """首次启动：创建默认 Admin 账号"""
    existing = store.get_user("Admin")
    if existing:
        return {"ok": True, "msg": "Admin 已存在", "created": False}
    import hashlib
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha-256', b'Admin', salt, 100000)
    store.save_user("Admin", {
        "id": "Admin", "salt": salt.hex(), "hash": dk.hex(),
        "createdAt": int(time.time() * 1000), "isDefault": True
    })
    return {"ok": True, "msg": "Admin 账号已创建", "created": True}


@app.post("/api/auth/login")
async def auth_login(req: Request):
    data = await req.json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username:
        return {"ok": False, "msg": "请输入用户名"}
    user = store.get_user(username)
    if not user:
        return {"ok": False, "msg": "用户不存在"}
    # 无密码账号（首次登录）
    if not user.get("hash"):
        if password:
            # 用户输入了密码，直接设置
            import hashlib
            salt = os.urandom(16)
            dk = hashlib.pbkdf2_hmac('sha-256', password.encode(), salt, 100000)
            user["salt"] = salt.hex()
            user["hash"] = dk.hex()
            store.save_user(username, user)
            return {"ok": True, "mirror_id": f"user_{username}"}
        return {"ok": True, "mirror_id": f"user_{username}", "need_password": True}
    if not password:
        return {"ok": False, "msg": "请输入密码"}
    import hashlib
    salt = bytes.fromhex(user["salt"])
    dk = hashlib.pbkdf2_hmac('sha-256', password.encode(), salt, 100000)
    if dk.hex() != user["hash"]:
        return {"ok": False, "msg": "密码错误"}
    return {"ok": True, "mirror_id": f"user_{username}"}


@app.post("/api/auth/change_password")
async def auth_change_password(req: Request):
    data = await req.json()
    username = (data.get("username") or "").strip()
    old_password = data.get("oldPassword") or ""
    new_password = data.get("newPassword") or ""
    if not new_password or len(new_password) < 4:
        return {"ok": False, "msg": "新密码至少4个字符"}
    user = store.get_user(username)
    if not user:
        return {"ok": False, "msg": "用户不存在"}
    import hashlib
    salt = bytes.fromhex(user["salt"])
    dk = hashlib.pbkdf2_hmac('sha-256', old_password.encode(), salt, 100000)
    if dk.hex() != user["hash"]:
        return {"ok": False, "msg": "当前密码错误"}
    new_salt = os.urandom(16)
    new_dk = hashlib.pbkdf2_hmac('sha-256', new_password.encode(), new_salt, 100000)
    user["salt"] = new_salt.hex()
    user["hash"] = new_dk.hex()
    store.save_user(username, user)
    return {"ok": True, "msg": "密码修改成功"}


@app.get("/api/auth/users")
async def auth_list_users():
    return {"ok": True, "users": store.list_usernames()}


@app.get("/api/auth/users/list")
async def auth_list_users_detailed():
    """返回用户列表（含创建时间、是否有密码）"""
    users = store.load_users()
    result = []
    for username, data in users.items():
        result.append({
            "id": username,
            "hasPassword": bool(data.get("hash")),
            "createdAt": data.get("createdAt", 0)
        })
    result.sort(key=lambda u: u.get("createdAt", 0), reverse=True)
    return {"ok": True, "users": result}


@app.post("/api/auth/register")
async def auth_register_v2(req: Request):
    """注册新账号（支持无密码创建）"""
    data = await req.json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    no_password = data.get("no_password", False)
    if not username or len(username) < 2:
        return {"ok": False, "msg": "用户名至少2个字符"}
    if not no_password and (not password or len(password) < 4):
        return {"ok": False, "msg": "密码至少4个字符"}
    if store.get_user(username):
        return {"ok": False, "msg": "该用户名已被注册"}
    import hashlib
    user_data = {"id": username, "salt": "", "hash": "", "createdAt": int(time.time() * 1000)}
    if not no_password:
        salt = os.urandom(16)
        dk = hashlib.pbkdf2_hmac('sha-256', password.encode(), salt, 100000)
        user_data["salt"] = salt.hex()
        user_data["hash"] = dk.hex()
    store.save_user(username, user_data)
    return {"ok": True, "mirror_id": f"user_{username}"}


@app.post("/api/auth/force_set_password")
async def auth_force_set_password(req: Request):
    """无密码账号首次登录时强制设置密码"""
    data = await req.json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password or len(password) < 4:
        return {"ok": False, "msg": "密码至少4个字符"}
    user = store.get_user(username)
    if not user:
        return {"ok": False, "msg": "用户不存在"}
    import hashlib
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha-256', password.encode(), salt, 100000)
    user["salt"] = salt.hex()
    user["hash"] = dk.hex()
    store.save_user(username, user)
    return {"ok": True}


@app.post("/api/auth/admin/reset_password")
async def admin_reset_password(req: Request):
    """Admin 重置指定用户密码"""
    data = await req.json()
    operator = (data.get("operator") or "").strip()
    target = (data.get("username") or "").strip()
    new_password = (data.get("newPassword") or "").strip()
    if operator != "Admin":
        return {"ok": False, "msg": "仅 Admin 可执行此操作"}
    if not target or not new_password or len(new_password) < 4:
        return {"ok": False, "msg": "新密码至少4个字符"}
    user = store.get_user(target)
    if not user:
        return {"ok": False, "msg": "用户不存在"}
    import hashlib
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha-256', new_password.encode(), salt, 100000)
    user["salt"] = salt.hex()
    user["hash"] = dk.hex()
    store.save_user(target, user)
    return {"ok": True, "msg": f"已重置 {target} 的密码"}


@app.post("/api/auth/admin/clear_password")
async def admin_clear_password(req: Request):
    """Admin 清除指定用户密码（变为无密码账号）"""
    data = await req.json()
    operator = (data.get("operator") or "").strip()
    target = (data.get("username") or "").strip()
    if operator != "Admin":
        return {"ok": False, "msg": "仅 Admin 可执行此操作"}
    if not target:
        return {"ok": False, "msg": "用户名不能为空"}
    if target == "Admin":
        return {"ok": False, "msg": "不能清除 Admin 的密码"}
    user = store.get_user(target)
    if not user:
        return {"ok": False, "msg": "用户不存在"}
    user["salt"] = ""
    user["hash"] = ""
    store.save_user(target, user)
    return {"ok": True, "msg": f"已清除 {target} 的密码"}


def _force_delete_dir(path):
    """强制删除目录，处理 Windows 文件锁"""
    if not os.path.isdir(path):
        return
    try:
        shutil.rmtree(path)
    except Exception:
        import subprocess
        try:
            subprocess.run(["cmd", "/c", "rd", "/s", "/q", path], capture_output=True, timeout=10)
        except Exception:
            pass
    # 最终验证
    if os.path.isdir(path):
        raise RuntimeError(f"无法删除目录: {path}")


async def _async_delete_dir(path):
    """在线程池中执行目录删除，不阻塞事件循环"""
    import asyncio
    await asyncio.to_thread(_force_delete_dir, path)


@app.post("/api/auth/admin/delete_user")
async def admin_delete_user(req: Request):
    """Admin 注销指定用户（删除账号+全部数据）"""
    data = await req.json()
    operator = (data.get("operator") or "").strip()
    target = (data.get("username") or "").strip()
    if operator != "Admin":
        return {"ok": False, "msg": "仅 Admin 可执行此操作"}
    if not target:
        return {"ok": False, "msg": "用户名不能为空"}
    if target == "Admin":
        return {"ok": False, "msg": "不能注销 Admin 账号"}
    if not store.get_user(target):
        return {"ok": False, "msg": "用户不存在"}
    # 删除用户数据目录
    user_dir = os.path.join(USERDATA_DIR, f"user_{target}")
    await _async_delete_dir(user_dir)
    # 删除自动备份
    backup_dir = os.path.join(USERDATA_DIR, "auto_backup", f"user_{target}")
    await _async_delete_dir(backup_dir)
    # 从 users.json 中移除
    store.delete_user(target)
    # 清除该用户的技能缓存
    if skills_engine and target in skills_engine._user_cache:
        del skills_engine._user_cache[target]
    # 验证删除结果
    remaining = os.path.isdir(user_dir)
    return {"ok": True, "msg": f"已注销用户 {target} 及其全部数据", "dir_deleted": not remaining}


@app.post("/api/auth/delete_account")
async def delete_own_account(req: Request):
    """用户注销自己的账号（需验证密码）"""
    data = await req.json()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    if not username or not password:
        return {"ok": False, "msg": "请填写密码"}
    user = store.get_user(username)
    if not user:
        return {"ok": False, "msg": "用户不存在"}
    # 验证密码
    if user.get("hash"):
        import hashlib
        salt = bytes.fromhex(user["salt"])
        dk = hashlib.pbkdf2_hmac('sha-256', password.encode(), salt, 100000)
        if dk.hex() != user["hash"]:
            return {"ok": False, "msg": "密码错误"}
    # 删除数据
    user_dir = os.path.join(USERDATA_DIR, f"user_{username}")
    await _async_delete_dir(user_dir)
    backup_dir = os.path.join(USERDATA_DIR, "auto_backup", f"user_{username}")
    await _async_delete_dir(backup_dir)
    store.delete_user(username)
    # 清除该用户的技能缓存
    if skills_engine and username in skills_engine._user_cache:
        del skills_engine._user_cache[username]
    return {"ok": True, "msg": "账号已注销"}


# --- 全局登录背景图（不绑定用户，所有用户共享）---

GLOBAL_DIR = os.path.join(USERDATA_DIR, "_global")

@app.post("/api/login-bg")
async def upload_login_bg(file: UploadFile = File(...)):
    os.makedirs(GLOBAL_DIR, exist_ok=True)
    data = await file.read()
    filepath = os.path.join(GLOBAL_DIR, "login_bg.png")
    with open(filepath, 'wb') as f:
        f.write(data)
    return {"ok": True}

@app.get("/api/login-bg")
async def serve_login_bg():
    filepath = os.path.join(GLOBAL_DIR, "login_bg.png")
    if os.path.exists(filepath):
        return FileResponse(filepath, media_type="image/png", headers={"Cache-Control": "no-cache", **CORS_HEADERS})
    return Response(status_code=404, content='{"error": "not found"}', media_type="application/json")

@app.delete("/api/login-bg")
async def delete_login_bg():
    filepath = os.path.join(GLOBAL_DIR, "login_bg.png")
    if os.path.exists(filepath):
        os.remove(filepath)
    return {"ok": True}


@app.get("/api/login-config")
async def get_login_config():
    """读取全局登录页配置（标题、副标题、文本框等，不含背景图）"""
    filepath = os.path.join(GLOBAL_DIR, "login_config.json")
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {}


@app.put("/api/login-config")
async def save_login_config(req: Request):
    """保存全局登录页配置（仅 Admin 可调用）"""
    data = await req.json()
    os.makedirs(GLOBAL_DIR, exist_ok=True)
    filepath = os.path.join(GLOBAL_DIR, "login_config.json")
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return {"ok": True}


# --- 核心 JSON 数据 API ---

@app.get("/api/userdata/{mirror_id}/core/{key}")
async def get_core_data(mirror_id: str, key: str):
    data = store.load_core(mirror_id, key)
    if data is None:
        return Response(status_code=404, content='{"error": "not found"}', media_type="application/json")
    return data


@app.get("/api/userdata/{mirror_id}/batch")
async def batch_load_core(mirror_id: str, keys: str = "", media: bool = False):
    """批量加载核心数据 + 可选媒体列表，减少启动时的 HTTP 请求数。"""
    key_list = [k.strip() for k in keys.split(',') if k.strip()]
    result = {}
    for key in key_list:
        data = store.load_core(mirror_id, key)
        if data is not None:
            result[key] = data
    # 一次性返回媒体列表（省去 3 个独立请求）
    if media:
        result["_bgm"] = store.list_bgm(mirror_id)
        result["_bg_images"] = store.list_bg_images(mirror_id)
        result["_models"] = store.list_models(mirror_id)
        result["_mods"] = store.list_mods(mirror_id)
    return result


@app.put("/api/userdata/{mirror_id}/core/{key}")
async def put_core_data(mirror_id: str, key: str, req: Request):
    data = await req.json()
    store.save_core(mirror_id, key, data)
    return {"ok": True}


@app.delete("/api/userdata/{mirror_id}/core/{key}")
async def delete_core_data(mirror_id: str, key: str):
    store.delete_core(mirror_id, key)
    return {"ok": True}


# --- BGM API ---

@app.get("/api/userdata/{mirror_id}/bgm")
async def list_bgm(mirror_id: str):
    return store.list_bgm(mirror_id)


@app.post("/api/userdata/{mirror_id}/bgm")
async def upload_bgm(mirror_id: str, file: UploadFile = File(...), id: str = Form(...), name: str = Form(...)):
    data = await file.read()
    store.save_bgm(mirror_id, id, name, data)
    return {"ok": True}


@app.delete("/api/userdata/{mirror_id}/bgm/{bgm_id}")
async def delete_bgm(mirror_id: str, bgm_id: str):
    store.delete_bgm(mirror_id, bgm_id)
    return {"ok": True}


@app.get("/api/userdata/{mirror_id}/bgm/{bgm_id}/file")
async def serve_bgm_file(mirror_id: str, bgm_id: str):
    path = store.get_bgm_path(mirror_id, bgm_id)
    if not path or not os.path.exists(path): return Response(status_code=404, content=f'{{"error":"bgm file not found"}}', media_type="application/json")
    return FileResponse(path, media_type=store.get_mime_type(path), headers=CORS_HEADERS)


# --- 背景图片 API ---

@app.get("/api/userdata/{mirror_id}/bg_images")
async def list_bg_images(mirror_id: str):
    return store.list_bg_images(mirror_id)


@app.post("/api/userdata/{mirror_id}/bg_images")
async def upload_bg_image(mirror_id: str, file: UploadFile = File(...), id: str = Form(...), name: str = Form(...)):
    data = await file.read()
    store.save_bg_image(mirror_id, id, name, data)
    return {"ok": True}


@app.delete("/api/userdata/{mirror_id}/bg_images/{bg_id}")
async def delete_bg_image(mirror_id: str, bg_id: str):
    store.delete_bg_image(mirror_id, bg_id)
    return {"ok": True}


@app.get("/api/userdata/{mirror_id}/bg_images/{bg_id}/file")
async def serve_bg_image_file(mirror_id: str, bg_id: str):
    path = store.get_bg_image_path(mirror_id, bg_id)
    if not path or not os.path.exists(path): return Response(status_code=404, content=f'{{"error":"bg image file not found"}}', media_type="application/json")
    return FileResponse(path, media_type=store.get_mime_type(path), headers=CORS_HEADERS)


# --- 应用图片 API（标题背景等）---

@app.post("/api/userdata/{mirror_id}/app_image/{key}")
async def upload_app_image(mirror_id: str, key: str, file: UploadFile = File(...)):
    data = await file.read()
    ext = os.path.splitext(file.filename or '')[1] or '.png'
    store.save_app_image(mirror_id, key, data, ext)
    return {"ok": True}


@app.get("/api/userdata/{mirror_id}/app_image/{key}")
async def serve_app_image(mirror_id: str, key: str):
    path = store.get_app_image_path(mirror_id, key)
    if not path or not os.path.exists(path):
        return Response(status_code=404, content='{"error": "not found"}', media_type="application/json")
    return FileResponse(path, media_type=store.get_mime_type(path), headers={"Cache-Control": "no-cache", **CORS_HEADERS})


@app.delete("/api/userdata/{mirror_id}/app_image/{key}")
async def delete_app_image(mirror_id: str, key: str):
    store.delete_app_image(mirror_id, key)
    return {"ok": True}


# --- Live2D 模型 API ---

@app.get("/api/userdata/{mirror_id}/models")
async def list_models(mirror_id: str):
    return store.list_models(mirror_id)


@app.post("/api/userdata/{mirror_id}/models")
async def upload_model(mirror_id: str, req: Request):
    """多文件上传模型（multipart form-data）"""
    form = await req.form()
    model_id = form.get("id", "")
    model_name = form.get("name", "")
    file_list = []
    # 使用 getlist 获取所有同名字段的文件（修复：form[key] 只返回最后一个）
    seen_keys = set()
    for key in form:
        if key.startswith("files") and key not in seen_keys:
            seen_keys.add(key)
            uploads = form.getlist(key)
            for upload in uploads:
                if hasattr(upload, 'read'):
                    rel_path = upload.filename or key
                    data = await upload.read()
                    file_list.append((rel_path, data))
    if not file_list:
        return Response(status_code=400, content='{"error": "no files"}', media_type="application/json")
    store.save_model(mirror_id, model_id, model_name, file_list)
    return {"ok": True}


@app.post("/api/userdata/{mirror_id}/models/file")
async def upload_model_file(mirror_id: str, file: UploadFile = File(...), model_id: str = Form(...), path: str = Form(...)):
    """上传单个模型文件"""
    mid = store._sanitize(mirror_id)
    safe_model_id = store._sanitize(model_id)
    data = await file.read()
    model_dir = os.path.join(store.base_dir, mid, 'models', safe_model_id)
    safe_path = path.replace('..', '_')
    dest = os.path.join(model_dir, safe_path)
    store._atomic_write_bytes(dest, data)
    return {"ok": True, "path": safe_path}


@app.put("/api/userdata/{mirror_id}/models")
async def save_model_manifest(mirror_id: str, req: Request):
    """保存/更新模型 manifest（JSON）"""
    data = await req.json()
    model_id = data.get('id', '')
    model_name = data.get('name', '')
    files = data.get('files', [])
    mid = store._sanitize(mirror_id)
    safe_model_id = store._sanitize(model_id)
    model_dir = os.path.join(store.base_dir, mid, 'models', safe_model_id)
    os.makedirs(model_dir, exist_ok=True)
    manifest = {'id': model_id, 'name': model_name, 'files': files}
    store._atomic_write_json(os.path.join(model_dir, 'manifest.json'), manifest)
    return {"ok": True}


@app.get("/api/userdata/{mirror_id}/models/{model_id}")
async def get_model(mirror_id: str, model_id: str):
    manifest = store.get_model(mirror_id, model_id)
    if not manifest:
        return Response(status_code=404, content='{"error": "not found"}', media_type="application/json")
    return manifest


@app.delete("/api/userdata/{mirror_id}/models/{model_id}")
async def delete_model(mirror_id: str, model_id: str):
    store.delete_model(mirror_id, model_id)
    return {"ok": True}


@app.get("/api/models/all")
async def list_all_models():
    """列出所有用户目录中的模型（去重）"""
    all_models = []
    seen_ids = set()
    if not os.path.isdir(USERDATA_DIR):
        return all_models
    for entry in os.listdir(USERDATA_DIR):
        models_dir = os.path.join(USERDATA_DIR, entry, 'models')
        if not os.path.isdir(models_dir):
            continue
        for d in os.listdir(models_dir):
            manifest_path = os.path.join(models_dir, d, 'manifest.json')
            manifest = store._read_json(manifest_path)
            if manifest and manifest.get('id') not in seen_ids:
                seen_ids.add(manifest['id'])
                all_models.append({'id': manifest['id'], 'name': manifest['name']})
    return all_models


@app.get("/api/models/search/{model_id}")
async def search_model(model_id: str):
    """在所有用户目录中搜索模型（兼容老版本迁移）"""
    safe_id = store._sanitize(model_id)
    # 遍历 userdata 下所有用户目录
    if not os.path.isdir(USERDATA_DIR):
        return {"found": False}
    for entry in os.listdir(USERDATA_DIR):
        model_dir = os.path.join(USERDATA_DIR, entry, 'models', safe_id)
        manifest_path = os.path.join(model_dir, 'manifest.json')
        if os.path.exists(manifest_path):
            manifest = store._read_json(manifest_path)
            if manifest:
                return {"found": True, "mirror_id": entry, "manifest": manifest}
    return {"found": False}


@app.get("/api/userdata/{mirror_id}/models/{model_id}/files/{path:path}")
async def serve_model_file(mirror_id: str, model_id: str, path: str):
    file_path = store.get_model_file_path(mirror_id, model_id, path)
    if not file_path:
        return Response(status_code=404, content='{"error": "not found"}', media_type="application/json")
    return FileResponse(file_path, media_type=store.get_mime_type(path), headers=CORS_HEADERS)


# --- 前端插件 Mods API ---

@app.get("/api/userdata/{mirror_id}/mods")
async def list_mods(mirror_id: str):
    return store.list_mods(mirror_id)


@app.put("/api/userdata/{mirror_id}/mods/{mod_id}")
async def save_mod(mirror_id: str, mod_id: str, req: Request):
    data = await req.json()
    data['id'] = mod_id
    store.save_mod(mirror_id, data)
    return {"ok": True}


@app.delete("/api/userdata/{mirror_id}/mods/{mod_id}")
async def delete_mod(mirror_id: str, mod_id: str):
    store.delete_mod(mirror_id, mod_id)
    return {"ok": True}


# --- 插件数据通用 API ---

@app.get("/api/userdata/{mirror_id}/plugins/{plugin_name}")
async def list_plugin_data(mirror_id: str, plugin_name: str):
    return store.list_plugin_json(mirror_id, plugin_name)


@app.get("/api/userdata/{mirror_id}/plugins/{plugin_name}/{key}")
async def get_plugin_data(mirror_id: str, plugin_name: str, key: str):
    data = store.load_plugin_json(mirror_id, plugin_name, key)
    if data is None:
        return Response(status_code=404, content='{"error": "not found"}', media_type="application/json")
    return data


@app.put("/api/userdata/{mirror_id}/plugins/{plugin_name}/{key}")
async def put_plugin_data(mirror_id: str, plugin_name: str, key: str, req: Request):
    data = await req.json()
    store.save_plugin_json(mirror_id, plugin_name, key, data)
    return {"ok": True}


@app.delete("/api/userdata/{mirror_id}/plugins/{plugin_name}/{key}")
async def delete_plugin_data(mirror_id: str, plugin_name: str, key: str):
    store.delete_plugin_json(mirror_id, plugin_name, key)
    return {"ok": True}


@app.post("/api/userdata/{mirror_id}/plugins/{plugin_name}/{key}/blob")
async def upload_plugin_blob(mirror_id: str, plugin_name: str, key: str, file: UploadFile = File(...)):
    data = await file.read()
    ext = os.path.splitext(file.filename or '')[1] or '.bin'
    store.save_plugin_blob(mirror_id, plugin_name, key, data, ext)
    return {"ok": True, "file": f"{store._sanitize(key)}{ext}"}


@app.get("/api/userdata/{mirror_id}/plugins/{plugin_name}/{key}/blob")
async def serve_plugin_blob(mirror_id: str, plugin_name: str, key: str):
    path = store.get_plugin_blob_path(mirror_id, plugin_name, key)
    if not path:
        return Response(status_code=404, content='{"error": "not found"}', media_type="application/json")
    return FileResponse(path, media_type=store.get_mime_type(path), headers=CORS_HEADERS)


# --- 自动备份 API ---

AUTO_BACKUP_DIR = os.path.join(USERDATA_DIR, "auto_backup")

@app.post("/api/auto-backup")
async def auto_backup(req: Request):
    """自动备份聊天数据到本地文件夹（仅保留最新一份）"""
    data = await req.json()
    mid = store._sanitize(data.get("mirror_id", "default"))
    backup_dir = os.path.join(AUTO_BACKUP_DIR, mid)
    os.makedirs(backup_dir, exist_ok=True)

    # 清理旧备份（仅保留最新1份）
    for f in os.listdir(backup_dir):
        if f.endswith('.json'):
            try:
                os.remove(os.path.join(backup_dir, f))
            except Exception:
                pass

    # 写入新备份
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.json"
    filepath = os.path.join(backup_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data.get("content", {}), f, ensure_ascii=False)
    return {"ok": True, "file": filename}


@app.get("/api/auto-backup/{mirror_id}")
async def list_auto_backups(mirror_id: str):
    """列出可用的自动备份"""
    mid = store._sanitize(mirror_id)
    backup_dir = os.path.join(AUTO_BACKUP_DIR, mid)
    if not os.path.isdir(backup_dir):
        return {"ok": True, "backups": []}
    backups = []
    for f in sorted(os.listdir(backup_dir), reverse=True):
        if f.endswith('.json'):
            fpath = os.path.join(backup_dir, f)
            stat = os.stat(fpath)
            backups.append({
                "file": f,
                "size": stat.st_size,
                "time": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
    return {"ok": True, "backups": backups}


@app.get("/api/auto-backup/{mirror_id}/{filename}")
async def load_auto_backup(mirror_id: str, filename: str):
    """加载指定的自动备份"""
    mid = store._sanitize(mirror_id)
    safe_fn = store._sanitize(filename)
    filepath = os.path.join(AUTO_BACKUP_DIR, mid, safe_fn)
    if not os.path.exists(filepath):
        return Response(status_code=404, content='{"error": "not found"}', media_type="application/json")
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


@app.delete("/api/auto-backup/{mirror_id}/{filename}")
async def delete_auto_backup(mirror_id: str, filename: str):
    """删除指定的自动备份"""
    mid = store._sanitize(mirror_id)
    safe_fn = store._sanitize(filename)
    filepath = os.path.join(AUTO_BACKUP_DIR, mid, safe_fn)
    if os.path.exists(filepath):
        os.remove(filepath)
    return {"ok": True}


# --- 批量迁移 API ---

@app.post("/api/userdata/{mirror_id}/migrate")
async def migrate_data(mirror_id: str, req: Request):
    """从前端 IndexedDB 批量迁移到服务端"""
    data = await req.json()
    total = 0
    # 迁移核心数据
    if "core_data" in data:
        total += store.migrate_core_data(mirror_id, data["core_data"])
    # 迁移 mods
    if "app_mods" in data:
        for mod in data["app_mods"]:
            if isinstance(mod, dict) and mod.get('id'):
                store.save_mod(mirror_id, mod)
                total += 1
    return {"ok": True, "msg": f"已迁移 {total} 条数据", "count": total}


# --- 工厂重置 API ---

@app.delete("/api/userdata/{mirror_id}/all")
async def reset_user_data(mirror_id: str):
    """删除指定用户的所有数据"""
    mid = store._sanitize(mirror_id)
    user_dir = os.path.join(USERDATA_DIR, mid)
    if os.path.isdir(user_dir):
        shutil.rmtree(user_dir)
    return {"ok": True}


@app.delete("/api/admin/reset-all")
async def reset_all_data():
    """清空全软件数据（Admin 专用）：删除所有用户目录、全局数据、服务器配置"""
    import subprocess
    keep_dirs = {'skills_library'}
    errors = []

    if os.path.isdir(USERDATA_DIR):
        for entry in os.listdir(USERDATA_DIR):
            if entry in keep_dirs:
                continue
            path = os.path.join(USERDATA_DIR, entry)
            try:
                if os.path.isdir(path):
                    if sys.platform == 'win32':
                        # Windows: PowerShell Remove-Item 比 rmdir 更可靠
                        result = subprocess.run(
                            ['powershell', '-Command', f'Remove-Item -Path "{path}" -Recurse -Force'],
                            capture_output=True, timeout=15
                        )
                        if os.path.isdir(path):
                            errors.append(f"{entry}: 删除失败 ({result.stderr.decode()[:80]})")
                    else:
                        shutil.rmtree(path)
                elif os.path.isfile(path):
                    try:
                        os.remove(path)
                    except Exception:
                        if sys.platform == 'win32':
                            subprocess.run(
                                ['powershell', '-Command', f'Remove-Item -Path "{path}" -Force'],
                                capture_output=True, timeout=5
                            )
            except Exception as e:
                errors.append(f"{entry}: {e}")

    os.makedirs(USERDATA_DIR, exist_ok=True)
    if errors:
        return {"ok": True, "msg": f"已清空（{len(errors)} 项跳过）", "errors": errors[:5]}
    return {"ok": True, "msg": "全软件数据已清空"}


@app.post("/api/userdata/{source_id}/clone_to/{target_id}")
async def clone_user_data(source_id: str, target_id: str):
    """将一个用户的数据完整克隆到另一个用户"""
    src = store._sanitize(source_id)
    tgt = store._sanitize(target_id)
    src_dir = os.path.join(USERDATA_DIR, src)
    tgt_dir = os.path.join(USERDATA_DIR, tgt)
    if not os.path.isdir(src_dir):
        return {"ok": False, "msg": "源用户数据不存在"}
    if os.path.isdir(tgt_dir):
        shutil.rmtree(tgt_dir)
    shutil.copytree(src_dir, tgt_dir)
    return {"ok": True, "msg": f"已将 {src} 数据克隆至 {tgt}"}


@app.get("/admin")
async def serve_admin_ui():
    target = os.path.join(STATIC_DIR, "admin.html")
    if os.path.exists(target): return FileResponse(target)
    return {"detail": "Admin panel not found."}


app.mount("/models", StaticFiles(directory=MODELS_DIR), name="models")

# ==========================================
# OpenCode 集成
# ==========================================
import subprocess
import shutil
import uuid

opencode_processes = {}  # task_id -> { process, status, output }
WORKSPACE_DIR = os.path.join(os.path.dirname(BASE_DIR), "WorkSpace")
os.makedirs(WORKSPACE_DIR, exist_ok=True)
os.makedirs(os.path.join(WORKSPACE_DIR, ".config", "opencode"), exist_ok=True)

class OpenCodeRequest(BaseModel):
    message: str
    model: str = ""
    persona: str = ""
    project_path: str = ""
    workMode: bool = False

class OpenCodeConfirm(BaseModel):
    task_id: str
    confirmed: bool

class OpenCodeConfig(BaseModel):
    base_url: str = ""
    api_key: str = ""
    model: str = ""
    workMode: bool = False

def get_opencode_path():
    return shutil.which("opencode")

@app.get("/api/opencode/status")
async def opencode_status():
    path = get_opencode_path()
    installed = path is not None
    version = ""
    if installed:
        try:
            r = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=5)
            version = r.stdout.strip() if r.returncode == 0 else ""
        except: pass
    return {"installed": installed, "version": version, "path": path or ""}

@app.post("/api/opencode/install")
async def opencode_install():
    try:
        subprocess.run(["npm", "install", "-g", "opencode-ai"], check=True, timeout=120)
        # 运行 postinstall
        try:
            npm_root = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True, timeout=10).stdout.strip()
            postinstall = os.path.join(npm_root, "opencode-ai", "postinstall.mjs")
            if os.path.exists(postinstall):
                subprocess.run(["node", postinstall], timeout=60)
        except: pass
        return {"success": True, "version": get_opencode_path() and "installed"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/opencode/run")
async def opencode_run(req: OpenCodeRequest):
    path = get_opencode_path()
    if not path:
        return {"error": "OpenCode 未安装，请先安装"}

    task_id = str(uuid.uuid4())[:8]

    # 构建 prompt：任务优先，禁止 emoji
    prompt = f"任务: {req.message}\n[重要: 严禁在输出中使用任何emoji表情符号]"
    if req.persona:
        prompt += f"\n\n角色风格参考:\n{req.persona[:200]}"

    env = os.environ.copy()
    project_root = os.path.dirname(BASE_DIR)
    if req.workMode:
        env['USERPROFILE'] = WORKSPACE_DIR
    if req.project_path and os.path.isdir(req.project_path):
        cwd = req.project_path
    else:
        cwd = WORKSPACE_DIR if req.workMode else project_root

    try:
        import subprocess as sp, tempfile
        tmp_out = os.path.join(tempfile.gettempdir(), f"opencode_{task_id}.jsonl")
        # 将 prompt 写入临时文件，避免 shell 转义问题
        prompt_file = os.path.join(tempfile.gettempdir(), f"opencode_prompt_{task_id}.txt")
        with open(prompt_file, 'w', encoding='utf-8') as pf:
            pf.write(prompt)

        # --auto: 自动批准权限  --continue: 连续上下文
        cmd_str = f'cmd /c ""{path}" run --format json --auto --continue'
        if req.model:
            cmd_str += f' -m {req.model}'
        cmd_str += f' < "{prompt_file}" > "{tmp_out}" 2>&1"'

        proc = sp.Popen(cmd_str, cwd=cwd, env=env, shell=True)

        opencode_processes[task_id] = {"process": proc, "status": "running", "output": [], "outfile": tmp_out, "prompt_file": prompt_file}
        return {"task_id": task_id}
    except Exception as e:
        return {"error": f"启动 OpenCode 失败: {e}"}

@app.get("/api/opencode/stream/{task_id}")
async def opencode_stream(task_id: str):
    if task_id not in opencode_processes:
        return {"error": "任务不存在"}

    # 读取指定 task 的所有输出（从文件）
    proc_info = opencode_processes[task_id]
    outfile = proc_info.get("outfile", "")
    output = []

    if outfile and os.path.exists(outfile):
        try:
            with open(outfile, 'r', encoding='utf-8', errors='replace') as f:
                for line in f:
                    s = line.strip()
                    if s:
                        output.append(s)
        except: pass

    proc_info["output"] = output
    proc_info["status"] = "completed"
    return {"lines": output, "status": "completed"}

@app.get("/api/opencode/poll/{task_id}")
async def opencode_poll(task_id: str):
    """轮询：前端每 500ms 调一次，返回新输出行"""
    if task_id not in opencode_processes:
        return {"error": "任务不存在", "lines": [], "done": True}

    proc_info = opencode_processes[task_id]
    outfile = proc_info.get("outfile", "")
    last_idx = proc_info.get("_poll_idx", 0)
    new_lines = []

    if outfile and os.path.exists(outfile):
        i = last_idx - 1
        try:
            with open(outfile, 'r', encoding='utf-8', errors='replace') as f:
                for i, line in enumerate(f):
                    s = line.strip()
                    if s and i >= last_idx:
                        new_lines.append(s)
            proc_info["_poll_idx"] = i + 1
            proc_info["output"].extend(new_lines)
        except: pass

    done = proc_info["process"].poll() is not None
    if done:
        proc_info["status"] = "completed"
    return {"lines": new_lines, "done": done}

@app.post("/api/opencode/confirm")
async def opencode_confirm(req: OpenCodeConfirm):
    if req.task_id not in opencode_processes:
        return {"error": "任务不存在"}
    proc_info = opencode_processes[req.task_id]
    proc = proc_info["process"]
    if proc.poll() is not None:
        return {"error": "进程已结束"}
    try:
        response = "yes" if req.confirmed else "no"
        proc.stdin.write(response + "\n")
        proc.stdin.flush()
        proc_info["confirm_pending"] = None
        return {"success": True}
    except Exception as e:
        return {"error": f"写入确认失败: {e}"}

@app.get("/api/opencode/tasks")
async def opencode_tasks():
    result = {}
    for tid, info in opencode_processes.items():
        result[tid] = {"status": info["status"], "output_count": len(info["output"])}
    return result

@app.post("/api/opencode/configure")
async def opencode_configure(req: OpenCodeConfig):
    """配置 OpenCode provider — workMode=true 时写入 WorkSpace 独立目录"""
    workspace_flag = getattr(req, 'workspace', False) or getattr(req, 'workMode', False)
    if workspace_flag:
        config_dir = os.path.join(WORKSPACE_DIR, ".config", "opencode")
    else:
        config_dir = os.path.join(os.path.expanduser("~"), ".config", "opencode")
    os.makedirs(config_dir, exist_ok=True)
    config_path = os.path.join(config_dir, "config.json")
    config = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f: config = json.load(f)
        except: pass
    if req.base_url: config["base_url"] = req.base_url
    if req.api_key: config["api_key"] = req.api_key
    if req.model: config["model"] = req.model
    with open(config_path, "w") as f: json.dump(config, f, indent=2)
    return {"success": True, "config_path": config_path, "workspace": workspace_flag}

@app.get("/api/opencode/models")
async def opencode_list_models():
    """列出 OpenCode 可用模型"""
    path = get_opencode_path()
    if not path: return {"error": "OpenCode 未安装"}
    try:
        r = subprocess.run([path, "models"], capture_output=True, text=True, timeout=15)
        return {"models": r.stdout.strip(), "error": r.stderr.strip() if r.returncode != 0 else ""}
    except Exception as e:
        return {"error": str(e)}

# ==========================================
# Ollama 本地模型管理
# ==========================================
ollama_pull_processes = {}  # task_id -> { process, status, progress }

def get_ollama_path():
    return shutil.which("ollama")

@app.get("/api/ollama/status")
async def ollama_status():
    path = get_ollama_path()
    installed = path is not None
    version = ""
    if installed:
        try:
            r = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=5)
            version = r.stdout.strip() or r.stderr.strip()
        except: pass
    return {"installed": installed, "version": version, "path": path or ""}

@app.post("/api/ollama/install")
async def ollama_install():
    """下载安装 Ollama（Windows）"""
    if get_ollama_path():
        return {"success": True, "message": "已安装"}

    # Windows: 下载安装包
    import tempfile
    import urllib.request
    installer_url = "https://ollama.com/download/OllamaSetup.exe"
    installer_path = os.path.join(tempfile.gettempdir(), "OllamaSetup.exe")

    try:
        # 下载
        def report(block, blocksize, total):
            pass  # 进度通过 SSE 另外处理

        urllib.request.urlretrieve(installer_url, installer_path, reporthook=report)

        # 静默安装
        subprocess.Popen([installer_path, "/VERYSILENT", "/NORESTART"], shell=True)

        # 等待安装完成（最多 120 秒）
        for _ in range(120):
            time.sleep(1)
            if get_ollama_path():
                return {"success": True, "message": "安装成功"}

        return {"success": False, "error": "安装超时，请手动安装"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/ollama/install-progress")
async def ollama_install_progress():
    """SSE 推送 Ollama 下载进度"""
    import tempfile
    installer_url = "https://ollama.com/download/OllamaSetup.exe"
    installer_path = os.path.join(tempfile.gettempdir(), "OllamaSetup.exe")

    async def progress_gen():
        try:
            # 尝试获取文件大小
            import urllib.request
            req = urllib.request.Request(installer_url, method='HEAD')
            resp = urllib.request.urlopen(req, timeout=10)
            total = int(resp.headers.get('Content-Length', 0))
        except:
            total = 0

        yield f'data: {{"status":"downloading","total":{total},"downloaded":0}}\n\n'

        try:
            downloaded = 0
            chunk_size = 65536
            req = urllib.request.Request(installer_url)
            resp = urllib.request.urlopen(req, timeout=30)
            with open(installer_path, 'wb') as f:
                while True:
                    chunk = resp.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    pct = int(downloaded * 100 / total) if total > 0 else 0
                    yield f'data: {{"status":"downloading","total":{total},"downloaded":{downloaded},"percent":{pct}}}\n\n'

            yield f'data: {{"status":"installing"}}\n\n'

            # 启动安装
            subprocess.Popen([installer_path, "/VERYSILENT", "/NORESTART"], shell=True)

            # 等待安装完成
            for i in range(120):
                time.sleep(1)
                if get_ollama_path():
                    yield f'data: {{"status":"done"}}\n\n'
                    return

            yield f'data: {{"status":"error","message":"安装超时"}}\n\n'

        except Exception as e:
            yield f'data: {{"status":"error","message":"{str(e)}"}}\n\n'

    return StreamingResponse(progress_gen(), media_type="text/event-stream")

@app.post("/api/ollama/pull")
async def ollama_pull(req: Request):
    """拉取 Ollama 模型"""
    data = await req.json()
    model_name = data.get("model", "").strip()
    if not model_name:
        return {"error": "请填写模型名称"}

    path = get_ollama_path()
    if not path:
        return {"error": "Ollama 未安装"}

    task_id = f"ollama_{uuid.uuid4().hex[:8]}"
    try:
        proc = subprocess.Popen(
            [path, "pull", model_name],
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1, encoding="utf-8", errors="replace"
        )
        ollama_pull_processes[task_id] = {"process": proc, "model": model_name, "status": "running"}
        return {"task_id": task_id}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/ollama/pull-progress/{task_id}")
async def ollama_pull_progress(task_id: str):
    if task_id not in ollama_pull_processes:
        return {"error": "任务不存在"}

    async def progress_gen():
        proc_info = ollama_pull_processes[task_id]
        proc = proc_info["process"]
        while proc.poll() is None:
            line = proc.stdout.readline()
            if line:
                yield f"data: {line.strip()}\n\n"
            else:
                await asyncio.sleep(0.1)
        for line in proc.stdout:
            if line.strip():
                yield f"data: {line.strip()}\n\n"
        proc_info["status"] = "done"
        yield f'data: {{"status":"done"}}\n\n'
        del ollama_pull_processes[task_id]

    return StreamingResponse(progress_gen(), media_type="text/event-stream")

@app.get("/api/ollama/models")
async def ollama_list_models():
    """列出本地已安装的 Ollama 模型"""
    path = get_ollama_path()
    if not path: return {"error": "Ollama 未安装"}
    try:
        r = subprocess.run([path, "list"], capture_output=True, text=True, timeout=10)
        return {"models": r.stdout.strip(), "error": r.stderr.strip() if r.returncode != 0 else ""}
    except Exception as e:
        return {"error": str(e)}

# ==========================================
# llama.cpp 本地推理引擎
# ==========================================
LLAMACPP_DIR = os.path.join(BASE_DIR, "llama_cpp")
LLAMACPP_MODELS_DIR = os.path.join(LLAMACPP_DIR, "models")

def _ensure_llamacpp_dirs():
    os.makedirs(LLAMACPP_DIR, exist_ok=True)
    os.makedirs(LLAMACPP_MODELS_DIR, exist_ok=True)

def _get_llamacpp_release(gpu):
    import urllib.request, json as _json
    gh_mirrors = ["https://ghfast.top/", "https://ghproxy.net/", ""]
    
    for mirror in gh_mirrors:
        try:
            api_url = mirror + "https://api.github.com/repos/ggerganov/llama.cpp/releases?per_page=1"
            req = urllib.request.Request(api_url, headers={"User-Agent": "GWC"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                releases = _json.loads(resp.read())
                if releases:
                    for asset in releases[0].get("assets", []):
                        name = asset["name"]
                        if gpu == "cuda" and "cuda" in name.lower() and name.endswith(".zip"):
                            return mirror + asset["browser_download_url"], name
                        if gpu != "cuda" and "win" in name.lower() and "cuda" not in name.lower() and name.endswith(".zip"):
                            return mirror + asset["browser_download_url"], name
        except Exception as e:
            print(f"[llama.cpp] 镜像 {mirror or '直连'} 获取失败: {e}")
            continue
    return None, None

@app.get("/api/llamacpp/status")
async def llamacpp_status():
    _ensure_llamacpp_dirs()
    items = os.listdir(LLAMACPP_DIR) if os.path.isdir(LLAMACPP_DIR) else []
    for f in items:
        if 'llama' in f.lower() and f.endswith('.exe'):
            return {"installed": True, "path": LLAMACPP_DIR, "exe": f}
    return {"installed": False, "path": LLAMACPP_DIR}

@app.get("/api/llamacpp/install")
async def llamacpp_install(req: Request, gpu: str = "cpu"):
    _ensure_llamacpp_dirs()
    import urllib.request, zipfile, io, threading
    url, _ = _get_llamacpp_release(gpu)
    
    if not url:
        return StreamingResponse(
            iter(["data: " + json.dumps({"status": "error", "msg": "找不到合适的下载包"}) + "\n\n"]),
            media_type="text/event-stream"
        )
    
    async def stream():
        yield "data: " + json.dumps({"status": "start", "msg": "正在下载...", "url": url}) + "\n\n"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "GWC"})
            with urllib.request.urlopen(req, timeout=300) as resp:
                total = int(resp.headers.get("Content-Length", 0))
                downloaded = 0
                chunks = []
                last_yield = 0
                while True:
                    chunk = resp.read(65536)
                    if not chunk: break
                    chunks.append(chunk)
                    downloaded += len(chunk)
                    pct = round(downloaded / total * 100) if total > 0 else min(99, downloaded // 500000)
                    if pct - last_yield >= 5 or pct >= 99:
                        yield "data: " + json.dumps({"status": "downloading", "pct": pct, "msg": f"{pct}% ({downloaded // 1024}KB)" if total == 0 else f"下载中 {pct}%"}) + "\n\n"
                        last_yield = pct
                
                yield "data: " + json.dumps({"status": "extracting", "msg": "解压中..."}) + "\n\n"
                zip_data = b"".join(chunks)
                with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
                    for member in zf.namelist():
                        try:
                            fname = member.rstrip('/').split("/")[-1]
                            if fname and not member.endswith('/'):
                                dest = os.path.join(LLAMACPP_DIR, fname)
                                with zf.open(member) as src:
                                    with open(dest, "wb") as dst:
                                        dst.write(src.read())
                        except: pass
                # 检查是否安装成功
                exe = os.path.join(LLAMACPP_DIR, "llama-server.exe")
                if os.path.exists(exe):
                    yield "data: " + json.dumps({"status": "done", "msg": "安装完成"}) + "\n\n"
                else:
                    # 可能叫其他名字
                    for f in os.listdir(LLAMACPP_DIR):
                        if 'llama' in f.lower() and f.endswith('.exe'):
                            yield "data: " + json.dumps({"status": "done", "msg": f"安装完成 ({f})"}) + "\n\n"
                            return
                    yield "data: " + json.dumps({"status": "error", "msg": "解压完成但未找到 llama 可执行文件"}) + "\n\n"
        except Exception as e:
            yield "data: " + json.dumps({"status": "error", "msg": str(e)}) + "\n\n"
    
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.get("/api/llamacpp/models")
async def llamacpp_models():
    _ensure_llamacpp_dirs()
    models = [f for f in os.listdir(LLAMACPP_MODELS_DIR) if f.endswith('.gguf')]
    return {"models": sorted(models)}

@app.post("/api/llamacpp/import")
async def llamacpp_import(file: UploadFile = File(...)):
    _ensure_llamacpp_dirs()
    if not file.filename or not file.filename.endswith('.gguf'):
        return {"status": "error", "message": "仅支持 .gguf 文件"}
    dest = os.path.join(LLAMACPP_MODELS_DIR, os.path.basename(file.filename))
    with open(dest, 'wb') as f:
        f.write(await file.read())
    return {"status": "ok", "filename": file.filename}

@app.post("/api/llamacpp/import-zip")
async def llamacpp_import_zip(file: UploadFile = File(...)):
    """手动导入 llama.cpp release ZIP 包"""
    _ensure_llamacpp_dirs()
    import zipfile, io
    try:
        zip_data = await file.read()
        with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
            for member in zf.namelist():
                try:
                    fname = member.rstrip('/').split("/")[-1]
                    if fname and not member.endswith('/'):
                        dest = os.path.join(LLAMACPP_DIR, fname)
                        with zf.open(member) as src:
                            with open(dest, "wb") as dst:
                                dst.write(src.read())
                except: pass
        for f in os.listdir(LLAMACPP_DIR):
            if f.lower().startswith('llama') and f.endswith('.exe'):
                return {"status": "ok", "found": f}
        return {"status": "error", "message": "ZIP 中未找到 llama 可执行文件"}
    except zipfile.BadZipFile:
        return {"status": "error", "message": "无效的 ZIP 文件"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# 本地 ASR 语音识别（faster-whisper 小模型）
# ==========================================
import threading
import signal
whisper_model = None
_current_model_size = None
_model_lock = threading.Lock()
ASR_MODEL_DIR = os.path.join(BASE_DIR, "asr_model")
os.environ.setdefault('HF_ENDPOINT', 'https://hf-mirror.com')

asr_status = {"status": "idle", "message": ""}

def _read_model_size_from_settings():
    try:
        USERDATA = os.path.join(os.path.dirname(BASE_DIR), "userdata")
        for d in os.listdir(USERDATA):
            if d.startswith('user_'):
                fp = os.path.join(USERDATA, d, 'core', 'live2d_settings_v35.json')
                if os.path.exists(fp):
                    data = json.load(open(fp, 'r', encoding='utf-8'))
                    if data and data.get('voiceInputModelSize'):
                        return data['voiceInputModelSize']
    except: pass
    return 'base'

def _is_model_complete(model_dir):
    """检查 faster-whisper 模型文件是否完整"""
    # 必须在 snapshots/<hash>/ 下找到 model.bin 才认为完整
    snapshots_dir = os.path.join(model_dir, "snapshots")
    if not os.path.isdir(snapshots_dir):
        return False
    for d in os.listdir(snapshots_dir):
        snapshot_dir = os.path.join(snapshots_dir, d)
        if os.path.isdir(snapshot_dir):
            # 用实际文件而非 symlink 判断
            model_bin = os.path.join(snapshot_dir, "model.bin")
            if os.path.isfile(model_bin):
                return True
    return False


def get_whisper_model():
    global whisper_model, _current_model_size, asr_status
    size = _read_model_size_from_settings()
    if _current_model_size != size:
        whisper_model = None
        _current_model_size = size
    if whisper_model is not None:
        return whisper_model
    with _model_lock:
        if whisper_model is not None:
            return whisper_model
        from faster_whisper import WhisperModel
        local_path = os.path.join(ASR_MODEL_DIR, f"models--Systran--faster-whisper-{_current_model_size}")
        if os.path.isdir(local_path) and _is_model_complete(local_path):
            try:
                whisper_model = WhisperModel(_current_model_size, device="cpu", compute_type="auto",
                                              download_root=ASR_MODEL_DIR, local_files_only=True)
                asr_status = {"status": "ready", "message": f"模型 {_current_model_size} 已加载"}
                print(f"✅ ASR 模型从本地加载: {_current_model_size}")
                return whisper_model
            except Exception as e:
                print(f"⚠️ 本地模型加载失败 ({e})，尝试重新下载...")
                whisper_model = None

        asr_status = {"status": "downloading", "message": f"正在下载 {_current_model_size} 模型..."}
        print(f"🔄 开始下载 ASR 模型 ({_current_model_size})...")
        try:
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(
                    WhisperModel, _current_model_size,
                    device="cpu", compute_type="auto", download_root=ASR_MODEL_DIR
                )
                whisper_model = future.result(timeout=300)
            asr_status = {"status": "ready", "message": f"模型 {_current_model_size} 已就绪"}
            print(f"✅ ASR 模型下载完成: {_current_model_size}")
        except concurrent.futures.TimeoutError:
            asr_status = {"status": "error", "message": "模型下载超时，请手动下载后放入 " + ASR_MODEL_DIR}
            raise RuntimeError("ASR 模型下载超时（300秒），请检查网络或手动下载模型")
        except Exception as e:
            asr_status = {"status": "error", "message": "下载失败，请手动放入 " + ASR_MODEL_DIR}
            print(f"❌ ASR 模型加载失败: {e}")
            raise
    return whisper_model

# 不在启动时预下载，改为首次使用时懒加载（预下载会卡住后端启动）
# 模型状态由前端轮询 /api/asr/model-status 获取

@app.get("/api/asr/model-status")
async def asr_model_status():
    return asr_status

# 语音识别结果中继（Electron → 前端）
voice_result_text = ""
voice_result_ts = 0

@app.post("/api/voice-result")
async def voice_result_post(req: Request):
    global voice_result_text, voice_result_ts
    data = await req.json()
    voice_result_text = data.get("text", "")
    voice_result_ts = data.get("ts", int(time.time() * 1000))
    return {"status": "ok"}

@app.get("/api/voice-result")
async def voice_result_get():
    return {"text": voice_result_text, "ts": voice_result_ts}

@app.post("/api/asr/transcribe")
async def asr_transcribe(file: UploadFile = File(...), language: str = Form("zh")):
    import tempfile
    lang_map = { 'zh-CN': 'zh', 'zh-TW': 'zh', 'en-US': 'en', 'en-GB': 'en', 'ja-JP': 'ja', 'ko-KR': 'ko' }
    lang = lang_map.get(language, language)
    tmp_path = None
    try:
        suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        model = get_whisper_model()
        segments, info = model.transcribe(tmp_path, beam_size=5, language=lang,
                                           vad_filter=True, vad_parameters=dict(min_silence_duration_ms=300))
        text = " ".join(s.text for s in segments).strip()
        # 繁转简
        if lang == 'zh' and text:
            try:
                from opencc import OpenCC
                text = OpenCC('t2s').convert(text)
            except: pass
        return {"text": text, "language": info.language}
    except Exception as e:
        err_msg = str(e)
        if '10061' in err_msg or 'ConnectError' in err_msg or 'Connection' in err_msg:
            err_msg = '模型下载失败：无法连接 HuggingFace（可能被墙）。请设置环境变量 HF_ENDPOINT=https://hf-mirror.com 后重启后端，或手动下载 tiny 模型到本地。'
        return {"text": "", "error": err_msg}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try: os.unlink(tmp_path)
            except: pass

# 服务端截图
import base64 as _b64
import io as _io

@app.get("/api/screenshot/capture")
async def screenshot_capture():
    try:
        try:
            from PIL import ImageGrab as _IG
            img = _IG.grab()
            buf = _io.BytesIO()
            img.save(buf, format='PNG')
            img_base64 = _b64.b64encode(buf.getvalue()).decode()
        except:
            try:
                import pyautogui as _pyg
                img = _pyg.screenshot()
                buf = _io.BytesIO()
                img.save(buf, format='PNG')
                img_base64 = _b64.b64encode(buf.getvalue()).decode()
            except:
                return {"error": "截图失败 - 请安装 Pillow: pip install Pillow"}
        return {"image": f"data:image/png;base64,{img_base64}"}
    except Exception as e:
        return {"error": str(e)}


# 前端构建产物（分发模式：前后端同端口，支持 frp 一键映射）
FRONTEND_DIST = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")

# ==========================================
# 服务端联网搜索（解决客户端 CORS 限制）
# ==========================================
import urllib.request as urllib2
import html as _html

@app.get("/api/web/search")
async def web_search(q: str = "", source: str = "ddg"):
    results = []
    query = q.strip()
    if not query:
        return {"results": []}

    # DuckDuckGo Lite（纯 HTML，服务端无 CORS 问题）
    if "ddg" in source:
        try:
            ddg_url = f"https://lite.duckduckgo.com/lite/?q={quote(query)}"
            req = urllib2.Request(ddg_url, headers={"User-Agent": "Mozilla/5.0"})
            resp = urllib2.urlopen(req, timeout=8)
            html_text = resp.read().decode("utf-8", errors="replace")
            # 提取结果
            import re
            # DDG Lite 结果格式: <a rel="nofollow" href="...">title</a><br><span>snippet</span>
            links = re.findall(r'<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>(.*?)</a>', html_text)
            snippets = re.findall(r'<span[^>]*class="result-snippet"[^>]*>(.*?)</span>', html_text, re.DOTALL)
            for i, (url, title) in enumerate(links[:5]):
                title_clean = re.sub(r'<[^>]+>', '', title).strip()
                snippet_clean = re.sub(r'<[^>]+>', '', snippets[i] if i < len(snippets) else "").strip()
                results.append({"title": title_clean, "snippet": snippet_clean, "url": url})
        except Exception as e:
            results.append({"title": "[DDG Error]", "snippet": str(e), "url": ""})

    # Wikipedia
    if "wiki" in source:
        try:
            wiki_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={quote(query)}&utf8=&format=json"
            req = urllib2.Request(wiki_url, headers={"User-Agent": "GWC/1.0"})
            resp = urllib2.urlopen(req, timeout=6)
            data = json.loads(resp.read().decode())
            for item in (data.get("query", {}).get("search", []) or [])[:3]:
                results.append({"title": item["title"], "snippet": re.sub(r'<[^>]+>', '', item.get("snippet", "")), "url": f"https://en.wikipedia.org/wiki/{quote(item['title'])}"})
        except Exception as e:
            pass

    return {"results": results}

@app.get("/app")
async def redirect_frontend():
    """重定向 /app → /app/，确保相对路径正确解析"""
    return RedirectResponse(url="/app/")

@app.get("/app/{path:path}")
async def serve_frontend_path(path: str):
    file_path = os.path.join(FRONTEND_DIST, path)
    if os.path.isfile(file_path): return FileResponse(file_path)
    idx = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(idx): return FileResponse(idx)
    return {"detail": "Frontend not built. Run: npm run build"}

if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    # 自动初始化默认 Admin 账号（首次启动）
    try:
        users = store.load_users()
        if not users:
            import hashlib
            salt = os.urandom(16)
            dk = hashlib.pbkdf2_hmac('sha-256', b'Admin', salt, 100000)
            store.save_user('Admin', {'id': 'Admin', 'salt': salt.hex(), 'hash': dk.hex(), 'createdAt': int(time.time() * 1000), 'isDefault': True})
            print("✅ 已创建默认 Admin 账号（密码: Admin）")
        else:
            print(f"📋 已有 {len(users)} 个用户账号")
    except Exception as e:
        print(f"⚠️ 用户初始化跳过: {e}")
    # Docker 环境监听 0.0.0.0，本地监听 127.0.0.1
    host = os.environ.get("GWC_HOST", "127.0.0.1")
    port = int(os.environ.get("GWC_PORT", "5201"))
    print(f"🚀 GWC 核心桥接引擎准备就绪... {host}:{port}")
    uvicorn.run(app, host=host, port=port, workers=1, limit_concurrency=100, timeout_keep_alive=30)
