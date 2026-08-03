import { contextBridge, ipcRenderer } from 'electron'

export interface ReminderTriggerPayload {
  name?: string
  avatarId?: string
  gender?: string
  message?: string
  sound?: string
  voice?: { enabled: boolean; volume: number; rate: number; pitch: number }
}

const api = {
  isElectron: true as const,
  platform: process.platform,

  sendReminderSync(payload: {
    intervalMinutes?: number
    enabled?: boolean
    paused?: boolean
    name?: string
    avatarId?: string
    sound?: string
  }): void {
    ipcRenderer.send('reminder:sync', payload)
  },

  reminderTriggered(payload: ReminderTriggerPayload): void {
    ipcRenderer.send('reminder:triggered', payload)
  },

  closeOverlay(): void {
    ipcRenderer.send('overlay:close')
  },

  onReminderPaused(callback: (paused: boolean) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, paused: boolean): void => callback(paused)
    ipcRenderer.on('reminder:paused', listener)
    return () => ipcRenderer.removeListener('reminder:paused', listener)
  },

  onAddWater(callback: (data: { amount: number }) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, data: { amount: number }): void => callback(data)
    ipcRenderer.on('hydration:add', listener)
    return () => ipcRenderer.removeListener('hydration:add', listener)
  },

  onSnooze(callback: (data: { minutes: number }) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, data: { minutes: number }): void => callback(data)
    ipcRenderer.on('reminder:snooze', listener)
    return () => ipcRenderer.removeListener('reminder:snooze', listener)
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('api', api)
} else {
  // @ts-ignore fallback for non-context-isolated mode
  window.api = api
}
