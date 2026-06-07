import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initErrorReporting } from './utils/errorReporting'
import { registerWebServiceWorker } from './utils/pwaEnvironment'

initErrorReporting()
void registerWebServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
