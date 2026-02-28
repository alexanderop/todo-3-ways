import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const db = useDrizzle()
  return db.update(todos)
    .set({ completed: body.completed })
    .where(eq(todos.id, id))
    .returning()
    .get()
})
