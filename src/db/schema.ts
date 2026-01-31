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
    // Slack integration
    slackUserId: text("slack_user_id"), // Slack user ID if matched by email
    slackDmChannelId: text("slack_dm_channel_id"), // DM channel ID for direct messages
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
  industryArchetype: text("industry_archetype"), // Hospitality, Blue-collar, White-collar, E-commerce, Tech
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
  // Slack integration
  slackChannelId: text("slack_channel_id"), // Client-specific Slack channel
  slackChannelName: text("slack_channel_name"), // Stored for reference
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
  timezone: text("timezone"),
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
    moodboardItems: jsonb("moodboard_items").$type<{
      id: string;
      type: "style" | "color" | "image" | "upload";
      imageUrl: string;
      name: string;
      metadata?: {
        styleAxis?: string;
        deliverableType?: string;
        colorSamples?: string[];
        styleId?: string;
      };
    }[]>().default([]),
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

// Task activity log (for timeline tracking)
export const taskActivityLog = pgTable("task_activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id),
  actorType: text("actor_type").notNull(), // "client", "freelancer", "admin", "system"
  action: text("action").notNull(), // "created", "assigned", "started", "submitted", "approved", "revision_requested", "completed", "cancelled"
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  metadata: jsonb("metadata").$type<{
    freelancerName?: string;
    deliverableCount?: number;
    revisionFeedback?: string;
    [key: string]: unknown;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("task_activity_log_task_id_idx").on(table.taskId),
  index("task_activity_log_created_at_idx").on(table.createdAt),
]);

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
  // Each bucket has 3 values representing the spectrum endpoints and middle
  toneBucket: text("tone_bucket").notNull(), // "playful" | "balanced" | "serious"
  energyBucket: text("energy_bucket").notNull(), // "calm" | "balanced" | "energetic"
  densityBucket: text("density_bucket").notNull().default("balanced"), // "minimal" | "balanced" | "rich"
  premiumBucket: text("premium_bucket").notNull().default("balanced"), // "accessible" | "balanced" | "premium"

  // Color characteristics
  colorBucket: text("color_bucket").notNull(), // "warm" | "cool" | "neutral"
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

    // Extended AI classification (similar to brand library buckets)
    colorTemperature: text("color_temperature"), // warm, cool, neutral
    energyLevel: text("energy_level"), // calm, balanced, energetic
    densityLevel: text("density_level"), // minimal, balanced, rich
    formalityLevel: text("formality_level"), // casual, balanced, formal
    colorSamples: jsonb("color_samples").$type<string[]>().default([]), // hex colors

    // Industry & audience targeting
    industries: jsonb("industries").$type<string[]>().default([]), // tech, fashion, food, etc.
    targetAudience: text("target_audience"), // b2b, b2c, enterprise, startup, consumer

    // Visual element tags
    visualElements: jsonb("visual_elements").$type<string[]>().default([]), // typography-heavy, photo-centric, etc.
    moodKeywords: jsonb("mood_keywords").$type<string[]>().default([]), // professional, playful, elegant, etc.

    // Duplicate detection
    imageHash: text("image_hash"), // Perceptual hash for content-based deduplication
    sourceUrl: text("source_url"), // Original URL before upload to storage

    // Example output for preview
    exampleOutputUrl: text("example_output_url"), // URL to an example of generated output using this style

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

// Style selection history (for learning from user preferences)
export const styleSelectionHistory = pgTable(
  "style_selection_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    styleId: uuid("style_id")
      .notNull()
      .references(() => deliverableStyleReferences.id, { onDelete: "cascade" }),

    // Context of selection
    deliverableType: text("deliverable_type").notNull(),
    styleAxis: text("style_axis").notNull(),

    // Selection metadata
    selectionContext: text("selection_context").notNull().default("chat"), // chat, browse, refinement
    wasConfirmed: boolean("was_confirmed").notNull().default(false), // Did they proceed with this style?

    // Session tracking
    draftId: uuid("draft_id").references(() => chatDrafts.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("ssh_user_id_idx").on(table.userId),
    index("ssh_user_style_idx").on(table.userId, table.styleAxis),
    index("ssh_user_type_idx").on(table.userId, table.deliverableType),
  ]
);

