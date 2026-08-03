import { useMemo } from 'react'
import { HYDRATION_TIPS } from '../utils/constants'

export function HydrationTip(): React.JSX.Element {
  const tip = useMemo(() => HYDRATION_TIPS[Math.floor(Math.random() * HYDRATION_TIPS.length)], [])
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-blue-100/80 bg-gradient-to-r from-blue-50/90 to-cyan-50/90 px-5 py-4">
      <span className="mt-0.5 text-xl">💡</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">Hydration Tip</p>
        <p className="text-sm font-medium text-slate-600">{tip}</p>
      </div>
    </div>
  )
}
