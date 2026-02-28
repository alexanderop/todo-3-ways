import { eq } from 'drizzle-orm'
import { createError, defineEventHandler, readBody } from 'h3'
import * as Y from 'yjs'
import { todos, useDrizzle } from '../../../shared/server/utils/drizzle'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ update: number[] }>(event)
  if (!body.update) {
    throw createError({ statusCode: 400, statusMessage: 'Missing update' })
  }

  const doc = new Y.Doc()
  Y.applyUpdate(doc, new Uint8Array(body.update))

  const todosMap = doc.getMap<Y.Map<unknown>>('todos')
  const db = useDrizzle()

  db.transaction((tx) => {
    todosMap.forEach((yMap) => {
      const title = String(yMap.get('title') ?? '')
      const completed = Number(yMap.get('completed') ?? 0)
      const createdAt = Number(yMap.get('createdAt') ?? 0)

      const existing = tx.select().from(todos).where(eq(todos.title, title)).get()
      if (existing) {
        tx.update(todos).set({ completed }).where(eq(todos.id, existing.id)).run()
        return
      }

      tx.insert(todos).values({
        title,
        completed,
        createdAt: new Date(createdAt),
      }).run()
    })
  })

  doc.destroy()
  return { ok: true }
})
