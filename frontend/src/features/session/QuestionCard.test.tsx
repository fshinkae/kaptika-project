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

  it('no computador, os controles de zoom e o teclado funcionam', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Ampliar imagem: Imagem da questão' }))
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reduzir' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Ampliar' }))
    expect(screen.getByText('140%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reduzir' })).toBeEnabled()

    await user.keyboard('+')
    expect(screen.getByText('196%')).toBeInTheDocument()

    await user.keyboard('0')
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('a tela cheia sobrevive a re-render da questão (ex.: tique do cronômetro)', async () => {
    const user = userEvent.setup()
    const { rerender } = renderCard()

    await user.click(screen.getByRole('button', { name: /Ampliar imagem: Imagem da questão/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // O cronômetro re-renderiza a tela a cada segundo; a imagem não pode
    // remontar e fechar a tela cheia por causa disso.
    rerender(
      <QuestionCard
        question={question()}
        feedback={null}
        onConfirm={() => {}}
        isSubmitting={false}
        onNext={() => {}}
        nextLabel="Próxima questão"
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
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

  it('alternativa só de imagem: tocar amplia e dá para escolher de lá', async () => {
    const user = userEvent.setup()
    renderCard()

    const imageAlternative = screen.getByRole('radio', { name: 'Alternativa A: imagem' })
    expect(screen.getByRole('img', { name: 'Alternativa A' })).toBeInTheDocument()

    // tocar a imagem amplia, sem escolher por baixo do pano
    await user.click(screen.getByRole('img', { name: 'Alternativa A' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(imageAlternative).not.toBeChecked()

    // a escolha fica a um toque de distância, dentro da própria tela cheia
    await user.click(screen.getByRole('button', { name: 'Escolher alternativa A' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(imageAlternative).toBeChecked()
  })

  it('tocar o cartão da alternativa (fora da imagem) escolhe direto', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByRole('radio', { name: 'Alternativa A: imagem' }))

    expect(screen.getByRole('radio', { name: 'Alternativa A: imagem' })).toBeChecked()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('nenhum link "Ampliar": a própria imagem é o gatilho', () => {
    renderCard()

    expect(screen.queryByRole('button', { name: 'Ampliar' })).not.toBeInTheDocument()
    expect(screen.queryByText('Toque para ampliar')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ampliar imagem: Imagem da questão' }),
    ).toContainElement(screen.getByRole('img', { name: 'Imagem da questão' }))
  })

  it('imagem ausente na fonte vira aviso, não imagem quebrada', () => {
    renderCard(question({ context: '![](https://enem.dev/broken-image.svg)' }))

    expect(screen.getByText(/Imagem indisponível na fonte/)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Imagem da questão' })).not.toBeInTheDocument()
  })
})
