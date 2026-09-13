/** Marca: três bolinhas do cartão-resposta, a do meio preenchida de marca-texto. */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 56 56" className={className}>
      <rect width="56" height="56" rx="14" className="fill-pen-600" />
      <ellipse cx="15" cy="28" rx="6" ry="4.6" fill="none" stroke="#fff" strokeWidth="2.6" />
      <ellipse cx="28" cy="28" rx="6.6" ry="5.2" className="fill-highlight" />
      <ellipse cx="41" cy="28" rx="6" ry="4.6" fill="none" stroke="#fff" strokeWidth="2.6" />
    </svg>
  )
}

/** Logotipo: marca + nome com traço de marca-texto. O nome é texto real. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-9 w-9" />
      <span className="font-display text-3xl leading-none font-extrabold tracking-tight text-ink">
        kap<span className="highlight-mark">tika</span>
      </span>
    </span>
  )
}
