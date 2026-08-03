import { SNOOZE_OPTIONS } from '../utils/constants'

interface OverlayButtonsProps {
  snoozeOpen: boolean
  onDrank: () => void
  onSnooze: (minutes: number) => void
  onToggleSnooze: () => void
}

export function OverlayButtons({ snoozeOpen, onDrank, onSnooze, onToggleSnooze }: OverlayButtonsProps): React.JSX.Element {
  return (
    <div className="overlay-bounce-in flex w-[320px] flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={onDrank}
          className="flex-1 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/40 transition hover:brightness-110 active:scale-95"
        >
          🥤 I Drank Water
        </button>
        <button
          onClick={onToggleSnooze}
          className="flex-1 rounded-full border border-blue-200 bg-white/80 px-4 py-2.5 text-sm font-bold text-blue-600 transition hover:bg-blue-50 active:scale-95"
        >
          😴 Snooze
        </button>
      </div>
      {snoozeOpen && (
        <div className="overlay-bounce-in grid grid-cols-3 gap-2">
          {SNOOZE_OPTIONS.map((option) => (
            <button
              key={option.minutes}
              onClick={() => onSnooze(option.minutes)}
              className="rounded-xl border border-blue-200 bg-white/85 px-2 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 active:scale-95"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
