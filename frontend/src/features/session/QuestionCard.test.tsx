import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionCard } from './QuestionCard'
import type { QuestionView } from './sessionApi'

const CONTEXT_IMAGE = 'https://enem.dev/2023/questions/140/grafico.png'

function question(overrides: Partial<QuestionView> = {}): QuestionView {
  return {
    questionId: '2023-140',
    position: 1,
    statement: 'Qual gráfico representa a distribuição?',
    context: `**TEXTO I**\n\nObserve o gráfico.\n\n![](${CONTEXT_IMAGE})`,
    alternatives: [
      { letter: 'A', text: null, file: 'https://enem.dev/2023/questions/140/a.png' },
      { letter: 'B', text: 'Alternativa em texto', file: null },
    ],
    ...overrides,
  }
}

function renderCard(view: QuestionView = question()) {
  return render(
    <QuestionCard
      question={view}
      feedback={null}
      onConfirm={() => {}}
      isSubmitting={false}
      onNext={() => {}}
      nextLabel="Próxima questão"
    />,
  )
}

describe('QuestionCard — imagens', () => {
  it('renderiza a imagem do texto de apoio em vez do markdown cru', () => {
    renderCard()

    expect(screen.getByRole('img', { name: 'Imagem da questão' })).toHaveAttribute(
      'src',
      CONTEXT_IMAGE,
    )
    // markdown é interpretado: nada de ![]() nem ** na tela
    expect(screen.queryByText(/!\[\]\(/)).not.toBeInTheDocument()
    expect(screen.getByText('TEXTO I').tagName).toBe('STRONG')
  })

  it('abre e fecha a imagem em tela cheia', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByRole('button', { name: /Ampliar imagem: Imagem da questão/ }))

    const viewer = screen.getByRole('dialog')
    expect(viewer).toHaveAttribute('aria-modal', 'true')
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('alternativa só de imagem: tocar a imagem seleciona, "Ampliar" só amplia', async () => {
    const user = userEvent.setup()
    renderCard()

    const imageAlternative = screen.getByRole('radio', { name: 'Alternativa A: imagem' })
    expect(screen.getByRole('img', { name: 'Alternativa A' })).toBeInTheDocument()

    await user.click(screen.getByRole('img', { name: 'Alternativa A' }))
    expect(imageAlternative).toBeChecked()

    await user.click(screen.getByRole('radio', { name: /Alternativa B/ }))
    await user.click(screen.getByRole('button', { name: 'Ampliar imagem: Alternativa A' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // ampliar não muda a escolha
    expect(imageAlternative).not.toBeChecked()
  })

  it('imagem ausente na fonte vira aviso, não imagem quebrada', () => {
    renderCard(question({ context: '![](https://enem.dev/broken-image.svg)' }))

    expect(screen.getByText(/Imagem indisponível na fonte/)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Imagem da questão' })).not.toBeInTheDocument()
  })
})