// Relations for style selection history
export const styleSelectionHistoryRelations = relations(styleSelectionHistory, ({ one }) => ({
  user: one(users, {
    fields: [styleSelectionHistory.userId],
    references: [users.id],
  }),
  style: one(deliverableStyleReferences, {
    fields: [styleSelectionHistory.styleId],
    references: [deliverableStyleReferences.id],
  }),
  draft: one(chatDrafts, {
    fields: [styleSelectionHistory.draftId],
    references: [chatDrafts.id],
  }),
}));

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

// ============================================
// Audit Logging Tables
// ============================================

// Audit log action types
export const auditActionTypeEnum = pgEnum("audit_action_type", [
  // Authentication
  "AUTH_LOGIN",
  "AUTH_LOGOUT",
  "AUTH_FAILED_LOGIN",
  "AUTH_PASSWORD_CHANGE",
  "AUTH_2FA_ENABLED",
  "AUTH_2FA_DISABLED",
  // User management
  "USER_CREATE",
  "USER_UPDATE",
  "USER_DELETE",
  "USER_ROLE_CHANGE",
  // Freelancer management
  "FREELANCER_APPROVE",
  "FREELANCER_REJECT",
  "FREELANCER_SUSPEND",
  "FREELANCER_BULK_ACTION",
  // Task management
  "TASK_CREATE",
  "TASK_ASSIGN",
  "TASK_STATUS_CHANGE",
  "TASK_DELETE",
  // Credit/billing
  "CREDIT_PURCHASE",
  "CREDIT_USAGE",
  "CREDIT_REFUND",
  "CREDIT_MANUAL_ADJUST",
  // Settings
  "SETTINGS_UPDATE",
  "COUPON_CREATE",
  "COUPON_DELETE",
  // Admin actions
  "ADMIN_DATABASE_ACCESS",
  "ADMIN_EXPORT_DATA",
  "ADMIN_IMPERSONATE",
  // Security
  "SECURITY_TEST_RUN",
  "SECURITY_ALERT",
]);

// Audit logs table
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Who performed the action
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorEmail: text("actor_email"), // Stored separately for persistence even if user deleted
    actorRole: text("actor_role"),
    // What action was performed
    action: auditActionTypeEnum("action").notNull(),
    // What resource was affected
    resourceType: text("resource_type").notNull(), // user, task, freelancer, coupon, settings, etc.
    resourceId: text("resource_id"), // The ID of the affected resource
    // Details
    details: jsonb("details").$type<Record<string, unknown>>(), // Additional context
    previousValue: jsonb("previous_value"), // Before state for updates
    newValue: jsonb("new_value"), // After state for updates
    // Result
    success: boolean("success").notNull().default(true),
    errorMessage: text("error_message"),
    // Request context
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    endpoint: text("endpoint"), // API endpoint that triggered this
    // Timestamp
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_actor_id_idx").on(table.actorId),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_resource_type_idx").on(table.resourceType),
    index("audit_logs_resource_id_idx").on(table.resourceId),
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_actor_action_idx").on(table.actorId, table.action),
  ]
);

// Relations for audit logs
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

// Import log source type enum
export const importLogSourceEnum = pgEnum("import_log_source", [
  "bigged",
  "dribbble",
  "manual_url",
  "file_upload",
  "page_scrape",
]);

// Import log target type enum
export const importLogTargetEnum = pgEnum("import_log_target", [
  "deliverable_style",
  "brand_reference",
]);

