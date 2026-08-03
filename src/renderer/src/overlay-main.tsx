import { createRoot } from 'react-dom/client'
import { OverlayRenderer } from './overlay/OverlayRenderer'
import { overlayCss } from './overlay/OverlayAnimations'
import './index.css'

const style = document.createElement('style')
style.textContent = overlayCss
document.head.appendChild(style)

createRoot(document.getElementById('overlay-root')!).render(<OverlayRenderer />)
