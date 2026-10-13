import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Fotos de produto enviadas pela mãe (presentes e itens do Enxoval). A foto é da conta; o item
 * aponta para ela por `photo_key`. O arquivo fica em disco como `<key>.webp`, e a chave aleatória
 * é o único jeito de chegar a ele.
 */
export const MEDIA_KEY_PATTERN = /^[a-f0-9]{32}$/;

export const mediaFiles = pgTable(
  "media_files",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    key: text("key").notNull().unique(),
    /** Tamanho do arquivo já tratado; a soma por conta é o que conta para o limite. */
    bytes: integer("bytes").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("media_files_user_id_idx").on(table.userId)],
);

export type MediaFile = typeof mediaFiles.$inferSelect;
