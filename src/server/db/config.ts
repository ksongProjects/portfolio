export function getDatabaseUrl(): string | null {
  const candidates = [
    process.env.SUPABASE_DB_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
  ]

  for (const candidate of candidates) {
    if (!candidate) {
      continue
    }

    const trimmed = candidate.trim()

    if (!trimmed) {
      continue
    }

    if (trimmed.startsWith('file:')) {
      continue
    }

    if (!/^postgres(ql)?:\/\//i.test(trimmed)) {
      continue
    }

    return trimmed
  }

  return null
}

export function isDatabaseConfigured(): boolean {
  return getDatabaseUrl() !== null
}
