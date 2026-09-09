import Markdown from 'react-markdown'
import { ZoomableImage } from '../../components/ZoomableImage'

/**
 * Texto de apoio da questão. A enem.dev entrega markdown — negrito, itálico e
 * as imagens embutidas na posição em que aparecem na prova —, então renderizar
 * como texto puro mostraria `**` e `![](url)` crus. Só markdown: nenhum HTML
 * da fonte é interpretado.
 */
export function QuestionContext({ markdown }: { markdown: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-slate-600">
      <Markdown
        components={{
          img: ({ src, alt }) =>
            typeof src === 'string' ? (
              <ZoomableImage src={src} alt={alt || 'Imagem da questão'} />
            ) : null,
          p: ({ children }) => <p className="whitespace-pre-line">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-800">{children}</strong>
          ),
          a: ({ children }) => <span>{children}</span>,
          h1: ({ children }) => <p className="font-semibold text-slate-800">{children}</p>,
          h2: ({ children }) => <p className="font-semibold text-slate-800">{children}</p>,
          h3: ({ children }) => <p className="font-semibold text-slate-800">{children}</p>,
        }}
      >
        {markdown}
      </Markdown>
    </div>
  )
}
