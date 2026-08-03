export function AnimatedBackground(): React.JSX.Element {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="animate-blob absolute -top-24 -left-24 h-96 w-96 rounded-full bg-cyan-300/40 blur-3xl" />
      <div className="animate-blob-slow absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-blue-400/30 blur-3xl" />
      <div className="animate-blob absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="animate-blob-slow absolute top-2/3 left-1/2 h-64 w-64 rounded-full bg-blue-200/50 blur-3xl" />
    </div>
  )
}
