import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** Placeholder da própria enem.dev quando a imagem original não existe. */
const MISSING_IMAGE = 'broken-image'
const MIN_SCALE = 1
const MAX_SCALE = 6
const DOUBLE_TAP_SCALE = 2.5

/**
 * Imagem de questão: aparece no fluxo do texto e o próprio toque nela abre a
 * tela cheia, onde se amplia com dois dedos. Fora da tela cheia a imagem nunca
 * passa da largura do container nem é esticada além do tamanho original.
 */
export function ZoomableImage({
  src,
  alt,
  onSelect,
  selectLabel,
  className = '',
}: {
  src: string
  alt: string
  /** Quando a imagem é uma alternativa, permite escolhê-la de dentro da tela cheia. */
  onSelect?: () => void
  selectLabel?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!src || src.includes(MISSING_IMAGE) || failed) {
    return (
      <span className="block rounded-lg bg-paper px-3 py-2 text-xs text-ink-muted ring-1 ring-line">
        Imagem indisponível na fonte.
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        // Dentro de um <label> (alternativa), sem preventDefault o toque também
        // marcaria o rádio junto de abrir a tela cheia.
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen(true)
        }}
        aria-label={`Ampliar imagem: ${alt}`}
        className={`block w-fit max-w-full cursor-zoom-in rounded-lg bg-white p-1
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-600
          ${className}`}
      >
        {/* As digitalizações da enem.dev variam muito de tamanho: exibir no
            tamanho natural, limitado pela largura do texto e por uma altura
            máxima, evita ampliar uma imagem pequena até borrar. */}
        <img
          src={src}
          alt={alt}
          decoding="async"
          onError={() => setFailed(true)}
          className="block h-auto max-h-[60vh] max-w-full object-contain"
        />
      </button>

      {open && (
        <ImageViewer
          src={src}
          alt={alt}
          onClose={() => setOpen(false)}
          onSelect={onSelect}
          selectLabel={selectLabel}
        />
      )}
    </>
  )
}

interface Transform {
  scale: number
  x: number
  y: number
}

const IDENTITY: Transform = { scale: 1, x: 0, y: 0 }

/**
 * Tela cheia da imagem, com as gestualidades que um estudante espera do
 * celular: pinça de dois dedos para ampliar, arrastar para mover, toque duplo
 * para alternar. No desktop, a roda do mouse amplia. Esc e o botão fecham.
 */
function ImageViewer({
  src,
  alt,
  onClose,
  onSelect,
  selectLabel,
}: {
  src: string
  alt: string
  onClose: () => void
  onSelect?: () => void
  selectLabel?: string
}) {
  const [transform, setTransform] = useState<Transform>(IDENTITY)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<Element | null>(null)

  // Ponteiros ativos e o estado do gesto em curso ficam fora do render: mudam
  // a cada movimento e só o transform precisa repintar.
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ distance: number; start: Transform } | null>(null)
  const drag = useRef<{ x: number; y: number; start: Transform } | null>(null)
  const lastTap = useRef(0)

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

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === '+' || event.key === '=') {
        setTransform((t) => ({ ...t, scale: clamp(t.scale * 1.4, MIN_SCALE, MAX_SCALE) }))
      }
      if (event.key === '-') {
        setTransform((t) => {
          const scale = clamp(t.scale / 1.4, MIN_SCALE, MAX_SCALE)
          return scale === MIN_SCALE ? IDENTITY : { ...t, scale }
        })
      }
      if (event.key === '0') setTransform(IDENTITY)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const apply = useCallback((next: Transform) => {
    const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE)
    // No tamanho de tela a imagem volta ao centro: não há para onde arrastar.
    setTransform(scale === MIN_SCALE ? IDENTITY : { ...next, scale })
  }, [])

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    try {
      // Segue recebendo os eventos se o dedo sair do elemento; o navegador
      // recusa se o ponteiro já não existe, e aí o gesto funciona sem captura.
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // sem captura: o gesto continua válido enquanto o dedo estiver sobre a área
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointers.current.size === 2) {
      gesture.current = { distance: pointerDistance(), start: transform }
      drag.current = null
      return
    }
    drag.current = { x: event.clientX, y: event.clientY, start: transform }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointers.current.size >= 2 && gesture.current) {
      const ratio = pointerDistance() / gesture.current.distance
      apply({ ...gesture.current.start, scale: gesture.current.start.scale * ratio })
      return
    }
    if (drag.current && transform.scale > MIN_SCALE) {
      apply({
        ...drag.current.start,
        x: drag.current.start.x + (event.clientX - drag.current.x),
        y: drag.current.start.y + (event.clientY - drag.current.y),
      })
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) gesture.current = null
    if (pointers.current.size === 0) drag.current = null
  }

  /** Toque duplo (e clique duplo) alterna entre caber na tela e ampliar. */
  function onImageClick() {
    const now = Date.now()
    const isDoubleTap = now - lastTap.current < 300
    lastTap.current = now
    if (isDoubleTap) {
      apply(transform.scale > MIN_SCALE ? IDENTITY : { ...IDENTITY, scale: DOUBLE_TAP_SCALE })
    }
  }

  function onWheel(event: React.WheelEvent<HTMLDivElement>) {
    apply({ ...transform, scale: transform.scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15) })
  }

  function pointerDistance(): number {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y) || 1
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Imagem ampliada: ${alt}`}
      className="fixed inset-0 z-50 flex flex-col bg-ink/95"
    >
      {/* No celular a pinça basta; no computador não há pinça, então os
          controles de zoom precisam estar visíveis (e no teclado). */}
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => apply({ ...transform, scale: transform.scale / 1.4 })}
            disabled={transform.scale <= MIN_SCALE}
            aria-label="Reduzir"
            className={`${CONTROL_CLASS} disabled:opacity-40`}
          >
            −
          </button>
          <span className="min-w-[3.5rem] text-center text-sm font-semibold text-white/80">
            {Math.round(transform.scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => apply({ ...transform, scale: transform.scale * 1.4 })}
            disabled={transform.scale >= MAX_SCALE}
            aria-label="Ampliar"
            className={`${CONTROL_CLASS} disabled:opacity-40`}
          >
            +
          </button>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className={`${CONTROL_CLASS} px-4 text-sm`}
        >
          Fechar
        </button>
      </div>

      {/* touch-action none entrega os dois dedos ao gesto em vez de deixar o
          navegador rolar/ampliar a página inteira por baixo do diálogo. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onClick={onImageClick}
        style={{ touchAction: 'none' }}
        className="flex flex-1 items-center justify-center overflow-hidden p-3"
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
          // Em telas largas, esticar a digitalização até a borda só a borra: o
          // teto de largura mantém a nitidez e o zoom cobre quem quer mais.
          className={`mx-auto h-auto max-h-full w-full max-w-[900px] bg-white object-contain select-none ${
            transform.scale > MIN_SCALE ? 'cursor-grab' : 'cursor-zoom-in'
          }`}
        />
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4">
        {onSelect && selectLabel && (
          <button
            type="button"
            onClick={() => {
              onSelect()
              onClose()
            }}
            className="min-h-[44px] w-full rounded-control bg-white px-4 text-base font-semibold text-ink
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {selectLabel}
          </button>
        )}
        <p className="text-center text-xs text-white/70">
          Dois dedos ou a roda do mouse ampliam; arraste para mover. Toque duplo alterna.
        </p>
      </div>
    </div>,
    document.body,
  )
}

const CONTROL_CLASS =
  'min-h-[44px] min-w-[44px] rounded-control px-3 text-base font-semibold text-white ring-1 ring-white/30 ' +
  'hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
