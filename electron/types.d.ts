export {}

declare global {
  interface Window {
    api?: {
      isElectron?: boolean
      platform?: string
      sendReminderSync: (payload: {
        intervalMinutes?: number
        enabled?: boolean
        paused?: boolean
        name?: string
        avatarId?: string
        sound?: string
      }) => void
      reminderTriggered: (payload: {
        name?: string
        avatarId?: string
        gender?: string
        message?: string
        sound?: string
        voice?: { enabled: boolean; volume: number; rate: number; pitch: number }
      }) => void
      closeOverlay: () => void
      onReminderPaused: (callback: (paused: boolean) => void) => () => void
      onAddWater: (callback: (data: { amount: number }) => void) => () => void
      onSnooze: (callback: (data: { minutes: number }) => void) => () => void
    }
    overlay?: {
      isElectron?: boolean
      onShow: (
        callback: (data: {
          name?: string
          avatarId?: string
          gender?: string
          message?: string
          sound?: string
          voice?: { enabled: boolean; volume: number; rate: number; pitch: number }
        }) => void
      ) => () => void
      ready: () => void
      drank: (payload: { amount: number }) => void
      snooze: (payload: { minutes: number }) => void
      resize: (payload: { width: number; height: number }) => void
      close: () => void
    }
  }
}
