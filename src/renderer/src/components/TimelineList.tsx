import type { SipEntry } from '../types'
import { formatTime } from '../utils/format'

interface TimelineListProps {
  timeline: SipEntry[]
}

export function TimelineList({ timeline }: TimelineListProps): React.JSX.Element {
  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-100/70 text-3xl">💧</div>
        <p className="text-sm font-medium text-slate-500">No water entries today.</p>
        <p className="text-xs text-slate-400">Add your first glass to start your timeline.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {timeline.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center justify-between rounded-2xl border border-blue-100/70 bg-white/60 px-4 py-2.5 animate-fade-in-up"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100/80 text-lg">💧</span>
            <div>
              <p className="text-sm font-semibold text-slate-700">+{entry.amount} ml</p>
              <p className="text-xs text-slate-400">{formatTime(entry.timestamp)}</p>
            </div>
          </div>
          <span className="text-xs font-medium text-blue-500">Sip #{entry.id.slice(0, 4)}</span>
        </li>
      ))}
    </ul>
  )
}
