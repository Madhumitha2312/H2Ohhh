/* H2Ohhh Companion - background service worker
 * Responsibilities:
 *  - Keep reminder settings in chrome.storage.local
 *  - Schedule/restart the reminder alarm (survives tab changes & browser restarts)
 *  - Relay SHOW_REMINDER to the active tab when the alarm fires
 *  - Accept settings from the popup/options page and from the website bridge
 */
const REMINDER_ALARM = 'h2o-reminder'

const DEFAULT_SETTINGS = {
  enabled: false,
  intervalMinutes: 30,
  customIntervalMinutes: 0,
  avatarId: 'girl',
  gender: 'female',
  name: '',
  sound: 'waterdrop',
  voiceEnabled: true,
  voice: { volume: 1, rate: 0.95, pitch: 1 },
  loggedIn: false,
  nextReminderAt: null,
  lastSyncAt: null
}

let settings = { ...DEFAULT_SETTINGS }

function loadSettings() {
  return chrome.storage.local.get({ settings: DEFAULT_SETTINGS }).then((res) => {
    settings = { ...DEFAULT_SETTINGS, ...(res.settings || {}) }
    return settings
  })
}

function saveSettings(patch) {
  settings = { ...settings, ...patch }
  return chrome.storage.local.set({ settings })
}

function effectiveInterval() {
  const base = settings.customIntervalMinutes > 0 ? settings.customIntervalMinutes : settings.intervalMinutes
  return Math.max(0.5, base)
}

function scheduleNextReminder() {
  if (settings.enabled && settings.loggedIn) {
    const delayMinutes = effectiveInterval()
    const at = Date.now() + delayMinutes * 60000
    chrome.alarms.create(REMINDER_ALARM, { delayInMinutes: delayMinutes })
    return saveSettings({ nextReminderAt: at })
  }
  chrome.alarms.clear(REMINDER_ALARM)
  return saveSettings({ nextReminderAt: null })
}

async function fireReminder() {
  const payload = {
    name: settings.name || '',
    avatarId: settings.avatarId || 'girl',
    gender: settings.gender || 'female',
    sound: settings.sound || 'waterdrop',
    voiceEnabled: settings.voiceEnabled !== false,
    voice: settings.voice || { volume: 1, rate: 0.95, pitch: 1 }
  }

  let sent = false
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (tab && tab.id != null && tab.url && /^https?:/.test(tab.url)) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_REMINDER', payload })
        sent = true
      } catch (_) {
        // Content script not present (tab opened before the extension loaded).
        // Inject it into the active tab so the overlay appears on this site.
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
          await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_REMINDER', payload })
          sent = true
        } catch (_) {
          // Not injectable (chrome://, webstore, PDF viewer, etc.)
        }
      }
    }
  } catch (_) {
    // Tabs API unavailable for some reason
  }

  // Fallback: show on any tab that has the content script.
  if (!sent) {
    try {
      const tabs = await chrome.tabs.query({})
      for (const t of tabs) {
        if (t.id == null) continue
        try {
          await chrome.tabs.sendMessage(t.id, { type: 'SHOW_REMINDER', payload })
          sent = true
          break
        } catch (_) {
          // keep looking
        }
      }
    } catch (_) {
      // ignore
    }
  }

  // Regardless of where it is shown, restart the timer so reminders continue.
  await scheduleNextReminder()
}

chrome.runtime.onInstalled.addListener(async () => {
  await loadSettings()
  await scheduleNextReminder()
})

chrome.runtime.onStartup.addListener(async () => {
  await loadSettings()
  await scheduleNextReminder()
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REMINDER_ALARM) {
    fireReminder()
  }
})

// Videos are fetched here in the service worker instead of the content
// script: content-script network requests are subject to the host page's CSP
// (YouTube/ChatGPT/Gmail block chrome-extension:// fetches), which is why the
// overlay stayed blank on foreign sites while voice still played.
const VIDEO_CACHE = new Map()

