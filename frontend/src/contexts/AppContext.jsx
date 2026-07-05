import React, { createContext, useContext } from 'react';

// 创建 Context
const AppContext = createContext(null);

// Provider 组件 — 由 App.jsx 包裹，传入所有共享状态
export function AppProvider({ children, value }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// 自定义 hook — 子页面通过此 hook 访问共享状态
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export default AppContext;
