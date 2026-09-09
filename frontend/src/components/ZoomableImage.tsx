import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** Placeholder da própria enem.dev quando a imagem original não existe. */
const MISSING_IMAGE = 'broken-image'

/**
 * Imagem de questão: aparece no fluxo do texto e abre em tela cheia ao toque,
 * onde pode ser ampliada e arrastada. Fora da tela cheia a imagem nunca passa
 * da largura do container (mobile-first).
 */
export function ZoomableImage({
  src,
  alt,
  trigger = 'image',
  className = '',
}: {
  src: string
  alt: string
  /**
   * Onde fica o gatilho do zoom. `image`: a imagem inteira abre (texto de
   * apoio). `badge`: só o botão no canto abre, porque o toque na imagem já
   * tem dono — selecionar a alternativa.
   */
  trigger?: 'image' | 'badge'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!src || src.includes(MISSING_IMAGE) || failed) {
    return (
      <span className="block rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
        Imagem indisponível na fonte.
      </span>
    )
  }

  const image = (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full bg-white object-contain"
    />
  )

  const viewer = open ? <ImageViewer src={src} alt={alt} onClose={() => setOpen(false)} /> : null

  if (trigger === 'image') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Ampliar imagem: ${alt}`}
          className={`relative block w-full cursor-zoom-in overflow-hidden rounded-lg
            ring-1 ring-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-indigo-600 ${className}`}
        >
          {image}
          <span aria-hidden className={BADGE_CLASS}>
            Ampliar
          </span>
        </button>
        {viewer}
      </>
    )
  }

  return (
    <span className={`relative block overflow-hidden rounded-lg ring-1 ring-slate-200 ${className}`}>
      {image}
      <button
        type="button"
        // Dentro de um <label>: sem isto o toque no botão também marcaria a
        // alternativa (e o preventDefault impede a ativação do rádio).
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen(true)
        }}
        aria-label={`Ampliar imagem: ${alt}`}
        className={`${BADGE_CLASS} min-h-[32px] cursor-zoom-in hover:bg-slate-900
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600`}
      >
        Ampliar
      </button>
      {viewer}
    </span>
  )
}

const BADGE_CLASS =
  'absolute bottom-2 right-2 rounded-full bg-slate-900/70 px-2 py-1 text-xs font-medium text-white'

const ZOOM_STEPS = [1, 2, 3]

/**
 * Tela cheia da imagem. Um toque alterna entre caber na tela e ampliar; quando
 * ampliada, o próprio container rola para arrastar. Fecha no Esc, no fundo e
 * no botão — e devolve o foco a quem abriu.
 */
function ImageViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<Element | null>(null)

  useEffect(() => {
    openerRef.current = document.activeElement
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden' // trava o scroll da página atrás
    return () => {
      document.body.style.overflow = previousOverflow
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus()
    }
  }, [])

  const close = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  const zoom = ZOOM_STEPS[step]
  const zoomed = zoom > 1

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Imagem ampliada: ${alt}`}
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/95"
    >
      <div className="flex items-center justify-between gap-2 p-3">
        <button
          type="button"
          onClick={() => setStep((s) => (s + 1) % ZOOM_STEPS.length)}
          className="min-h-[44px] rounded-xl px-4 text-sm font-semibold text-white ring-1 ring-white/30
            hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {zoomed ? `Reduzir (${zoom}x)` : 'Ampliar'}
        </button>
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          className="min-h-[44px] rounded-xl px-4 text-sm font-semibold text-white ring-1 ring-white/30
            hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Fechar
        </button>
      </div>

      {/* Fundo clicável fecha; a imagem alterna o zoom. Quando ampliada, o
          container rola nos dois eixos para arrastar a imagem. */}
      <div
        onClick={close}
        className={`flex-1 ${zoomed ? 'overflow-auto' : 'flex items-center justify-center overflow-hidden'} p-3`}
      >
        <img
          src={src}
          alt={alt}
          onClick={(event) => {
            event.stopPropagation()
            setStep((s) => (s + 1) % ZOOM_STEPS.length)
          }}
          style={{ width: zoomed ? `${zoom * 100}%` : undefined }}
          className={`mx-auto bg-white ${
            zoomed ? 'max-w-none cursor-zoom-out' : 'max-h-full max-w-full object-contain cursor-zoom-in'
          }`}
        />
      </div>

      <p className="px-4 pb-4 text-center text-xs text-white/70">
        Toque na imagem para ampliar ou reduzir. Esc fecha.
      </p>
    </div>,
    document.body,
  )
}
