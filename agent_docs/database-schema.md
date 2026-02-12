# Database Schema

The database schema is defined in a single file: `src/db/schema.ts` using Drizzle ORM. The database is PostgreSQL hosted on Supabase. All queries use Drizzle ORM -- not raw Supabase client queries. Supabase is used primarily for storage and as the PostgreSQL host.

## Database Client

Defined in `src/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(connectionString, {
  prepare: false,
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(client, { schema })
```

Key exports:

- `db` -- Drizzle instance for queries
- `sql` -- Raw postgres client (for transactions, raw queries)
- `withTransaction(fn)` -- Transaction wrapper

## Enums

| Enum                       | Values                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `user_role`                | CLIENT, FREELANCER, ADMIN                                                                                                        |
| `onboarding_status`        | NOT_STARTED, IN_PROGRESS, COMPLETED                                                                                              |
| `task_status`              | PENDING, OFFERED, ASSIGNED, IN_PROGRESS, PENDING_ADMIN_REVIEW, IN_REVIEW, REVISION_REQUESTED, COMPLETED, CANCELLED, UNASSIGNABLE |
| `task_complexity`          | SIMPLE, INTERMEDIATE, ADVANCED, EXPERT                                                                                           |
| `task_urgency`             | CRITICAL, URGENT, STANDARD, FLEXIBLE                                                                                             |
| `artist_experience_level`  | JUNIOR, MID, SENIOR, EXPERT                                                                                                      |
| `skill_proficiency`        | BEGINNER, INTERMEDIATE, ADVANCED, EXPERT                                                                                         |
| `task_offer_response`      | PENDING, ACCEPTED, DECLINED, EXPIRED                                                                                             |
| `decline_reason`           | TOO_BUSY, SKILL_MISMATCH, DEADLINE_TOO_TIGHT, LOW_CREDITS, PERSONAL_CONFLICT, OTHER                                              |
| `task_category`            | STATIC_ADS, VIDEO_MOTION, SOCIAL_MEDIA, UI_UX                                                                                    |
| `freelancer_status`        | PENDING, APPROVED, REJECTED, SUSPENDED                                                                                           |
| `notification_channel`     | EMAIL, WHATSAPP, IN_APP                                                                                                          |
| `payout_status`            | PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED                                                                                |
| `payout_method`            | STRIPE_CONNECT, BANK_TRANSFER, PAYPAL                                                                                            |
| `brief_status`             | DRAFT, READY, SUBMITTED, IN_PROGRESS, COMPLETED                                                                                  |
| `security_test_status`     | PENDING, RUNNING, PASSED, FAILED, ERROR, SKIPPED                                                                                 |
| `security_test_run_status` | PENDING, RUNNING, COMPLETED, FAILED, CANCELLED                                                                                   |
| `test_schedule_frequency`  | MANUAL, HOURLY, DAILY, WEEKLY, MONTHLY                                                                                           |
| `audit_action_type`        | AUTH_LOGIN, AUTH_LOGOUT, USER_CREATE, TASK_CREATE, CREDIT_PURCHASE, etc. (26 values)                                             |
| `import_log_source`        | bigged, dribbble, manual_url, file_upload, page_scrape                                                                           |
| `import_log_target`        | deliverable_style, brand_reference                                                                                               |

## Core Tables

### users

Better Auth compatible user table. Primary key is `text` (not UUID).

| Column                  | Type      | Notes                                |
| ----------------------- | --------- | ------------------------------------ |
| id                      | text PK   | Better Auth generated                |
| name                    | text      | Required                             |
| email                   | text      | Unique, indexed                      |
| emailVerified           | boolean   | Default false                        |
| image                   | text      | Avatar URL                           |
| role                    | user_role | Default CLIENT, indexed              |
| phone                   | text      | Optional                             |
| credits                 | integer   | Default 0, deducted on task creation |
| companyId               | uuid FK   | References companies.id              |
| onboardingCompleted     | boolean   | Default false                        |
| onboardingData          | jsonb     | Freeform onboarding state            |
| notificationPreferences | jsonb     | Email/WhatsApp/in-app toggles        |
| slackUserId             | text      | Slack integration                    |
| slackDmChannelId        | text      | Slack DM channel                     |
| createdAt, updatedAt    | timestamp | Auto-set                             |

### sessions

Better Auth session table.

