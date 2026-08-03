import type { ReactNode } from 'react'
import { AnimatedBackground } from './AnimatedBackground'
import { BrandLogo } from './BrandLogo'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps): React.JSX.Element {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="mb-6 flex justify-center">
          <BrandLogo withText />
        </div>
        <div className="glass-strong rounded-3xl p-8">
          <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
