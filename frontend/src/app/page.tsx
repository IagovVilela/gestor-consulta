import Link from 'next/link'
import { CompanyContact } from '@/components/brand/CompanyContact'
import { Button } from '@/components/ui/button'
import { COMPANY } from '@/lib/company'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-white">
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Gestor de Consultas Médicas</h1>
        <p className="text-lg text-slate-300">
          Plataforma desenvolvida por {COMPANY.name}
        </p>
        <Button asChild className="mt-4">
          <Link href="/login">Acessar o sistema</Link>
        </Button>
      </div>

      <CompanyContact className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-white [&_p]:text-white [&_a]:text-slate-300 [&_a:hover]:text-white [&_.text-muted-foreground]:text-slate-400" />
    </main>
  )
}
