import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './layers/shared/server/database/schema.ts',
  out: './layers/shared/server/database/migrations',
  dbCredentials: {
    url: './db.sqlite',
  },
})