// Import logs table - tracks all imports to reference and brand libraries
export const importLogs = pgTable(
  "import_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Import source and target
    source: importLogSourceEnum("source").notNull(),
    target: importLogTargetEnum("target").notNull(),

    // Who triggered the import
    triggeredBy: text("triggered_by").references(() => users.id, { onDelete: "set null" }),
    triggeredByEmail: text("triggered_by_email"),

    // Import parameters
    searchQuery: text("search_query"), // For bigged/scraper queries
    sourceUrl: text("source_url"), // URL that was scraped

    // Results summary
    totalAttempted: integer("total_attempted").notNull().default(0),
    totalSuccessful: integer("total_successful").notNull().default(0),
    totalFailed: integer("total_failed").notNull().default(0),
    totalSkipped: integer("total_skipped").notNull().default(0), // Duplicates

    // Detailed results
    importedItems: jsonb("imported_items").$type<Array<{
      id: string;
      name: string;
      imageUrl: string;
      deliverableType?: string;
      styleAxis?: string;
      toneBucket?: string;
      energyBucket?: string;
      confidence?: number;
    }>>().default([]),

    failedItems: jsonb("failed_items").$type<Array<{
      url: string;
      error: string;
    }>>().default([]),

    skippedItems: jsonb("skipped_items").$type<Array<{
      url: string;
      reason: string;
    }>>().default([]),

    // Processing details
    processingTimeMs: integer("processing_time_ms"),
    confidenceThreshold: decimal("confidence_threshold", { precision: 3, scale: 2 }),

    // Status
    status: text("status").notNull().default("completed"), // completed, partial, failed
    errorMessage: text("error_message"),

    // Timestamps
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("import_logs_source_idx").on(table.source),
    index("import_logs_target_idx").on(table.target),
    index("import_logs_triggered_by_idx").on(table.triggeredBy),
    index("import_logs_created_at_idx").on(table.createdAt),
    index("import_logs_source_target_idx").on(table.source, table.target),
  ]
);

// Relations for import logs
export const importLogsRelations = relations(importLogs, ({ one }) => ({
  triggeredByUser: one(users, {
    fields: [importLogs.triggeredBy],
    references: [users.id],
  }),
}));

// Add imageHash field to deliverableStyleReferences for duplicate detection
// Note: This requires a migration to add the column

// ============================================
// Target Audiences Tables
// ============================================

// Target audiences for companies (inferred from brand data and social profiles)
export const audiences = pgTable(
  "audiences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Audience identification
    name: text("name").notNull(), // e.g., "HR Directors", "Small Business Owners"
    isPrimary: boolean("is_primary").notNull().default(false),

    // Demographics
    demographics: jsonb("demographics").$type<{
      ageRange?: { min: number; max: number };
      gender?: "all" | "male" | "female" | "other";
      income?: "low" | "middle" | "high" | "enterprise";
      education?: string[];
      locations?: string[];
    }>(),

    // Firmographics (B2B)
    firmographics: jsonb("firmographics").$type<{
      companySize?: string[]; // "1-10", "11-50", "51-200", "201-500", "500+"
      industries?: string[];
      jobTitles?: string[];
      departments?: string[];
      decisionMakingRole?: "decision-maker" | "influencer" | "end-user";
    }>(),

    // Psychographics
    psychographics: jsonb("psychographics").$type<{
      painPoints?: string[];
      goals?: string[];
      values?: string[];
      buyingMotivations?: string[];
    }>(),

    // Behavioral
    behavioral: jsonb("behavioral").$type<{
      contentPreferences?: string[]; // "video", "long-form", "data-driven"
      platforms?: string[]; // "LinkedIn", "Instagram", "Email"
      buyingProcess?: "impulse" | "considered" | "committee";
    }>(),

    // Confidence & source
    confidence: integer("confidence").notNull().default(50), // 0-100
    sources: jsonb("sources").$type<string[]>().default([]), // ["website", "linkedin", "user-input"]

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("audiences_company_id_idx").on(table.companyId),
    index("audiences_is_primary_idx").on(table.companyId, table.isPrimary),
  ]
);

// Relations for audiences
export const audiencesRelations = relations(audiences, ({ one }) => ({
  company: one(companies, {
    fields: [audiences.companyId],
    references: [companies.id],
  }),
}));

// Update companies relations to include audiences
export const companiesAudiencesRelation = relations(companies, ({ many }) => ({
  audiences: many(audiences),
}));

// ============================================
// Brief Tables (Designer-ready briefs)
// ============================================

// Brief status enum
export const briefStatusEnum = pgEnum("brief_status", [
  "DRAFT",
  "READY",
  "SUBMITTED",
  "IN_PROGRESS",
  "COMPLETED",
]);

