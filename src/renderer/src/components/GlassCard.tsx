import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className = '' }: GlassCardProps): React.JSX.Element {
  return <div className={`glass rounded-3xl ${className}`}>{children}</div>
}
