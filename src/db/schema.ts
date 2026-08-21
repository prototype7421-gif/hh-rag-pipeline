import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    transcript: text("transcript").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("documents_created_at_idx").on(table.createdAt)]
);

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    chunkIndex: text("chunk_index").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("chunks_document_id_idx").on(table.documentId)]
);