// Briefs table - stores live brief state for chat sessions
export const briefs = pgTable(
  "briefs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Ownership
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),

    // Link to draft or task
    draftId: uuid("draft_id").references(() => chatDrafts.id, { onDelete: "set null" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),

    // Status
    status: briefStatusEnum("status").notNull().default("DRAFT"),
    completionPercentage: integer("completion_percentage").notNull().default(0),

    // Core brief fields (mirroring LiveBrief structure)
    topic: jsonb("topic").$type<{
      value: string | null;
      confidence: number;
      source: "pending" | "inferred" | "confirmed";
    }>(),

    platform: jsonb("platform").$type<{
      value: string | null;
      confidence: number;
      source: "pending" | "inferred" | "confirmed";
    }>(),

    contentType: jsonb("content_type").$type<{
      value: string | null;
      confidence: number;
      source: "pending" | "inferred" | "confirmed";
    }>(),

    intent: jsonb("intent").$type<{
      value: string | null;
      confidence: number;
      source: "pending" | "inferred" | "confirmed";
    }>(),

    taskType: jsonb("task_type").$type<{
      value: string | null;
      confidence: number;
      source: "pending" | "inferred" | "confirmed";
    }>(),

    audience: jsonb("audience").$type<{
      value: {
        name: string;
        demographics?: string;
        psychographics?: string;
        painPoints?: string[];
        goals?: string[];
        source?: "inferred" | "selected" | "custom";
      } | null;
      confidence: number;
      source: "pending" | "inferred" | "confirmed";
    }>(),

    // Dimensions
    dimensions: jsonb("dimensions").$type<{
      width: number;
      height: number;
      label: string;
      aspectRatio: string;
    }[]>(),

    // Visual direction
    visualDirection: jsonb("visual_direction").$type<{
      selectedStyles: Array<{
        id: string;
        name: string;
        imageUrl: string;
        styleAxis: string;
        deliverableType: string;
      }>;
      moodKeywords: string[];
      colorPalette: string[];
      typography: {
        primary: string;
        secondary: string;
      };
      avoidElements: string[];
    }>(),

    // Content outline (for multi-asset plans)
    contentOutline: jsonb("content_outline").$type<{
      title: string;
      subtitle?: string;
      totalItems: number;
      weekGroups: Array<{
        weekNumber: number;
        label: string;
        isExpanded: boolean;
        items: Array<{
          id: string;
          number: number;
          title: string;
          description: string;
          platform: string;
          contentType: string;
          dimensions: { width: number; height: number; label: string; aspectRatio: string };
          week: number;
          day: number;
          status: "draft" | "in_progress" | "completed";
        }>;
      }>;
    }>(),

    // Additional context from brand
    brandContext: jsonb("brand_context").$type<{
      name: string;
      industry: string;
      toneOfVoice: string;
      description: string;
    }>(),

    // Clarifying questions tracking
    clarifyingQuestionsAsked: jsonb("clarifying_questions_asked").$type<string[]>().default([]),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("briefs_user_id_idx").on(table.userId),
    index("briefs_company_id_idx").on(table.companyId),
    index("briefs_draft_id_idx").on(table.draftId),
    index("briefs_task_id_idx").on(table.taskId),
    index("briefs_status_idx").on(table.status),
    index("briefs_created_at_idx").on(table.createdAt),
  ]
);

// Relations for briefs
export const briefsRelations = relations(briefs, ({ one }) => ({
  user: one(users, {
    fields: [briefs.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [briefs.companyId],
    references: [companies.id],
  }),
  draft: one(chatDrafts, {
    fields: [briefs.draftId],
    references: [chatDrafts.id],
  }),
  task: one(tasks, {
    fields: [briefs.taskId],
    references: [tasks.id],
  }),
}));

// Update chatDrafts relations to include brief
export const chatDraftsBriefsRelation = relations(chatDrafts, ({ one }) => ({
  brief: one(briefs, {
    fields: [chatDrafts.id],
    references: [briefs.draftId],
  }),
}));

// Update tasks relations to include brief
export const tasksBriefsRelation = relations(tasks, ({ one }) => ({
  brief: one(briefs, {
    fields: [tasks.id],
    references: [briefs.taskId],
  }),
}));
