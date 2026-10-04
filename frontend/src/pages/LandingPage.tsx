import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buttonClassName } from '../components/Button'
import {
  ChartIcon,
  CheckIcon,
  ClockIcon,
  FlameIcon,
  MedalIcon,
  RankIcon,
  StudyIcon,
} from '../components/Icons'
import { Logo, LogoMark } from '../components/Logo'

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-600'

/**
 * Página pública de apresentação, mostrada em "/" para quem não tem sessão.
 * Números do texto refletem as regras do backend (5 questões por sessão,
 * +10 XP por acerto, placar semanal); nada aqui consome a API.
 */
export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <SiteHeader />
      <main>
        <Hero />
        <Facts />
        <HowItWorks />
        <Features />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" aria-label="Kaptika, início" className={`rounded-control ${FOCUS_RING}`}>
          <Logo />
        </Link>
        <nav aria-label="Conta" className="flex items-center gap-2">
          <Link
            to="/login"
            className={`inline-flex min-h-[44px] items-center rounded-control px-3 font-semibold text-pen-700 hover:bg-pen-50 ${FOCUS_RING}`}
          >
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className={buttonClassName('primary', 'max-sm:hidden sm:w-auto')}
          >
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero-dots relative">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-20 md:pb-24">
        <div className="flex flex-col items-start gap-6">
          <p className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-pen-700 ring-1 ring-line">
            Preparação para o ENEM
          </p>
          <h1 className="text-[2.6rem] leading-[1.05] font-extrabold tracking-tight text-ink sm:text-6xl">
            O ENEM em doses de <span className="highlight-mark whitespace-nowrap">5 questões</span>.
          </h1>
          <p className="max-w-xl text-lg text-ink-muted">
            Questões reais de provas anteriores, gabarito na hora e XP a cada acerto. Uma sessão por
            dia mantém sua ofensiva acesa, e o hábito de estudar vem junto.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link to="/cadastro" className={buttonClassName('primary', 'sm:w-auto sm:px-8', 'lg')}>
              Criar minha conta
            </Link>
            <Link to="/login" className={buttonClassName('secondary', 'sm:w-auto sm:px-8', 'lg')}>
              Já tenho conta
            </Link>
          </div>
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <ClockIcon className="h-4 w-4 text-ink-subtle" />
            Uma sessão cabe no intervalo entre aulas.
          </p>
        </div>
        <DemoCard />
      </div>
    </section>
  )
}

const DEMO_CHOICES = [
  { letter: 'A', text: 'R$ 110,00' },
  { letter: 'B', text: 'R$ 115,00' },
  { letter: 'C', text: 'R$ 120,00', correct: true },
  { letter: 'D', text: 'R$ 125,00' },
  { letter: 'E', text: 'R$ 130,00' },
]

/**
 * Prévia animada (só CSS, em laço) de uma questão sendo respondida: a escolha
 * vira acerto, sobe +10 XP e a ofensiva avança. Com movimento reduzido, mostra
 * o estado final parado. Decorativa: o leitor de tela recebe a legenda.
 */
function DemoCard() {
  return (
    <figure className="relative mx-auto w-full max-w-sm md:max-w-md">
      <figcaption className="sr-only">
        Exemplo de uma questão de Matemática sendo respondida: a alternativa certa fica verde, o
        estudante ganha 10 de XP e a ofensiva passa de 6 para 7 dias.
      </figcaption>

      <div aria-hidden className="relative">
        <div className="absolute -inset-3 -rotate-2 rounded-[22px] bg-pen-600" />
        <div className="relative rounded-[18px] bg-surface p-5 shadow-[0_18px_40px_-18px_rgb(23_44_133/0.45)] ring-1 ring-line">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-pen-700">Matemática</span>
            <span className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-2 w-5 rounded-full ${i < 2 ? 'bg-pen-600' : i === 2 ? 'demo-dot bg-line' : 'bg-line'}`}
                />
              ))}
            </span>
          </div>

          <p className="mt-4 font-semibold text-ink">
            Um tênis de R$ 150,00 está com 20% de desconto. Qual é o preço final?
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {DEMO_CHOICES.map((c) => (
              <li
                key={c.letter}
                className={`flex items-center gap-3 rounded-control border-[1.5px] border-line px-3 py-2 text-sm ${c.correct ? 'demo-choice' : ''}`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.5px] border-line-strong text-xs font-bold text-ink-muted ${c.correct ? 'demo-bubble' : ''}`}
                >
                  {c.letter}
                </span>
                <span className="flex-1 text-ink">{c.text}</span>
                {c.correct && <CheckIcon className="demo-check h-5 w-5 text-success" />}
              </li>
            ))}
          </ul>
        </div>

        <div className="demo-xp absolute -top-4 right-4 rounded-full bg-highlight px-3 py-1 font-display text-lg font-extrabold text-ink shadow-stamp">
          +10 XP
        </div>

        <div className="float-slow absolute -bottom-6 -left-3 flex items-center gap-2 rounded-card bg-surface px-3 py-2 ring-1 ring-line sm:-left-8">
          <FlameIcon accent className="h-6 w-6 text-ink" />
          <span className="relative font-display text-xl leading-none font-extrabold text-ink">
            <span className="demo-streak-old">6</span>
            <span className="demo-streak-new absolute inset-0">7</span>
          </span>
          <span className="text-sm text-ink-muted">dias</span>
        </div>
      </div>
    </figure>
  )
}

