import postgres from 'postgres'
import { getDatabaseUrl } from '@/server/db/config'

export type SqlValue = string | number | null
type SqlClient = ReturnType<typeof postgres>
type UnsafeClient = Pick<SqlClient, 'unsafe'>
type DbExecutor = {
  queryAll<T>(query: string, params?: SqlValue[]): Promise<T[]>
  queryFirst<T>(query: string, params?: SqlValue[]): Promise<T | null>
  execute(query: string, params?: SqlValue[]): Promise<void>
}

const globalForPostgres = globalThis as typeof globalThis & {
  portfolioSql?: SqlClient
}

function getSqlClient(): SqlClient {
  const databaseUrl = getDatabaseUrl()

  if (!databaseUrl) {
    throw new Error(
      'Supabase database is not configured. Set DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL.',
    )
  }

  if (!globalForPostgres.portfolioSql) {
    globalForPostgres.portfolioSql = postgres(databaseUrl, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 30,
    })
  }

  return globalForPostgres.portfolioSql
}

function normalizeQueryPlaceholders(query: string): string {
  let index = 0

  return query.replace(/\?/g, () => {
    index += 1
    return `$${index}`
  })
}

function createExecutor(client: UnsafeClient): DbExecutor {
  return {
    async queryAll<T>(query: string, params: SqlValue[] = []): Promise<T[]> {
      return client.unsafe<T[]>(normalizeQueryPlaceholders(query), params)
    },
    async queryFirst<T>(query: string, params: SqlValue[] = []): Promise<T | null> {
      const rows = await client.unsafe<T[]>(normalizeQueryPlaceholders(query), params)
      return rows[0] ?? null
    },
    async execute(query: string, params: SqlValue[] = []): Promise<void> {
      await client.unsafe(normalizeQueryPlaceholders(query), params)
    },
  }
}

export async function queryAll<T>(query: string, params: SqlValue[] = []): Promise<T[]> {
  return createExecutor(getSqlClient()).queryAll<T>(query, params)
}

export async function queryFirst<T>(query: string, params: SqlValue[] = []): Promise<T | null> {
  return createExecutor(getSqlClient()).queryFirst<T>(query, params)
}

export async function execute(query: string, params: SqlValue[] = []): Promise<void> {
  await createExecutor(getSqlClient()).execute(query, params)
}

export async function transaction<T>(work: (executor: DbExecutor) => Promise<T>): Promise<T> {
  const sql = getSqlClient()

  return sql.begin(async (transactionSql) => {
    const executor = createExecutor(transactionSql)
    return work(executor)
  }) as Promise<T>
}
