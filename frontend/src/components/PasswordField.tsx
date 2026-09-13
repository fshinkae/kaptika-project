import { forwardRef, useState } from 'react'
import { FormField } from './FormField'

type PasswordFieldProps = Omit<React.ComponentProps<typeof FormField>, 'type' | 'action'>

/** Senha com mostrar/ocultar: no teclado do celular, digitar às cegas gera erro. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>((props, ref) => {
  const [visible, setVisible] = useState(false)
  return (
    <FormField
      {...props}
      ref={ref}
      type={visible ? 'text' : 'password'}
      action={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label="Mostrar senha"
          aria-pressed={visible}
          className="h-11 rounded-xl px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50
            focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600"
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      }
    />
  )
})

PasswordField.displayName = 'PasswordField'
