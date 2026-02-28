import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../database/schema'

export const tables = schema
export { todos } from '../database/schema'

const sqlite = new Database('./db.sqlite')

let drizzleInstance: ReturnType<typeof drizzle> | null = null

export function useDrizzle() {
  drizzleInstance ??= drizzle(sqlite, { schema })
  return drizzleInstance
}
