import { contextBridge, ipcRenderer } from 'electron'

export interface OverlayShowData {
  name?: string
  avatarId?: string
  gender?: string
  message?: string
  sound?: string
  voice?: { enabled: boolean; volume: number; rate: number; pitch: number }
}

const overlay = {
  isElectron: true as const,

  onShow(callback: (data: OverlayShowData) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, data: OverlayShowData): void => callback(data)
    ipcRenderer.on('overlay:show', listener)
    return () => ipcRenderer.removeListener('overlay:show', listener)
  },

  ready(): void {
    ipcRenderer.send('overlay:ready')
  },

  drank(payload: { amount: number }): void {
    ipcRenderer.send('overlay:drank', payload)
  },

  snooze(payload: { minutes: number }): void {
    ipcRenderer.send('overlay:snooze', payload)
  },

  resize(payload: { width: number; height: number }): void {
    ipcRenderer.send('overlay:resize', payload)
  },

  close(): void {
    ipcRenderer.send('overlay:close')
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('overlay', overlay)
} else {
  // @ts-ignore fallback for non-context-isolated mode
  window.overlay = overlay
}
