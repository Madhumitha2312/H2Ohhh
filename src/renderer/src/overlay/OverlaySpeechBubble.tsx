interface OverlaySpeechBubbleProps {
  message: string
}

export function OverlaySpeechBubble({ message }: OverlaySpeechBubbleProps): React.JSX.Element {
  return (
    <div className="overlay-bubble-pop relative max-w-[300px] rounded-2xl rounded-br-md bg-white/95 px-4 py-2.5 shadow-lg shadow-blue-900/20 ring-1 ring-white/80">
      <p className="text-sm font-bold leading-snug text-slate-800">{message}</p>
      <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm bg-white/95" />
    </div>
  )
}
