import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertCircle, Users, Search, Shield, Trash2, Key, UserX, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { getCurrentUser, changePassword, logoutUser } from '../../utils/auth';

const API = '';

export default function AccountTab() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser === 'Admin';

  // --- 修改密码 ---
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleChangePassword = async () => {
    setPwdMsg(null);
    if (!oldPwd || !newPwd) { setPwdMsg({ ok: false, text: '请填写当前密码和新密码' }); return; }
    if (newPwd !== confirmPwd) { setPwdMsg({ ok: false, text: '两次输入的新密码不一致' }); return; }
    if (newPwd.length < 4) { setPwdMsg({ ok: false, text: '新密码至少4个字符' }); return; }
    setPwdLoading(true);
    try {
      const result = await changePassword(currentUser, oldPwd, newPwd);
      setPwdMsg({ ok: result.ok, text: result.msg });
      if (result.ok) { setOldPwd(''); setNewPwd(''); setConfirmPwd(''); }
    } catch (err) { setPwdMsg({ ok: false, text: '操作失败: ' + err.message }); }
    finally { setPwdLoading(false); }
  };

  // --- Admin 用户管理 ---
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPwd, setResetPwd] = useState('');
  const [resetMsg, setResetMsg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);

  const loadUsers = async () => {
    setUserLoading(true);
    try {
      const resp = await fetch(`${API}/api/auth/users/list`);
      const data = await resp.json();
      if (data.ok) setUsers(data.users || []);
    } catch (e) {}
    setUserLoading(false);
  };
  useEffect(() => { if (isAdmin) loadUsers(); }, [isAdmin]);

  const filteredUsers = users.filter(u =>
    u.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleResetPassword = async () => {
    if (!resetPwd || resetPwd.length < 4) { setResetMsg({ ok: false, text: '密码至少4个字符' }); return; }
    try {
      const resp = await fetch(`${API}/api/auth/admin/reset_password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: currentUser, username: resetTarget, newPassword: resetPwd })
      });
      const data = await resp.json();
      setResetMsg({ ok: data.ok, text: data.msg });
      if (data.ok) { setResetTarget(null); setResetPwd(''); }
    } catch (e) { setResetMsg({ ok: false, text: '操作失败' }); }
  };

  const handleClearPassword = async (username) => {
    if (!confirm(`确定清除 ${username} 的密码？该用户下次登录将需要重新设置密码。`)) return;
    try {
      const resp = await fetch(`${API}/api/auth/admin/clear_password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: currentUser, username })
      });
      const data = await resp.json();
      setActionMsg({ ok: data.ok, text: data.msg });
      if (data.ok) loadUsers();
    } catch (e) { setActionMsg({ ok: false, text: '操作失败' }); }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      const resp = await fetch(`${API}/api/auth/admin/delete_user`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: currentUser, username: deleteTarget })
      });
      const data = await resp.json();
      setActionMsg({ ok: data.ok, text: data.msg });
      if (data.ok) { setDeleteTarget(null); loadUsers(); }
    } catch (e) { setActionMsg({ ok: false, text: '操作失败' }); }
  };

  // --- 注销自己的账号 ---
  const [deleteSelfPwd, setDeleteSelfPwd] = useState('');
  const [deleteSelfMsg, setDeleteSelfMsg] = useState(null);
  const [deleteSelfConfirm, setDeleteSelfConfirm] = useState(false);
  const [deleteSelfLoading, setDeleteSelfLoading] = useState(false);

  const handleDeleteSelf = async () => {
    if (!deleteSelfPwd) { setDeleteSelfMsg({ ok: false, text: '请输入密码' }); return; }
    setDeleteSelfLoading(true);
    try {
      const resp = await fetch(`${API}/api/auth/delete_account`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, password: deleteSelfPwd })
      });
      const data = await resp.json();
      if (data.ok) {
        logoutUser();
        window.location.hash = '/login';
        window.location.reload();
      } else {
        setDeleteSelfMsg({ ok: false, text: data.msg });
      }
    } catch (e) { setDeleteSelfMsg({ ok: false, text: '操作失败' }); }
    finally { setDeleteSelfLoading(false); }
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in p-2 md:p-4">
      <h2 className="text-xl md:text-2xl font-black text-[#ba3f42] tracking-widest mb-6 flex items-center gap-3">
        <Lock size={24} /> 账号安全
      </h2>

      {/* 当前用户信息 */}
      <div className="bg-white rounded-2xl border border-[#e6d5b8] shadow-sm p-6">
        <h4 className="text-sm font-bold text-[#ba3f42] mb-4 flex items-center gap-2">当前登录账号</h4>
        <div className="flex items-center gap-4 bg-[#fdfaf5] p-4 rounded-xl border border-[#e6d5b8]">
          <div className="w-12 h-12 rounded-full bg-[#5ab4ed] flex items-center justify-center text-white font-bold text-lg shadow-md">
            {currentUser ? currentUser[0].toUpperCase() : '?'}
          </div>
          <div>
            <p className="font-bold text-[#4a4036] text-lg flex items-center gap-2">
              {currentUser || '未登录'}
              {isAdmin && <span className="text-xs px-2 py-0.5 bg-[#ba3f42] text-white rounded-full">Admin</span>}
            </p>
            <p className="text-xs text-[#7a6b5d]">密码使用 PBKDF2-SHA256 加密保护</p>
          </div>
        </div>
      </div>

      {/* 修改密码 */}
      <div className="bg-white rounded-2xl border border-[#e6d5b8] shadow-sm p-6">
        <h4 className="text-sm font-bold text-[#ba3f42] mb-4 flex items-center gap-2">
          <Lock size={16} /> 修改密码
        </h4>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold text-[#7a6b5d] mb-1.5">当前密码</label>
            <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} placeholder="输入当前密码"
              className="w-full px-4 py-2.5 rounded-lg text-sm text-[#4a4036] bg-[#fdfaf5] border border-[#e6d5b8] outline-none focus:border-[#5ab4ed] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#7a6b5d] mb-1.5">新密码</label>
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="输入新密码（至少4个字符）"
              className="w-full px-4 py-2.5 rounded-lg text-sm text-[#4a4036] bg-[#fdfaf5] border border-[#e6d5b8] outline-none focus:border-[#5ab4ed] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#7a6b5d] mb-1.5">确认新密码</label>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="再次输入新密码"
              className="w-full px-4 py-2.5 rounded-lg text-sm text-[#4a4036] bg-[#fdfaf5] border border-[#e6d5b8] outline-none focus:border-[#5ab4ed] transition-colors" />
          </div>
          {pwdMsg && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${pwdMsg.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {pwdMsg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {pwdMsg.text}
            </div>
          )}
          <button onClick={handleChangePassword} disabled={pwdLoading}
            className="px-6 py-2.5 bg-[#5ab4ed] hover:bg-[#4fa0d8] text-white font-bold text-sm rounded-full transition-colors shadow-md disabled:opacity-50">
            {pwdLoading ? '处理中...' : '确认修改'}
          </button>
        </div>
      </div>

      {/* Admin: 用户管理 */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-[#e6d5b8] shadow-sm p-6">
          <h4 className="text-sm font-bold text-[#ba3f42] mb-4 flex items-center gap-2">
            <Users size={16} /> 用户管理
          </h4>

          {actionMsg && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mb-4 ${actionMsg.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {actionMsg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {actionMsg.text}
            </div>
          )}

          {/* 搜索框 */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a6b5d]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索用户名..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-[#4a4036] bg-[#fdfaf5] border border-[#e6d5b8] outline-none focus:border-[#5ab4ed] transition-colors" />
          </div>

          {/* 用户列表 */}
          {userLoading ? (
            <p className="text-sm text-[#7a6b5d] text-center py-4">加载中...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-[#7a6b5d] text-center py-4">没有找到用户</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#fdfaf5] border border-[#e6d5b8] hover:border-[#5ab4ed] transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#5ab4ed] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {u.id[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#4a4036] text-sm truncate flex items-center gap-2">
                      {u.id}
                      {u.id === 'Admin' && <span className="text-xs px-1.5 py-0.5 bg-[#ba3f42] text-white rounded-full">Admin</span>}
                      {!u.hasPassword && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">无密码</span>}
                    </p>
                    <p className="text-xs text-[#7a6b5d]">{formatDate(u.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* 重置密码 */}
                    <button onClick={() => { setResetTarget(u.id); setResetPwd(''); setResetMsg(null); }}
                      title="重置密码"
                      className="p-2 rounded-lg hover:bg-blue-50 text-[#5ab4ed] transition-colors">
                      <Key size={14} />
                    </button>
                    {/* 清除密码 */}
                    {u.id !== 'Admin' && (
                      <button onClick={() => handleClearPassword(u.id)}
                        title="清除密码"
                        className="p-2 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors">
                        <EyeOff size={14} />
                      </button>
                    )}
                    {/* 注销用户 */}
                    {u.id !== 'Admin' && (
                      <button onClick={() => setDeleteTarget(u.id)}
                        title="注销用户"
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                        <UserX size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 重置密码弹窗 */}
          {resetTarget && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
                <h3 className="font-bold text-[#4a4036] text-lg mb-2">重置密码</h3>
                <p className="text-sm text-[#7a6b5d] mb-4">为 <span className="font-bold">{resetTarget}</span> 设置新密码</p>
                <input type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)}
                  placeholder="输入新密码（至少4个字符）" autoFocus
                  className="w-full px-4 py-2.5 rounded-lg text-sm text-[#4a4036] bg-[#fdfaf5] border border-[#e6d5b8] outline-none focus:border-[#5ab4ed] transition-colors mb-3" />
                {resetMsg && (
                  <div className={`flex items-center gap-2 p-2 rounded-lg text-sm mb-3 ${resetMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {resetMsg.text}
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setResetTarget(null)}
                    className="px-4 py-2 text-sm text-[#7a6b5d] hover:bg-gray-100 rounded-lg transition-colors">取消</button>
                  <button onClick={handleResetPassword}
                    className="px-4 py-2 text-sm bg-[#5ab4ed] hover:bg-[#4fa0d8] text-white font-bold rounded-lg transition-colors">确认</button>
                </div>
              </div>
            </div>
          )}

          {/* 删除确认弹窗 */}
          {deleteTarget && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#4a4036] text-lg">注销用户</h3>
                    <p className="text-sm text-[#7a6b5d]">此操作不可撤销</p>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-red-700">
                    即将注销用户 <span className="font-bold">{deleteTarget}</span>，该操作将：
                  </p>
                  <ul className="text-sm text-red-600 mt-2 space-y-1 list-disc list-inside">
                    <li>删除该用户的所有数据（聊天记录、设置、模型等）</li>
                    <li>删除该用户的所有自动备份</li>
                    <li>从系统中永久移除该账号</li>
                  </ul>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 text-sm text-[#7a6b5d] hover:bg-gray-100 rounded-lg transition-colors">取消</button>
                  <button onClick={handleDeleteUser}
                    className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors">确认注销</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 所有用户: 注销自己的账号 */}
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
        <h4 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
          <Trash2 size={16} /> 注销账号
        </h4>
        <p className="text-xs text-[#7a6b5d] mb-4">
          注销后，您的所有数据（聊天记录、设置、模型、备份等）将被永久删除，且无法恢复。
        </p>

        {!deleteSelfConfirm ? (
          <button onClick={() => setDeleteSelfConfirm(true)}
            className="px-5 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded-full border border-red-200 transition-colors">
            我要注销账号
          </button>
        ) : (
          <div className="space-y-3 max-w-md">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">请输入密码确认身份。注销后将自动退出登录并跳转到登录页面。</p>
            </div>
            <input type="password" value={deleteSelfPwd} onChange={e => setDeleteSelfPwd(e.target.value)}
              placeholder="输入当前密码" autoFocus
              className="w-full px-4 py-2.5 rounded-lg text-sm text-[#4a4036] bg-[#fdfaf5] border border-[#e6d5b8] outline-none focus:border-red-400 transition-colors" />
            {deleteSelfMsg && (
              <div className="flex items-center gap-2 p-2 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                <AlertCircle size={14} /> {deleteSelfMsg.text}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setDeleteSelfConfirm(false); setDeleteSelfPwd(''); setDeleteSelfMsg(null); }}
                className="px-4 py-2 text-sm text-[#7a6b5d] hover:bg-gray-100 rounded-lg transition-colors">取消</button>
              <button onClick={handleDeleteSelf} disabled={deleteSelfLoading}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
                {deleteSelfLoading ? '处理中...' : '确认注销并删除所有数据'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
