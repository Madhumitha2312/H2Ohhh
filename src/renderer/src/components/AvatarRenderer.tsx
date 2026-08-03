import type { AvatarVariant } from '../utils/avatarLoader'
import { avatarUrl, isVideoUrl } from '../utils/avatarLoader'

interface AvatarRendererProps {
  avatarId: string
  variant?: AvatarVariant
  className?: string
  animate?: boolean
  alt?: string
}

/**
 * Reusable avatar renderer.
 * Supports PNG, GIF (img) and MP4, WEBM (video).
 * Swap the asset files under src/renderer/src/assets/avatars to
 * replace a character with an AI-generated avatar video later.
 */
export function AvatarRenderer({
  avatarId,
  variant = 'casual',
  className = '',
  animate = true,
  alt
}: AvatarRendererProps): React.JSX.Element | null {
  const src = avatarUrl(avatarId, variant)
  if (!src) return null

  const wrapperClass = `${animate ? 'animate-float' : ''} ${className}`.trim()

  if (isVideoUrl(src)) {
    return (
      <video
        className={wrapperClass}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        aria-label={alt ?? avatarId}
      />
    )
  }

  return <img className={wrapperClass} src={src} alt={alt ?? avatarId} draggable={false} />
}
