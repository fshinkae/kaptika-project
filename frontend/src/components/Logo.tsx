/** Marca: capivara estudante de perfil, com o lápis (marca-texto) atrás da orelha. */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 56 56" className={className}>
      <rect width="56" height="56" rx="14" className="fill-pen-600" />
      <g transform="rotate(-24 22 15)">
        <rect x="9" y="12.6" width="22" height="4.8" rx=".6" className="fill-highlight" />
        <rect x="7" y="12.6" width="3" height="4.8" rx=".6" className="fill-pen-800" />
        <path d="M31 12.6 36.5 15 31 17.4Z" className="fill-paper" />
        <path d="M34.6 14.2 36.5 15 34.6 15.8Z" className="fill-ink" />
      </g>
      {/* Cabeça e peito sem encostar na borda: em fundo papel, o quadrado não perde o contorno. */}
      <path
        className="fill-capy"
        d="M12 50C7 50 4.5 46.5 5.2 41 6.5 30 13 20 22 17c3-.5 6-.6 9-.6h12c5 0 8 2.6 8 7.6v7c0 4.5-3 7-7.5 7H38c-2.5 2-3.5 5.5-3 8.5.3 2.2-1 3.5-3 3.5Z"
      />
      <ellipse cx="22.5" cy="17.2" rx="3.6" ry="3" className="fill-capy" />
      <ellipse cx="22.7" cy="17.6" rx="1.7" ry="1.4" className="fill-capy-dark" />
      <circle cx="30" cy="22.6" r="1.9" className="fill-ink" />
      <path
        d="M47.6 20.4q1.4 1.4 1 3.2M50.4 32.4q-2.4 1.2-4.8.4"
        fill="none"
        strokeWidth="1.7"
        strokeLinecap="round"
        className="stroke-ink"
      />
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
