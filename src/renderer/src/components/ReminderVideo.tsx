import { useEffect, useRef } from 'react'
import type { Gender } from '../types'
import girlReminderVideo from '../assets/videos/girl-reminder.mp4'
import boyReminderVideo from '../assets/videos/boy-reminder.mp4'

const REMINDER_VIDEOS: Record<string, string> = {
  female: girlReminderVideo,
  male: boyReminderVideo,
  neutral: girlReminderVideo
}

interface ReminderVideoProps {
  gender?: Gender | string
  className?: string
  onEnded?: () => void
}

/**
 * Reusable animated reminder video.
 * Picks the correct video based on the user's gender:
 *  - female -> girl-reminder.mp4
 *  - male   -> boy-reminder.mp4
 * Autoplays muted, plays inline, has no controls and never loops.
 * When playback finishes the video freezes on the last frame and the
 * onEnded callback is fired.
 */
export function ReminderVideo({ gender = 'female', className = '', onEnded }: ReminderVideoProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const src = REMINDER_VIDEOS[gender] ?? girlReminderVideo

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay can be rejected (e.g. while muted preference is settling).
        // The next reminder cycle recreates the element and retries.
      })
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      key={src}
      src={src}
      className={className}
      autoPlay
      muted
      playsInline
      controls={false}
      loop={false}
      preload="auto"
      onEnded={onEnded}
      draggable={false}
      aria-label="Reminder animation"
    />
  )
}
