interface BrandLogoProps {
  size?: number
  withText?: boolean
  textClassName?: string
}

export function BrandLogo({ size = 44, withText = false, textClassName = '' }: BrandLogoProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center rounded-2xl bg-gradient-brand shadow-lg shadow-blue-500/30"
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"
            fill="#ffffff"
            fillOpacity="0.95"
          />
        </svg>
      </div>
      {withText && (
        <span className={`text-2xl font-extrabold tracking-tight text-gradient ${textClassName}`}>H2Ohhh</span>
      )}
    </div>
  )
}
