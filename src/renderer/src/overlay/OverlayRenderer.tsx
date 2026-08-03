import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { VoiceSettings } from '../types'
import { ReminderVideo } from '../components/ReminderVideo'
import { OverlaySpeechBubble } from './OverlaySpeechBubble'
import { OverlayButtons } from './OverlayButtons'
import { overlayAnimations } from './OverlayAnimations'
import { playSound } from '../services/notifications'
import { speak, stopSpeaking } from '../services/voice'
import { reminderSpeech } from '../utils/constants'

interface ShowData {
  name?: string
  avatarId?: string
  gender?: string
  message?: string
  sound?: string
  voice?: VoiceSettings
}

const EXIT_MS = 520

export function OverlayRenderer(): React.JSX.Element {
  const [data, setData] = useState<ShowData | null>(null)
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const show = useCallback((incoming: ShowData) => {
    setData(incoming)
    setSnoozeOpen(false)
    setExiting(false)
    setVisible(true)
    if (incoming.sound) playSound(incoming.sound)
    // Automatically speak ~300ms after the notification sound.
    speak(reminderSpeech(incoming.name ?? ''), {
      delayMs: 300,
      gender: incoming.gender ?? (incoming.avatarId === 'boy' ? 'male' : 'female'),
      volume: incoming.voice?.volume ?? 1,
      rate: incoming.voice?.rate ?? 0.95,
      pitch: incoming.voice?.pitch ?? 1
    })
  }, [])

  useEffect(() => {
    window.overlay?.ready()
    const off = window.overlay?.onShow((incoming) => {
      show(incoming)
    })
    return () => {
      off?.()
    }
  }, [show])

  // Keep the transparent overlay window sized exactly to its content so there
  // is never a large blank transparent area on the desktop.
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el || !visible) return
    const sendSize = (): void => {
      // offsetWidth/offsetHeight are layout sizes, unaffected by the
      // ancestor slide-in/scale transform, so the window matches content.
      const width = Math.max(140, Math.ceil(el.offsetWidth))
      const height = Math.max(150, Math.ceil(el.offsetHeight))
      window.overlay?.resize?.({ width, height })
    }
    sendSize()
    const observer = new ResizeObserver(sendSize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, data, snoozeOpen])

  const hide = useCallback((action: () => void) => {
    stopSpeaking()
    setExiting(true)
    window.setTimeout(() => {
      setVisible(false)
      setExiting(false)
      action()
    }, EXIT_MS)
  }, [])

  const handleDrank = useCallback(() => {
    hide(() => {
      window.overlay?.drank({ amount: 250 })
    })
  }, [hide])

  const handleSnooze = useCallback(
    (minutes: number) => {
      hide(() => {
        window.overlay?.snooze({ minutes })
      })
    },
    [hide]
  )

  if (!visible || !data) return <></>

  const cardClass = exiting ? overlayAnimations.slideOut : overlayAnimations.slideIn

  return (
    <div className="flex h-screen w-screen items-end justify-end overflow-hidden p-1">
      <div className={cardClass}>
        {/* contentRef measures this non-animated wrapper so the window is
            sized to the true content, not the transient slide/scale state. */}
        <div ref={contentRef} className="flex w-[320px] flex-col items-center">
          <div className="z-10 w-full">
            <OverlaySpeechBubble message={data.message ?? "It's time to drink some water."} />
          </div>
          {/* The character video is the main focus: not cropped, no box, no border. */}
          <ReminderVideo
            gender={data.gender ?? (data.avatarId === 'boy' ? 'male' : 'female')}
            className="overlay-float -mt-2 h-[360px] w-auto max-w-[320px] object-contain"
          />
          <div className="-mt-3">
            <OverlayButtons
              snoozeOpen={snoozeOpen}
              onDrank={handleDrank}
              onSnooze={handleSnooze}
              onToggleSnooze={() => setSnoozeOpen((v) => !v)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}