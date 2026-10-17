import * as React from 'react'
import { Input } from './input'
import {
  formatCPF,
  formatPhone,
  formatRG,
  formatDate,
  formatCEP,
  formatCRM,
  formatCNPJ,
} from '@/lib/masks'

type MaskType = 'cpf' | 'phone' | 'rg' | 'date' | 'cep' | 'crm' | 'cnpj'

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask?: MaskType
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onUnformattedChange?: (value: string) => void
}

const formatters: Record<MaskType, (value: string) => string> = {
  cpf: formatCPF,
  phone: formatPhone,
  rg: formatRG,
  date: formatDate,
  cep: formatCEP,
  crm: formatCRM,
  cnpj: formatCNPJ,
}

const maxLengths: Record<MaskType, number> = {
  cpf: 14,
  phone: 15,
  rg: 12,
  date: 10,
  cep: 9,
  crm: 12,
  cnpj: 18,
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onChange, onUnformattedChange, maxLength, value, defaultValue, ...props }, ref) => {
    const formatValue = React.useCallback(
      (raw: string) => (mask ? formatters[mask](raw) : raw),
      [mask],
    )

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formattedValue = formatValue(e.target.value)
      e.target.value = formattedValue

      onChange?.(e)

      if (onUnformattedChange) {
        onUnformattedChange(formattedValue.replace(/\D/g, ''))
      }
    }

    const resolvedMaxLength = maxLength ?? (mask ? maxLengths[mask] : undefined)
    const hasValue = value !== undefined && value !== null
    const hasDefault = defaultValue !== undefined && defaultValue !== null

    return (
      <Input
        ref={ref}
        {...props}
        {...(hasValue ? { value: formatValue(String(value)) } : {})}
        {...(!hasValue && hasDefault
          ? { defaultValue: formatValue(String(defaultValue)) }
          : {})}
        maxLength={resolvedMaxLength}
        inputMode={mask && mask !== 'crm' ? 'numeric' : props.inputMode}
        onChange={handleChange}
      />
    )
  },
)

MaskedInput.displayName = 'MaskedInput'

export { MaskedInput }
