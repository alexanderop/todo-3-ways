import { defineEventHandler } from 'h3'
import { todos, useDrizzle } from '../../utils/drizzle'

export default defineEventHandler(async () => {
  const db = useDrizzle()
  return db.select().from(todos).all()
})
