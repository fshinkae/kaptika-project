import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../lib/apiClient'
import { getProfile, updateProfile, type Profile } from '../lib/profileApi'
import { ProfileBadgesHighlight } from '../features/badges'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { ErrorState } from '../components/ErrorState'
import { FormField } from '../components/FormField'
import { LoadingState } from '../components/LoadingState'
import { PageHeader } from '../components/PageHeader'
import { formatDays } from '../lib/format'

const editSchema = z.object({
  displayName: z.string().trim().min(2, 'Mínimo de 2 caracteres.').max(40, 'Máximo de 40 caracteres.'),
  avatarUrl: z.union([z.url('URL inválida.'), z.literal('')]),
})
type EditForm = z.infer<typeof editSchema>

export function ProfilePage() {
  const { signOut } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)

  const query = useQuery({ queryKey: ['profile'], queryFn: getProfile })

  if (query.isPending) return <LoadingState label="Carregando perfil…" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8">
      {editing ? (
        <ProfileEditForm
          profile={query.data}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            queryClient.setQueryData(['profile'], updated)
            setEditing(false)
          }}
        />
      ) : (
        <ProfileView profile={query.data} onEdit={() => setEditing(true)} onSignOut={signOut} />
      )}
    </main>
  )
}

function ProfileView({
  profile,
  onEdit,
  onSignOut,
}: {
  profile: Profile
  onEdit: () => void
  onSignOut: () => void
}) {
  const { progress } = profile
  return (
    <div className="flex flex-col items-center gap-6">
      <Avatar src={profile.avatarUrl} name={profile.displayName} />
      <h1 className="text-xl font-semibold text-ink">{profile.displayName}</h1>

      <dl className="grid w-full grid-cols-2 gap-3">
        <Stat label="XP total" value={progress.xpTotal} />
        <Stat label="Nível" value={progress.level} />
        <Stat label="Ofensiva" value={formatDays(progress.streakCurrent)} />
        <Stat label="Medalhas" value={progress.badgesCount} />
      </dl>

      <ProfileBadgesHighlight />

      <div className="flex w-full flex-col gap-3">
        <Button onClick={onEdit}>Editar perfil</Button>
        <Button variant="secondary" onClick={onSignOut}>
          Sair
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-control bg-surface p-4 text-center ring-1 ring-line">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold text-ink">{value}</dd>
    </div>
  )
}

function ProfileEditForm({
  profile,
  onCancel,
  onSaved,
}: {
  profile: Profile
  onCancel: () => void
  onSaved: (updated: Profile) => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { displayName: profile.displayName, avatarUrl: profile.avatarUrl ?? '' },
  })

  const mutation = useMutation({
    mutationFn: (form: EditForm) =>
      updateProfile({ displayName: form.displayName, avatarUrl: form.avatarUrl || null }),
    onSuccess: onSaved,
    onError: (error) => {
      // 422 do backend: mostra a regra violada no campo de nome (FR-009)
      if (error instanceof ApiError && error.status === 422) {
        setError('displayName', { message: error.message })
      } else {
        setFormError('Não foi possível salvar. Tente novamente.')
      }
    },
  })

  return (
    <form
      noValidate
      onSubmit={handleSubmit((form) => {
        setFormError(null)
        mutation.mutate(form)
      })}
      className="flex flex-col gap-4"
    >
      <PageHeader title="Editar perfil" />
      <FormField label="Nome de exibição" error={errors.displayName?.message} {...register('displayName')} />
      <FormField
        label="URL do avatar"
        type="url"
        placeholder="https://…"
        error={errors.avatarUrl?.message}
        {...register('avatarUrl')}
      />
      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
    </form>
  )
}
