import { Link, useNavigate } from 'react-router-dom'
import { AnimatedBackground } from '../components/AnimatedBackground'
import { BrandLogo } from '../components/BrandLogo'
import { useAuth } from '../hooks/useAuth'
import { APP_NAME, TAGLINE } from '../utils/constants'

export function LandingPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleGetStarted = (): void => {
    if (user) {
      navigate('/dashboard')
    } else {
      navigate('/signup')
    }
  }

  const navLinks = [
    { label: 'About', href: '#about' },
    { label: 'Features', href: '#features' },
    { label: 'Contact', href: '#contact' }
  ]

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <AnimatedBackground />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-12">
        <Link to="/">
          <BrandLogo withText />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="text-sm font-medium text-slate-600 transition hover:text-blue-600">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <button onClick={() => navigate('/dashboard')} className="btn-primary text-sm">
              Open Dashboard
            </button>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-blue-600 transition hover:text-blue-700">
                Sign In
              </Link>
              <Link to="/signup" className="btn-primary text-sm">
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="animate-float mb-8 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-gradient-brand shadow-2xl shadow-blue-500/40">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z" fill="#ffffff" />
            <ellipse cx="9.2" cy="13" rx="2.2" ry="1.5" fill="#2563eb" opacity="0.5" transform="rotate(-20 9.2 13)" />
          </svg>
        </div>

        <h1 className="max-w-3xl text-5xl font-extrabold leading-tight tracking-tight text-slate-800 sm:text-6xl">
          Turning <span className="text-gradient">Sips</span> Into{' '}
          <span className="text-gradient">Streaks</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-slate-500">
          {APP_NAME} is your personal hydration companion that reminds you to drink water, tracks your daily intake,
          and helps you build healthy hydration habits.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <button onClick={handleGetStarted} className="btn-primary text-base">
            Get Started
          </button>
          <a href="#features" className="btn-ghost text-base">
            Learn More
          </a>
        </div>

        <div id="features" className="mt-20 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: '⏰', title: 'Smart Reminders', text: 'Gentle nudges so you never forget to hydrate.' },
            { icon: '📊', title: 'Daily Analytics', text: 'Track intake, streaks and your weekly rhythm.' },
            { icon: '🤖', title: 'Desktop Assistant', text: 'A friendly companion right on your desktop.' }
          ].map((feature) => (
            <div key={feature.title} className="glass rounded-3xl p-6 text-left transition hover:-translate-y-1">
              <span className="text-2xl">{feature.icon}</span>
              <h3 className="mt-3 text-base font-bold text-slate-700">{feature.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{feature.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer id="about" className="relative z-10 mt-12 px-6 py-8 text-center">
        <p className="text-sm text-slate-500">
          Made with ❤️ for healthy hydration. <span className="text-gradient font-semibold">{TAGLINE}</span>
        </p>
      </footer>
    </div>
  )
}
