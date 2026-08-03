const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let mainWin = null
let overlayWin = null
let reminderTriggered = false
let addWaterForwarded = false
let consoleErrors = []
let failures = 0

function assert(cond, label) {
  if (cond) {
    console.log('  PASS  ' + label)
  } else {
    failures++
    console.log('  FAIL  ' + label)
  }
}

ipcMain.on('reminder:triggered', (_e, payload) => {
  reminderTriggered = true
  if (overlayWin) {
    overlayWin.show()
    overlayWin.webContents.send('overlay:show', {
      name: payload?.name ?? 'TestUser',
      avatarId: payload?.avatarId ?? 'girl',
      message: payload?.message ?? 'Time to drink some water.',
      sound: 'none',
      voice: { enabled: false, volume: 1, rate: 1, pitch: 1 }
    })
  }
})

ipcMain.on('overlay:ready', (event) => {
  overlayWin = BrowserWindow.fromWebContents(event.sender)
})

ipcMain.on('overlay:drank', (_e, payload) => {
  addWaterForwarded = true
  if (overlayWin) overlayWin.hide()
  if (mainWin) mainWin.webContents.send('hydration:add', payload)
})

ipcMain.on('overlay:snooze', () => {
  if (overlayWin) overlayWin.hide()
})
ipcMain.on('overlay:close', () => { if (overlayWin) overlayWin.hide() })
ipcMain.on('reminder:sync', () => {})

const JS = {
  setValue: `(el, value) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }`,
  clickByText: `(text) => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().includes(text))
    if (!btn) return false
    btn.click()
    return true
  }`,
  clickByAria: `(label) => {
    const btn = document.querySelector('button[aria-label="' + label + '"]')
    if (!btn) return false
    btn.click()
    return true
  }`,
  inputByPlaceholder: `(ph, value) => {
    const el = document.querySelector('input[placeholder="' + ph + '"]')
    if (!el) return false
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }`
}

app.whenReady().then(async () => {
  mainWin = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(ROOT, 'out/preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false
    }
  })
  mainWin.webContents.on('console-message', (_e, level, message) => {
    if (level >= 3) consoleErrors.push(message)
  })

  await mainWin.loadFile(path.join(ROOT, 'out/renderer/index.html'))
  await mainWin.webContents.executeJavaScript('localStorage.clear()')
  await mainWin.webContents.reload()
  await sleep(800)

  overlayWin = new BrowserWindow({
    width: 400,
    height: 620,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(ROOT, 'out/preload/overlay.js'),
      contextIsolation: true,
      sandbox: false
    }
  })
  overlayWin.webContents.on('console-message', (_e, level, message) => {
    if (level >= 3) consoleErrors.push(message)
  })
  await overlayWin.loadFile(path.join(ROOT, 'out/renderer/overlay.html'))
  await sleep(800)

  try {
    await runTests()
  } catch (err) {
    failures++
    console.log('  ERROR  ' + (err && err.stack ? err.stack : String(err)))
  }

  console.log('')
  assert(consoleErrors.length === 0, 'no console errors: ' + JSON.stringify(consoleErrors))
  console.log('')
  if (failures > 0) {
    console.log(`${failures} test(s) FAILED`)
    app.exit(1)
  } else {
    console.log('All e2e tests passed ✓')
    app.exit(0)
  }
})

async function exec(win, code) {
  return win.webContents.executeJavaScript(code, true)
}

