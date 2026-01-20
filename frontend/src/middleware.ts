import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Rotas que sempre devem ser permitidas
  const publicRoutes = ['/login', '/logout', '/api', '/_next', '/favicon.ico']
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  )

  // Sempre permitir rotas públicas
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Para outras rotas, deixar o cliente verificar autenticação
  // O middleware não bloqueia, deixa o componente decidir
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
