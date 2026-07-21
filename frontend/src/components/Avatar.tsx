import { useState } from 'react'

/** Avatar com fallback para as iniciais quando a imagem falha (edge case da spec). */
export function Avatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false)
  const initials = name.trim().slice(0, 2).toUpperCase() || '?'

  if (!src || failed) {
    return (
      <div
        aria-label={name}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-700"
      >
        {initials}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className="h-20 w-20 rounded-full object-cover"
    />
  )
}
