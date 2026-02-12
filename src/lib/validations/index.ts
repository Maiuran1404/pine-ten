import { z } from "zod";

/**
 * Centralized Zod validation schemas for API requests
 */

// ============ Task Schemas ============

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters")
    .transform((val) => val.trim()),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be less than 5000 characters")
    .transform((val) => val.trim()),
  category: z
    .string()
    .max(100)
    .optional()
    .nullable(),
  requirements: z.record(z.string(), z.unknown()).optional().nullable(),
  estimatedHours: z.number().positive().optional().nullable(),
  creditsRequired: z
    .number({ message: "Credits required must be a number" })
    .int({ message: "Credits must be a whole number" })
    .min(1, { message: "At least 1 credit required" })
    .max(100, { message: "Maximum 100 credits per task" }),
  deadline: z.string().datetime().optional().nullable(),
  chatHistory: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  styleReferences: z.array(z.string()).optional().default([]),
  attachments: z
    .array(
      z.object({
        fileName: z.string().max(255),
        fileUrl: z.string().url(),
        fileType: z.string(),
        fileSize: z.number().positive(),
      })
    )
    .optional()
    .default([]),
  moodboardItems: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["style", "color", "image", "upload"]),
        imageUrl: z.string(),
        name: z.string(),
        metadata: z
          .object({
            styleAxis: z.string().optional(),
            deliverableType: z.string().optional(),
            colorSamples: z.array(z.string()).optional(),
            styleId: z.string().optional(),
          })
          .optional(),
      })
    )
    .optional()
    .default([]),
  // Brief integration
  briefId: z.string().uuid().optional().nullable(),
  briefData: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  status: z
    .enum([
      "PENDING",
      "ASSIGNED",
      "IN_PROGRESS",
      "IN_REVIEW",
      "REVISION_REQUESTED",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
  priority: z.number().int({ message: "Priority must be a whole number" }).min(0).max(3).optional(),
  deadline: z.string().datetime().optional().nullable(),
});

export const taskMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message too long")
    .transform((val) => val.trim()),
  attachments: z.array(z.string().url()).optional().default([]),
});

export const taskRevisionSchema = z.object({
  feedback: z
    .string()
    .min(10, "Please provide detailed feedback")
    .max(2000, "Feedback too long")
    .transform((val) => val.trim()),
});

// ============ User Schemas ============

export const updateUserSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional()
    .nullable(),
  notificationPreferences: z
    .object({
      email: z.boolean().optional(),
      whatsapp: z.boolean().optional(),
      inApp: z.boolean().optional(),
    })
    .optional(),
});

export const onboardingSchema = z.object({
  role: z.enum(["CLIENT", "FREELANCER"]),
  companyName: z.string().min(2).max(100).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  // Freelancer-specific fields
  skills: z.array(z.string()).optional(),
  portfolioUrls: z.array(z.string().url()).optional(),
  bio: z.string().max(1000).optional(),
  whatsappNumber: z.string().optional(),
});

// ============ Auth Schemas ============

export const setRoleSchema = z.object({
  role: z.enum(["CLIENT", "FREELANCER"]),
});

// ============ Brand Schemas ============

export const updateBrandSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  website: z.string().url().optional().or(z.literal("")).nullable(),
  industry: z.string().max(100).optional().nullable(),
  industryArchetype: z.string().max(100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  faviconUrl: z.string().url().optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional()
    .nullable(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional()
    .nullable(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional()
    .nullable(),
  backgroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional()
    .nullable(),
  textColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional()
    .nullable(),
  brandColors: z.array(z.string()).optional().nullable(),
  primaryFont: z.string().max(100).optional().nullable(),
  secondaryFont: z.string().max(100).optional().nullable(),
  tagline: z.string().max(200).optional().nullable(),
  keywords: z.array(z.string()).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
  socialLinks: z
    .object({
      twitter: z.string().url().optional().or(z.literal("")),
      linkedin: z.string().url().optional().or(z.literal("")),
      facebook: z.string().url().optional().or(z.literal("")),
      instagram: z.string().url().optional().or(z.literal("")),
      youtube: z.string().url().optional().or(z.literal("")),
    })
    .optional(),
});

export const extractBrandSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

// ============ Admin Schemas ============

export const adminFreelancerActionSchema = z.object({
  freelancerId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  description: z.string().max(500).optional(),
  baseCredits: z.number().int().min(1).max(50),
  isActive: z.boolean().optional().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createStyleReferenceSchema = z.object({
  category: z.string().min(2).max(100),
  name: z.string().min(2).max(100),
  imageUrl: z.string().url(),
  tags: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export const adminCreditsSchema = z.object({
  userId: z.string(),
  amount: z.number().int(),
  type: z.enum(["BONUS", "ADJUSTMENT", "REFUND"]),
  description: z.string().max(500).optional(),
});

export const chatPromptsSchema = z.object({
  systemPrompt: z.string().min(10).max(10000),
  staticAdsTree: z.string().max(10000).optional(),
  dynamicAdsTree: z.string().max(10000).optional(),
  socialMediaTree: z.string().max(10000).optional(),
  uiuxTree: z.string().max(10000).optional(),
  creditGuidelines: z.string().max(5000).optional(),
});

// ============ Payment Schemas ============

export const createCheckoutSchema = z.object({
  packageId: z.enum(["credits_5", "credits_10", "credits_25", "credits_50"]),
});

// ============ Chat Schemas ============

export const chatMessageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(10000),
    })
  ),
  draftId: z.string().uuid().optional().nullable(),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileUrl: z.string().url(),
        fileType: z.string(),
        fileSize: z.number(),
      })
    )
    .optional(),
});

