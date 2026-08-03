import type { HydrationState } from '../types'
import { todayKey } from '../utils/format'

interface WeeklyChartProps {
  state: HydrationState
  goal: number
}

export function WeeklyChart({ state, goal }: WeeklyChartProps): React.JSX.Element {
  const today = todayKey()
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const key = todayKey(date)
    const record = state.history[key]
    const isToday = key === today
    const water = isToday ? state.todayWater : (record?.water ?? 0)
    return {
      key,
      label: date.toLocaleDateString([], { weekday: 'narrow' }),
      water,
      isToday
    }
  })

  const maxValue = Math.max(goal, ...days.map((d) => d.water), 1)

  return (
    <div className="flex h-44 items-end justify-between gap-2">
      {days.map((day) => {
        const height = Math.max(4, (day.water / maxValue) * 100)
        return (
          <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10px] font-semibold text-slate-500">{day.water > 0 ? `${Math.round(day.water / 100) / 10}L` : ''}</span>
            <div className="flex w-full items-end justify-center rounded-xl bg-blue-50/70 px-1" style={{ height: '100%' }}>
              <div
                className={`w-full rounded-lg transition-all duration-700 ${
                  day.isToday ? 'bg-gradient-to-t from-blue-500 to-cyan-400' : 'bg-blue-300/70'
                }`}
                style={{ height: `${height}%` }}
                title={`${day.label}: ${day.water} ml`}
              />
            </div>
            <span className={`text-xs font-medium ${day.isToday ? 'text-blue-600' : 'text-slate-400'}`}>{day.label}</span>
          </div>
        )
      })}
    </div>
  )
}
