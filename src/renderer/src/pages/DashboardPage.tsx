import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { HydrationState } from '../types'
import { AnimatedBackground } from '../components/AnimatedBackground'
import { BrandLogo } from '../components/BrandLogo'
import { AvatarRenderer } from '../components/AvatarRenderer'
import { GlassCard } from '../components/GlassCard'
import { WaterProgressRing } from '../components/WaterProgressRing'
import { TimelineList } from '../components/TimelineList'
import { WeeklyChart } from '../components/WeeklyChart'
import { MonthlyStats } from '../components/MonthlyStats'
import { Achievements } from '../components/Achievements'
import { HydrationTip } from '../components/HydrationTip'
import { useAuth } from '../hooks/useAuth'
import { useAppData } from '../context/AppDataProvider'
import { QUICK_ADD, greetingForTime, minutesLabel } from '../utils/constants'
import { formatTime, formatRelative, formatCountdown } from '../utils/format'

export function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { hydration: state, add, setPaused } = useAppData()

  const [customAmount, setCustomAmount] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const percent = useMemo(() => {
    const goal = user?.goal ?? 2500
    return Math.min(100, Math.round((state.todayWater / goal) * 100))
  }, [state.todayWater, user?.goal])

  const remaining = Math.max(0, (user?.goal ?? 2500) - state.todayWater)

  const handleQuickAdd = (amount: number): void => {
    const unlocked = add(amount)
    if (unlocked.length > 0) {
      setToast(`Achievement unlocked! 🎉`)
    } else {
      setToast(`+${amount} ml added 💧`)
    }
    window.setTimeout(() => setToast(null), 2200)
  }

  const handleCustomAdd = (): void => {
    const amount = parseInt(customAmount, 10)
    if (!amount || amount <= 0) return
    handleQuickAdd(amount)
    setCustomAmount('')
  }

  if (!user) return <></>

  const greeting = greetingForTime()
  const weeklyAvg = useWeeklyAverage(state)
  const hydrationScore = Math.min(100, Math.round((weeklyAvg / user.goal) * 100))

  return (
    <div className="relative min-h-screen overflow-hidden pb-16">
      <AnimatedBackground />

      <header className="sticky top-0 z-20 border-b border-blue-100/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
          <BrandLogo size={36} withText textClassName="text-xl" />
          <nav className="flex items-center gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="rounded-xl border border-blue-100 bg-white/70 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="rounded-xl border border-blue-100 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-500"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 pt-8">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">
            {greeting}, <span className="text-gradient">{user.name}</span> ☀️
          </h1>
          <p className="mt-1 text-sm text-slate-500">Let's stay hydrated today.</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <GlassCard className="p-6">
                <div className="flex items-center gap-4">
                  <AvatarRenderer
                    avatarId={user.avatarId}
                    variant="casual"
                    animate
                    className="h-16 w-16 rounded-2xl object-cover shadow-md shadow-blue-300/40"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-400">Today's Goal · {user.goal.toLocaleString()} ml</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-blue-100/70 pt-4">
                  <div>
                    <p className="text-xs text-slate-400">Reminder</p>
                    <p className="text-sm font-bold text-blue-600">{minutesLabel(user.intervalMinutes)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Current Streak</p>
                    <p className="text-sm font-bold text-blue-600">{state.streak} day{state.streak === 1 ? '' : 's'} 🔥</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="relative overflow-hidden p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reminder Status</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {state.remindersPaused || !user.remindersEnabled ? (
                        <span className="font-semibold text-amber-500">Paused</span>
                      ) : (
                        <span className="font-semibold text-emerald-500">Active</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setPaused(!state.remindersPaused)}
                    className="relative h-7 w-14 rounded-full transition"
                    style={{
                      background: state.remindersPaused ? '#e2e8f0' : 'linear-gradient(135deg,#60a5fa,#06b6d4)'
                    }}
                    aria-label="Toggle reminders"
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${state.remindersPaused ? 'left-1' : 'left-8'}`}
                    />
                  </button>
                </div>
                <div className="mt-3 rounded-xl bg-blue-50/70 px-3 py-2.5">
                  <p className="text-xs text-slate-400">Next reminder</p>
                  <p className="font-mono text-base font-bold text-blue-600">
                    {state.nextReminderAt ? formatCountdown(state.nextReminderAt - Date.now()) : '—'}
                  </p>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="relative overflow-hidden p-6">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
                <div className="relative">
                  <WaterProgressRing percentage={percent} size={200} strokeWidth={16}>
                    <div className="text-center">
                      <p className="text-2xl font-extrabold text-slate-800">{state.todayWater} ml</p>
                      <p className="text-sm text-slate-400">/ {user.goal.toLocaleString()} ml</p>
                      <p className="mt-1 text-xs font-bold text-blue-500">{percent}%</p>
                    </div>
                  </WaterProgressRing>
                </div>

                <div className="w-full max-w-sm rounded-3xl border border-blue-100/70 bg-gradient-to-b from-blue-50/80 to-cyan-50/80 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Quick Add</p>
                      <p className="text-xs text-slate-400">Tap to log a glass</p>
                    </div>
                    <span className="text-2xl">💧</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {QUICK_ADD.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleQuickAdd(amount)}
                        className="rounded-xl border border-blue-200/70 bg-white/80 px-3 py-2 text-sm font-bold text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-100/70"
                      >
                        +{amount} ml
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      className="input-glass flex-1 !py-2 text-sm"
                      type="number"
                      placeholder="Custom ml"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCustomAdd()}
                    />
                    <button onClick={handleCustomAdd} className="btn-primary !px-4 text-sm">
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between rounded-2xl border border-blue-100/70 bg-white/60 px-5 py-3">
                <div>
                  <p className="text-xs text-slate-400">Today's Sips</p>
                  <p className="text-lg font-extrabold text-slate-700">{state.todaySips}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Last Drink</p>
                  <p className="text-lg font-extrabold text-slate-700">{state.lastDrinkTime ? formatTime(state.lastDrinkTime) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Longest Streak</p>
                  <p className="text-lg font-extrabold text-slate-700">{state.longestStreak}</p>
                </div>
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <GlassCard className="p-6">
                <h3 className="text-base font-bold text-slate-700">Today's Timeline</h3>
                <div className="mt-4 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                  <TimelineList timeline={state.timeline} />
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-700">This Week</h3>
                  <span className="rounded-full bg-blue-100/80 px-3 py-1 text-xs font-bold text-blue-600">
                    Score {hydrationScore}
                  </span>
                </div>
                <div className="mt-4">
                  <WeeklyChart state={state} goal={user.goal} />
                </div>
              </GlassCard>
            </div>

            <GlassCard className="p-6">
              <h3 className="text-base font-bold text-slate-700">Monthly Statistics</h3>
              <div className="mt-4">
                <MonthlyStats state={state} goal={user.goal} />
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="mb-4 text-base font-bold text-slate-700">Achievements</h3>
              <Achievements state={state} />
            </GlassCard>

            <HydrationTip />
          </div>

          <div className="space-y-5">
            <GlassCard className="p-6">
              <h3 className="text-base font-bold text-slate-700">Today at a Glance</h3>
              <dl className="mt-4 space-y-3.5 text-sm">
                {[
                  { label: "Today's Goal", value: `${user.goal.toLocaleString()} ml`, icon: '🎯' },
                  { label: 'Remaining Water', value: `${remaining.toLocaleString()} ml`, icon: '🌊' },
                  { label: 'Last Drink Time', value: state.lastDrinkTime ? formatTime(state.lastDrinkTime) : '—', icon: '🕐' },
                  {
                    label: 'Next Reminder',
                    value: state.nextReminderAt
                      ? formatRelative(state.nextReminderAt - Date.now())
                      : state.remindersPaused
                        ? 'Paused'
                        : '—',
                    icon: '⏰'
                  }
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-2xl border border-blue-100/70 bg-white/60 px-4 py-3">
                    <span className="flex items-center gap-2 text-slate-500">
                      <span>{row.icon}</span>
                      {row.label}
                    </span>
                    <span className="font-bold text-slate-700">{row.value}</span>
                  </div>
                ))}
              </dl>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-base font-bold text-slate-700">Hydration Score</h3>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative h-20 w-20">
                  <div className="absolute inset-0 rounded-full bg-blue-100/70" />
                  <div
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 transition-all duration-700"
                    style={{
                      clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${100 - hydrationScore}%)`
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-white">
                    {hydrationScore}
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Based on your weekly average of <span className="font-bold text-blue-600">{weeklyAvg.toLocaleString()} ml</span> per
                  day.
                </p>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <p className="text-sm font-bold text-slate-700">Longest Streak</p>
                  <p className="text-xs text-slate-400">Your best run so far</p>
                </div>
                <span className="ml-auto text-2xl font-extrabold text-gradient">{state.longestStreak}d</span>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up rounded-2xl glass-strong px-6 py-3 text-sm font-bold text-blue-700 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}

function useWeeklyAverage(state: HydrationState): number {
  return useMemo(() => {
    let total = 0
    let count = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = todayKeyShort(d)
      const record = state.history[key]
      const water = i === 0 ? state.todayWater : (record?.water ?? 0)
      total += water
      count += 1
    }
    return Math.round(total / count)
  }, [state])
}

function todayKeyShort(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
