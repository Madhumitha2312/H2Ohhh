import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'

const PRELOAD = join(__dirname, '../preload/index.js')
const OVERLAY_PRELOAD = join(__dirname, '../preload/overlay.js')

let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let overlayReady = false
let pendingOverlayShow: {
  name?: string
  avatarId?: string
  gender?: string
  message?: string
  sound?: string
  voice?: { enabled: boolean; volume: number; rate: number; pitch: number }
} | null = null
let _tray: Tray | null = null
let remindersPaused = false
let reminderState: {
  intervalMinutes: number
  enabled: boolean
  name: string
  avatarId: string
  sound: string
} = {
  intervalMinutes: 30,
  enabled: true,
  name: '',
  avatarId: 'girl',
  sound: 'waterdrop'
}

function createTrayIcon(size = 32): Electron.NativeImage {
  const buffer = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const top = size * 0.16
  const cy = size * 0.55
  const r = size * 0.3

  const gradient = (t: number): [number, number, number] => {
    const a = [74, 144, 226]
    const b = [34, 211, 238]
    const m = Math.max(0, Math.min(1, t))
    return [
      Math.round(a[0] + (b[0] - a[0]) * m),
      Math.round(a[1] + (b[1] - a[1]) * m),
      Math.round(a[2] + (b[2] - a[2]) * m)
    ]
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const inCircle = dx * dx + dy * dy <= r * r
      const headH = size * 0.24
      const inTip = y >= top && y < cy && Math.abs(x + 0.5 - cx) <= (headH - (y - top)) * 0.62
      let inDrop = inCircle || inTip
      const px = (x + 0.5) / size
      const py = (y + 0.5) / size
      if (inDrop) {
        const t = py * 0.8 + 0.1
        const [cr, cg, cb] = gradient(t)
        const idx = (y * size + x) * 4
        const alpha = Math.min(1, Math.min(px, 1 - px, py, 1 - py) * 6)
        buffer[idx] = cb
        buffer[idx + 1] = cg
        buffer[idx + 2] = cr
        buffer[idx + 3] = Math.round(255 * alpha)
      }
    }
  }
  return nativeImage.createFromBitmap(buffer, { width: size, height: size })
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 830,
    minWidth: 1000,
    minHeight: 680,
    show: false,
    backgroundColor: '#eef6ff',
    title: 'H2Ohhh',
    webPreferences: {
      preload: PRELOAD,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function createOverlayWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 360,
    height: 450,
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
      preload: OVERLAY_PRELOAD,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/overlay.html'))
  }

  win.on('blur', () => {
    // Keep the overlay visible; do not auto-hide on blur.
  })

  return win
}

function positionOverlay(win: BrowserWindow): void {
  const { screen } = require('electron')
  const display = screen.getPrimaryDisplay()
  const { workArea } = display
  const [width, height] = win.getSize()
  const margin = 24
  win.setPosition(
    workArea.x + workArea.width - width - margin,
    workArea.y + workArea.height - height - margin,
    false
  )
}

function showOverlay(payload: {
  name?: string
  avatarId?: string
  gender?: string
  message?: string
  sound?: string
  voice?: { enabled: boolean; volume: number; rate: number; pitch: number }
}): void {
  if (!overlayWindow) return
  const data = {
    name: payload.name ?? reminderState.name,
    avatarId: payload.avatarId ?? reminderState.avatarId,
    gender: payload.gender,
    message: payload.message ?? '',
    sound: payload.sound ?? reminderState.sound,
    voice: payload.voice ?? { enabled: false, volume: 1, rate: 1, pitch: 1 }
  }
  if (!overlayReady) {
    pendingOverlayShow = data
    return
  }
  overlayWindow.webContents.send('overlay:show', data)
  positionOverlay(overlayWindow)
  overlayWindow.show()
  overlayWindow.focus()
}

function hideOverlay(): void {
  if (overlayWindow && overlayWindow.isVisible()) {
    overlayWindow.hide()
  }
}

function sendToMain(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}

function showMainWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function buildTray(): Tray {
  const trayIcon = createTrayIcon()
  const t = new Tray(trayIcon)
  t.setToolTip('H2Ohhh - Turning Sips Into Streaks')

  const refreshMenu = (): void => {
    t.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Open', click: () => showMainWindow() },
        {
          label: remindersPaused ? 'Resume Reminders' : 'Pause Reminders',
          click: () => {
            remindersPaused = !remindersPaused
            sendToMain('reminder:paused', remindersPaused)
            refreshMenu()
          }
        },
        { label: 'Drink Water', click: () => sendToMain('hydration:add', { amount: 250 }) },
        { label: 'Settings', click: () => showMainWindow() },
        { type: 'separator' },
        {
          label: 'Exit',
          click: () => {
            app.quit()
          }
        }
      ])
    )
  }
  refreshMenu()

  t.on('double-click', () => showMainWindow())
  return t
}

function registerIpc(): void {
  ipcMain.on('reminder:triggered', (_event, payload) => {
    if (remindersPaused || !reminderState.enabled) return
    showOverlay(payload ?? {})
  })

  ipcMain.on('reminder:sync', (_event, payload) => {
    if (payload) {
      reminderState = {
        intervalMinutes: payload.intervalMinutes ?? reminderState.intervalMinutes,
        enabled: payload.enabled ?? reminderState.enabled,
        name: payload.name ?? reminderState.name,
        avatarId: payload.avatarId ?? reminderState.avatarId,
        sound: payload.sound ?? reminderState.sound
      }
      if (typeof payload.paused === 'boolean') remindersPaused = payload.paused
    }
  })

  ipcMain.on('overlay:close', () => hideOverlay())

  ipcMain.on('overlay:drank', (_event, payload) => {
    hideOverlay()
    sendToMain('hydration:add', { amount: payload?.amount ?? 250 })
  })

  ipcMain.on('overlay:snooze', (_event, payload) => {
    hideOverlay()
    sendToMain('reminder:snooze', { minutes: payload?.minutes ?? 15 })
  })

  ipcMain.on('overlay:ready', (event) => {
    overlayWindow = BrowserWindow.fromWebContents(event.sender) ?? overlayWindow
    overlayReady = true
    if (pendingOverlayShow) {
      const data = pendingOverlayShow
      pendingOverlayShow = null
      if (overlayWindow) {
        overlayWindow.webContents.send('overlay:show', data)
        positionOverlay(overlayWindow)
        overlayWindow.show()
        overlayWindow.focus()
      }
    }
  })

  ipcMain.on('overlay:resize', (_event, payload) => {
    if (!overlayWindow) return
    const current = overlayWindow.getContentSize()
    const width = Math.max(140, Math.round(payload?.width ?? current[0]))
    const height = Math.max(120, Math.round(payload?.height ?? current[1]))
    overlayWindow.setContentSize(width, height)
    positionOverlay(overlayWindow)
  })

  ipcMain.on('overlay:pause', () => {
    remindersPaused = true
    sendToMain('reminder:paused', true)
  })
}

app.whenReady().then(() => {
  const gotLock = app.requestSingleInstanceLock()
  if (!gotLock) {
    app.quit()
    return
  }

  app.on('second-instance', () => showMainWindow())

  registerIpc()
  mainWindow = createMainWindow()
  overlayWindow = createOverlayWindow()
  _tray = buildTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    } else {
      showMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', () => {
  if (_tray) {
    _tray.destroy()
    _tray = null
  }
})
