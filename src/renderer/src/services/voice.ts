const SPEECH_VOLUME = 1
const SPEECH_RATE = 0.95
const SPEECH_PITCH = 1

const FEMALE_VOICE_RE =
  /female|woman|girl|zira|aria|ava|jenny|emma|samantha|karen|moira|tessa|serena|kate|victoria|fiona|veena|sonia|nicky|michelle|joanna|salli|kendra|kimberly|ivy|reagan|jessa|libby|amara|corina|beatrice|cecilia|heather|hazel|susan|catherine|martha/i

const MALE_VOICE_RE =
  /male|man|boy|david|mark|daniel|george|thomas|james|oliver|alex|ryan|tom|charles|william|henry|andrew|peter|robert|sam|eric|adam|brian|josh|kenny|jeff|matt|taylor|vincent|frank|paul|guy|nathan|chris|mike|steve|joe|nick/i

let pendingSpeechTimer: number | null = null
// Bumped by stopSpeaking() to invalidate any speech still waiting for voices.
let speechToken = 0
let voicesLoadedPromise: Promise<boolean> | null = null

export interface SpeakOptions {
  delayMs?: number
  gender?: string
  volume?: number
  rate?: number
  pitch?: number
}

function speechSynthesisAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  )
}

/**
 * Resolves to `true` once speechSynthesis voices are available.
 * If the platform never reports voices (no "voiceschanged" event),
 * it resolves to `false` after `timeoutMs` so speech falls back to the
 * default system voice instead of hanging.
 */
function waitForVoices(timeoutMs = 2500): Promise<boolean> {
  if (!speechSynthesisAvailable()) return Promise.resolve(false)
  const synth = window.speechSynthesis
  const voices = synth.getVoices()
  if (voices.length > 0) return Promise.resolve(true)
  if (voicesLoadedPromise) return voicesLoadedPromise

  voicesLoadedPromise = new Promise<boolean>((resolve) => {
    let settled = false
    const onVoicesChanged = (): void => {
      if (settled) return
      const count = window.speechSynthesis.getVoices().length
      if (count > 0) {
        settled = true
        window.speechSynthesis.removeEventListener?.('voiceschanged', onVoicesChanged)
        resolve(true)
      }
    }
    window.speechSynthesis.addEventListener?.('voiceschanged', onVoicesChanged)
    window.setTimeout(() => {
      if (settled) return
      settled = true
      window.speechSynthesis.removeEventListener?.('voiceschanged', onVoicesChanged)
      resolve(window.speechSynthesis.getVoices().length > 0)
    }, timeoutMs)
  })
  return voicesLoadedPromise
}

function pickVoice(gender?: string): SpeechSynthesisVoice | null {
  const synth = window.speechSynthesis
  const voices = synth.getVoices()
  if (!voices || voices.length === 0) return null
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'))
  if (gender === 'male') {
    const male = english.find((v) => MALE_VOICE_RE.test(`${v.name} ${v.lang}`))
    return male ?? english[0] ?? null
  }
  const female = english.find((v) => FEMALE_VOICE_RE.test(`${v.name} ${v.lang}`))
  return female ?? english[0] ?? null
}

function doSpeak(text: string, options: SpeakOptions): void {
  if (!speechSynthesisAvailable()) {
    console.warn('[voice] SpeechSynthesis is not available in this browser.')
    return
  }
  const trimmed = text.trim()
  if (!trimmed) return

  const synth = window.speechSynthesis
  try {
    // Stop any previous speech before starting a new one.
    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(trimmed)
    utterance.volume = options.volume ?? SPEECH_VOLUME
    utterance.rate = options.rate ?? SPEECH_RATE
    utterance.pitch = options.pitch ?? SPEECH_PITCH
    utterance.onerror = (event): void => {
      console.warn('[voice] SpeechSynthesis error:', event?.error ?? event)
    }

    // Use a natural English voice when available. If none matches, leave
    // utterance.voice unset so the browser falls back to its default voice.
    const voice = pickVoice(options.gender)
    if (voice) utterance.voice = voice

    synth.speak(utterance)
  } catch (err) {
    console.warn('[voice] Failed to start speech:', err)
  }
}

function scheduleSpeak(text: string, options: SpeakOptions, delayMs: number): void {
  if (pendingSpeechTimer !== null) {
    window.clearTimeout(pendingSpeechTimer)
    pendingSpeechTimer = null
  }
  const token = ++speechToken
  pendingSpeechTimer = window.setTimeout(() => {
    pendingSpeechTimer = null
    // Wait for voices to load before speaking; fall back to the default
    // system voice if they never arrive.
    void waitForVoices().then(() => {
      if (token !== speechToken) return
      doSpeak(text, options)
    })
  }, delayMs)
}

export function speak(text: string, options: SpeakOptions | number = {}): void {
  const opts: SpeakOptions = typeof options === 'number' ? { delayMs: options } : options
  scheduleSpeak(text, opts, opts.delayMs ?? 0)
}

export function stopSpeaking(): void {
  // Invalidate any speech still pending or waiting for voices.
  speechToken += 1
  if (pendingSpeechTimer !== null) {
    window.clearTimeout(pendingSpeechTimer)
    pendingSpeechTimer = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch (err) {
      console.warn('[voice] Failed to cancel speech:', err)
    }
  }
}
