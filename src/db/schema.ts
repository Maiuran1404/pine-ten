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
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["CLIENT", "FREELANCER", "ADMIN"]);
export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING_ADMIN_REVIEW",
  "IN_REVIEW",
  "REVISION_REQUESTED",
  "COMPLETED",
  "CANCELLED",
]);
export const taskCategoryEnum = pgEnum("task_category", [
  "STATIC_ADS",
  "VIDEO_MOTION",
  "SOCIAL_MEDIA",
  "UI_UX",
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
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("CLIENT"),
    phone: text("phone"),
    credits: integer("credits").notNull().default(0),
    companyId: uuid("company_id"),
    onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
    onboardingData: jsonb("onboarding_data"),
    notificationPreferences: jsonb("notification_preferences"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_role_idx").on(table.role),
  ]
);

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

// Companies table (for brand information)
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
  industry: text("industry"),
  description: text("description"),
  // Brand identity
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  accentColor: text("accent_color"),
  backgroundColor: text("background_color"),
  textColor: text("text_color"),
  // Additional brand colors as array
  brandColors: jsonb("brand_colors").$type<string[]>().default([]),
  // Typography
  primaryFont: text("primary_font"),
  secondaryFont: text("secondary_font"),
  // Social media & contact
  socialLinks: jsonb("social_links").$type<{
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  }>(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  // Brand assets
  brandAssets: jsonb("brand_assets").$type<{
    images?: string[];
    documents?: string[];
  }>(),
  // Extracted metadata
  tagline: text("tagline"),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  // Onboarding status
  onboardingStatus: onboardingStatusEnum("onboarding_status").notNull().default("NOT_STARTED"),
  // Timestamps
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
export const tasks = pgTable(
  "tasks",
  {
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
  },
  (table) => [
    index("tasks_client_id_idx").on(table.clientId),
    index("tasks_freelancer_id_idx").on(table.freelancerId),
    index("tasks_status_idx").on(table.status),
    index("tasks_created_at_idx").on(table.createdAt),
    index("tasks_client_status_idx").on(table.clientId, table.status),
  ]
);

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
  category: text("category").notNull(), // e.g., "static_ads", "video_motion", "social_media", "ui_ux"
  name: text("name").notNull(),
  description: text("description"), // Short description shown under the style card
  imageUrl: text("image_url").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  usageCount: integer("usage_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Brand references (for onboarding inspiration matching)
export const brandReferences = pgTable("brand_references", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),

  // Bucket dimensions (mapped from personality sliders)
  toneBucket: text("tone_bucket").notNull(), // "playful" | "balanced" | "serious"
  energyBucket: text("energy_bucket").notNull(), // "bold" | "balanced" | "minimal"

  // Color characteristics
  colorBucket: text("color_bucket").notNull(), // "warm" | "cool" | "neutral" | "vibrant" | "muted"
  colorSamples: jsonb("color_samples").$type<string[]>().default([]), // hex values

  // Categorical
  visualStyles: jsonb("visual_styles").$type<string[]>().default([]), // matches 12 visual style options
  industries: jsonb("industries").$type<string[]>().default([]),

  // Metadata
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Deliverable style references (for chat style suggestions)
export const deliverableStyleReferences = pgTable(
  "deliverable_style_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url").notNull(),

    // Primary categorization
    deliverableType: text("deliverable_type").notNull(),
    // Values: instagram_post, instagram_story, instagram_reel, linkedin_post,
    //         linkedin_banner, facebook_ad, twitter_post, youtube_thumbnail,
    //         email_header, presentation_slide, web_banner, static_ad, video_ad

    // Style navigation
    styleAxis: text("style_axis").notNull(),
    // Values: minimal, bold, editorial, corporate, playful, premium, organic, tech

    subStyle: text("sub_style"), // optional depth

    // Rich metadata for AI enhancement
    semanticTags: jsonb("semantic_tags").$type<string[]>().default([]),

    // Ordering
    featuredOrder: integer("featured_order").notNull().default(0),
    displayOrder: integer("display_order").notNull().default(0),

    // Tracking
    isActive: boolean("is_active").notNull().default(true),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("dsr_type_style_idx").on(table.deliverableType, table.styleAxis),
    index("dsr_type_active_idx").on(table.deliverableType, table.isActive),
  ]
);

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
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  sessions: many(sessions),
  accounts: many(accounts),
  clientTasks: many(tasks, { relationName: "clientTasks" }),
  freelancerTasks: many(tasks, { relationName: "freelancerTasks" }),
  notifications: many(notifications),
  creditTransactions: many(creditTransactions),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  members: many(users),
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

// Chat drafts (in-progress task requests)
export const chatDrafts = pgTable("chat_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Request"),
  messages: jsonb("messages").$type<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    attachments?: {
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    }[];
  }[]>().default([]),
  selectedStyles: jsonb("selected_styles").$type<string[]>().default([]),
  pendingTask: jsonb("pending_task").$type<{
    title: string;
    description: string;
    category: string;
    estimatedHours: number;
    deliveryDays?: number;
    creditsRequired: number;
  } | null>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const chatDraftsRelations = relations(chatDrafts, ({ one }) => ({
  client: one(users, {
    fields: [chatDrafts.clientId],
    references: [users.id],
  }),
}));

