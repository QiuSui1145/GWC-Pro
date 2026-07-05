import React, { useState, useEffect } from 'react';
import { loginUser, registerUser } from '../utils/auth';
import { User, Lock, LogIn, UserPlus, AlertCircle, Search, ChevronDown, ChevronUp, Key } from 'lucide-react';

const API = '';

export default function LoginPage({ onLogin, loginConfig }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 账号选择器
  const [userList, setUserList] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 首次登录设密
  const [needPassword, setNeedPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const cfg = loginConfig || {};

  // 加载用户列表
  useEffect(() => {
    fetch(`${API}/api/auth/users/list`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.ok) setUserList(data.users || []); })
      .catch(() => {});
  }, []);

  const filteredUsers = userList.filter(u =>
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectUser = (userId) => {
    setUsername(userId);
    setShowUserList(false);
    setSearchQuery('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const result = await registerUser(username.trim(), password);
        if (result.ok) {
          onLogin();
        } else {
          setError(result.msg);
        }
      } else {
        const result = await loginUser(username.trim(), password, rememberMe);
        if (result.ok) {
          if (result.need_password) {
            // 无密码账号，弹出设密对话框
            setNeedPassword(true);
          } else {
            onLogin();
          }
        } else {
          setError(result.msg);
        }
      }
    } catch (err) {
      setError('操作失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 4) { setError('密码至少4个字符'); return; }
    if (newPassword !== confirmPassword) { setError('两次密码不一致'); return; }
    setLoading(true);
    try {
      const resp = await fetch(`${API}/api/auth/force_set_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: newPassword })
      });
      const data = await resp.json();
      if (data.ok) {
        onLogin();
      } else {
        setError(data.msg || '设置失败');
      }
    } catch (err) {
      setError('操作失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasBg = !!cfg.loginBgImage;

  // 首次登录设密界面
  if (needPassword) {
    return (
      <div className="relative h-screen w-full overflow-hidden flex items-center justify-center font-sans select-none"
        style={{
          background: hasBg
            ? `url(${cfg.loginBgImage}) center/cover no-repeat`
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          backgroundPosition: hasBg ? `calc(50% + ${cfg.loginBgOffsetX || 0}px) calc(50% + ${cfg.loginBgOffsetY || 0}px)` : undefined
        }}>
        <div className="relative z-10 w-full max-w-md mx-4">
          <div className="rounded-2xl p-8 shadow-2xl" style={{
            backgroundColor: 'rgba(30, 30, 35, 0.85)',
            backdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            <div className="flex items-center gap-3 mb-6">
              <Key size={24} className="text-[#5ab4ed]" />
              <h2 className="text-xl font-bold text-white tracking-wide">首次登录 - 设置密码</h2>
            </div>
            <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
              欢迎 <strong className="text-white">{username}</strong>！这是您首次登录，请设置一个密码以保护您的数据。
            </p>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>新密码</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="至少4个字符" autoFocus
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)' }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>确认密码</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)' }} />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{
                  background: 'rgba(186,63,66,0.15)', border: '1px solid rgba(186,63,66,0.3)', color: '#fca5a5'
                }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm tracking-wide transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #5ab4ed, #4fa0d8)', boxShadow: '0 4px 15px rgba(90,180,237,0.3)' }}>
                {loading ? '处理中...' : '设置密码并进入'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden flex items-center justify-center font-sans select-none"
      style={{
        background: hasBg
          ? `url(${cfg.loginBgImage}) center/cover no-repeat`
          : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        backgroundPosition: hasBg ? `calc(50% + ${cfg.loginBgOffsetX || 0}px) calc(50% + ${cfg.loginBgOffsetY || 0}px)` : undefined
      }}>

      {!hasBg && (
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, #5ab4ed 0.5px, transparent 0.5px), radial-gradient(circle at 75% 75%, #ba3f42 0.5px, transparent 0.5px)',
          backgroundSize: '60px 60px'
        }} />
      )}

      {/* 自定义文字框 */}
      {(cfg.loginTextBoxes || []).map(box => (
        <div key={box.id} className="absolute pointer-events-none"
          style={{
            left: `${box.x}%`, top: `${box.y}%`, transform: 'translate(-50%, -50%)',
            fontSize: `${box.fontSize}px`, color: box.color, opacity: box.opacity, whiteSpace: 'nowrap', zIndex: 10
          }}>
          {box.text}
        </div>
      ))}

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-wider" style={{
            color: cfg.loginPageTitleColor || '#5ab4ed',
            fontFamily: cfg.loginPageTitleFont || 'serif',
            textShadow: '0 0 30px rgba(90,180,237,0.3)',
            transform: `translate(${cfg.loginPageTitleX || 0}px, ${cfg.loginPageTitleY || 0}px)`
          }}>
            {cfg.loginPageTitle || 'GWC'}
          </h1>
          <p className="text-sm mt-2 tracking-widest" style={{
            color: cfg.loginPageSubTitleColor || 'rgba(255,255,255,0.4)',
            fontFamily: cfg.loginPageSubTitleFont || 'sans-serif',
            transform: `translate(${cfg.loginPageSubTitleX || 0}px, ${cfg.loginPageSubTitleY || 0}px)`
          }}>
            {cfg.loginPageSubTitle || 'GalGame Web Chat Engine'}
          </p>
        </div>

        <div className="rounded-2xl p-8 shadow-2xl" style={{
          backgroundColor: 'rgba(30, 30, 35, 0.65)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}>
          <h2 className="text-xl font-bold text-white mb-6 tracking-wide">
            {isRegister ? '注册新账号' : '用户登录'}
          </h2>

          {/* 账号选择器 */}
          {!isRegister && userList.length > 0 && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowUserList(!showUserList)}
                className="flex items-center gap-2 text-xs font-bold transition-colors hover:underline w-full justify-between"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <span>选择已有账号</span>
                {showUserList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showUserList && (
                <div className="mt-2 rounded-xl overflow-hidden" style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="搜索账号..."
                      className="w-full pl-9 pr-4 py-2 text-xs text-white outline-none"
                      style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <p className="text-xs text-center py-3" style={{ color: 'rgba(255,255,255,0.3)' }}>无匹配账号</p>
                    ) : (
                      filteredUsers.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => selectUser(u.id)}
                          className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <User size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                            <span className="text-sm font-bold text-white">{u.id}</span>
                          </div>
                          {!u.hasPassword && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{
                              background: 'rgba(90,180,237,0.2)', color: '#5ab4ed'
                            }}>首次登录</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                用户名
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="输入用户名"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(90,180,237,0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                密码
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码（无密码账号可留空）"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(90,180,237,0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
              </div>
            </div>

            {!isRegister && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className="w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer"
                  style={{ background: rememberMe ? '#5ab4ed' : 'rgba(0,0,0,0.3)', borderColor: rememberMe ? '#5ab4ed' : 'rgba(255,255,255,0.2)' }}
                >
                  {rememberMe && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  记住登录（保持3天）
                </span>
              </label>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{
                background: 'rgba(186,63,66,0.15)', border: '1px solid rgba(186,63,66,0.3)', color: '#fca5a5'
              }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #5ab4ed, #4fa0d8)', boxShadow: '0 4px 15px rgba(90,180,237,0.3)' }}
            >
              {loading ? '处理中...' : (isRegister ? '注册并登录' : '登录')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-xs font-bold transition-colors hover:underline"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              {isRegister ? '已有账号？返回登录' : '没有账号？注册新用户'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
          默认账号与密码均为Admin，登陆后请更改。
        </p>
      </div>
    </div>
  );
}
