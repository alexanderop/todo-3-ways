import { eq } from 'drizzle-orm'
import { defineEventHandler, getRouterParam } from 'h3'
import { todos, useDrizzle } from '../../utils/drizzle'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDrizzle()
  await db.delete(todos).where(eq(todos.id, id))
  return { success: true }
})