// Webhook events for idempotency
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: text("event_id").notNull().unique(), // Stripe event ID
    eventType: text("event_type").notNull(),
    provider: text("provider").notNull().default("stripe"),
    payload: jsonb("payload"), // Store the full event for debugging
    processedAt: timestamp("processed_at").notNull().defaultNow(),
    status: text("status").notNull().default("processed"), // processed, failed
    errorMessage: text("error_message"),
  },
  (table) => [
    index("webhook_events_event_id_idx").on(table.eventId),
    index("webhook_events_processed_at_idx").on(table.processedAt),
  ]
);

// Notification settings (admin-configurable)
export const notificationSettings = pgTable("notification_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: text("event_type").notNull().unique(), // e.g., TASK_ASSIGNED, TASK_STARTED, TASK_COMPLETED
  name: text("name").notNull(), // Human-readable name
  description: text("description"), // Description of when this fires
  // Channel toggles
  emailEnabled: boolean("email_enabled").notNull().default(true),
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(true),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  // Recipients
  notifyClient: boolean("notify_client").notNull().default(false),
  notifyFreelancer: boolean("notify_freelancer").notNull().default(false),
  notifyAdmin: boolean("notify_admin").notNull().default(false),
  // Templates (JSON for flexibility)
  emailSubject: text("email_subject"),
  emailTemplate: text("email_template"), // HTML template with {{variables}}
  whatsappTemplate: text("whatsapp_template"), // Plain text with {{variables}}
  // Metadata
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => users.id),
});

// Orshot template presets (admin-configurable)
export const orshotTemplates = pgTable(
  "orshot_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(), // 'social_media', 'marketing', 'brand_assets'
    orshotTemplateId: integer("orshot_template_id").notNull(), // Orshot Studio template ID
    previewImageUrl: text("preview_image_url"), // Preview thumbnail for selector
    parameterMapping: jsonb("parameter_mapping")
      .notNull()
      .$type<{
        [brandField: string]: {
          paramId: string;
          type: "text" | "color" | "image" | "number";
          style?: {
            fontSize?: string;
            fontFamily?: string;
            fontWeight?: string;
            textAlign?: string;
          };
        };
      }>(),
    outputFormat: text("output_format").notNull().default("png"), // 'png', 'jpg', 'webp', 'pdf'
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("orshot_templates_category_idx").on(table.category)]
);

// Generated designs (client history)
export const generatedDesigns = pgTable(
  "generated_designs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => orshotTemplates.id, {
      onDelete: "set null",
    }),
    templateName: text("template_name").notNull(), // Store name in case template is deleted
    imageUrl: text("image_url").notNull(),
    imageFormat: text("image_format").notNull(),
    modificationsUsed: jsonb("modifications_used").$type<
      Record<string, unknown>
    >(), // Store what values were used
    savedToAssets: boolean("saved_to_assets").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("generated_designs_client_id_idx").on(table.clientId),
    index("generated_designs_created_at_idx").on(table.createdAt),
  ]
);

