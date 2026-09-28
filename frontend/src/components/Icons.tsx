import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>
/** `accent`: preenche a forma principal de marca-texto (ofensiva, medalha). */
type AccentIconProps = IconProps & { accent?: boolean }

/**
 * Ícones de traço da identidade (24px, currentColor, traço 1,9, pontas
 * arredondadas). Decorativos: sempre acompanham texto visível ou rótulo.
 */
function Icon({ children, className = 'h-5 w-5', strokeWidth = 1.9, ...props }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {children}
    </svg>
  )
}

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />
  </Icon>
)

export const StudyIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 5h5.5A3.5 3.5 0 0 1 12 8.5V20a2.5 2.5 0 0 0-2.5-2.5H3zM21 5h-5.5A3.5 3.5 0 0 0 12 8.5V20a2.5 2.5 0 0 1 2.5-2.5H21z" />
  </Icon>
)

export const RankIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 20.5h17M5.5 20.5v-7h4v7M10 20.5V5.5h4v15M14.5 20.5v-10h4v10" />
  </Icon>
)

export const ChartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 3.5v17h17M7.5 16.5l4-5 3 3 5.5-7" />
  </Icon>
)

export const UserIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </Icon>
)

export const FlameIcon = ({ accent, ...p }: AccentIconProps) => (
  <Icon {...p}>
    <path
      className={accent ? 'fill-highlight' : undefined}
      d="M12 21c3.9 0 6.5-2.6 6.5-6.2 0-3.3-2.2-5.4-3.6-7.4-.3 1.9-1.3 3-2.4 3.4.2-2.9-.9-5.8-3.4-7.8.1 3.3-1.9 5.1-3.3 7.1-1 1.4-1.3 2.9-1.3 4.7C4.5 18.4 8.1 21 12 21Z"
    />
  </Icon>
)

export const MedalIcon = ({ accent, ...p }: AccentIconProps) => (
  <Icon {...p}>
    <path d="m8.5 14-1.5 7.5 5-2.8 5 2.8-1.5-7.5" />
    <circle className={accent ? 'fill-highlight' : undefined} cx="12" cy="9" r="5.5" />
  </Icon>
)

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
)

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Icon>
)

export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
  </Icon>
)

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
)
