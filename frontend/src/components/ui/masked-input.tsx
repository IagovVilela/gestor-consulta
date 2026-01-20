import * as React from 'react'
import { Input } from './input'
import { formatCPF, formatPhone, formatRG, formatDate, formatCEP, formatCRM } from '@/lib/masks'

interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask?: 'cpf' | 'phone' | 'rg' | 'date' | 'cep' | 'crm'
  onUnformattedChange?: (value: string) => void
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onChange, onUnformattedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let formattedValue = e.target.value

      switch (mask) {
        case 'cpf':
          formattedValue = formatCPF(e.target.value)
          break
        case 'phone':
          formattedValue = formatPhone(e.target.value)
          break
        case 'rg':
          formattedValue = formatRG(e.target.value)
          break
        case 'date':
          formattedValue = formatDate(e.target.value)
          break
        case 'cep':
          formattedValue = formatCEP(e.target.value)
          break
        case 'crm':
          formattedValue = formatCRM(e.target.value)
          break
      }

      // Atualizar o valor formatado no input
      e.target.value = formattedValue

      // Chamar onChange original
      if (onChange) {
        onChange(e)
      }

      // Chamar callback com valor sem formatação se necessário
      if (onUnformattedChange) {
        const unformatted = formattedValue.replace(/\D/g, '')
        onUnformattedChange(unformatted)
      }
    }

    return <Input ref={ref} onChange={handleChange} {...props} />
  }
)

MaskedInput.displayName = 'MaskedInput'

export { MaskedInput }