async function runTests() {
  console.log('== LANDING ==')
  const landingText = await exec(mainWin, `document.body.innerText.includes('Turning Sips')`)
  assert(landingText, 'landing page renders')

  console.log('== SIGNUP ==')
  await exec(mainWin, `location.hash = '#/signup'`)
  let formReady = false
  for (let i = 0; i < 40 && !formReady; i++) {
    formReady = await exec(
      mainWin,
      `!!document.querySelector('input[placeholder="Your name"]') && !!document.querySelector('input[placeholder="you@example.com"]') && document.querySelectorAll('input[placeholder="••••••••"]').length >= 2`
    )
    if (!formReady) await sleep(200)
  }
  assert(formReady, 'signup form rendered')

  await exec(mainWin, `(${JS.inputByPlaceholder})("Your name", "TestUser")`)
  await exec(mainWin, `(${JS.inputByPlaceholder})("you@example.com", "test@example.com")`)
  await exec(mainWin, `(() => {
    const inputs = document.querySelectorAll('input[placeholder="••••••••"]')
    if (inputs.length < 2) return false
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(inputs[0], 'pass1234')
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
    setter.call(inputs[1], 'pass1234')
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  const fieldsOk = await exec(
    mainWin,
    `(() => {
      const g = (p) => (document.querySelector('input[placeholder="' + p + '"]') || {}).value || ''
      return g('Your name') === 'TestUser' && g('you@example.com') === 'test@example.com'
    })()`
  )
  assert(fieldsOk, 'signup form fields filled')

  await exec(mainWin, `(${JS.clickByText})("Create Account")`)
  let onOnboarding = ''
  for (let i = 0; i < 40; i++) {
    onOnboarding = await exec(mainWin, `location.hash`)
    if (onOnboarding.includes('onboarding')) break
    await sleep(250)
  }
  assert(onOnboarding.includes('onboarding'), `signup redirects to onboarding (hash=${JSON.stringify(onOnboarding)})`)
  if (!onOnboarding.includes('onboarding')) {
    const dbg = await exec(mainWin, `location.href + ' || ERR: ' + (document.body.innerText.match(/Passwords do not match|already exists|must be|valid email/i) || [])[0]`)
    console.log('  DEBUG ' + dbg)
  }
  const usersStored = await exec(mainWin, `!!localStorage.getItem('h2ohhh:users')`)
  assert(usersStored, 'user persisted to localStorage after signup')

  console.log('== ONBOARDING WIZARD ==')
  const steps = [
    'Continue',
    'Continue',
    'Female',
    'Continue',
    '2,000 ml',
    'Continue',
    'Every 30 Minutes',
    'Continue',
    'Water Drop',
    'Continue',
    'Friendly Girl',
    'Continue',
    'Start My Journey'
  ]
  for (const stepText of steps) {
    let ok = false
    for (let attempt = 0; attempt < 15 && !ok; attempt++) {
      ok = await exec(mainWin, `(${JS.clickByText})(${JSON.stringify(stepText)})`)
      if (!ok) await sleep(200)
    }
    assert(ok, `onboarding step clicked: ${stepText}`)
    await sleep(400)
  }
  const onDashboard = await exec(mainWin, `location.hash`)
  assert(onDashboard.includes('dashboard'), 'onboarding finishes to dashboard')

  console.log('== DASHBOARD (own name, no hardcoded name) ==')
  const bodyText = await exec(mainWin, `document.body.innerText`)
  assert(bodyText.includes('TestUser'), 'dashboard shows logged-in user name')
  assert(bodyText.includes('Good'), 'greeting renders')
  assert(!bodyText.includes('Madhu'), 'no hardcoded placeholder name present')

  const profile = await exec(mainWin, `JSON.parse(localStorage.getItem('h2ohhh:users'))[0]`)
  assert(profile && profile.name === 'TestUser', 'profile stored with signup name')
  assert(profile && profile.onboarded === true, 'onboarding marks profile as onboarded')

  console.log('== PERSISTENCE (restart) ==')
  mainWin.webContents.reload()
  await sleep(1200)
  await exec(mainWin, `location.hash = '#/dashboard'`)
  await sleep(900)
  const afterRestart = await exec(mainWin, `document.body.innerText.includes('TestUser')`)
  assert(afterRestart, 'user persists across app restart')

  console.log('== SETTINGS ==')
  await exec(mainWin, `location.hash = '#/settings'`)
  await sleep(600)
  const okInterval = await exec(mainWin, `(${JS.clickByText})("Every 1 Hour")`)
  assert(okInterval, 'settings: changed interval to 1 hour')
  await sleep(400)
  const profAfter = await exec(mainWin, `JSON.parse(localStorage.getItem('h2ohhh:users'))[0]`)
  assert(profAfter.intervalMinutes === 60, 'interval saved to localStorage')
  const okAvatar = await exec(mainWin, `(${JS.clickByText})("Cute Water Drop")`)
  assert(okAvatar, 'settings: changed avatar')
  await sleep(400)
  const profAvatar = await exec(mainWin, `JSON.parse(localStorage.getItem('h2ohhh:users'))[0]`)
  assert(profAvatar.avatarId === 'waterdrop', 'avatar saved to localStorage')

  console.log('== REMINDER ENGINE (2 min interval + clock fast-forward) ==')
  const ok2min = await exec(mainWin, `(${JS.clickByText})("Every 2 Minutes")`)
  assert(ok2min, 'settings: selected 2 minute interval')
  await sleep(500)
  const profTest = await exec(mainWin, `JSON.parse(localStorage.getItem('h2ohhh:users'))[0]`)
  assert(profTest.intervalMinutes === 2, '2 minute interval saved to localStorage')
  await exec(mainWin, `location.hash = '#/dashboard'`)
  await sleep(1500) // let the reminder hook schedule with the 2-min interval

  // Fast-forward the clock so the countdown interval expires.
  await exec(
    mainWin,
    `(() => {
      const t0 = Date.now()
      const orig = Date.now
      window.__restoreClock = () => { Date.now = orig }
      Date.now = () => t0 + 3 * 60 * 1000
      return true
    })()`
  )
  await sleep(1500)
  let firedAt = -1
  for (let i = 0; i < 10; i++) {
    if (reminderTriggered) { firedAt = i; break }
    await sleep(500)
  }
  assert(reminderTriggered, `reminder fires and triggers desktop overlay (fired within ${(firedAt + 1) * 0.5}s)`)
  await exec(mainWin, `window.__restoreClock()`)

  console.log('== OVERLAY "I DRANK" ==')
  await sleep(700)
  assert(overlayWin && overlayWin.isVisible(), 'overlay window is visible')
  const overlayText = await exec(overlayWin, `document.body.innerText`)
  assert(overlayText.includes('TestUser') || overlayText.includes('sip'), 'overlay shows reminder message with user name')
  const hasVideo = await exec(overlayWin, `!!document.querySelector('#overlay-root video')`)
  assert(hasVideo, 'overlay renders reminder video element')
  const hasImg = await exec(overlayWin, `!!document.querySelector('#overlay-root img')`)
  assert(!hasImg, 'overlay does not render static avatar image')
  const drankOk = await exec(overlayWin, `(${JS.clickByText})("I Drank Water")`)
  assert(drankOk, 'overlay "I Drank Water" clickable')
  await sleep(1400)
  assert(addWaterForwarded, 'overlay forwarded drank action to dashboard')
  const water = await exec(
    mainWin,
    `JSON.parse(localStorage.getItem(${JSON.stringify('h2ohhh:user:' + profile.id + ':hydration')})).todayWater`
  )
  assert(water === 250, 'dashboard water intake updated to 250ml via overlay')

  console.log('== SNOOZE RESTART ==')
  reminderTriggered = false
  await exec(
    mainWin,
    `(() => {
      const t0 = Date.now()
      const orig = Date.now
      window.__restoreClock2 = () => { Date.now = orig }
      Date.now = () => t0 + 3 * 60 * 1000
      return true
    })()`
  )
  await sleep(2200)
  assert(reminderTriggered, 'reminder fires again after restart')
  await exec(mainWin, `window.__restoreClock2()`)
  await sleep(700)
  assert(overlayWin.isVisible(), 'overlay visible for snooze test')
  const snoozeOk = await exec(overlayWin, `(${JS.clickByText})("Snooze")`)
  assert(snoozeOk, 'overlay snooze button clickable')
  await sleep(500)
  const snooze5 = await exec(overlayWin, `(${JS.clickByText})("5 min")`)
  assert(snooze5, 'snooze option selected')
  await sleep(1200)
  assert(!overlayWin.isVisible(), 'overlay hidden after snooze action')

  console.log('== REMINDER SETTINGS ON/OFF ==')
  await exec(mainWin, `location.hash = '#/settings'`)
  await sleep(600)
  const offOk = await exec(mainWin, `(${JS.clickByText})("Reminder OFF")`)
  assert(offOk, 'settings: clicked Reminder OFF')
  await sleep(500)
  const profOff = await exec(mainWin, `JSON.parse(localStorage.getItem('h2ohhh:users'))[0]`)
  assert(profOff.remindersEnabled === false, 'Reminder OFF saved to localStorage')
  await exec(mainWin, `location.hash = '#/dashboard'`)
  await sleep(1500)
  reminderTriggered = false
  await exec(
    mainWin,
    `(() => {
      const t0 = Date.now()
      const orig = Date.now
      window.__restoreClock3 = () => { Date.now = orig }
      Date.now = () => t0 + 3 * 60 * 1000
      return true
    })()`
  )
  await sleep(2500)
  assert(!reminderTriggered, 'no reminder fires while Reminder is OFF')
  await exec(mainWin, `window.__restoreClock3()`)

  await exec(mainWin, `location.hash = '#/settings'`)
  await sleep(600)
  const onOk = await exec(mainWin, `(${JS.clickByText})("Reminder ON")`)
  assert(onOk, 'settings: clicked Reminder ON')
  await sleep(500)
  const profOn = await exec(mainWin, `JSON.parse(localStorage.getItem('h2ohhh:users'))[0]`)
  assert(profOn.remindersEnabled === true, 'Reminder ON saved to localStorage')
  await exec(mainWin, `location.hash = '#/dashboard'`)
  await sleep(1500)
  reminderTriggered = false
  await exec(
    mainWin,
    `(() => {
      const t0 = Date.now()
      const orig = Date.now
      window.__restoreClock4 = () => { Date.now = orig }
      Date.now = () => t0 + 3 * 60 * 1000
      return true
    })()`
  )
  await sleep(2500)
  assert(reminderTriggered, 'reminder fires again after Reminder ON')
  await exec(mainWin, `window.__restoreClock4()`)
}
