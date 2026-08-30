import './utils/authFetch'  // 必须最先执行：为后端请求注入会话令牌
import './utils/theme'      // 在渲染前应用主题，避免首屏闪一下浅色
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme-dark.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
