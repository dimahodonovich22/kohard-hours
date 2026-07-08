import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './i18n'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { startQueueWorker } from './lib/uploadQueue'
import { isDemo } from './lib/demo'

// В демо нет Firebase Storage — очередь загрузки фото не нужна.
// HashRouter, чтобы маршруты работали на GitHub Pages без серверных правил.
if (!isDemo) startQueueWorker()
const Router = isDemo ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </StrictMode>,
)
