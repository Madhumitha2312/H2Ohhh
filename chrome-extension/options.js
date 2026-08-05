/* H2Ohhh Companion - options controller */
const $ = (sel) => document.querySelector(sel)

const PRESETS = [2, 5, 10, 15, 30, 45, 60, 120]
const WEBSITE_URL = 'https://h2ohhh.vercel.app'

let settings = null

function fmtCountdown(at) {
  if (!at) return '—'
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

  const master = $('#master-toggle')
  master.setAttribute('aria-checked', String(enabled))
  master.classList.toggle('on', enabled)

  const vt = $('#voice-toggle')
  vt.setAttribute('aria-checked', String(settings.voiceEnabled !== false))
  vt.classList.toggle('on', settings.voiceEnabled !== false)
  $('#voice-sliders').classList.toggle('dimmed', settings.voiceEnabled === false)

  $('#interval-label').textContent = preset ? `every ${interval} min` : `every ${interval} min (custom)`
  $('.opt').forEach((b) => {
    const v = b.dataset.min
    if (v) {
      b.classList.toggle('active', v !== 'custom' && Number(v) === interval)
    }
  })

  $('.sound-row .opt').forEach((b) => {
    b.classList.toggle('active', b.dataset.sound === settings.sound)
  })

  $('.avatar-opt').forEach((el) => {
    el.classList.toggle('active', el.dataset.avatar === (settings.avatarId === 'boy' ? 'boy' : 'girl'))
  })

  const voice = settings.voice || {}
  $('#v-volume').value = voice.volume != null ? voice.volume : 1
  $('#v-rate').value = voice.rate != null ? voice.rate : 0.95
  $('#v-pitch').value = voice.pitch != null ? voice.pitch : 1
  $('#v-volume-val').textContent = $('#v-volume').value
  $('#v-rate-val').textContent = $('#v-rate').value
  $('#v-pitch-val').textContent = $('#v-pitch').value

  $('#countdown').textContent = enabled ? fmtCountdown(settings.nextReminderAt) : 'Off (Reminder OFF)'

  const dot = $('#status-dot')
  if (settings.loggedIn) {
    dot.classList.remove('off'); dot.classList.add('on')
    $('#sync-note').textContent = `Synced with H2Ohhh website · ${settings.name ? settings.name + ' · ' : ''}last sync ${new Date(settings.lastSyncAt || Date.now()).toLocaleTimeString()}`
  } else {
    dot.classList.remove('on'); dot.classList.add('off')
    $('#sync-note').textContent = 'Not synced. Open the H2Ohhh website and log in.'
  }
}

function save(patch) {
  chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: patch })
}

function setVoice(patch) {
  save({ voice: { ...(settings.voice || {}), ...patch } })
}

$('#master-toggle').addEventListener('click', () => save({ enabled: !settings.enabled }))
$('#voice-toggle').addEventListener('click', () => save({ voiceEnabled: settings.voiceEnabled !== false ? false : true }))

$('.interval-grid').addEventListener('click', (e) => {
  const b = e.target.closest('.opt')
  if (!b) return
  save({ intervalMinutes: Number(b.dataset.min), customIntervalMinutes: 0 })
})

$('#custom-apply').addEventListener('click', () => {
  const v = parseInt($('#custom-input').value, 10)
  if (v > 0) save({ customIntervalMinutes: v })
})

$('.sound-row').addEventListener('click', (e) => {
  const b = e.target.closest('.opt')
  if (!b) return
  save({ sound: b.dataset.sound })
})

$('.avatar-row').addEventListener('click', (e) => {
  const b = e.target.closest('.avatar-opt')
  if (!b) return
  const avatarId = b.dataset.avatar
  save({ avatarId, gender: avatarId === 'boy' ? 'male' : 'female' })
})

$('#v-volume').addEventListener('input', (e) => { $('#v-volume-val').textContent = e.target.value; setVoice({ volume: parseFloat(e.target.value) }) })
$('#v-rate').addEventListener('input', (e) => { $('#v-rate-val').textContent = e.target.value; setVoice({ rate: parseFloat(e.target.value) }) })
$('#v-pitch').addEventListener('input', (e) => { $('#v-pitch-val').textContent = e.target.value; setVoice({ pitch: parseFloat(e.target.value) }) })

$('#open-site').addEventListener('click', () => chrome.tabs.create({ url: WEBSITE_URL }))
$('#force-sync').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'REFRESH' }, (res) => {
    if (res && res.ok) { settings = res.settings; render() }
  })
})

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'SETTINGS_UPDATED') { settings = msg.settings; render() }
})

chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
  if (res && res.ok) { settings = res.settings; render() }
})

setInterval(() => {
  if (settings) $('#countdown').textContent = settings.enabled ? fmtCountdown(settings.nextReminderAt) : 'Off (Reminder OFF)'
}, 1000)