| Column               | Type      | Notes                     |
| -------------------- | --------- | ------------------------- |
| id                   | text PK   |                           |
| token                | text      | Unique session token      |
| expiresAt            | timestamp | Session expiry            |
| userId               | text FK   | Cascading delete to users |
| ipAddress, userAgent | text      | Request metadata          |

### accounts

Better Auth accounts (credential or OAuth provider links).

| Column                             | Type    | Notes                                     |
| ---------------------------------- | ------- | ----------------------------------------- |
| id                                 | text PK |                                           |
| accountId                          | text    | Provider-specific account ID              |
| providerId                         | text    | "credential" or "google"                  |
| userId                             | text FK | Cascading delete to users                 |
| password                           | text    | Hashed password (for credential provider) |
| accessToken, refreshToken, idToken | text    | OAuth tokens                              |

### companies

Brand/company information for clients.

| Column                                                                | Type              | Notes                                           |
| --------------------------------------------------------------------- | ----------------- | ----------------------------------------------- |
| id                                                                    | uuid PK           | Auto-generated                                  |
| name                                                                  | text              | Company name                                    |
| website, industry, industryArchetype                                  | text              | Company details                                 |
| logoUrl, faviconUrl                                                   | text              | Brand assets                                    |
| primaryColor, secondaryColor, accentColor, backgroundColor, textColor | text              | Hex colors                                      |
| brandColors                                                           | jsonb (string[])  | Additional palette                              |
| primaryFont, secondaryFont                                            | text              | Typography                                      |
| socialLinks                                                           | jsonb             | Twitter, LinkedIn, Facebook, Instagram, YouTube |
| brandAssets                                                           | jsonb             | { images: string[], documents: string[] }       |
| tagline                                                               | text              |                                                 |
| keywords                                                              | jsonb (string[])  |                                                 |
| onboardingStatus                                                      | onboarding_status | Brand setup progress                            |
| slackChannelId, slackChannelName                                      | text              | Client Slack channel                            |

### tasks

Core task table connecting clients with freelancers.

| Column          | Type             | Notes                                           |
| --------------- | ---------------- | ----------------------------------------------- |
| id              | uuid PK          |                                                 |
| clientId        | text FK          | References users.id, cascading delete           |
| freelancerId    | text FK          | References users.id, set null on delete         |
| categoryId      | uuid FK          | References taskCategories.id                    |
| title           | text             | Required, 3-200 chars                           |
| description     | text             | Required, 10-5000 chars                         |
| status          | task_status      | Default PENDING                                 |
| requirements    | jsonb            | Freeform requirements from chat                 |
| styleReferences | jsonb (string[]) | Selected style reference IDs                    |
| moodboardItems  | jsonb            | Array of { id, type, imageUrl, name, metadata } |
| chatHistory     | jsonb (object[]) | Full AI chat transcript                         |
| estimatedHours  | decimal          |                                                 |
| creditsUsed     | integer          | Deducted from client on creation                |
| maxRevisions    | integer          | Default 2                                       |
| revisionsUsed   | integer          | Incremented on revision request                 |
| priority        | integer          | 0-3                                             |
| deadline        | timestamp        | Optional                                        |
| complexity      | task_complexity  | Auto-detected or set                            |
| urgency         | task_urgency     | Auto-detected from deadline                     |
| offeredTo       | text FK          | Current freelancer being offered                |
| offerExpiresAt  | timestamp        | Offer expiry window                             |
| escalationLevel | integer          | Assignment escalation tier                      |
| requiredSkills  | jsonb (string[]) | Skill slugs needed                              |

**Indexes:** clientId, freelancerId, status, createdAt, (clientId + status), offeredTo, offerExpiresAt

### freelancerProfiles

Extended profile for freelancer users.

| Column                             | Type                    | Notes                             |
| ---------------------------------- | ----------------------- | --------------------------------- |
| id                                 | uuid PK                 |                                   |
| userId                             | text FK                 | Unique, cascading delete to users |
| status                             | freelancer_status       | Default PENDING (admin approves)  |
| skills, specializations            | jsonb (string[])        |                                   |
| portfolioUrls                      | jsonb (string[])        |                                   |
| bio                                | text                    |                                   |
| hourlyRate                         | decimal                 |                                   |
| rating                             | decimal                 | 0-5                               |
| completedTasks                     | integer                 | Counter                           |
| experienceLevel                    | artist_experience_level | Default JUNIOR                    |
| maxConcurrentTasks                 | integer                 | Default 3                         |
| acceptsUrgentTasks                 | boolean                 |                                   |
| workingHoursStart, workingHoursEnd | text                    | HH:MM format                      |
| availability                       | boolean                 |                                   |
| vacationMode                       | boolean                 |                                   |
| vacationUntil                      | timestamp               |                                   |
| preferredCategories                | jsonb (string[])        |                                   |
| minCreditsToAccept                 | integer                 | Default 1                         |

