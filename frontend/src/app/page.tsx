import Link from 'next/link'
import { CompanyContact } from '@/components/brand/CompanyContact'
import { ProductLogo } from '@/components/brand/ProductLogo'
import { Button } from '@/components/ui/button'
import { COMPANY, PRODUCT } from '@/lib/company'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-white">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="overflow-visible rounded-2xl bg-white px-6 py-5 shadow-lg shadow-black/20">
          <ProductLogo variant="full" priority className="h-20" />
        </div>
        <p className="max-w-md text-lg text-slate-300">
          {PRODUCT.tagline}
        </p>
        <p className="text-sm text-slate-400">
          Plataforma desenvolvida por {COMPANY.name}
        </p>
        <Button asChild className="mt-1">
          <Link href="/login">Acessar o sistema</Link>
        </Button>
      </div>

      <CompanyContact className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-white [&_p]:text-white [&_a]:text-slate-300 [&_a:hover]:text-white [&_.text-muted-foreground]:text-slate-400" />
    </main>
  )
}
