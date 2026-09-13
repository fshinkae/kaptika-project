import type { SVGProps } from 'react'

/** Ícones de traço (24px, currentColor). Decorativos: sempre com texto ao lado. */
function Icon({ children, className = 'h-5 w-5', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {children}
    </svg>
  )
}

export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
)

export const ClockIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
)

export const FlameIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 21c3.9 0 6.5-2.6 6.5-6.2 0-3.3-2.2-5.4-3.6-7.4-.3 1.9-1.3 3-2.4 3.4.2-2.9-.9-5.8-3.4-7.8.1 3.3-1.9 5.1-3.3 7.1-1 1.4-1.3 2.9-1.3 4.7C4.5 18.4 8.1 21 12 21Z" />
  </Icon>
)
