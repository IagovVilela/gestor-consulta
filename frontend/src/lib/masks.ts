/**
 * Funções de formatação e máscaras para campos de formulário
 */

/**
 * Formata CPF: 000.000.000-00
 */
export function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 3) return numbers
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
  if (numbers.length <= 9)
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
}

/**
 * Remove formatação do CPF
 */
export function unformatCPF(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Valida CPF
 */
export function validateCPF(cpf: string): boolean {
  const cleanCPF = unformatCPF(cpf)
  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleanCPF.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleanCPF.charAt(10))) return false

  return true
}

/**
 * Formata telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 2) return numbers.length > 0 ? `(${numbers}` : ''
  if (numbers.length <= 6)
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  if (numbers.length <= 10)
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
}

/**
 * Remove formatação do telefone
 */
export function unformatPhone(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Formata RG: 00.000.000-0
 */
export function formatRG(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
  if (numbers.length <= 8)
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}-${numbers.slice(8, 9)}`
}

/**
 * Remove formatação do RG
 */
export function unformatRG(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Formata CEP: 00000-000
 */
export function formatCEP(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 5) return numbers
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`
}

/**
 * Formata CRM: 000000 ou 000000-XX/UF
 * Aceita apenas números, formata como 000000-XX/UF quando tem mais de 6 dígitos
 */
export function formatCRM(value: string): string {
  // Remove tudo exceto números e letras (para permitir UF)
  const cleaned = value.replace(/[^0-9A-Za-z]/g, '')
  
  // Se tem apenas números e até 6 dígitos, retorna como está
  if (/^\d{1,6}$/.test(cleaned)) {
    return cleaned
  }
  
  // Se tem mais de 6 dígitos, tenta formatar como 000000-XX/UF
  // Formato: números seguidos de hífen, 2 letras, barra, 2 letras
  const match = cleaned.match(/^(\d{1,6})([A-Za-z]{0,2})\/?([A-Za-z]{0,2})$/)
  
  if (match) {
    const [, numbers, middle, uf] = match
    let formatted = numbers
    if (middle) {
      formatted += `-${middle}`
      if (uf) {
        formatted += `/${uf}`
      }
    } else if (cleaned.length > 6 && /^\d+$/.test(cleaned)) {
      // Se tem apenas números e mais de 6, formata como 000000-XX
      formatted = `${cleaned.slice(0, 6)}-${cleaned.slice(6, 8)}`
    }
    return formatted.toUpperCase()
  }
  
  // Se não corresponde ao padrão, retorna apenas os primeiros números
  const numbers = cleaned.replace(/\D/g, '')
  if (numbers.length <= 6) return numbers
  return `${numbers.slice(0, 6)}-${numbers.slice(6, 8)}`
}

/**
 * Remove formatação do CRM
 */
export function unformatCRM(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, '')
}

/**
 * Remove formatação do CEP
 */
export function unformatCEP(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Formata CNPJ: 00.000.000/0000-00
 */
export function formatCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 14)
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
  if (numbers.length <= 8)
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
  if (numbers.length <= 12)
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`
}

/**
 * Remove formatação do CNPJ
 */
export function unformatCNPJ(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Formata data: dd/mm/yyyy
 */
export function formatDate(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
}

/**
 * Converte data formatada para formato ISO (yyyy-mm-dd)
 */
export function formatDateToISO(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length < 8) return ''
  const day = numbers.slice(0, 2)
  const month = numbers.slice(2, 4)
  const year = numbers.slice(4, 8)
  return `${year}-${month}-${day}`
}

/**
 * Converte data ISO para formato brasileiro (dd/mm/yyyy)
 */
export function formatDateFromISO(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Formata valor monetário: R$ 0,00
 */
export function formatCurrency(value: string | number): string {
  if (!value) return 'R$ 0,00'
  const numValue =
    typeof value === 'string'
      ? parseFloat(value.replace(/\D/g, '')) / 100 || 0
      : value || 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue)
}

/**
 * Remove formatação de valor monetário
 */
export function unformatCurrency(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Hook para aplicar máscara em input
 */
export function useMask(
  mask: (value: string) => string,
  unformat?: (value: string) => string
) {
  return {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = mask(e.target.value)
      e.target.value = formatted
    },
    onBlur: unformat
      ? (e: React.FocusEvent<HTMLInputElement>) => {
          // Manter formato visual, mas salvar sem formatação se necessário
        }
      : undefined,
  }
}

