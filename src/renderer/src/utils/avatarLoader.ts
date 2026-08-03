type GlobResult = Record<string, { default?: string }>

const modules = import.meta.glob('../assets/avatars/*', { eager: true }) as unknown as GlobResult

const assets: Record<string, string> = {}
for (const [path, mod] of Object.entries(modules)) {
  const base = path.split('/').pop() ?? ''
  assets[base] = mod?.default ?? base
}

// Extension priority: future AI-generated video avatars are preferred, then images.
const EXT_PRIORITY = ['mp4', 'webm', 'gif', 'png', 'svg']

const CASUAL: Record<string, string[]> = {
  girl: ['girl-casual', 'girl-office', 'girl-reminder'],
  boy: ['boy-casual', 'boy-reminder'],
  waterdrop: ['waterdrop'],
  bubble: ['bubble']
}

const REMINDER: Record<string, string[]> = {
  girl: ['girl-reminder', 'girl-casual'],
  boy: ['boy-reminder', 'boy-casual'],
  waterdrop: ['waterdrop'],
  bubble: ['bubble']
}

function findAsset(baseName: string): string | null {
  const stem = baseName.replace(/\.[^.]+$/, '')
  for (const ext of EXT_PRIORITY) {
    const key = `${stem}.${ext}`
    if (assets[key]) return assets[key]
  }
  return null
}

export type AvatarVariant = 'casual' | 'reminder'

export function avatarUrl(avatarId: string, variant: AvatarVariant = 'casual'): string | null {
  const list = (variant === 'reminder' ? REMINDER : CASUAL)[avatarId]
  if (!list) return null
  for (const name of list) {
    const url = findAsset(name)
    if (url) return url
  }
  return null
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm)(\?.*)?$/i.test(url)
}

export function isGifUrl(url: string): boolean {
  return /\.gif(\?.*)?$/i.test(url)
}
