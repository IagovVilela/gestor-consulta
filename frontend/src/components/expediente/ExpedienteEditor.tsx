'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const DIAS_SEMANA = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
] as const

export interface ExpedienteItem {
  diaSemana: number
  horaInicio: string
  horaFim: string
  duracaoConsulta: number
  ativo: boolean
}

export function defaultExpedienteClinica(): ExpedienteItem[] {
  return DIAS_SEMANA.map((dia) => ({
    diaSemana: dia.value,
    horaInicio: dia.value === 6 ? '08:00' : '08:00',
    horaFim: dia.value === 6 ? '12:00' : dia.value === 0 ? '12:00' : '18:00',
    duracaoConsulta: 30,
    ativo: dia.value !== 0,
  }))
}

export function defaultExpedienteVazio(): ExpedienteItem[] {
  return DIAS_SEMANA.map((dia) => ({
    diaSemana: dia.value,
    horaInicio: '08:00',
    horaFim: '18:00',
    duracaoConsulta: 30,
    ativo: false,
  }))
}

export function fromApiExpediente(
  itens: Array<{
    diaSemana: number
    horaInicio: string
    horaFim: string
    duracaoConsulta?: number
  }>,
  fallback: ExpedienteItem[],
): ExpedienteItem[] {
  return fallback.map((base) => {
    const found = itens.find((item) => item.diaSemana === base.diaSemana)
    if (!found) {
      return { ...base, ativo: false }
    }
    return {
      diaSemana: found.diaSemana,
      horaInicio: found.horaInicio,
      horaFim: found.horaFim,
      duracaoConsulta: found.duracaoConsulta || 30,
      ativo: true,
    }
  })
}

export function toApiExpediente(itens: ExpedienteItem[]) {
  return itens
    .filter((item) => item.ativo)
    .map(({ diaSemana, horaInicio, horaFim, duracaoConsulta }) => ({
      diaSemana,
      horaInicio,
      horaFim,
      duracaoConsulta,
    }))
}

interface ExpedienteEditorProps {
  value: ExpedienteItem[]
  onChange: (value: ExpedienteItem[]) => void
  title?: string
  description?: string
}

export function ExpedienteEditor({
  value,
  onChange,
  title = 'Expediente',
  description,
}: ExpedienteEditorProps) {
  const updateDay = (diaSemana: number, patch: Partial<ExpedienteItem>) => {
    onChange(
      value.map((item) =>
        item.diaSemana === diaSemana ? { ...item, ...patch } : item,
      ),
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="space-y-3">
        {DIAS_SEMANA.map((dia) => {
          const item = value.find((v) => v.diaSemana === dia.value) || {
            diaSemana: dia.value,
            horaInicio: '08:00',
            horaFim: '18:00',
            duracaoConsulta: 30,
            ativo: false,
          }

          return (
            <div
              key={dia.value}
              className="grid gap-3 rounded-lg border p-3 md:grid-cols-[140px_1fr_1fr_120px_auto] md:items-end"
            >
              <div className="flex items-center gap-2">
                <input
                  id={`dia-${dia.value}`}
                  type="checkbox"
                  checked={item.ativo}
                  onChange={(e) =>
                    updateDay(dia.value, { ativo: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor={`dia-${dia.value}`}>{dia.label}</Label>
              </div>

              <div className="space-y-1">
                <Label>Início</Label>
                <Input
                  type="time"
                  disabled={!item.ativo}
                  value={item.horaInicio}
                  onChange={(e) =>
                    updateDay(dia.value, { horaInicio: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Fim</Label>
                <Input
                  type="time"
                  disabled={!item.ativo}
                  value={item.horaFim}
                  onChange={(e) =>
                    updateDay(dia.value, { horaFim: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  min={5}
                  max={240}
                  step={5}
                  disabled={!item.ativo}
                  value={item.duracaoConsulta}
                  onChange={(e) =>
                    updateDay(dia.value, {
                      duracaoConsulta: Number(e.target.value) || 30,
                    })
                  }
                />
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={!item.ativo}
                onClick={() =>
                  updateDay(dia.value, {
                    horaInicio: '08:00',
                    horaFim: dia.value === 6 ? '12:00' : '18:00',
                    duracaoConsulta: 30,
                  })
                }
              >
                Padrão
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
