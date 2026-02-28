import {
  Events,
  makeSchema,
  Schema,
  State,
} from '@livestore/livestore'

// SQLite tables (derived state)
export const tables = {
  todos: State.SQLite.table({
    name: 'todos',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      title: State.SQLite.text({ default: '' }),
      completed: State.SQLite.boolean({ default: false }),
      deletedAt: State.SQLite.integer({ nullable: true }),
      createdAt: State.SQLite.integer({ default: 0 }),
    },
  }),
}

// Events (source of truth)
export const events = {
  todoCreated: Events.synced({
    name: 'v1.TodoCreated',
    schema: Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      createdAt: Schema.Number,
    }),
  }),
  todoCompleted: Events.synced({
    name: 'v1.TodoCompleted',
    schema: Schema.Struct({ id: Schema.String }),
  }),
  todoUncompleted: Events.synced({
    name: 'v1.TodoUncompleted',
    schema: Schema.Struct({ id: Schema.String }),
  }),
  todoDeleted: Events.synced({
    name: 'v1.TodoDeleted',
    schema: Schema.Struct({
      id: Schema.String,
      deletedAt: Schema.Number,
    }),
  }),
}

// Materializers (event → SQL state)
const materializers = State.SQLite.materializers(events, {
  'v1.TodoCreated': ({ id, title, createdAt }) =>
    tables.todos.insert({ id, title, createdAt }),
  'v1.TodoCompleted': ({ id }) =>
    tables.todos.update({ completed: true }).where({ id }),
  'v1.TodoUncompleted': ({ id }) =>
    tables.todos.update({ completed: false }).where({ id }),
  'v1.TodoDeleted': ({ id, deletedAt }) =>
    tables.todos.update({ deletedAt }).where({ id }),
})

const state = State.SQLite.makeState({ tables, materializers })
export const schema = makeSchema({ events, state })
