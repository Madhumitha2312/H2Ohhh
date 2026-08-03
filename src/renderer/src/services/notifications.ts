let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) audioCtx = new Ctor()
  return audioCtx
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.18
): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start)
  gain.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime + start)
  osc.stop(ctx.currentTime + start + duration + 0.05)
}

export function playSound(id: string): void {
  if (id === 'none') return
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()

  switch (id) {
    case 'waterdrop': {
      tone(ctx, 900, 0, 0.12, 'sine', 0.16)
      tone(ctx, 500, 0.1, 0.16, 'sine', 0.1)
      break
    }
    case 'ocean': {
      tone(ctx, 220, 0, 0.5, 'sine', 0.05)
      tone(ctx, 320, 0.12, 0.55, 'sine', 0.04)
      tone(ctx, 180, 0.24, 0.6, 'sine', 0.04)
      break
    }
    case 'bell': {
      tone(ctx, 660, 0, 0.5, 'sine', 0.14)
      tone(ctx, 990, 0, 0.4, 'sine', 0.05)
      break
    }
    default:
      break
  }
}

export function playPraise(): void {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  tone(ctx, 523.25, 0, 0.14, 'triangle', 0.12)
  tone(ctx, 659.25, 0.12, 0.14, 'triangle', 0.12)
  tone(ctx, 783.99, 0.24, 0.24, 'triangle', 0.12)
}

export function notifyNative(title: string, body: string): void {
  if (window.api?.isElectron && typeof Notification !== 'undefined' && 'Notification' in window) {
    try {
      const n = new Notification(title, { body, silent: true })
      n.onclick = (): void => {
        window.api?.closeOverlay()
        window.focus()
      }
    } catch {
      // Fallback to browser notification when available.
    }
  }
}
