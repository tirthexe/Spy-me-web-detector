import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const accessLogs = pgTable("access_logs", {
  id: serial("id").primaryKey(),
  app: text("app").notNull(),
  type: text("type").notNull(), // 'microphone' or 'camera'
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  firebaseId: text("firebase_id"), // Firebase document ID
});

export const monitoringStatus = pgTable("monitoring_status", {
  id: serial("id").primaryKey(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).pick({
  app: true,
  type: true,
  firebaseId: true,
});

export const insertMonitoringStatusSchema = createInsertSchema(monitoringStatus).pick({
  isEnabled: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type MonitoringStatus = typeof monitoringStatus.$inferSelect;
export type InsertMonitoringStatus = z.infer<typeof insertMonitoringStatusSchema>;
