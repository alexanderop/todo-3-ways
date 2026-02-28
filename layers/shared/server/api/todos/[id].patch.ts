import { eq } from 'drizzle-orm'
import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { todos, useDrizzle } from '../../utils/drizzle'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const db = useDrizzle()
  return db.update(todos)
    .set({ completed: body.completed, updatedAt: new Date() })
    .where(eq(todos.id, id))
    .returning()
    .get()
})
