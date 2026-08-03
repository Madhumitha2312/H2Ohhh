import { clamp } from '../utils/format'

interface WaterWaveProps {
  level: number
  className?: string
  height?: string
}

export function WaterWave({ level, className = '', height = 'h-48' }: WaterWaveProps): React.JSX.Element {
  const pct = clamp(level, 0, 100)
  const waveY = 100 - pct

  const wavePath = `M0 100 L0 ${waveY} C 25 ${waveY - 6}, 50 ${waveY + 6}, 75 ${waveY} S 125 ${waveY - 6}, 150 ${waveY} S 200 ${waveY - 6}, 200 ${waveY} L 200 100 Z`
  const wavePath2 = `M0 100 L0 ${waveY} C 25 ${waveY - 8}, 50 ${waveY + 8}, 75 ${waveY} S 125 ${waveY - 8}, 150 ${waveY} S 200 ${waveY - 8}, 200 ${waveY} L 200 100 Z`

  return (
    <div className={`relative overflow-hidden ${height} ${className}`}>
      <svg className="absolute bottom-0 left-0 h-full w-full" viewBox="0 0 200 100" preserveAspectRatio="none">
        <path d={wavePath} fill="#3b98f6" opacity="0.9" />
      </svg>
      <svg
        className="absolute bottom-0 left-0 h-full w-full animate-wave"
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
      >
        <path d={wavePath2} fill="#60a5fa" opacity="0.65" />
      </svg>
    </div>
  )
}
