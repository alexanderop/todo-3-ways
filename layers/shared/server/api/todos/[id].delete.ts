import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDrizzle()
  await db.delete(todos).where(eq(todos.id, id))
  return { success: true }
})
