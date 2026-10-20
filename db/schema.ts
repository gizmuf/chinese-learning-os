import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
export const learningEvents = sqliteTable(
  "learning_events",
  {
    userId: text("user_id").notNull(),
    id: text("id").notNull(),
    itemId: text("item_id").notNull(),
    at: integer("at").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index("events_user_at").on(t.userId, t.at),
  ],
);
