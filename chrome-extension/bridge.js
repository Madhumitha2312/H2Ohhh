/* H2Ohhh Companion - website settings bridge
 * Runs only on the H2Ohhh website (see manifest content_scripts matches).
 * Reads the reminder settings the website saves in localStorage and syncs
 * them to the extension so the extension reminds you everywhere.
 *
 * The website already persists settings under:
 *   h2ohhh:session -> { userId }      (active session)
 *   h2ohhh:users   -> [ { id, name, gender, avatarId, intervalMinutes,
 *                         remindersEnabled, sound, voice, ... } ]
 */
const SESSION_KEY = 'h2ohhh:session'
const USERS_KEY = 'h2ohhh:users'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch (_) {
    return fallback
  }
}

function readWebsiteSettings() {
  try {
    const session = readJSON(SESSION_KEY, null)
    const users = readJSON(USERS_KEY, [])
    const profile = session && session.userId ? users.find((u) => u.id === session.userId) : null

    if (!profile) {
      return { loggedIn: false, enabled: false }
    }

    const voice = profile.voice || { enabled: true, volume: 1, rate: 0.95, pitch: 1 }
    return {
      loggedIn: true,
      enabled: !!profile.remindersEnabled,
      intervalMinutes: Number(profile.intervalMinutes) || 30,
      avatarId: profile.avatarId || 'girl',
      gender: profile.gender || 'female',
      name: profile.name || '',
      sound: profile.sound || 'waterdrop',
      voiceEnabled: voice.enabled !== false,
      voice: {
        volume: Number(voice.volume) || 1,
        rate: Number(voice.rate) || 0.95,
        pitch: Number(voice.pitch) || 1
      }
    }
  } catch (_) {
    return { loggedIn: false, enabled: false }
  }
}

let lastSynced = null

function syncNow() {
  const settings = readWebsiteSettings()
  const json = JSON.stringify(settings)
  if (json === lastSynced) return
  lastSynced = json
  try {
    chrome.runtime.sendMessage({ type: 'SYNC_FROM_WEBSITE', settings }).catch(() => {})
  } catch (_) {
    // extension context may be busy; try again next tick
  }
}

// Sync on page load, on visibility change and periodically while the
// website tab is open so setting edits are picked up quickly.
syncNow()
window.addEventListener('focus', syncNow)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') syncNow()
})
setInterval(syncNow, 3000)