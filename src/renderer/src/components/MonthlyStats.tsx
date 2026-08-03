import type { HydrationState } from '../types'
import { addDaysKey } from '../utils/dateHelpers'
import { todayKey } from '../utils/format'

interface MonthlyStatsProps {
  state: HydrationState
  goal: number
}

interface StatBoxProps {
  label: string
  value: string
  icon: string
}

function StatBox({ label, value, icon }: StatBoxProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-blue-100/70 bg-white/60 px-4 py-3">
      <span className="text-lg">{icon}</span>
      <span className="text-lg font-bold text-slate-700">{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  )
}

export function MonthlyStats({ state, goal }: MonthlyStatsProps): React.JSX.Element {
  const today = todayKey()
  const days: Array<{ key: string; water: number; goalMet: boolean }> = []
  for (let i = 0; i < 30; i++) {
    const key = addDaysKey(today, -i)
    const record = state.history[key]
    const isToday = key === today
    const water = isToday ? state.todayWater : (record?.water ?? 0)
    days.push({ key, water, goalMet: isToday ? water >= goal : (record?.goalMet ?? false) })
  }

  const total = days.reduce((sum, d) => sum + d.water, 0)
  const average = Math.round(total / 30)
  const bestDay = days.reduce((best, d) => (d.water > best.water ? d : best), days[0])
  const goalDays = days.filter((d) => d.goalMet).length

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatBox label="Avg / Day" value={`${average} ml`} icon="📈" />
      <StatBox label="30-Day Total" value={`${(total / 1000).toFixed(1)} L`} icon="💧" />
      <StatBox label="Best Day" value={`${bestDay.water} ml`} icon="🏆" />
      <StatBox label="Goal Days" value={`${goalDays} / 30`} icon="✅" />
    </div>
  )
}
