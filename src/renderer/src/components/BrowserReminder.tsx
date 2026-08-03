import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAppData } from '../context/AppDataProvider'
import { ReminderVideo } from './ReminderVideo'
import { OverlaySpeechBubble } from '../overlay/OverlaySpeechBubble'
import { OverlayButtons } from '../overlay/OverlayButtons'
import { overlayAnimations, overlayAnimationsCss } from '../overlay/OverlayAnimations'
import { playSound } from '../services/notifications'
import { speak, stopSpeaking } from '../services/voice'
import { reminderSpeech } from '../utils/constants'

const EXIT_MS = 520

/**
 * In-page reminder used when the desktop overlay is unavailable
 * (i.e. running in a plain browser without the Electron preload API).
 * Renders the same compact bottom-right assistant as the Electron overlay.
 */
export function BrowserReminder(): React.JSX.Element | null {
  const { user } = useAuth()
  const { reminder } = useAppData()
  const [exiting, setExiting] = useState(false)
  const visibleRef = useRef(false)

  useEffect(() => {
    let style = document.getElementById('h2o-overlay-css') as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = 'h2o-overlay-css'
      document.head.appendChild(style)
    }
    style.textContent = overlayAnimationsCss
  }, [])

  const visible = reminder.visible

  useEffect(() => {
    if (!visible) {
      visibleRef.current = false
      return
    }
    if (visibleRef.current || !user) return
    visibleRef.current = true
    if (user.sound) playSound(user.sound)
    speak(reminderSpeech(user.name), {
      delayMs: 300,
      gender: user.gender,
      volume: user.voice.volume,
      rate: user.voice.rate,
      pitch: user.voice.pitch
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const runAction = (action: () => void): void => {
    if (exiting) return
    stopSpeaking()
    setExiting(true)
    window.setTimeout(() => {
      setExiting(false)
      action()
    }, EXIT_MS)
  }

  const handleDrank = (): void => runAction(() => reminder.drank())
  const handleSnooze = (minutes: number): void => runAction(() => reminder.snooze(minutes))

  if (!visible || !user) return null

  const cardClass = exiting ? overlayAnimations.slideOut : overlayAnimations.slideIn

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <div className={cardClass}>
        <div className="flex w-[320px] flex-col items-center">
          <div className="z-10 w-full">
            <OverlaySpeechBubble message={reminder.message} />
          </div>
          <ReminderVideo
            gender={user.gender}
            className="overlay-float -mt-2 h-[360px] w-auto max-w-[320px] object-contain"
          />
          <div className="-mt-3">
            <OverlayButtons
              snoozeOpen={reminder.snoozeOpen}
              onDrank={handleDrank}
              onSnooze={handleSnooze}
              onToggleSnooze={reminder.toggleSnooze}
            />
          </div>
        </div>
      </div>
    </div>
  )
}