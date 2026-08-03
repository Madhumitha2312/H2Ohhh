export const overlayAnimations = {
  slideIn: 'overlay-slide-in',
  slideOut: 'overlay-slide-out',
  fadeIn: 'overlay-fade-in',
  float: 'overlay-float',
  bubblePop: 'overlay-bubble-pop',
  bounceIn: 'overlay-bounce-in'
}

// Only the animation + component classes. Safe to inject into the main page
// (does not touch html/body backgrounds).
export const overlayAnimationsCss = `
  .overlay-slide-in {
    animation: overlaySlideIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .overlay-slide-out {
    animation: overlaySlideOut 0.45s cubic-bezier(0.55, 0, 0.55, 0.2) both;
  }
  .overlay-fade-in {
    animation: overlayFadeIn 0.5s ease-out both;
  }
  .overlay-float {
    animation: overlayFloat 3.4s ease-in-out infinite;
  }
  .overlay-bubble-pop {
    animation: overlayBubblePop 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .overlay-bounce-in {
    animation: overlayBounceIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes overlaySlideIn {
    0% { opacity: 0; transform: translate(48px, 64px) scale(0.96); }
    70% { transform: translate(-4px, -6px) scale(1); }
    100% { opacity: 1; transform: translate(0, 0) scale(1); }
  }
  @keyframes overlaySlideOut {
    0% { opacity: 1; transform: translate(0, 0) scale(1); }
    100% { opacity: 0; transform: translate(64px, 88px) scale(0.95); }
  }
  @keyframes overlayFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes overlayFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes overlayBubblePop {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes overlayBounceIn {
    0% { opacity: 0; transform: translateY(14px); }
    60% { transform: translateY(-4px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`

// Full stylesheet for the standalone Electron overlay window.
export const overlayCss = `
  html, body {
    margin: 0;
    padding: 0;
    background: transparent !important;
  }
  #overlay-root {
    height: 100vh;
    background: transparent;
  }
  ${overlayAnimationsCss}
`