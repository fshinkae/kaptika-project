import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { CheckIcon, CloseIcon } from '../../components/Icons'
import { ZoomableImage } from '../../components/ZoomableImage'
import { QuestionContext } from './QuestionContext'
import type { AlternativeView, AnswerResult, QuestionView } from './sessionApi'

/**
 * Uma questão por vez (FR-002). Exige seleção + confirmação antes de revelar
 * (FR-003); após confirmar, mostra acerto/erro e a alternativa correta vinda
 * da API (FR-004). Resposta confirmada não pode ser alterada e o botão de
 * confirmar é bloqueado durante o envio (FR-006).
 */
export function QuestionCard({
  question,
  feedback,
  onConfirm,
  isSubmitting,
  onNext,
  nextLabel,
}: {
  question: QuestionView
  feedback: AnswerResult | null
  onConfirm: (alternative: string) => void
  isSubmitting: boolean
  onNext: () => void
  nextLabel: string
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const answered = feedback !== null
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Cada questão monta de novo (key no pai). Ela abre no topo e o foco vai ao
  // enunciado (SES-3): antes, a próxima questão aparecia rolada até as
  // alternativas e o foco se perdia com o botão "Próxima" desmontado.
  useEffect(() => {
    // Sempre ao topo e sem animação: com as imagens ainda carregando, a página
    // encurta e o navegador prende a rolagem no meio da questão nova.
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'instant' })
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <section className="flex flex-col gap-5" aria-labelledby="question-statement">
      {question.context && <QuestionContext markdown={question.context} />}

      <h2
        id="question-statement"
        ref={headingRef}
        tabIndex={-1}
        className="whitespace-pre-wrap text-base font-semibold leading-relaxed text-ink focus:outline-none"
      >
        {question.statement}
      </h2>

      <fieldset className="flex flex-col gap-2 border-0 p-0" disabled={answered || isSubmitting}>
        <legend className="sr-only">Alternativas</legend>
        {question.alternatives.map((alt) => {
          const state = alternativeState(alt.letter, selected, feedback)
          return (
            <label
              key={alt.letter}
              className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-control border px-4 py-3 text-sm transition
                has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-pen-600
                ${labelStyles(state)}`}
            >
              <input
                type="radio"
                name="alternative"
                value={alt.letter}
                checked={selected === alt.letter}
                onChange={() => setSelected(alt.letter)}
                aria-label={alternativeLabel(alt, state)}
                className="sr-only"
              />
              <span
                aria-hidden
                // Bolinha do cartão-resposta: preenchida ao marcar.
                className={`flex h-7 w-9 shrink-0 items-center justify-center rounded-[50%] border-2 text-xs font-bold ${badgeStyles(state)}`}
              >
                {alt.letter}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                {alt.text && <span className="text-ink">{alt.text}</span>}
                {alt.file && (
                  // Tocar a imagem a amplia; escolher se faz tocando o cartão
                  // ao redor ou pelo botão dentro da tela cheia.
                  <ZoomableImage
                    src={alt.file}
                    alt={`Alternativa ${alt.letter}`}
                    // A tela cheia é um portal fora do <fieldset>, então o
                    // disabled dele não a alcança: retira a escolha na mão.
                    onSelect={
                      answered || isSubmitting ? undefined : () => setSelected(alt.letter)
                    }
                    selectLabel={`Escolher alternativa ${alt.letter}`}
                  />
                )}
              </span>
              {state === 'correct' && <CheckIcon className="h-5 w-5 shrink-0 text-success" />}
              {state === 'wrong' && <CloseIcon className="h-5 w-5 shrink-0 text-danger" />}
            </label>
          )
        })}
      </fieldset>

      {answered ? (
        <div className="flex flex-col gap-4">
          <p
            role="status"
            aria-live="polite"
            className={`flex items-center gap-2 text-sm font-semibold ${feedback.correct ? 'text-success' : 'text-danger'}`}
          >
            {feedback.correct ? (
              <CheckIcon className="h-5 w-5 shrink-0" />
            ) : (
              <CloseIcon className="h-5 w-5 shrink-0" />
            )}
            {feedback.correct
              ? 'Você acertou!'
              : `Resposta incorreta. A correta é a alternativa ${feedback.correctAlternative}.`}
          </p>
          <Button onClick={onNext}>{nextLabel}</Button>
        </div>
      ) : (
        <Button
          onClick={() => selected && onConfirm(selected)}
          disabled={!selected || isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Enviando…' : 'Confirmar'}
        </Button>
      )}
    </section>
  )
}

/**
 * Rótulo acessível: alternativas só de imagem não têm texto para ler. Depois da
 * resposta, diz qual é a correta e qual foi a escolhida (A11Y-3): a cor sozinha
 * não chega ao leitor de tela.
 */
function alternativeLabel(alt: AlternativeView, state: AltState): string {
  const base = alt.text
    ? `Alternativa ${alt.letter}: ${alt.text}`
    : `Alternativa ${alt.letter}: imagem`
  if (state === 'correct') return `${base} (correta)`
  if (state === 'wrong') return `${base} (sua resposta, incorreta)`
  return base
}

type AltState = 'idle' | 'selected' | 'correct' | 'wrong'

/** Estado visual de cada alternativa: pré-resposta usa seleção; pós-resposta usa gabarito. */
function alternativeState(
  letter: string,
  selected: string | null,
  feedback: AnswerResult | null,
): AltState {
  if (feedback) {
    if (letter === feedback.correctAlternative) return 'correct'
    if (letter === feedback.chosen) return 'wrong'
    return 'idle'
  }
  return selected === letter ? 'selected' : 'idle'
}

function labelStyles(state: AltState): string {
  switch (state) {
    case 'selected':
      return 'border-pen-600 bg-pen-50'
    case 'correct':
      return 'border-success bg-success-soft'
    case 'wrong':
      return 'border-danger bg-danger-soft'
    default:
      return 'border-line bg-surface'
  }
}

function badgeStyles(state: AltState): string {
  switch (state) {
    case 'selected':
      return 'border-pen-600 bg-pen-600 text-white'
    case 'correct':
      return 'border-success bg-success text-white'
    case 'wrong':
      return 'border-danger bg-surface text-danger'
    default:
      return 'border-line-strong bg-surface text-ink-muted'
  }
}
