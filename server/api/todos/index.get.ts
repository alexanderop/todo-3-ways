export default defineEventHandler(async () => {
  const db = useDrizzle()
  return db.select().from(todos).all()
})
