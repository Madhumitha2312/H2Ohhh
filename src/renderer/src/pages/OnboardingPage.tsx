import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatedBackground } from '../components/AnimatedBackground'
import { BrandLogo } from '../components/BrandLogo'
import { AvatarRenderer } from '../components/AvatarRenderer'
import { useAuth } from '../hooks/useAuth'
import { GOAL_OPTIONS, SOUND_OPTIONS, AVATAR_THEMES, TEST_INTERVALS, NORMAL_INTERVALS, minutesLabel } from '../utils/constants'

const TOTAL_STEPS = 8

export function OnboardingPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()

  const [step, setStep] = useState(0)
  const [name, setName] = useState(user?.name ?? '')
  const [gender, setGender] = useState<'female' | 'male'>(user?.gender === 'male' ? 'male' : 'female')
  const [goal, setGoal] = useState(user?.goal ?? 2500)
  const [customGoal, setCustomGoal] = useState('')
  const [intervalMinutes, setIntervalMinutes] = useState(user?.intervalMinutes ?? 30)
  const [testMode, setTestMode] = useState(false)
  const [sound, setSound] = useState(user?.sound ?? 'waterdrop')
  const [avatarId, setAvatarId] = useState(user?.avatarId ?? 'girl')
  const [error, setError] = useState<string | null>(null)

  const intervals = testMode ? TEST_INTERVALS : NORMAL_INTERVALS

  const stepMeta = [
    { title: 'Welcome to H2Ohhh 💧', subtitle: "Let's personalize your hydration journey." },
    { title: 'What should we call you?', subtitle: 'We will use your name in reminders.' },
    { title: 'Select your gender', subtitle: 'Helps us pick your default character.' },
    { title: 'Daily Water Goal', subtitle: 'How much water do you want to drink per day?' },
    { title: 'Reminder Interval', subtitle: 'How often should we nudge you to drink?' },
    { title: 'Notification Sound', subtitle: 'Choose the sound you will hear.' },
    { title: 'Character Theme', subtitle: 'Pick the character you love the most.' },
    { title: 'Your Journey Summary', subtitle: 'Review your preferences and begin.' }
  ]

  const goalValue = goal === 0 ? Math.max(0, parseInt(customGoal, 10) || 0) : goal

  const canContinue = (): boolean => {
    if (step === 1) return name.trim().length > 0
    if (step === 3) {
      if (goal === 0) return parseInt(customGoal, 10) > 0
      return true
    }
    return true
  }

  const handleNext = (): void => {
    setError(null)
    if (!canContinue()) {
      setError('Please fill in this field to continue.')
      return
    }
    if (step === 0) {
      setStep(1)
      return
    }
    if (step === 2 && gender === 'male' && !['boy', 'girl', 'waterdrop', 'bubble'].includes(avatarId)) {
      setAvatarId('boy')
    }
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1)
  }

  const handleBack = (): void => {
    if (step === 0) {
      navigate(-1)
      return
    }
    setStep((s) => s - 1)
  }

  const handleFinish = (): void => {
    if (!user) return
    updateUser({
      name: name.trim(),
      gender,
      goal: goalValue,
      intervalMinutes,
      sound,
      avatarId,
      onboarded: true
    })
    navigate('/dashboard')
  }

  const selectedAvatarLabel = useMemo(
    () => AVATAR_THEMES.find((t) => t.id === avatarId)?.label ?? 'Friendly Girl',
    [avatarId]
  )

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-xl">
        <div className="mb-5 flex justify-center">
          <BrandLogo withText />
        </div>

        <div className="glass-strong rounded-3xl p-7 sm:p-9">
          <div className="mb-6 flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  i <= step ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-blue-100'
                }`}
              />
            ))}
          </div>

          <div key={step} className="animate-fade-in-up">
            <h1 className="text-2xl font-extrabold text-slate-800">{stepMeta[step].title}</h1>
            <p className="mt-1 text-sm text-slate-500">{stepMeta[step].subtitle}</p>

            <div className="mt-6">
              {step === 0 && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="animate-float flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-brand shadow-xl shadow-blue-500/30">
                    <span className="text-5xl">💧</span>
                  </div>
                  <p className="max-w-sm text-center text-slate-600">
                    You are one step away from a healthier, more hydrated you.
                  </p>
                </div>
              )}

              {step === 1 && (
                <div className="py-2">
                  <input
                    className="input-glass"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  />
                  <p className="mt-2 text-xs text-slate-400">Example: Sam</p>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'female', label: 'Female', emoji: '👩' },
                    { id: 'male', label: 'Male', emoji: '👨' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setGender(option.id as 'female' | 'male')
                        setAvatarId(option.id === 'male' ? 'boy' : 'girl')
                      }}
                      className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-6 transition ${
                        gender === option.id
                          ? 'border-blue-400 bg-blue-50/80 shadow-md'
                          : 'border-blue-100 bg-white/60 hover:border-blue-200'
                      }`}
                    >
                      <span className="text-4xl">{option.emoji}</span>
                      <span className="font-semibold text-slate-700">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {GOAL_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => setGoal(option)}
                        className={`rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                          goal === option
                            ? 'border-blue-400 bg-blue-50/80 text-blue-700 shadow-md'
                            : 'border-blue-100 bg-white/60 text-slate-600 hover:border-blue-200'
                        }`}
                      >
                        {option.toLocaleString()} ml
                      </button>
                    ))}
                    <button
                      onClick={() => setGoal(0)}
                      className={`rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                        goal === 0
                          ? 'border-blue-400 bg-blue-50/80 text-blue-700 shadow-md'
                          : 'border-blue-100 bg-white/60 text-slate-600 hover:border-blue-200'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {goal === 0 && (
                    <input
                      className="input-glass"
                      type="number"
                      min={1}
                      placeholder="Enter daily goal (ml)"
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                    />
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-white/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Test Mode</p>
                      <p className="text-xs text-slate-400">Short intervals for trying reminders.</p>
                    </div>
                    <button
                      onClick={() => {
                        setTestMode((v) => !v)
                        setIntervalMinutes(testMode ? 30 : 2)
                      }}
                      className={`relative h-7 w-14 rounded-full transition ${testMode ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-slate-200'}`}
                      aria-label="Toggle test mode"
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${testMode ? 'left-8' : 'left-1'}`}
                      />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {intervals.map((option) => (
                      <button
                        key={option.minutes}
                        onClick={() => setIntervalMinutes(option.minutes)}
                        className={`rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                          intervalMinutes === option.minutes
                            ? 'border-blue-400 bg-blue-50/80 text-blue-700 shadow-md'
                            : 'border-blue-100 bg-white/60 text-slate-600 hover:border-blue-200'
                        }`}
                      >
                        Every {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="flex flex-col gap-2">
                  {SOUND_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSound(option.id)}
                      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                        sound === option.id
                          ? 'border-blue-400 bg-blue-50/80 text-blue-700 shadow-md'
                          : 'border-blue-100 bg-white/60 text-slate-600 hover:border-blue-200'
                      }`}
                    >
                      <span className="text-lg">{option.id === 'waterdrop' ? '💧' : option.id === 'ocean' ? '🌊' : option.id === 'bell' ? '🔔' : '🔇'}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {step === 6 && (
                <div className="grid grid-cols-2 gap-3">
                  {AVATAR_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setAvatarId(theme.id)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-4 transition ${
                        avatarId === theme.id
                          ? 'border-blue-400 bg-blue-50/80 shadow-md'
                          : 'border-blue-100 bg-white/60 hover:border-blue-200'
                      }`}
                    >
                      <AvatarRenderer avatarId={theme.id} variant="casual" animate={false} className="h-16 w-16 object-cover" />
                      <span className="text-sm font-semibold text-slate-700">{theme.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 7 && (
                <div className="flex flex-col items-center gap-5">
                  <div className="flex items-center gap-4">
                    <AvatarRenderer avatarId={avatarId} variant="casual" animate className="h-24 w-24 rounded-full object-cover shadow-lg shadow-blue-300/40" />
                    <div className="rounded-2xl border border-blue-100 bg-white/70 px-5 py-4">
                      <p className="text-base font-bold text-slate-700">{name || 'Your name'}</p>
                      <p className="text-sm text-slate-500">{selectedAvatarLabel}</p>
                    </div>
                  </div>
                  <div className="w-full rounded-2xl border border-blue-100 bg-white/60 p-5">
                    <dl className="space-y-2.5 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Gender</dt>
                        <dd className="font-semibold capitalize text-slate-700">{gender}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Water Goal</dt>
                        <dd className="font-semibold text-slate-700">{goalValue.toLocaleString()} ml</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Reminder</dt>
                        <dd className="font-semibold text-slate-700">{minutesLabel(intervalMinutes)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Sound</dt>
                        <dd className="font-semibold text-slate-700">{SOUND_OPTIONS.find((s) => s.id === sound)?.label}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Character</dt>
                        <dd className="font-semibold text-slate-700">{selectedAvatarLabel}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}

          <div className="mt-7 flex items-center justify-between gap-3">
            <button onClick={handleBack} className="btn-ghost">
              Back
            </button>
            {step < TOTAL_STEPS - 1 ? (
              <button onClick={handleNext} className="btn-primary">
                Continue
              </button>
            ) : (
              <button onClick={handleFinish} className="btn-primary">
                Start My Journey
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
