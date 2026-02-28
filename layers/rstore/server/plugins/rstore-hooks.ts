import { allowTables, defineNitroPlugin, rstoreDrizzleHooks, tables } from '#imports'

export default defineNitroPlugin(() => {
  allowTables([
    tables.todos,
  ])

  // Strip negative temp IDs and coerce integer timestamps to Date for Drizzle
  rstoreDrizzleHooks.hook('index.post.before', ({ body }) => {
    if (typeof body.id === 'number' && body.id < 0)
      delete body.id
    if (typeof body.createdAt === 'number')
      body.createdAt = new Date(body.createdAt * 1000)
    if (typeof body.updatedAt === 'number')
      body.updatedAt = new Date(body.updatedAt * 1000)
  })

  // Auto-set updatedAt on PATCH so the offline sync's gte("updatedAt") filter works
  rstoreDrizzleHooks.hook('item.patch.before', ({ body }) => {
    body.updatedAt = new Date()
  })
})
