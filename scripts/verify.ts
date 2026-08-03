class MockStorage {
  private store = new Map<string, string>()
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
}

;(globalThis as { localStorage?: unknown }).localStorage = new MockStorage()

import {
  signup,
  login,
  continueAsGuest,
  logout,
  updateProfile,
  getCurrentUserId,
  forgotPassword
} from '../src/renderer/src/services/auth'
import { addWater, loadHydration, runDailyReset, setReminderMeta } from '../src/renderer/src/services/hydration'
import { getProfile } from '../src/renderer/src/services/storage'
import { TEST_INTERVALS, NORMAL_INTERVALS, SNOOZE_OPTIONS } from '../src/renderer/src/utils/constants'

let failures = 0

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  PASS  ${label}`)
  } else {
    failures += 1
    console.error(`  FAIL  ${label}`)
  }
}

async function main(): Promise<void> {
  console.log('== AUTH FLOW ==')

  const s1 = signup({ name: 'Madhu', email: 'madhu@test.com', password: 'secret123' })
  assert(s1.ok && !!s1.user, 'signup succeeds')
  assert(s1.user?.name === 'Madhu', 'signup stores name')

  const dup = signup({ name: 'X', email: 'madhu@test.com', password: 'secret123' })
  assert(!dup.ok, 'duplicate email rejected')

  logout()
  assert(getCurrentUserId() === null, 'logout clears session')

  const badLogin = login({ email: 'madhu@test.com', password: 'wrong' })
  assert(!badLogin.ok, 'wrong password rejected')

  const goodLogin = login({ email: 'madhu@test.com', password: 'secret123' })
  assert(goodLogin.ok && goodLogin.user?.name === 'Madhu', 'login succeeds and loads profile')

  const persisted = getProfile(goodLogin.user!.id)
  assert(persisted?.name === 'Madhu', 'profile persists after re-read (restart)')

  const updated = updateProfile({ name: 'Madhu Updated', goal: 3000, intervalMinutes: 60, avatarId: 'boy', sound: 'bell' })
  assert(updated?.name === 'Madhu Updated', 'updateProfile changes name')
  assert(updated?.goal === 3000, 'updateProfile changes goal')
  assert(updated?.intervalMinutes === 60, 'updateProfile changes interval')
  assert(updated?.avatarId === 'boy', 'updateProfile changes avatar')

  const again = getProfile(goodLogin.user!.id)
  assert(again?.name === 'Madhu Updated', 'updated profile persists')

  const fp = forgotPassword('madhu@test.com')
  assert(fp.ok, 'forgot password recognizes account')

  const guest = continueAsGuest()
  assert(guest && guest.name === 'Guest', 'guest login works')

  console.log('== HYDRATION FLOW ==')
  const uid = goodLogin.user!.id
  const profile = { ...goodLogin.user!, goal: 1000, intervalMinutes: 30 }

  let h = loadHydration(uid, profile.goal)
  assert(h.todayWater === 0, 'fresh hydration starts at 0')

  let res = addWater(uid, profile, h, 250)
  assert(res.state.todayWater === 250, 'addWater adds 250')
  assert(res.state.todaySips === 1, 'addWater increments sips')
  assert(res.state.timeline.length === 1, 'addWater appends timeline')
  assert(res.state.lastDrinkTime !== null, 'addWater records last drink time')
  assert(res.state.achievements.first_sip === true, 'first_sip achievement unlocks')
  assert(res.unlocked.includes('first_sip'), 'unlocked list includes first_sip')

  h = res.state
  res = addWater(uid, profile, h, 500)
  assert(res.state.todayWater === 750, 'second add totals 750')
  assert(res.state.achievements.half_goal === true, 'half_goal achievement unlocks')

  h = res.state
  res = addWater(uid, profile, h, 250)
  assert(res.state.todayWater === 1000, 'goal reached at 1000')
  assert(res.state.achievements.goal_completed === true, 'goal_completed achievement unlocks')

  const nowMs = Date.now()
  const marked = setReminderMeta(uid, res.state, nowMs + 30 * 60000)
  assert(marked.nextReminderAt === nowMs + 30 * 60000, 'next reminder persisted')

  console.log('== DAILY RESET / STREAK ==')
  const lastKey = marked.lastActiveDate
  const nextKey = addDaysStr(lastKey, 1)
  const migrated = runDailyReset(uid, profile.goal, nextKey)
  assert(migrated.todayWater === 0, 'daily reset clears today water')
  assert(migrated.timeline.length === 0, 'daily reset clears timeline')
  assert(migrated.streak === 1, 'streak increments when goal was met')
  assert(migrated.longestStreak === 1, 'longest streak updates')
  assert(!!migrated.history[lastKey], 'history record created for previous day')
  assert(migrated.history[lastKey].goalMet === true, 'previous day marked goalMet')

  const missed = addDaysStr(nextKey, 1)
  const afterMiss = runDailyReset(uid, profile.goal, missed)
  assert(afterMiss.streak === 0, 'streak resets when goal missed')

  console.log('== REMINDER INTERVALS ==')
  const allMinutes = [...TEST_INTERVALS, ...NORMAL_INTERVALS].map((o) => o.minutes)
  assert(TEST_INTERVALS.length === 4, 'test mode has 4 options')
  assert(NORMAL_INTERVALS.length === 4, 'normal mode has 4 options')
  assert(new Set(allMinutes).size === allMinutes.length, 'no duplicate reminder intervals')
  assert(allMinutes.join(',') === '2,5,10,15,30,45,60,120', 'interval values match spec')
  assert(SNOOZE_OPTIONS.length === 6, 'snooze has 6 options')

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) FAILED`)
    process.exit(1)
  }
  console.log('\nAll assertions passed ✓')
}

function addDaysStr(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

void main()