const FACTS = [
  { value: '5', label: 'questões por sessão' },
  { value: '+10', label: 'XP por acerto' },
  { value: '4', label: 'áreas do ENEM' },
  { value: '1', label: 'sessão por dia mantém a ofensiva' },
]

function Facts() {
  return (
    <section aria-label="O Kaptika em números" className="border-y border-line bg-surface">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-6 px-4 py-8 sm:px-6 md:grid-cols-4">
        {FACTS.map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <dt className="order-2 text-sm text-ink-muted">{f.label}</dt>
            <dd className="order-1 font-display text-4xl font-extrabold text-pen-600">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

const STEPS = [
  {
    title: 'Escolha a área',
    text: 'Linguagens, Ciências Humanas, Ciências da Natureza ou Matemática.',
  },
  {
    title: 'Responda 5 questões',
    text: 'Cada resposta mostra o gabarito na hora. Errou? Você vê a certa e segue em frente.',
  },
  {
    title: 'Volte amanhã',
    text: 'O XP sobe seu nível e a ofensiva conta os dias seguidos de estudo.',
  },
]

function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <SectionTitle eyebrow="Como funciona" title="Três passos, poucos minutos." />
      </Reveal>
      <ol className="mt-10 grid gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal as="li" key={s.title} delay={i * 90} className="relative rounded-card bg-surface p-6 ring-1 ring-line">
            <span
              aria-hidden
              className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink font-display text-lg font-extrabold text-ink"
            >
              {String.fromCharCode(65 + i)}
            </span>
            <h3 className="mt-4 text-xl font-bold text-ink">{s.title}</h3>
            <p className="mt-2 text-ink-muted">{s.text}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}

const FEATURES = [
  {
    icon: <FlameIcon accent className="h-6 w-6" />,
    title: 'Ofensiva diária',
    text: 'Dias seguidos de estudo viram uma sequência. Proteções seguram a ofensiva quando a vida aperta.',
  },
  {
    icon: <StudyIcon className="h-6 w-6" />,
    title: 'XP e níveis',
    text: 'Cada acerto vale XP. Acompanhe quanto falta para o próximo nível.',
  },
  {
    icon: <MedalIcon accent className="h-6 w-6" />,
    title: 'Medalhas',
    text: 'Conquistas por marcos do seu caminho, da primeira sessão às ofensivas longas.',
  },
  {
    icon: <RankIcon className="h-6 w-6" />,
    title: 'Placar semanal',
    text: 'Toda segunda a semana recomeça: dá para chegar ao topo mesmo começando agora.',
  },
  {
    icon: <ChartIcon className="h-6 w-6" />,
    title: 'Seu desempenho',
    text: 'Acertos por área e dias de estudo mostram onde vale insistir.',
  },
  {
    icon: <LogoMark className="h-6 w-6" />,
    title: 'Análise da sessão',
    text: 'Ao terminar, peça uma análise curta, feita por IA, do que foi bem e do que melhorar.',
  },
]

function Features() {
  return (
    <section className="bg-pen-50/60 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <SectionTitle eyebrow="Por que funciona" title="Estudar vira jogo, e o jogo vira hábito." />
        </Reveal>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal
              as="li"
              key={f.title}
              delay={(i % 3) * 90}
              className="group rounded-card bg-surface p-6 ring-1 ring-line transition duration-200 hover:-translate-y-1 hover:ring-pen-200 hover:shadow-[0_12px_28px_-16px_rgb(23_44_133/0.4)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-control bg-pen-50 text-pen-600 transition group-hover:bg-highlight-soft group-hover:text-ink">
                {f.icon}
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-ink-muted">{f.text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal className="relative overflow-hidden rounded-[22px] bg-pen-600 px-6 py-12 text-center sm:px-12 sm:py-16">
        <LogoMark className="mx-auto h-16 w-16 rounded-[14px] ring-4 ring-pen-700" />
        <h2 className="mx-auto mt-6 max-w-2xl font-display text-3xl font-extrabold text-white sm:text-5xl">
          Sua primeira sessão leva menos tempo que ler este site.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-pen-100">
          Crie a conta, escolha a área e responda. O resto o Kaptika conta para você.
        </p>
        <Link
          to="/cadastro"
          className="mt-8 inline-flex min-h-14 items-center justify-center rounded-card bg-highlight px-8 text-lg font-bold text-ink shadow-[0_3px_0_var(--color-ink)] transition hover:brightness-95 active:translate-y-[3px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Começar agora
        </Link>
      </Reveal>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="flex items-center gap-2">
          <LogoMark className="h-6 w-6" />
          Kaptika
        </span>
        <p>
          Questões de edições anteriores do ENEM, via{' '}
          <a
            href="https://enem.dev"
            target="_blank"
            rel="noreferrer"
            className={`font-semibold text-pen-700 underline underline-offset-2 ${FOCUS_RING}`}
          >
            enem.dev
          </a>
          . Sem vínculo com o INEP.
        </p>
      </div>
    </footer>
  )
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-bold tracking-wide text-pen-600 uppercase">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">{title}</h2>
    </div>
  )
}

/**
 * Surge suavemente ao entrar na tela. Sem IntersectionObserver (ou com
 * movimento reduzido, tratado no CSS) o conteúdo já nasce visível.
 */
function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  children,
}: {
  as?: 'div' | 'li'
  delay?: number
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (visible || !el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible])

  return (
    <Tag
      ref={ref as never}
      data-visible={visible}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${className}`}
    >
      {children}
    </Tag>
  )
}
