import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatedBackground } from '../components/AnimatedBackground'
import { BrandLogo } from '../components/BrandLogo'
import { AvatarRenderer } from '../components/AvatarRenderer'
import { GlassCard } from '../components/GlassCard'
import { useAuth } from '../hooks/useAuth'
import { useAppData } from '../context/AppDataProvider'
import { GOAL_OPTIONS, SOUND_OPTIONS, AVATAR_THEMES, ALL_INTERVALS, minutesLabel } from '../utils/constants'
import { getHydration } from '../services/storage'
import { defaultHydration } from '../services/storage'
import { saveHydration } from '../services/storage'

export function SettingsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const { setPaused } = useAppData()

  const [name, setName] = useState(user?.name ?? '')
  const [customGoal, setCustomGoal] = useState('')
  const [saved, setSaved] = useState<string | null>(null)

  if (!user) return <></>

  const flash = (message: string): void => {
    setSaved(message)
    window.setTimeout(() => setSaved(null), 2000)
  }

  const saveName = (): void => {
    if (name.trim().length === 0) return
    updateUser({ name: name.trim() })
    flash('Name updated ✓')
  }

  const setGoal = (goal: number): void => {
    updateUser({ goal })
    flash(`Goal updated to ${goal.toLocaleString()} ml ✓`)
  }

  const setInterval = (minutes: number): void => {
    updateUser({ intervalMinutes: minutes })
    flash(`Reminder set to ${minutesLabel(minutes)} ✓`)
  }

  const setRemindersEnabled = (enabled: boolean): void => {
    updateUser({ remindersEnabled: enabled })
    if (!enabled) window.api?.closeOverlay?.()
    flash(enabled ? 'Reminders ON ✓' : 'Reminders OFF ✓')
  }

  const setAvatar = (avatarId: string): void => {
    updateUser({ avatarId })
    flash('Avatar updated ✓')
  }

  const setSound = (sound: string): void => {
    updateUser({ sound })
    flash('Sound updated ✓')
  }

  const setVoice = (patch: Partial<typeof user.voice>): void => {
    updateUser({ voice: { ...user.voice, ...patch } })
    flash('Voice settings saved ✓')
  }

  const exportData = (): void => {
    const hydration = getHydration(user.id)
    const payload = { exportedAt: new Date().toISOString(), profile: user, hydration }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `h2ohhh-export-${user.name.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
    flash('Data exported ✓')
  }

  const resetProgress = (): void => {
    const fresh = defaultHydration()
    saveHydration(user.id, fresh)
    setPaused(false)
    flash('Progress reset ✓')
  }

  return (
    <div className="relative min-h-screen overflow-hidden pb-16">
      <AnimatedBackground />

      <header className="sticky top-0 z-20 border-b border-blue-100/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
            <BrandLogo size={34} withText textClassName="text-lg" />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-xl border border-blue-100 bg-white/70 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-5 pt-8">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">
            Settings <span className="text-gradient">⚙️</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Everything is saved automatically to your device.</p>
        </div>

        {saved && (
          <div className="mt-4 animate-fade-in-up rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-600">
            {saved}
          </div>
        )}

        <div className="mt-6 space-y-5">
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-700">👤 Profile</h3>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-semibold text-slate-600">Name</label>
                <input
                  className="input-glass"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                />
              </div>
              <button onClick={saveName} className="btn-primary text-sm">
                Save Name
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-700">🎯 Daily Water Goal</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {GOAL_OPTIONS.map((goal) => (
                <button
                  key={goal}
                  onClick={() => setGoal(goal)}
                  className={`rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                    user.goal === goal
                      ? 'border-blue-400 bg-blue-50/80 text-blue-700 shadow-md'
                      : 'border-blue-100 bg-white/60 text-slate-600 hover:border-blue-200'
                  }`}
                >
                  {goal.toLocaleString()} ml
                </button>
              ))}
              <div className="col-span-2 flex gap-2 sm:col-span-3">
                <input
                  className="input-glass flex-1"
                  type="number"
                  placeholder="Custom goal (ml)"
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setGoal(parseInt(customGoal, 10))}
                />
                <button onClick={() => setGoal(parseInt(customGoal, 10))} className="btn-ghost text-sm">
                  Set
                </button>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-700">⏰ Reminder Settings</h3>
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-600">Reminder</p>
              <div className="mt-2 flex gap-3">
                <button
                  onClick={() => setRemindersEnabled(true)}
                  className={`flex-1 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                    user.remindersEnabled
                      ? 'border-emerald-400 bg-emerald-50/80 text-emerald-700 shadow-md'
                      : 'border-slate-200 bg-white/60 text-slate-500 hover:border-emerald-200'
                  }`}
                >
                  Reminder ON
                </button>
                <button
                  onClick={() => setRemindersEnabled(false)}
                  className={`flex-1 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                    !user.remindersEnabled
                      ? 'border-rose-400 bg-rose-50/80 text-rose-600 shadow-md'
                      : 'border-slate-200 bg-white/60 text-slate-500 hover:border-rose-200'
                  }`}
                >
                  Reminder OFF
                </button>
              </div>
            </div>
            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-600">Reminder Interval</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {ALL_INTERVALS.map((option) => (
                  <button
                    key={option.minutes}
                    onClick={() => setInterval(option.minutes)}
                    className={`rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                      user.intervalMinutes === option.minutes
                        ? 'border-blue-400 bg-blue-50/80 text-blue-700 shadow-md'
                        : 'border-blue-100 bg-white/60 text-slate-600 hover:border-blue-200'
                    }`}
                  >
                    Every {option.label}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-700">🖼️ Avatar / Character</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {AVATAR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setAvatar(theme.id)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 transition ${
                    user.avatarId === theme.id
                      ? 'border-blue-400 bg-blue-50/80 shadow-md'
                      : 'border-blue-100 bg-white/60 hover:border-blue-200'
                  }`}
                >
                  <AvatarRenderer avatarId={theme.id} variant="casual" animate={false} className="h-14 w-14 object-cover" />
                  <span className="text-xs font-semibold text-slate-700">{theme.label}</span>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-700">🔔 Notification Sound</h3>
            <div className="mt-4 flex flex-col gap-2">
              {SOUND_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSound(option.id)}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                    user.sound === option.id
                      ? 'border-blue-400 bg-blue-50/80 text-blue-700 shadow-md'
                      : 'border-blue-100 bg-white/60 text-slate-600 hover:border-blue-200'
                  }`}
                >
                  <span className="text-lg">{option.id === 'waterdrop' ? '💧' : option.id === 'ocean' ? '🌊' : option.id === 'bell' ? '🔔' : '🔇'}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-700">🗣️ Voice Companion</h3>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Voice reminders</p>
                <p className="text-xs text-slate-400">Your assistant greets you out loud.</p>
              </div>
              <button
                onClick={() => setVoice({ enabled: !user.voice.enabled })}
                className={`relative h-7 w-14 rounded-full transition ${user.voice.enabled ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-slate-200'}`}
                aria-label="Toggle voice"
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${user.voice.enabled ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(
                [
                  { key: 'volume', label: 'Volume', min: 0, max: 1, step: 0.1 },
                  { key: 'rate', label: 'Rate', min: 0.5, max: 2, step: 0.1 },
                  { key: 'pitch', label: 'Pitch', min: 0.5, max: 2, step: 0.1 }
                ] as const
              ).map((setting) => (
                <label key={setting.key} className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">{setting.label}</span>
                  <input
                    type="range"
                    min={setting.min}
                    max={setting.max}
                    step={setting.step}
                    value={user.voice[setting.key]}
                    onChange={(e) => setVoice({ [setting.key]: parseFloat(e.target.value) })}
                    className="accent-blue-600"
                  />
                  <span className="text-xs text-slate-400">{user.voice[setting.key].toFixed(1)}</span>
                </label>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-700">📦 Data</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={exportData} className="btn-ghost text-sm">
                Export History (JSON)
              </button>
              <button
                onClick={resetProgress}
                className="rounded-xl border border-red-200 bg-red-50/70 px-5 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-100/70"
              >
                Reset Progress
              </button>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  )
}