### creditTransactions

Tracks all credit movements (purchases, usage, refunds, bonuses).

| Column          | Type    | Notes                             |
| --------------- | ------- | --------------------------------- |
| id              | uuid PK |                                   |
| userId          | text FK |                                   |
| amount          | integer | Positive = add, negative = deduct |
| type            | text    | PURCHASE, USAGE, REFUND, BONUS    |
| description     | text    | Human-readable reason             |
| relatedTaskId   | uuid FK | Optional link to task             |
| stripePaymentId | text    | Stripe payment intent ID          |

## Assignment Algorithm Tables

### skills

Formalized skill taxonomy (admin-managed).

| Column   | Type    | Notes                            |
| -------- | ------- | -------------------------------- |
| id       | uuid PK |                                  |
| name     | text    | Unique skill name                |
| slug     | text    | URL-safe unique slug             |
| category | text    | design, video, development, etc. |

### artistSkills

Per-artist proficiency levels for each skill.

| Column           | Type              | Notes                |
| ---------------- | ----------------- | -------------------- |
| artistId         | text FK           | References users.id  |
| skillId          | uuid FK           | References skills.id |
| proficiencyLevel | skill_proficiency | Default INTERMEDIATE |
| yearsExperience  | decimal           |                      |
| verified         | boolean           | Admin-verified flag  |
| verifiedBy       | text FK           | Admin who verified   |

### taskOffers

Tracks offer history (which freelancers were offered a task and their responses).

| Column          | Type                | Notes                                                                           |
| --------------- | ------------------- | ------------------------------------------------------------------------------- |
| taskId          | uuid FK             |                                                                                 |
| artistId        | text FK             |                                                                                 |
| matchScore      | decimal             | Composite score                                                                 |
| escalationLevel | integer             | 1, 2, or 3                                                                      |
| response        | task_offer_response | PENDING, ACCEPTED, DECLINED, EXPIRED                                            |
| declineReason   | decline_reason      |                                                                                 |
| scoreBreakdown  | jsonb               | { skillScore, timezoneScore, experienceScore, workloadScore, performanceScore } |

### assignmentAlgorithmConfig

Admin-editable scoring configuration (versioned).

Key JSONB fields:

- `weights` -- Scoring dimension weights (must sum to 100)
- `acceptanceWindows` -- Response time by urgency (minutes)
- `escalationSettings` -- Thresholds and max offers per level
- `timezoneSettings` -- Peak hours and timezone scoring
- `experienceMatrix` -- Score for each (complexity, experience) pair
- `workloadSettings` -- Max active tasks and deduction per task
- `exclusionRules` -- Hard filters (overloaded, vacation, night hours)
- `bonusModifiers` -- Extra points for specialization, favorites

### clientArtistAffinity

Tracks client-artist working history and favorites.

## Content & Style Tables

### styleReferences

Style cards shown during AI chat (legacy table).

### deliverableStyleReferences

Rich style reference cards for the chat interface.

| Column                                     | Type             | Notes                                                                |
| ------------------------------------------ | ---------------- | -------------------------------------------------------------------- |
| deliverableType                            | text             | instagram_post, linkedin_banner, static_ad, video_ad, etc.           |
| styleAxis                                  | text             | minimal, bold, editorial, corporate, playful, premium, organic, tech |
| subStyle                                   | text             | Optional depth                                                       |
| semanticTags                               | jsonb (string[]) |                                                                      |
| colorTemperature                           | text             | warm, cool, neutral                                                  |
| energyLevel, densityLevel, formalityLevel  | text             | Spectrum values                                                      |
| colorSamples                               | jsonb (string[]) | Hex colors                                                           |
| industries                                 | jsonb (string[]) |                                                                      |
| targetAudience                             | text             | b2b, b2c, enterprise, startup, consumer                              |
| visualElements, moodKeywords               | jsonb (string[]) |                                                                      |
| imageHash                                  | text             | Perceptual hash for deduplication                                    |
| videoUrl, videoThumbnailUrl, videoDuration | text             | Video reference support                                              |

### brandReferences

