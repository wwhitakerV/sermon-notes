import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

type DbType = ReturnType<typeof create>

let cached: DbType | null = null

function create() {
	const connectionString = process.env.DATABASE_URL

	if (!connectionString) {
		throw new Error(
			'DATABASE_URL is not set. Add your Neon connection string to .env.',
		)
	}

	return drizzle(neon(connectionString), { schema })
}

/**
 * Resolved on first use rather than at import time, so a missing
 * `DATABASE_URL` surfaces as a request-time error instead of breaking the
 * build for routes that never touch the database.
 */
export function getDb(): DbType {
	cached ??= create()

	return cached
}

export * from './schema'
