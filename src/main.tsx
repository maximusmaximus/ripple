import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RippleApp } from './components/ripple-app'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RippleApp />
  </StrictMode>,
)