// ============ Freelancer Schemas ============

export const claimTaskSchema = z.object({
  taskId: z.string().uuid(),
});

export const submitDeliverableSchema = z.object({
  taskId: z.string().uuid(),
  message: z.string().max(2000).optional(),
  files: z
    .array(
      z.object({
        fileName: z.string(),
        fileUrl: z.string().url(),
        fileType: z.string(),
        fileSize: z.number(),
      })
    )
    .min(1, "At least one deliverable file is required"),
});

// ============ Coupon Schemas ============

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase alphanumeric"),
  percentOff: z.number().min(1).max(100).optional(),
  amountOff: z.number().min(1).optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
});

// ============ Brand Extract Schema ============

export const extractBrandRequestSchema = z.object({
  websiteUrl: z.string().min(1, "Website URL is required").max(2000),
});

// ============ Freelancer Profile Schema ============

export const updateFreelancerProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  skills: z.array(z.string().max(100)).optional(),
  specializations: z.array(z.string().max(100)).optional(),
  portfolioUrls: z.array(z.string().url()).optional(),
  whatsappNumber: z.string().max(30).optional(),
  availability: z.string().max(50).optional(),
});

// ============ Stripe Connect Schema ============

export const stripeConnectActionSchema = z.object({
  action: z.enum(["create", "onboarding", "dashboard"]),
  country: z.string().length(2).optional(),
});

// ============ Chat Stream Schema ============

export const chatStreamSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(10000),
    })
  ).min(1, "At least one message is required"),
});

// ============ Draft Schema ============

export const saveDraftSchema = z.object({
  id: z.string().optional(),
  title: z.string().max(200).optional(),
  messages: z.array(z.any()).optional(),
  selectedStyles: z.array(z.any()).optional(),
  pendingTask: z.any().optional().nullable(),
});

// ============ Creative Intake Schema ============

export const creativeIntakeSchema = z.object({
  serviceType: z.string().min(1, "Service type is required").max(100),
  currentStep: z.string().min(1, "Current step is required").max(100),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().max(10000),
    })
  ),
  userMessage: z.string().min(1, "User message is required").max(5000),
  currentData: z.record(z.string(), z.unknown()).optional().default({}),
});

// ============ Brief Outline Schema ============

export const generateOutlineSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(500),
  platform: z.string().min(1, "Platform is required").max(50),
  contentType: z.string().max(50).optional().default("post"),
  intent: z.string().min(1, "Intent is required").max(50),
  durationDays: z.number().int().min(1).max(365),
  audienceName: z.string().max(200).optional(),
  audienceDescription: z.string().max(1000).optional(),
  brandName: z.string().max(200).optional(),
  brandIndustry: z.string().max(200).optional(),
  brandTone: z.string().max(200).optional(),
});

// ============ Task Feedback Analysis Schema ============

export const analyzeFeedbackSchema = z.object({
  feedback: z.string().min(1, "Feedback is required").max(5000),
  originalRequirements: z.record(z.string(), z.unknown()).optional().nullable(),
  description: z.string().max(5000).optional(),
});

// ============ Admin Settings Schema ============

export const adminSettingsSchema = z.object({
  key: z.string().min(1, "Key is required").max(200),
  value: z.unknown(),
  description: z.string().max(500).optional(),
});

// ============ Admin Notification Settings Schema ============

export const updateNotificationSettingSchema = z.object({
  id: z.string().min(1, "Setting ID is required"),
  emailEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  notifyClient: z.boolean().optional(),
  notifyFreelancer: z.boolean().optional(),
  notifyAdmin: z.boolean().optional(),
  emailSubject: z.string().max(500).optional(),
  emailTemplate: z.string().max(10000).optional(),
  whatsappTemplate: z.string().max(2000).optional(),
});

// ============ Admin Brand Reference Schema ============

export const createBrandReferenceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().url(),
  toneBucket: z.string().min(1),
  energyBucket: z.string().min(1),
  densityBucket: z.string().optional().default("balanced"),
  colorBucket: z.string().min(1),
  premiumBucket: z.string().optional().default("balanced"),
  colorSamples: z.array(z.string()).optional().default([]),
  visualStyles: z.array(z.string()).optional().default([]),
  industries: z.array(z.string()).optional().default([]),
  displayOrder: z.number().int().optional().default(0),
});

// ============ Admin Deliverable Style Schema ============

export const createDeliverableStyleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().url(),
  deliverableType: z.string().min(1),
  styleAxis: z.string().min(1),
  subStyle: z.string().optional().nullable(),
  semanticTags: z.array(z.string()).optional().default([]),
  featuredOrder: z.number().int().optional().default(0),
  displayOrder: z.number().int().optional().default(0),
});

// ============ Onboarding Request Schema ============

export const onboardingRequestSchema = z.object({
  type: z.enum(["client", "freelancer"]),
  data: z.record(z.string(), z.unknown()),
});

// ============ Helper Types ============

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskMessageInput = z.infer<typeof taskMessageSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
