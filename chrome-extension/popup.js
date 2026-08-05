/* H2Ohhh Companion - popup controller */
const $ = (sel) => document.querySelector(sel)

const PRESETS = [2, 5, 15, 30, 60]
const WEBSITE_URL = 'https://h2ohhh.vercel.app'

let settings = null

function fmtCountdown(at) {
  if (!at) return 'Off'
  const sec = Math.max(0, Math.ceil((at - Date.now()) / 1000))
  if (sec <= 0) return 'Now'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function render() {
  if (!settings) return
  const enabled = !!settings.enabled
  const interval = settings.customIntervalMinutes > 0 ? settings.customIntervalMinutes : settings.intervalMinutes
  const preset = PRESETS.includes(interval)

  $('#toggle-btn').setAttribute('aria-checked', String(enabled))
  $('#toggle-btn').classList.toggle('on', enabled)

  $('#voice-toggle').setAttribute('aria-checked', String(settings.voiceEnabled !== false))
  $('#voice-toggle').classList.toggle('on', settings.voiceEnabled !== false)

  $('#interval-label').textContent = preset ? `${interval} min` : 'Custom'
  $('.opt').forEach((b) => {
    const v = b.dataset.min
    const active =
      (v === 'custom' && !preset) || (v !== 'custom' && Number(v) === interval)
    b.classList.toggle('active', active)
  })

  const cf = settings.customIntervalMinutes > 0
  $('#custom-wrap').classList.toggle('hidden', !cf)

  $('.avatar-opt').forEach((el) => {
    el.classList.toggle('active', el.dataset.avatar === (settings.avatarId === 'boy' ? 'boy' : 'girl'))
  })

  $('#countdown').textContent = enabled ? fmtCountdown(settings.nextReminderAt) : 'Off (Reminder OFF)'

  const dot = $('#status-dot')
  if (settings.loggedIn) {
    dot.classList.remove('off')
    dot.classList.add('on')
    $('#sync-note').textContent = 'Synced with H2Ohhh website'
  } else {
    dot.classList.remove('on')
    dot.classList.add('off')
    $('#sync-note').textContent = 'Open H2Ohhh website & log in to sync settings'
  }
}

function save(patch) {
  chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: patch })
}

function startCountdown() {
  setInterval(() => {
    if (settings) $('#countdown').textContent = settings.enabled ? fmtCountdown(settings.nextReminderAt) : 'Off (Reminder OFF)'
  }, 1000)
}

$('#toggle-btn').addEventListener('click', () => {
  const next = !settings.enabled
  save({ enabled: next })
  $('#toggle-btn').setAttribute('aria-checked', String(next))
  $('#toggle-btn').classList.toggle('on', next)
})

$('#voice-toggle').addEventListener('click', () => {
  const next = settings.voiceEnabled !== false ? false : true
  save({ voiceEnabled: next })
  $('#voice-toggle').setAttribute('aria-checked', String(next))
  $('#voice-toggle').classList.toggle('on', next)
})

$('.interval-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('.opt')
  if (!btn) return
  const v = btn.dataset.min
  if (v === 'custom') {
    $('#custom-wrap').classList.remove('hidden')
    $('#custom-input').focus()
    save({ customIntervalMinutes: 0 })
  } else {
    save({ intervalMinutes: Number(v), customIntervalMinutes: 0 })
  }
})

$('#custom-apply').addEventListener('click', () => {
  const v = parseInt($('#custom-input').value, 10)
  if (v > 0) save({ customIntervalMinutes: v })
})

$('.avatar-row').addEventListener('click', (e) => {
  const btn = e.target.closest('.avatar-opt')
  if (!btn) return
  const avatarId = btn.dataset.avatar
  save({ avatarId, gender: avatarId === 'boy' ? 'male' : 'female' })
})

$('#open-options').addEventListener('click', () => chrome.runtime.openOptionsPage())
$('#open-site').addEventListener('click', () => chrome.tabs.create({ url: WEBSITE_URL }))

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'SETTINGS_UPDATED') {
    settings = msg.settings
    render()
  }
})

chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
  if (res && res.ok) {
    settings = res.settings
    render()
    startCountdown()
  }
})