Brand inspiration cards for the onboarding flow. Categorized by tone, energy, density, premium, and color buckets.

### styleSelectionHistory

Tracks which styles users select during chat sessions (for learning preferences).

## Communication Tables

### taskMessages

Messages between client and freelancer on a task.

### taskFiles

File attachments on tasks (reference files and deliverables).

### taskActivityLog

Timeline of all task state changes.

| Column                    | Type    | Notes                                                                                                     |
| ------------------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| taskId                    | uuid FK |                                                                                                           |
| actorType                 | text    | "client", "freelancer", "admin", "system"                                                                 |
| action                    | text    | "created", "assigned", "started", "submitted", "approved", "revision_requested", "completed", "cancelled" |
| previousStatus, newStatus | text    | Status transition                                                                                         |
| metadata                  | jsonb   | Context-specific data                                                                                     |

### notifications

In-app, email, and WhatsApp notification records.

### notificationSettings

Admin-configurable notification templates and channel toggles per event type.

## Payment Tables

### payouts

Artist payout requests and processing status.

### stripeConnectAccounts

Stripe Connect account details for each freelancer.

### webhookEvents

Idempotency tracking for Stripe webhook events.

## Brief Tables

### briefs

Stores live brief state built during chat sessions. Contains structured fields for task summary, topic, platform, content type, intent, audience, dimensions, visual direction, and content outline. Each field includes a confidence score and source indicator (pending/inferred/confirmed).

### audiences

Target audience profiles for companies, with demographics, firmographics, psychographics, and behavioral data.

## Security & Audit Tables

### securityTests, securityTestRuns, securityTestResults

Automated security testing framework with test definitions, execution runs, and per-test results.

### securitySnapshots

Periodic captures of overall security health (SSL, headers, dependencies, API endpoints).

### auditLogs

Comprehensive audit trail for all admin and security-relevant actions. Tracks actor, action, resource, before/after values, request context.

### importLogs

Tracks all imports to reference libraries (from Dribbble, manual URLs, file uploads, page scrapes).

## Relations

All relations are defined at the bottom of `src/db/schema.ts` using Drizzle's `relations()` function. Key relationships:

- `users` has one `freelancerProfile`, one `company`, many `sessions`, `accounts`, `clientTasks`, `freelancerTasks`, `notifications`, `creditTransactions`, `payouts`, one `stripeConnectAccount`
- `tasks` has one `client` (user), one `freelancer` (user), one `category`, many `files`, many `messages`, one `brief`
- `freelancerProfiles` has one `user`, many `artistSkills`
- `skills` has many `artistSkills`, many `taskSkillRequirements`
- `taskOffers` has one `task`, one `artist` (user)
- `companies` has many `members` (users), many `audiences`

## Common Query Patterns

### Querying with Drizzle

```typescript
import { db } from '@/db'
import { tasks, users } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'

// Simple select
const userTasks = await db
  .select()
  .from(tasks)
  .where(eq(tasks.clientId, userId))
  .orderBy(desc(tasks.createdAt))

// Join
const tasksWithFreelancer = await db
  .select({
    id: tasks.id,
    title: tasks.title,
    freelancerName: users.name,
  })
  .from(tasks)
  .leftJoin(users, eq(tasks.freelancerId, users.id))

// Insert
const [newTask] = await db
  .insert(tasks)
  .values({ clientId: userId, title: '...', description: '...' })
  .returning()

// Update
await db
  .update(tasks)
  .set({ status: 'COMPLETED', completedAt: new Date() })
  .where(eq(tasks.id, taskId))
```

### Transaction Pattern

```typescript
import { withTransaction } from "@/db";

const result = await withTransaction(async (tx) => {
  // All operations use tx instead of db
  const [user] = await tx
    .select({ credits: users.credits })
    .from(users)
    .where(eq(users.id, userId))
    .for("update"); // Row lock

  await tx.update(users)
    .set({ credits: sql`${users.credits} - ${amount}` })
    .where(eq(users.id, userId));

  await tx.insert(creditTransactions).values({ ... });

  return user;
});
```

## Migrations

Migrations are managed by Drizzle Kit:

```bash
pnpm db:generate    # Generate migration SQL from schema changes
pnpm db:migrate     # Apply pending migrations
pnpm db:push        # Push schema directly (dev only, no migration file)
pnpm db:studio      # Open Drizzle Studio GUI
```

Migration files are stored in `src/db/migrations/` as numbered SQL files.