// Orshot templates relations
export const orshotTemplatesRelations = relations(
  orshotTemplates,
  ({ many }) => ({
    generatedDesigns: many(generatedDesigns),
  })
);

// Generated designs relations
export const generatedDesignsRelations = relations(
  generatedDesigns,
  ({ one }) => ({
    client: one(users, {
      fields: [generatedDesigns.clientId],
      references: [users.id],
    }),
    template: one(orshotTemplates, {
      fields: [generatedDesigns.templateId],
      references: [orshotTemplates.id],
    }),
  })
);

// ============================================
// Security Testing Tables
// ============================================

// Security test status enum
export const securityTestStatusEnum = pgEnum("security_test_status", [
  "PENDING",
  "RUNNING",
  "PASSED",
  "FAILED",
  "ERROR",
  "SKIPPED",
]);

// Security test run status enum
export const securityTestRunStatusEnum = pgEnum("security_test_run_status", [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

// Test schedule frequency enum
export const testScheduleFrequencyEnum = pgEnum("test_schedule_frequency", [
  "MANUAL",
  "HOURLY",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
]);

// Security test definitions - individual test cases
export const securityTests = pgTable("security_tests", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // auth, payment, navigation, forms, api, etc.
  testType: text("test_type").notNull(), // deterministic, exploratory
  severity: text("severity").notNull().default("medium"), // critical, high, medium, low
  // Test configuration
  testFlow: jsonb("test_flow").$type<{
    steps: Array<{
      action: string;
      target?: string;
      value?: string;
      assertion?: string;
      timeout?: number;
    }>;
    setup?: string[];
    teardown?: string[];
  }>(),
  // For exploratory tests
  exploratoryConfig: jsonb("exploratory_config").$type<{
    startUrl: string;
    maxDepth?: number;
    patterns?: string[];
    excludePatterns?: string[];
    checkTypes?: string[]; // links, forms, auth, etc.
  }>(),
  expectedOutcome: text("expected_outcome"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Test users - accounts used for automated testing
export const testUsers = pgTable("test_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(), // client, freelancer, admin
  // Credentials stored encrypted or reference to secrets
  credentials: jsonb("credentials").$type<{
    type: "password" | "oauth" | "magic_link";
    value?: string; // For password-based auth in test env only
  }>(),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Test schedules - cadence configuration
export const testSchedules = pgTable("test_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  frequency: testScheduleFrequencyEnum("frequency").notNull().default("DAILY"),
  // Schedule details
  cronExpression: text("cron_expression"), // For custom schedules
  timezone: text("timezone").notNull().default("UTC"),
  // What to run
  testIds: jsonb("test_ids").$type<string[]>().default([]), // Specific tests or empty for all
  categories: jsonb("categories").$type<string[]>().default([]), // Run tests in these categories
  testUserId: uuid("test_user_id").references(() => testUsers.id),
  targetEnvironment: text("target_environment").notNull().default("production"), // production, staging
  // Status
  isActive: boolean("is_active").notNull().default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Security test runs - execution instances
export const securityTestRuns = pgTable(
  "security_test_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scheduleId: uuid("schedule_id").references(() => testSchedules.id),
    triggeredBy: text("triggered_by"), // user ID or "schedule"
    status: securityTestRunStatusEnum("status").notNull().default("PENDING"),
    // Configuration snapshot at run time
    targetUrl: text("target_url").notNull(),
    environment: text("environment").notNull().default("production"),
    testUserId: uuid("test_user_id").references(() => testUsers.id),
    // Results summary
    totalTests: integer("total_tests").notNull().default(0),
    passedTests: integer("passed_tests").notNull().default(0),
    failedTests: integer("failed_tests").notNull().default(0),
    errorTests: integer("error_tests").notNull().default(0),
    skippedTests: integer("skipped_tests").notNull().default(0),
    // Score calculation
    score: decimal("score", { precision: 5, scale: 2 }), // 0-100
    // Timing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
    // Metadata
    metadata: jsonb("metadata").$type<{
      browserInfo?: string;
      viewport?: { width: number; height: number };
      notes?: string;
    }>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("security_test_runs_status_idx").on(table.status),
    index("security_test_runs_created_at_idx").on(table.createdAt),
    index("security_test_runs_schedule_id_idx").on(table.scheduleId),
  ]
);

// Security test results - individual test outcomes
export const securityTestResults = pgTable(
  "security_test_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => securityTestRuns.id, { onDelete: "cascade" }),
    testId: uuid("test_id")
      .notNull()
      .references(() => securityTests.id),
    status: securityTestStatusEnum("status").notNull().default("PENDING"),
    // Results
    errorMessage: text("error_message"),
    stackTrace: text("stack_trace"),
    // For exploratory tests
    findings: jsonb("findings").$type<
      Array<{
        type: string;
        severity: string;
        message: string;
        location?: string;
        screenshot?: string;
      }>
    >(),
    // Evidence
    screenshots: jsonb("screenshots").$type<string[]>().default([]),
    consoleErrors: jsonb("console_errors").$type<string[]>().default([]),
    networkErrors: jsonb("network_errors").$type<
      Array<{
        url: string;
        status: number;
        message: string;
      }>
    >(),
    // Timing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("security_test_results_run_id_idx").on(table.runId),
    index("security_test_results_test_id_idx").on(table.testId),
    index("security_test_results_status_idx").on(table.status),
  ]
);

// Security overview snapshots - periodic security state captures
export const securitySnapshots = pgTable(
  "security_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Overall health metrics
    overallScore: decimal("overall_score", { precision: 5, scale: 2 }),
    // Category scores
    categoryScores: jsonb("category_scores").$type<
      Record<string, { score: number; passed: number; failed: number }>
    >(),
    // Security checks
    sslValid: boolean("ssl_valid"),
    sslExpiry: timestamp("ssl_expiry"),
    headersScore: decimal("headers_score", { precision: 5, scale: 2 }),
    missingHeaders: jsonb("missing_headers").$type<string[]>(),
    // Dependencies
    dependencyVulnerabilities: jsonb("dependency_vulnerabilities").$type<
      Array<{
        package: string;
        severity: string;
        cve?: string;
        fixVersion?: string;
      }>
    >(),
    // Environment checks
    envExposed: boolean("env_exposed"),
    debugEnabled: boolean("debug_enabled"),
    // API security
    openEndpoints: jsonb("open_endpoints").$type<string[]>(),
    rateLimitingEnabled: boolean("rate_limiting_enabled"),
    // Summary
    criticalIssues: integer("critical_issues").notNull().default(0),
    highIssues: integer("high_issues").notNull().default(0),
    mediumIssues: integer("medium_issues").notNull().default(0),
    lowIssues: integer("low_issues").notNull().default(0),
    // Last test run reference
    lastTestRunId: uuid("last_test_run_id").references(() => securityTestRuns.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("security_snapshots_created_at_idx").on(table.createdAt)]
);

// Relations for security tables
export const securityTestsRelations = relations(securityTests, ({ many }) => ({
  results: many(securityTestResults),
}));

export const testUsersRelations = relations(testUsers, ({ many }) => ({
  schedules: many(testSchedules),
  testRuns: many(securityTestRuns),
}));

export const testSchedulesRelations = relations(testSchedules, ({ one, many }) => ({
  testUser: one(testUsers, {
    fields: [testSchedules.testUserId],
    references: [testUsers.id],
  }),
  runs: many(securityTestRuns),
}));

export const securityTestRunsRelations = relations(securityTestRuns, ({ one, many }) => ({
  schedule: one(testSchedules, {
    fields: [securityTestRuns.scheduleId],
    references: [testSchedules.id],
  }),
  testUser: one(testUsers, {
    fields: [securityTestRuns.testUserId],
    references: [testUsers.id],
  }),
  results: many(securityTestResults),
}));

export const securityTestResultsRelations = relations(securityTestResults, ({ one }) => ({
  run: one(securityTestRuns, {
    fields: [securityTestResults.runId],
    references: [securityTestRuns.id],
  }),
  test: one(securityTests, {
    fields: [securityTestResults.testId],
    references: [securityTests.id],
  }),
}));
