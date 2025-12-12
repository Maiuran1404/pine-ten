import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  pgEnum,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["CLIENT", "FREELANCER", "ADMIN"]);
export const taskStatusEnum = pgEnum("task_status", [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "REVISION_REQUESTED",
  "COMPLETED",
  "CANCELLED",
]);
export const taskCategoryEnum = pgEnum("task_category", [
  "STATIC_ADS",
  "VIDEO_MOTION",
  "SOCIAL_MEDIA",
]);
export const freelancerStatusEnum = pgEnum("freelancer_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
]);
export const notificationChannelEnum = pgEnum("notification_channel", [
  "EMAIL",
  "WHATSAPP",
  "IN_APP",
]);

// Users table (BetterAuth compatible)
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("CLIENT"),
  phone: text("phone"),
  credits: integer("credits").notNull().default(0),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  onboardingData: jsonb("onboarding_data"),
  notificationPreferences: jsonb("notification_preferences"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// BetterAuth sessions table
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

// BetterAuth accounts table
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// BetterAuth verifications table
export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Freelancer profiles
export const freelancerProfiles = pgTable("freelancer_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  status: freelancerStatusEnum("status").notNull().default("PENDING"),
  skills: jsonb("skills").$type<string[]>().default([]),
  specializations: jsonb("specializations").$type<string[]>().default([]),
  portfolioUrls: jsonb("portfolio_urls").$type<string[]>().default([]),
  bio: text("bio"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  completedTasks: integer("completed_tasks").notNull().default(0),
  whatsappNumber: text("whatsapp_number"),
  availability: boolean("availability").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Task categories (admin-editable)
export const taskCategories = pgTable("task_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  baseCredits: integer("base_credits").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tasks
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  freelancerId: text("freelancer_id").references(() => users.id),
  categoryId: uuid("category_id").references(() => taskCategories.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: taskStatusEnum("status").notNull().default("PENDING"),
  requirements: jsonb("requirements"),
  styleReferences: jsonb("style_references").$type<string[]>().default([]),
  chatHistory: jsonb("chat_history").$type<object[]>().default([]),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  creditsUsed: integer("credits_used").notNull().default(1),
  maxRevisions: integer("max_revisions").notNull().default(2),
  revisionsUsed: integer("revisions_used").notNull().default(0),
  priority: integer("priority").notNull().default(0),
  deadline: timestamp("deadline"),
  assignedAt: timestamp("assigned_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Task files
export const taskFiles = pgTable("task_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => users.id),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  isDeliverable: boolean("is_deliverable").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Task messages (for communication between client and freelancer)
export const taskMessages = pgTable("task_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Style references (for AI chat suggestions)
export const styleReferences = pgTable("style_references", {
  id: uuid("id").defaultRandom().primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  usageCount: integer("usage_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  relatedTaskId: uuid("related_task_id").references(() => tasks.id),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  status: text("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Credit transactions
export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // PURCHASE, USAGE, REFUND, BONUS
  description: text("description"),
  relatedTaskId: uuid("related_task_id").references(() => tasks.id),
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Platform settings (admin-configurable)
export const platformSettings = pgTable("platform_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  freelancerProfile: one(freelancerProfiles, {
    fields: [users.id],
    references: [freelancerProfiles.userId],
  }),
  sessions: many(sessions),
  accounts: many(accounts),
  clientTasks: many(tasks, { relationName: "clientTasks" }),
  freelancerTasks: many(tasks, { relationName: "freelancerTasks" }),
  notifications: many(notifications),
  creditTransactions: many(creditTransactions),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  client: one(users, {
    fields: [tasks.clientId],
    references: [users.id],
    relationName: "clientTasks",
  }),
  freelancer: one(users, {
    fields: [tasks.freelancerId],
    references: [users.id],
    relationName: "freelancerTasks",
  }),
  category: one(taskCategories, {
    fields: [tasks.categoryId],
    references: [taskCategories.id],
  }),
  files: many(taskFiles),
  messages: many(taskMessages),
}));

export const freelancerProfilesRelations = relations(freelancerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [freelancerProfiles.userId],
    references: [users.id],
  }),
}));

export const taskFilesRelations = relations(taskFiles, ({ one }) => ({
  task: one(tasks, {
    fields: [taskFiles.taskId],
    references: [tasks.id],
  }),
  uploader: one(users, {
    fields: [taskFiles.uploadedBy],
    references: [users.id],
  }),
}));

export const taskMessagesRelations = relations(taskMessages, ({ one }) => ({
  task: one(tasks, {
    fields: [taskMessages.taskId],
    references: [tasks.id],
  }),
  sender: one(users, {
    fields: [taskMessages.senderId],
    references: [users.id],
  }),
}));
