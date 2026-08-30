"""
GWC 服务端会话令牌（无状态 HMAC 签名）

登录/注册成功后由后端签发 token，前端在后续请求中携带
（Authorization: Bearer <token> 或 ?_token=<token>）。
token 自带签名与过期时间，服务端无需保存会话状态即可校验。
"""
import os
import hmac
import time
import json
import base64
import hashlib


def _b64u_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode('ascii').rstrip('=')


def _b64u_decode(s: str) -> bytes:
    pad = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


class TokenAuth:
    # 令牌有效期：本地桌面应用场景下「记住登录」持续到手动退出登录，
    # 故设置一个极长的有效期（约 100 年），实际由前端 logout 清理。
    DEFAULT_TTL_MS = 100 * 365 * 24 * 60 * 60 * 1000

    def __init__(self, secret_path: str):
        self.secret = self._load_or_create_secret(secret_path)

    def _load_or_create_secret(self, path: str) -> bytes:
        try:
            if os.path.exists(path):
                with open(path, 'rb') as f:
                    data = f.read().strip()
                if len(data) >= 32:
                    return data
            secret = os.urandom(32)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            # 尽量收紧权限（POSIX 生效，Windows 忽略）
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, 'wb') as f:
                f.write(secret)
            return secret
        except Exception:
            # 兜底：进程内临时密钥（重启后旧 token 失效，安全但需重新登录）
            return os.urandom(32)

    def _sign(self, payload_b64: str) -> str:
        sig = hmac.new(self.secret, payload_b64.encode('ascii'), hashlib.sha256).digest()
        return _b64u_encode(sig)

    def issue(self, username: str, ttl_ms: int = DEFAULT_TTL_MS) -> str:
        payload = {"u": username, "exp": int(time.time() * 1000) + ttl_ms}
        payload_b64 = _b64u_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
        return f"{payload_b64}.{self._sign(payload_b64)}"

    def verify(self, token: str):
        """校验 token，返回用户名；无效/过期返回 None"""
        if not token or not isinstance(token, str) or '.' not in token:
            return None
        try:
            payload_b64, sig = token.split('.', 1)
            expected = self._sign(payload_b64)
            if not hmac.compare_digest(sig, expected):
                return None
            payload = json.loads(_b64u_decode(payload_b64))
            if int(payload.get("exp", 0)) < int(time.time() * 1000):
                return None
            user = payload.get("u")
            return user if isinstance(user, str) and user else None
        except Exception:
            return None