async function getVideoBytes(file) {
  if (VIDEO_CACHE.has(file)) return VIDEO_CACHE.get(file)
  const url = chrome.runtime.getURL('assets/' + file)
  const res = await fetch(url)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const data = await res.arrayBuffer()
  VIDEO_CACHE.set(file, data)
  return data
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return

  switch (message.type) {
    case 'GET_SETTINGS': {
      sendResponse({ ok: true, settings })
      break
    }
    case 'SAVE_SETTINGS': {
      const s = message.settings || {}
      const voice = { ...settings.voice, ...(s.voice || {}) }
      const patch = {
        enabled: typeof s.enabled === 'boolean' ? s.enabled : settings.enabled,
        intervalMinutes: typeof s.intervalMinutes === 'number' ? s.intervalMinutes : settings.intervalMinutes,
        customIntervalMinutes: typeof s.customIntervalMinutes === 'number' ? s.customIntervalMinutes : settings.customIntervalMinutes,
        avatarId: typeof s.avatarId === 'string' ? s.avatarId : settings.avatarId,
        gender: typeof s.gender === 'string' ? s.gender : settings.gender,
        name: typeof s.name === 'string' ? s.name : settings.name,
        sound: typeof s.sound === 'string' ? s.sound : settings.sound,
        voiceEnabled: typeof s.voiceEnabled === 'boolean' ? s.voiceEnabled : settings.voiceEnabled,
        voice
      }
      saveSettings(patch)
        .then(() => scheduleNextReminder())
        .then(() => sendResponse({ ok: true, settings }))
      return true
    }
    case 'SYNC_FROM_WEBSITE': {
      const s = message.settings || {}
      const patch = {
        loggedIn: !!s.loggedIn,
        enabled: !!s.loggedIn && !!s.enabled,
        intervalMinutes: typeof s.intervalMinutes === 'number' ? s.intervalMinutes : settings.intervalMinutes,
        customIntervalMinutes: typeof s.customIntervalMinutes === 'number' ? s.customIntervalMinutes : settings.customIntervalMinutes,
        avatarId: typeof s.avatarId === 'string' ? s.avatarId : settings.avatarId,
        gender: typeof s.gender === 'string' ? s.gender : settings.gender,
        name: typeof s.name === 'string' ? s.name : settings.name,
        sound: typeof s.sound === 'string' ? s.sound : settings.sound,
        voiceEnabled: typeof s.voiceEnabled === 'boolean' ? s.voiceEnabled : settings.voiceEnabled,
        voice: s.voice || settings.voice,
        lastSyncAt: Date.now()
      }
      saveSettings(patch)
        .then(() => scheduleNextReminder())
        .then(() => {
          sendResponse({ ok: true, settings })
          // Let the popup/options page update if open.
          chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings }).catch(() => {})
        })
      return true
    }
    case 'DRANK': {
      scheduleNextReminder().then(() => sendResponse({ ok: true }))
      return true
    }
    case 'SNOOZE': {
      const minutes = Math.max(0.5, Number(message.minutes) || 15)
      const custom = Number(message.minutes) || 0
      saveSettings({ customIntervalMinutes: custom > 0 ? custom : settings.customIntervalMinutes })
        .then(() => {
          const at = Date.now() + minutes * 60000
          chrome.alarms.create(REMINDER_ALARM, { delayInMinutes: minutes })
          return saveSettings({ nextReminderAt: at })
        })
        .then(() => sendResponse({ ok: true }))
      return true
    }
    case 'TOGGLE': {
      const enabled = !!message.enabled
      saveSettings({ enabled }).then(() => scheduleNextReminder()).then(() => sendResponse({ ok: true, settings }))
      return true
    }
    case 'GET_VIDEO': {
      const file = String(message.file || '')
      getVideoBytes(file)
        .then((data) => sendResponse({ ok: true, file, data }))
        .catch((err) => {
          console.error('[H2Ohhh bg] GET_VIDEO failed', file, err && err.message)
          sendResponse({ ok: false, file })
        })
      return true
    }
    case 'REFRESH': {
      sendResponse({ ok: true, settings })
      break
    }
    default:
      break
  }
})