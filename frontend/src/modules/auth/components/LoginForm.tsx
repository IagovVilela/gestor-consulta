'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductLogo } from '@/components/brand/ProductLogo'
import { PRODUCT } from '@/lib/company'
import { useAuthStore } from '@/lib/store/auth-store'
import api from '@/lib/axios'

const loginSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').refine(
    (val) => {
      // Validação mais flexível: aceita formato simples como iago@iago
      return val.includes('@') && val.length > 3
    },
    { message: 'Email inválido' }
  ),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('Enviando login...', data.email)
      const response = await api.post('/auth/login', data)
      console.log('Resposta recebida:', response.status, response.data)

      const { access_token, user, clinica } = response.data

      if (!access_token) {
        throw new Error('Token não recebido do servidor')
      }

      if (!user) {
        throw new Error('Dados do usuário não recebidos')
      }

      console.log('Dados recebidos:', { 
        user: user.email, 
        role: user.role, 
        hasToken: !!access_token,
        clinica: clinica?.nome 
      })

      // Salvar token no localStorage
      localStorage.setItem('token', access_token)
      console.log('Token salvo no localStorage')

      // ADMIN não deve ter clínica vinculada
      const isUserAdmin = user.role?.toUpperCase() === 'ADMIN'
      const clinicaToSave = isUserAdmin ? null : (clinica || null)
      
      // Salvar autenticação no Zustand (sem clínica se for ADMIN)
      setAuth(user, access_token, clinicaToSave)
      console.log('Estado salvo no Zustand', { isAdmin: isUserAdmin, hasClinica: !!clinicaToSave })

      // Aguardar um pouco para garantir persistência
      await new Promise(resolve => setTimeout(resolve, 500))

      // Verificar se foi salvo
      const savedToken = localStorage.getItem('token')
      console.log('Token verificado:', savedToken ? 'SIM' : 'NAO')

      if (!savedToken) {
        throw new Error('Falha ao salvar autenticação')
      }

      // Determinar URL de redirecionamento
      const role = (user.role || 'SECRETARIA').toUpperCase()
      const redirectUrl =
        role === 'ADMIN' ? '/admin' : role === 'MEDICO' ? '/dashboard' : '/agenda'
      
      console.log('Redirecionando para:', redirectUrl, 'com role:', role)
      
      // Forçar redirecionamento usando window.location
      // Isso força um reload completo da página
      window.location.replace(redirectUrl)
      
    } catch (err: any) {
      console.error('Erro completo no login:', err)
      console.error('Erro response:', err.response)
      console.error('Erro message:', err.message)
      
      const errorMessage = 
        err.response?.data?.message || 
        err.response?.data?.error ||
        err.message || 
        'Erro ao fazer login. Verifique suas credenciais.'
      
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <ProductLogo variant="full" priority className="h-[4.5rem]" />
        </div>
        <div className="space-y-1.5 text-center">
          <CardTitle>Entrar no {PRODUCT.name}</CardTitle>
          <CardDescription>
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

