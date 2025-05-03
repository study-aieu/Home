import { pgTable, text, serial, integer, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Content preferences schema
export const contentPreferencesSchema = z.object({
  length: z.enum(["Short (250 words)", "Medium (500 words)", "Long (1000+ words)"]),
  style: z.enum(["Academic", "Informative", "Creative", "Persuasive"]),
});

export type ContentPreferences = z.infer<typeof contentPreferencesSchema>;

// Generated content table
export const contents = pgTable("contents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  topic: text("topic").notNull(),
  prompt: text("prompt").default(""),
  humanLikeScore: integer("human_like_score").notNull(),
  preferences: json("preferences").$type<ContentPreferences>().notNull(),
  improvedFrom: integer("improved_from"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Content insert schema
export const contentInsertSchema = createInsertSchema(contents);
export type ContentInsert = z.infer<typeof contentInsertSchema>;

// Content select schema
export const contentSelectSchema = createSelectSchema(contents);
export type Content = z.infer<typeof contentSelectSchema>;
export type ContentWithId = typeof contents.$inferSelect;

// Content relations
export const contentsRelations = relations(contents, ({ one }) => ({
  improvedFromContent: one(contents, {
    fields: [contents.improvedFrom],
    references: [contents.id],
  }),
}));

// Request schemas
export const contentGenerationSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  details: z.string().optional(),
  preferences: contentPreferencesSchema,
});

export const contentImprovementSchema = z.object({
  contentId: z.number().optional(),
});
