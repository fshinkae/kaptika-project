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

  // As imagens da enem.dev são digitalizações de tamanhos muito diferentes:
  // uma fórmula estreita ao lado de um gráfico de página inteira. Exibir no
  // tamanho natural, limitado pela largura do texto e por uma altura máxima,
  // evita ampliar uma imagem pequena até borrar — e o zoom cobre o resto.
  const image = (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`block h-auto max-w-full object-contain ${
        trigger === 'image' ? 'mx-auto max-h-[60vh]' : 'max-h-[40vh]'
      }`}
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
          className={`${FRAME_CLASS} cursor-zoom-in focus-visible:outline-2
            focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${className}`}
        >
          {image}
          <span aria-hidden className={HINT_CLASS}>
            Toque para ampliar
          </span>
        </button>
        {viewer}
      </>
    )
  }

  // Na alternativa a moldura seria uma borda dentro da borda do próprio
  // cartão, e centralizar afastaria a imagem da letra: alinha à esquerda.
  return (
    <span className={`block ${className}`}>
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
        className="mt-1 block min-h-[32px] rounded-lg pr-2 text-xs font-medium
          text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-indigo-600"
      >
        Ampliar
      </button>
      {viewer}
    </span>
  )
}

/** Moldura que abraça a imagem em vez de esticá-la à largura do container. */
const FRAME_CLASS =
  'mx-auto block w-fit max-w-full rounded-lg bg-white p-2 ring-1 ring-slate-200'

const HINT_CLASS = 'mt-1 block text-right text-[11px] font-medium text-slate-400'

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
  // O botão anuncia o que o próximo toque faz, não o zoom atual.
  const nextZoom = ZOOM_STEPS[(step + 1) % ZOOM_STEPS.length]
  const zoomActionLabel = nextZoom === 1 ? 'Ajustar à tela' : `Ampliar (${nextZoom}x)`

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
          {zoomActionLabel}
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
          // Sem zoom, ocupa a largura da tela (aqui ampliar É o objetivo,
          // então uma imagem pequena sobe até caber) com a altura seguindo a
          // proporção; com zoom, cresce além da tela e o container rola.
          className={`mx-auto h-auto bg-white object-contain ${
            zoomed ? 'max-w-none cursor-zoom-out' : 'w-full max-h-full cursor-zoom-in'
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
