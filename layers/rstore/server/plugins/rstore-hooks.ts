import { allowTables, defineNitroPlugin, tables } from '#imports'

export default defineNitroPlugin(() => {
  allowTables([
    tables.todos,
  ])
})
