/**
 * Normaliza URLs de mídia (logos/anexos) para funcionar em local e produção.
 * Converte URLs absolutas do backend (ex.: localhost) em paths relativos
 * que passam pelo rewrite /api do Next.
 */
export function normalizeMediaUrl(url?: string | null): string | null {
  if (!url) return null

  const trimmed = url.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('/')) {
    return trimmed
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.pathname.startsWith('/api/uploads/')) {
      return parsed.pathname
    }
    return trimmed
  } catch {
    return trimmed
  }
}
