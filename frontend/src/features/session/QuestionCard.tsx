import { useState } from 'react'
import { Button } from '../../components/Button'
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

  return (
    <section className="flex flex-col gap-5" aria-labelledby="question-statement">
      {question.context && <QuestionContext markdown={question.context} />}

      <h2
        id="question-statement"
        className="whitespace-pre-wrap text-base font-semibold leading-relaxed text-slate-800"
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
              className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition
                has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-indigo-600
                ${labelStyles(state)}`}
            >
              <input
                type="radio"
                name="alternative"
                value={alt.letter}
                checked={selected === alt.letter}
                onChange={() => setSelected(alt.letter)}
                aria-label={alternativeLabel(alt)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeStyles(state)}`}
              >
                {alt.letter}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                {alt.text && <span className="text-slate-800">{alt.text}</span>}
                {alt.file && (
                  // Tocar a imagem escolhe a alternativa; só o botão "Ampliar"
                  // abre a tela cheia.
                  <ZoomableImage
                    src={alt.file}
                    alt={`Alternativa ${alt.letter}`}
                    trigger="badge"
                  />
                )}
              </span>
            </label>
          )
        })}
      </fieldset>

      {answered ? (
        <div className="flex flex-col gap-4">
          <p
            role="status"
            aria-live="polite"
            className={`text-sm font-semibold ${feedback.correct ? 'text-green-700' : 'text-red-700'}`}
          >
            {feedback.correct
              ? 'Você acertou! 🎉'
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

/** Rótulo acessível: alternativas só de imagem não têm texto para ler. */
function alternativeLabel(alt: AlternativeView): string {
  return alt.text
    ? `Alternativa ${alt.letter}: ${alt.text}`
    : `Alternativa ${alt.letter}: imagem`
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
      return 'border-indigo-500 bg-indigo-50'
    case 'correct':
      return 'border-green-500 bg-green-50'
    case 'wrong':
      return 'border-red-500 bg-red-50'
    default:
      return 'border-slate-200 bg-white'
  }
}

function badgeStyles(state: AltState): string {
  switch (state) {
    case 'selected':
      return 'bg-indigo-600 text-white'
    case 'correct':
      return 'bg-green-600 text-white'
    case 'wrong':
      return 'bg-red-600 text-white'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}
