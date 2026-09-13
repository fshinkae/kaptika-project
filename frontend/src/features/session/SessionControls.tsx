import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { ClockIcon } from '../../components/Icons'

/**
 * Cronômetro da sessão de estudo. Conta a partir do início real da sessão
 * (createdAt, vindo da API) e desconta o tempo pausado neste dispositivo — o
 * backend não registra tempo, então a pausa é um recurso da tela.
 */
export function useStudyStopwatch(startedAt: string) {
  const startMs = useMemo(() => new Date(startedAt).getTime(), [startedAt])
  const [paused, setPaused] = useState(false)
  const [tick, setTick] = useState(() => Date.now())
  // Total já pausado e instante da pausa em curso — fora do estado de render
  // porque só influenciam o cálculo do tempo decorrido.
  const pausedTotalRef = useRef(0)
  const pausedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [paused])

  const pause = useCallback(() => {
    pausedAtRef.current = Date.now()
    setPaused(true)
  }, [])

  const resume = useCallback(() => {
    if (pausedAtRef.current != null) {
      pausedTotalRef.current += Date.now() - pausedAtRef.current
      pausedAtRef.current = null
    }
    setTick(Date.now())
    setPaused(false)
  }, [])

  const reference = paused ? (pausedAtRef.current ?? tick) : tick
  const elapsedMs = Math.max(0, reference - startMs - pausedTotalRef.current)

  return { elapsed: formatElapsed(elapsedMs), paused, pause, resume }
}

/** mm:ss até 59:59; acima disso h:mm:ss. */
function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const seconds = String(total % 60).padStart(2, '0')
  const minutes = String(Math.floor(total / 60) % 60).padStart(2, '0')
  const hours = Math.floor(total / 3600)
  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`
}

/**
 * Tempo decorrido e pausar/retomar. Discreto de propósito (SES-7): em sessão
 * curta, cronômetro em destaque vira pressão e compete com a questão.
 */
export function SessionControls({
  elapsed,
  paused,
  onPause,
  onResume,
  disabled,
}: {
  elapsed: string
  paused: boolean
  onPause: () => void
  onResume: () => void
  disabled?: boolean
}) {
  return (
    <div className="-my-2 flex items-center justify-between gap-3">
      <p className="flex items-center gap-1.5 text-sm text-slate-600">
        <ClockIcon className="h-4 w-4" />
        <span role="timer" aria-label="Tempo de estudo" className="tabular-nums">
          {elapsed}
        </span>
      </p>
      <button
        type="button"
        onClick={paused ? onResume : onPause}
        disabled={disabled}
        className="-mr-3 min-h-[44px] rounded-xl px-3 text-sm font-semibold text-indigo-700
          transition duration-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-400
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        {paused ? 'Retomar' : 'Pausar'}
      </button>
    </div>
  )
}

/** Tela de pausa: esconde a questão para a pausa valer de fato. */
export function PausedPanel({ onResume }: { onResume: () => void }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-6 text-center ring-1 ring-slate-100">
      <h2 className="text-lg font-bold text-slate-800">Sessão pausada</h2>
      <p className="text-sm text-slate-600">
        O cronômetro está parado e a questão fica oculta até você retomar.
      </p>
      <Button onClick={onResume}>Retomar sessão</Button>
    </section>
  )
}

/** Encerrar antecipadamente (FR-008) com passo de confirmação. */
export function FinishControls({
  confirming,
  isFinishing,
  onAsk,
  onCancel,
  onConfirm,
}: {
  confirming: boolean
  isFinishing: boolean
  onAsk: () => void
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={onAsk}
        className="min-h-[44px] text-sm font-medium text-slate-600 underline-offset-2 hover:underline
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Encerrar sessão
      </button>
    )
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-sm text-slate-700">
        Encerrar agora? Você verá o resumo do que já respondeu.
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={isFinishing}>
          Continuar
        </Button>
        <Button onClick={onConfirm} disabled={isFinishing}>
          {isFinishing ? 'Encerrando…' : 'Encerrar'}
        </Button>
      </div>
    </div>
  )
}
