import type { HydrationState } from '../types'
import { ACHIEVEMENTS_DEF } from '../utils/constants'

interface AchievementsProps {
  state: HydrationState
}

export function Achievements({ state }: AchievementsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {ACHIEVEMENTS_DEF.map((achievement) => {
        const unlocked = !!state.achievements[achievement.id]
        return (
          <div
            key={achievement.id}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 text-center transition ${
              unlocked
                ? 'border-cyan-200/80 bg-gradient-to-br from-cyan-50/80 to-blue-50/80 shadow-sm'
                : 'border-slate-200/70 bg-white/40 opacity-60'
            }`}
          >
            <span className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>{achievement.icon}</span>
            <span className={`text-sm font-bold ${unlocked ? 'text-blue-700' : 'text-slate-500'}`}>
              {achievement.title}
            </span>
            <span className="text-[10px] leading-tight text-slate-400">{achievement.description}</span>
          </div>
        )
      })}
    </div>
  )
}
