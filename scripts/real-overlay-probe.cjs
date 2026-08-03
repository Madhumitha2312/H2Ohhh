const { spawn } = require('child_process')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const ELECTRON = path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe')
const PROFILE_ID = 'probe-user'
const CDP_PORT = 9222

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let failures = 0
function assert(cond, label) {
  if (cond) console.log('  PASS  ' + label)
  else {
    failures++
    console.log('  FAIL  ' + label)
  }
}

class CdpClient {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) p.reject(new Error(msg.error.message))
        else p.resolve(msg.result)
      }
    }
  }
  static open(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      ws.onopen = () => resolve(new CdpClient(ws))
      ws.onerror = () => reject(new Error('ws connect failed: ' + url))
    })
  }
  send(method, params) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (res.exceptionDetails) throw new Error('eval exception: ' + JSON.stringify(res.exceptionDetails))
    return res.result ? res.result.value : undefined
  }
}

async function getTargets() {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`)
  return res.json()
}

async function waitForTarget(predicate, label, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const targets = await getTargets()
      const hit = targets.find((t) => t.type === 'page' && predicate(t))
      if (hit) return hit
    } catch {}
    await sleep(400)
  }
  throw new Error('target not found: ' + label)
}

async function pollUntil(fn, label, timeoutMs = 15000) {
  const start = Date.now()
  let last
  while (Date.now() - start < timeoutMs) {
    try {
      last = await fn()
      if (last) return last
    } catch {}
    await sleep(400)
  }
  throw new Error('poll timeout: ' + label + ' (last=' + JSON.stringify(last) + ')')
}

;(async () => {
  console.log('== REAL APP NATIVE OVERLAY PROBE ==')
  const stderrFile = path.join(require('os').tmpdir(), 'h2o-probe.err.log')
  const errOut = require('fs').openSync(stderrFile, 'w')
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const app = spawn(ELECTRON, ['.', `--remote-debugging-port=${CDP_PORT}`], { cwd: ROOT, env, stdio: ['ignore', 'ignore', errOut] })

  try {
    const mainTarget = await waitForTarget((t) => t.url.includes('index.html'), 'main window')
    const main = await CdpClient.open(mainTarget.webSocketDebuggerUrl)

    console.log('== SETUP (inject test profile + reload) ==')
    await main.evaluate(`(() => {
      const id = '${PROFILE_ID}'
      const profile = {
        id, name: 'Probe User', email: 'probe@example.com', gender: 'female', goal: 2500,
        intervalMinutes: 2, avatarId: 'girl', sound: 'waterdrop',
        voice: { enabled: false, volume: 1, rate: 1, pitch: 1 }, theme: 'light',
        remindersEnabled: true, onboarded: true, createdAt: Date.now()
      }
      localStorage.clear()
      localStorage.setItem('h2ohhh:users', JSON.stringify([{ ...profile, passwordHash: 'h2o:x' }]))
      localStorage.setItem('h2ohhh:session', JSON.stringify({ userId: id, remember: true }))
      location.reload()
      return 'ok'
    })()`)
    await sleep(3000)

    const overlayTarget = await waitForTarget((t) => t.url.includes('overlay.html'), 'overlay window')
    const overlay = await CdpClient.open(overlayTarget.webSocketDebuggerUrl)

    const hasDrankBefore = await overlay.evaluate(`document.body.innerText.includes('I Drank Water')`)
    assert(!hasDrankBefore, 'overlay has no reminder content before reminder fires')

    console.log('== TRIGGER REMINDER (2-min test interval + clock fast-forward) ==')
    await main.evaluate(`(() => {
      const t0 = Date.now()
      window.__orig = Date.now
      window.__restore = () => { Date.now = window.__orig }
      Date.now = () => t0 + 3 * 60 * 1000
      return 'ok'
    })()`)

    const shown = await pollUntil(() => overlay.evaluate(`document.body.innerText.includes('I Drank Water')`), 'overlay shown with content')
    assert(shown, 'native overlay window showed the reminder content after firing')

    const layout = await pollUntil(() => overlay.evaluate(`(() => {
      if (window.outerWidth >= 400 || window.outerHeight >= 680) return null
      return {
        cx: window.screenX + window.outerWidth / 2,
        cy: window.screenY + window.outerHeight / 2,
        sw: window.screen.width,
        sh: window.screen.height,
        ow: window.outerWidth,
        oh: window.outerHeight
      }
    })()`), 'overlay window sized to content', 8000)
    assert(layout.ow > 0 && layout.oh > 0, `overlay window is tight, not a large blank window (${layout.ow}x${layout.oh})`)
    assert(Math.abs(layout.cx - layout.sw / 2) < 150, `overlay is centered on the desktop, not on the right side (cx=${Math.round(layout.cx)})`)

    const hasVideo = await overlay.evaluate(`!!document.querySelector('#overlay-root video')`)
    assert(hasVideo, 'overlay renders the reminder video element')
    const videoW = await overlay.evaluate(`(() => { const v = document.querySelector('#overlay-root video'); return v ? v.getBoundingClientRect().width : 0 })()`)
    assert(videoW >= 170, `reminder video is enlarged to be the primary element (width=${Math.round(videoW)}px)`)
    const videoFit = await overlay.evaluate(`(() => { const v = document.querySelector('#overlay-root video'); return v ? getComputedStyle(v).objectFit : '' })()`)
    assert(videoFit === 'contain', `reminder video uses object-fit: contain (got "${videoFit}")`)
    const videoRadius = await overlay.evaluate(`(() => { const v = document.querySelector('#overlay-root video'); return v ? getComputedStyle(v).borderRadius : '' })()`)
    assert(videoRadius === '0px', 'reminder video has no circular/fixed-square frame')
    const videoParentBg = await overlay.evaluate(`(() => {
      const v = document.querySelector('#overlay-root video')
      return v ? getComputedStyle(v.parentElement).backgroundColor : ''
    })()`)
    assert(videoParentBg === 'rgba(0, 0, 0, 0)', 'reminder video is shown directly, no card/panel behind it')
    const noClose = await overlay.evaluate(`!document.querySelector('[aria-label="Close reminder"]')`)
    assert(noClose, 'overlay has no Close (X) button')
    const bodyText = await overlay.evaluate('document.body.innerText')
    assert(/Drank Water/.test(bodyText), 'overlay shows "I Drank Water" button')
    assert(/Snooze/.test(bodyText), 'overlay shows "Snooze" button')
    assert(/Probe User|water/i.test(bodyText), 'overlay shows reminder message / speech bubble')

    const speechStarted = await (async () => {
      const start = Date.now()
      while (Date.now() - start < 6000) {
        try {
          const s = await overlay.evaluate(`window.speechSynthesis.speaking === true || window.speechSynthesis.pending === true`)
          if (s) return true
        } catch {}
        await sleep(300)
      }
      return false
    })()
    assert(speechStarted, 'assistant speaks automatically via speechSynthesis (no interaction)')

    const modalInMain = await main.evaluate(`[...document.querySelectorAll('button')].some((b) => b.textContent.includes('I Drank Water'))`)
    assert(!modalInMain, 'no React reminder modal inside the dashboard')

    console.log('== CLICK "I Drank Water" ==')
    const clicked = await overlay.evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('I Drank Water'))
      if (!b) return false
      b.click()
      return true
    })()`)
    assert(clicked, 'overlay "I Drank Water" clicked')

    const hidden = await pollUntil(() => overlay.evaluate(`!document.body.innerText.includes('I Drank Water')`), 'overlay cleared', 10000)
    assert(hidden, 'overlay hidden after drinking')

    const speechStopped = await (async () => {
      const start = Date.now()
      while (Date.now() - start < 5000) {
        try {
          const s = await overlay.evaluate(`!window.speechSynthesis.speaking && !window.speechSynthesis.pending`)
          if (s) return true
        } catch {}
        await sleep(300)
      }
      return false
    })()
    assert(speechStopped, 'speech cancelled when reminder closed')

    const hyd = await main.evaluate(`JSON.parse(localStorage.getItem('h2ohhh:user:${PROFILE_ID}:hydration'))`)
    assert(hyd && hyd.todayWater === 250, 'localStorage updated to 250 ml via IPC')
    const restarted = await pollUntil(() => main.evaluate(`(() => {
      const h = JSON.parse(localStorage.getItem('h2ohhh:user:${PROFILE_ID}:hydration'))
      return h && typeof h.nextReminderAt === 'number' && h.nextReminderAt > 0
    })()`), 'nextReminderAt set', 8000)
    assert(restarted, 'reminder timer restarted (nextReminderAt set)')
    await main.evaluate(`window.__restore()`)

    console.log('== REMINDER OFF (interval expires, nothing appears) ==')
    await main.evaluate(`(() => {
      const users = JSON.parse(localStorage.getItem('h2ohhh:users'))
      users[0].remindersEnabled = false
      localStorage.setItem('h2ohhh:users', JSON.stringify(users))
      location.reload()
      return 'ok'
    })()`)
    await sleep(3000)
    await main.evaluate(`(() => {
      const t0 = Date.now()
      window.__orig = Date.now
      window.__restore = () => { Date.now = window.__orig }
      Date.now = () => t0 + 3 * 60 * 1000
      return 'ok'
    })()`)
    const offStayedHidden = await (async () => {
      const start = Date.now()
      while (Date.now() - start < 7000) {
        try {
          const s = await overlay.evaluate(`document.body.innerText.includes('I Drank Water')`)
          if (s) return false
        } catch {}
        await sleep(400)
      }
      return true
    })()
    assert(offStayedHidden, 'with Reminder OFF nothing appears after the interval expires')
    await main.evaluate(`window.__restore()`)

    console.log('== REMINDER ON (interval expires, reminder appears again) ==')
    await main.evaluate(`(() => {
      const users = JSON.parse(localStorage.getItem('h2ohhh:users'))
      users[0].remindersEnabled = true
      localStorage.setItem('h2ohhh:users', JSON.stringify(users))
      location.reload()
      return 'ok'
    })()`)
    await sleep(3000)
    await main.evaluate(`(() => {
      const t0 = Date.now()
      window.__orig = Date.now
      window.__restore = () => { Date.now = window.__orig }
      Date.now = () => t0 + 3 * 60 * 1000
      return 'ok'
    })()`)
    const onShownAgain = await pollUntil(() => overlay.evaluate(`document.body.innerText.includes('I Drank Water')`), 'overlay shown again after Reminder ON', 12000)
    assert(onShownAgain, 'with Reminder ON the reminder appears after the interval expires')
    await main.evaluate(`window.__restore()`)
  } catch (err) {
    failures++
    console.log('  ERROR  ' + (err && err.stack ? err.stack : String(err)))
  } finally {
    try {
      app.kill()
    } catch {}
    await sleep(800)
    console.log('')
    if (failures > 0) {
      console.log(failures + ' probe check(s) FAILED')
      process.exit(1)
    } else {
      console.log('All real-app overlay probe checks passed ✓')
      process.exit(0)
    }
  }
})()
