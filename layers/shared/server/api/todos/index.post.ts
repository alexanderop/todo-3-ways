import { defineEventHandler, readBody } from 'h3'
import { todos, useDrizzle } from '../../utils/drizzle'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = useDrizzle()
  return db.insert(todos).values({
    title: body.title,
    completed: 0,
  }).returning().get()
})
