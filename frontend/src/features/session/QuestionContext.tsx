import Markdown, { type Components } from 'react-markdown'
import { ZoomableImage } from '../../components/ZoomableImage'

/**
 * Mapeamento markdown → elementos, definido UMA vez fora do componente. Se
 * fosse recriado a cada render, cada `img` viraria um tipo de componente novo
 * e o React remontaria a imagem — perdendo o estado de tela cheia aberta a
 * cada tique do cronômetro da sessão.
 */
const COMPONENTS: Components = {
  img: ({ src, alt }) =>
    typeof src === 'string' ? <ZoomableImage src={src} alt={alt || 'Imagem da questão'} /> : null,
  p: ({ children }) => <p className="whitespace-pre-line">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  a: ({ children }) => <span>{children}</span>,
  h1: ({ children }) => <p className="font-semibold text-ink">{children}</p>,
  h2: ({ children }) => <p className="font-semibold text-ink">{children}</p>,
  h3: ({ children }) => <p className="font-semibold text-ink">{children}</p>,
}

/**
 * Texto de apoio da questão. A enem.dev entrega markdown — negrito, itálico e
 * as imagens embutidas na posição em que aparecem na prova —, então renderizar
 * como texto puro mostraria `**` e `![](url)` crus. Só markdown: nenhum HTML
 * da fonte é interpretado.
 */
export function QuestionContext({ markdown }: { markdown: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink-muted">
      <Markdown components={COMPONENTS}>{markdown}</Markdown>
    </div>
  )
}
