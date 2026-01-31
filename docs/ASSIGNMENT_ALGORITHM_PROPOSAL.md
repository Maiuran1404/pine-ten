# Smart Task Assignment Algorithm - Design Proposal

## Executive Summary

This document proposes a comprehensive redesign of the task-to-artist assignment system, moving from a simple "least-loaded" approach to an intelligent, multi-factor matching algorithm with an acceptance workflow and robust fallback mechanisms.

---

## Current State vs Proposed State

| Aspect | Current | Proposed |
|--------|---------|----------|
| Matching Logic | Least-loaded (workload only) | Multi-factor scoring (skills, timezone, experience, workload) |
| Assignment Type | Immediate, automatic | Offer-based with acceptance window |
| Skill Matching | None | Required skill validation + proficiency scoring |
| Timezone Aware | No | Yes, with working hours calculation |
| Complexity Matching | None | Task complexity matched to artist experience |
| Fallback Strategy | Task stays PENDING | Cascading offers → Admin escalation |

---

## Part 1: Multi-Factor Scoring Algorithm

### 1.1 Scoring Factors & Weights

Each eligible artist receives a **composite score** (0-100) based on weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Skill Match** | 35% | Required skills vs artist capabilities |
| **Timezone Fit** | 20% | Working hours alignment |
| **Experience Match** | 20% | Task complexity vs artist experience level |
| **Workload Balance** | 15% | Current active tasks |
| **Performance History** | 10% | Rating + completion rate |

### 1.2 Skill Match Score (0-100)

```
Skill Score = (matched_required_skills / total_required_skills) × 100

Bonus modifiers:
  +10 if artist has category specialization
  +5 per "nice-to-have" skill matched
  -20 if missing ANY critical skill (hard requirement)
```

**Example:**
- Task requires: [Figma, Motion Graphics, After Effects]
- Artist has: [Figma, Motion Graphics, Premiere Pro]
- Score: (2/3) × 100 = 66.6

### 1.3 Timezone Fit Score (0-100)

Based on artist's local time when task is created:

| Local Time | Score | Reason |
|------------|-------|--------|
| 9:00 AM - 6:00 PM | 100 | Peak working hours |
| 6:00 PM - 9:00 PM | 80 | Evening availability |
| 7:00 AM - 9:00 AM | 70 | Early morning |
| 9:00 PM - 11:00 PM | 50 | Late evening |
| 11:00 PM - 7:00 AM | 20 | Night hours (sleeping) |

**Deadline urgency modifier:**
- If deadline < 4 hours AND artist is in night hours → Score = 0 (exclude)
- If deadline < 24 hours → Double-weight timezone factor

### 1.4 Experience Match Score (0-100)

Match task complexity to artist experience:

**Task Complexity Levels:**
- `SIMPLE` - Basic tasks, templates, minor edits
- `INTERMEDIATE` - Standard creative work
- `ADVANCED` - Complex multi-asset projects
- `EXPERT` - High-stakes, technically demanding

**Artist Experience Tiers:**
- `JUNIOR` - 0-10 completed tasks
- `MID` - 11-50 completed tasks
- `SENIOR` - 51-150 completed tasks
- `EXPERT` - 150+ completed tasks

**Scoring Matrix:**

|  | JUNIOR Artist | MID Artist | SENIOR Artist | EXPERT Artist |
|--|---------------|------------|---------------|---------------|
| SIMPLE Task | 100 | 90 | 70 | 50 |
| INTERMEDIATE Task | 60 | 100 | 90 | 80 |
| ADVANCED Task | 20 | 70 | 100 | 95 |
| EXPERT Task | 0 | 40 | 80 | 100 |

*Rationale: Don't give senior artists simple tasks (waste of talent), don't overwhelm juniors with expert work.*

### 1.5 Workload Balance Score (0-100)

```
Workload Score = max(0, 100 - (active_tasks × 20))

Where active_tasks = tasks in (ASSIGNED, IN_PROGRESS, REVISION_REQUESTED)
```

| Active Tasks | Score |
|--------------|-------|
| 0 | 100 |
| 1 | 80 |
| 2 | 60 |
| 3 | 40 |
| 4 | 20 |
| 5+ | 0 (exclude from assignment) |

### 1.6 Performance History Score (0-100)

```
Performance Score = (rating × 20) + (on_time_rate × 30) + (revision_efficiency × 20)

Where:
  rating = 0-5 stars → 0-100 points
  on_time_rate = (tasks_on_time / total_tasks) × 100
  revision_efficiency = 100 - (avg_revisions_used / avg_max_revisions × 100)
```

### 1.7 Final Score Calculation

```typescript
function calculateMatchScore(artist: Artist, task: Task): number {
  const skillScore = calculateSkillScore(artist.skills, task.requiredSkills);
  const timezoneScore = calculateTimezoneScore(artist.timezone, new Date());
  const experienceScore = calculateExperienceScore(artist.experienceLevel, task.complexity);
  const workloadScore = calculateWorkloadScore(artist.activeTasks);
  const performanceScore = calculatePerformanceScore(artist);

  // Hard exclusions (return -1 to exclude)
  if (skillScore < 50) return -1;  // Missing critical skills
  if (workloadScore === 0) return -1;  // Overloaded
  if (timezoneScore === 0 && task.isUrgent) return -1;  // Sleeping + urgent

  return (
    skillScore * 0.35 +
    timezoneScore * 0.20 +
    experienceScore * 0.20 +
    workloadScore * 0.15 +
    performanceScore * 0.10
  );
}
```

---

## Part 2: Acceptance Workflow

### 2.1 Task Offer States

```
PENDING → OFFERED → ASSIGNED → IN_PROGRESS → ...
              ↓
          DECLINED / EXPIRED
              ↓
        (next artist offer)
```

### 2.2 New Task Status: `OFFERED`

When a task is offered to an artist:
- Status becomes `OFFERED`
- `offeredTo` field set to artist ID
- `offerExpiresAt` timestamp set (current time + acceptance window)
- Artist receives notification (push, email, WhatsApp)

### 2.3 Acceptance Windows (Tiered by Urgency)

| Task Urgency | Acceptance Window | Reason |
|--------------|-------------------|--------|
| **Critical** (deadline < 4h) | 10 minutes | Immediate action needed |
| **Urgent** (deadline < 24h) | 30 minutes | Same-day delivery |
| **Standard** (deadline < 72h) | 2 hours | Normal workflow |
| **Flexible** (deadline > 72h or none) | 4 hours | Relaxed timeline |

### 2.4 Acceptance Flow

```
1. Task created
2. Algorithm ranks all eligible artists
3. Top artist receives offer
4. Timer starts
5. Artist can:
   a) ACCEPT → Status = ASSIGNED, assignment complete
   b) DECLINE → Immediate escalation to next artist
   c) NO RESPONSE → After timeout, auto-escalation

6. If declined/expired:
   - Record decline reason (optional)
   - Move to next ranked artist
   - Repeat from step 3
```

### 2.5 Artist Actions

**Accept Task:**
```typescript
POST /api/artist/tasks/{id}/accept
Response: { success: true, task: {...} }
```

**Decline Task:**
```typescript
POST /api/artist/tasks/{id}/decline
Body: { reason?: "too_busy" | "skill_mismatch" | "deadline_too_tight" | "other" }
Response: { success: true }
```

---

## Part 3: Escalation & Fallback Strategy

### 3.1 Escalation Chain

```
Level 1: Top 3 artists (sequential offers)
    ↓ (all declined/expired)
Level 2: Next 3 artists (with relaxed skill matching)
    ↓ (all declined/expired)
Level 3: Broadcast to all available artists
    ↓ (no takers after 30 min)
Level 4: Admin intervention
```

### 3.2 Level Details

**Level 1 - Best Matches (Default)**
- Offer to top-scored artist
- Wait for acceptance window
- If declined/expired, offer to #2, then #3
- Skill match threshold: 70%

**Level 2 - Relaxed Matching**
- Lower skill threshold to 50%
- Include artists slightly over workload limit (4 tasks → 5)
- Expand timezone tolerance (include night hours with bonus credits)
- Offer to next 3 artists sequentially

**Level 3 - Broadcast Mode**
- Post task to "Available Tasks" pool
- All eligible artists can claim (first-come-first-served)
- Notify all available artists simultaneously
- 30-minute window before Level 4

**Level 4 - Admin Intervention**
- Auto-notify admin (email + Slack + WhatsApp)
- Admin dashboard shows "Unassigned Critical" section
- Admin can:
  - Manually assign to specific artist
  - Extend deadline and retry
  - Split task into smaller pieces
  - Contact client about delay

### 3.3 Edge Cases

| Scenario | Handling |
|----------|----------|
| No artists with required skills | Immediately escalate to Level 4 with skill gap alert |
| All artists at max workload | Notify admin + show client estimated wait time |
| After-hours urgent task | Offer premium rate to night-shift artists + admin alert |
| Artist accepts then goes offline | Auto-reassign after 2 hours of no activity |
| Client cancels during offer period | Cancel offer, notify artist, refund credits |
| Artist repeatedly declines | Track decline rate, flag for admin review |
| System downtime during offer | Extend all offer windows by downtime duration |

### 3.4 Decline Tracking & Learning

Track decline patterns to improve future matching:

```sql
CREATE TABLE task_offer_log (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  artist_id TEXT REFERENCES users(id),
  offered_at TIMESTAMP,
  responded_at TIMESTAMP,
  response ENUM('accepted', 'declined', 'expired'),
  decline_reason TEXT,
  match_score DECIMAL(5,2),
  escalation_level INTEGER
);
```

Use this data to:
- Identify skill gaps in artist pool
- Detect problematic artists (high decline rate)
- Tune scoring weights based on acceptance patterns
- Predict acceptance likelihood

---

## Part 4: Database Schema Changes

### 4.1 New Tables

```sql
-- Formalized skill taxonomy
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT, -- 'design', 'video', 'development', etc.
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Artist skill proficiency
CREATE TABLE artist_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id TEXT REFERENCES users(id),
  skill_id UUID REFERENCES skills(id),
  proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'expert'),
  years_experience DECIMAL(3,1),
  verified BOOLEAN DEFAULT false, -- admin verified
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(artist_id, skill_id)
);

-- Task skill requirements
CREATE TABLE task_skill_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  skill_id UUID REFERENCES skills(id),
  is_required BOOLEAN DEFAULT true, -- required vs nice-to-have
  min_proficiency ENUM('beginner', 'intermediate', 'advanced', 'expert'),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Task offer tracking
CREATE TABLE task_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  artist_id TEXT REFERENCES users(id),
  match_score DECIMAL(5,2),
  escalation_level INTEGER DEFAULT 1,
  offered_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP,
  response ENUM('pending', 'accepted', 'declined', 'expired'),
  decline_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Artist working hours preferences
CREATE TABLE artist_availability_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id TEXT REFERENCES users(id),
  day_of_week INTEGER, -- 0=Sunday, 6=Saturday
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Schema Modifications

```sql
-- Add to tasks table
ALTER TABLE tasks ADD COLUMN complexity ENUM('simple', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate';
ALTER TABLE tasks ADD COLUMN offered_to TEXT REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN offer_expires_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN escalation_level INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN urgency ENUM('critical', 'urgent', 'standard', 'flexible') DEFAULT 'standard';

-- Add to freelancer_profiles table
ALTER TABLE freelancer_profiles ADD COLUMN experience_level ENUM('junior', 'mid', 'senior', 'expert') DEFAULT 'junior';
ALTER TABLE freelancer_profiles ADD COLUMN max_concurrent_tasks INTEGER DEFAULT 3;
ALTER TABLE freelancer_profiles ADD COLUMN accepts_urgent_tasks BOOLEAN DEFAULT true;
ALTER TABLE freelancer_profiles ADD COLUMN working_hours_start TIME DEFAULT '09:00';
ALTER TABLE freelancer_profiles ADD COLUMN working_hours_end TIME DEFAULT '18:00';
ALTER TABLE freelancer_profiles ADD COLUMN avg_response_time_minutes INTEGER; -- calculated
ALTER TABLE freelancer_profiles ADD COLUMN acceptance_rate DECIMAL(5,2); -- calculated
ALTER TABLE freelancer_profiles ADD COLUMN on_time_rate DECIMAL(5,2); -- calculated
```

### 4.3 New Status Values

```typescript
// Extended task status enum
type TaskStatus =
  | 'PENDING'           // Created, not yet offered
  | 'OFFERED'           // Offered to an artist, awaiting response
  | 'ASSIGNED'          // Artist accepted
  | 'IN_PROGRESS'       // Work started
  | 'PENDING_ADMIN_REVIEW'
  | 'IN_REVIEW'
  | 'REVISION_REQUESTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'UNASSIGNABLE';     // No artists available, needs admin
```

---

## Part 5: API Endpoints

### 5.1 New Endpoints

```typescript
// Artist accepts an offered task
POST /api/artist/tasks/:taskId/accept
Response: { success: boolean, task: Task }

// Artist declines an offered task
POST /api/artist/tasks/:taskId/decline
Body: { reason?: DeclineReason }
Response: { success: boolean }

// Get current offer for artist (if any)
GET /api/artist/current-offer
Response: { offer?: TaskOffer, task?: Task, expiresIn: number }

// Admin: Get unassigned tasks needing attention
GET /api/admin/tasks/unassigned
Response: { tasks: Task[], escalationStats: {...} }

// Admin: Force assign task
POST /api/admin/tasks/:taskId/force-assign
Body: { artistId: string, reason?: string }
Response: { success: boolean }

// Admin: Get artist matching scores for a task
GET /api/admin/tasks/:taskId/matching-scores
Response: { scores: ArtistScore[] }
```

### 5.2 Background Jobs

```typescript
// Check for expired offers (runs every minute)
CRON: processExpiredOffers()
  - Find all offers where expires_at < NOW() AND response = 'pending'
  - Mark as 'expired'
  - Trigger next artist in escalation chain

// Calculate artist metrics (runs daily)
CRON: updateArtistMetrics()
  - Calculate acceptance_rate, on_time_rate, avg_response_time
  - Update experience_level based on completed tasks

// Escalation alerts (runs every 5 minutes)
CRON: checkEscalationAlerts()
  - Find tasks at Level 3+ for > 30 minutes
  - Send admin alerts
```

---

## Part 6: Notification Flow

### 6.1 Artist Notifications

| Event | Channels | Content |
|-------|----------|---------|
| New offer | Push, Email, WhatsApp | Task title, deadline, credits, accept/decline links |
| Offer expiring soon (5 min) | Push | Reminder with time remaining |
| Offer expired | Push, Email | Notification that offer went to next artist |

### 6.2 Admin Notifications

| Event | Channels | Content |
|-------|----------|---------|
| Task reached Level 3 | Slack, Email | Task details, why no takers |
| Task reached Level 4 | Slack, WhatsApp, Email | Urgent: manual intervention needed |
| High decline rate detected | Daily digest | Artists with >50% decline rate |

### 6.3 Client Notifications

| Event | Channels | Content |
|-------|----------|---------|
| Task assigned | Email, In-app | Artist name, estimated start |
| Assignment delayed | Email | Explanation, new timeline |

---

## Part 7: Additional Features to Consider

### 7.1 Artist Preferences

Let artists set preferences:
- Preferred task categories
- Minimum credit value to accept
- Maximum concurrent tasks
- Blackout days/hours
- Vacation mode (pause all offers)

### 7.2 Client-Artist Affinity

Track successful pairings:
- Client can "favorite" an artist
- Favorited artists get +10 score boost
- Repeat pairings for brand consistency

### 7.3 Skill Verification

- Portfolio-based skill verification
- Admin can verify/endorse skills
- Verified skills get higher weight in matching

### 7.4 Smart Complexity Detection

Auto-detect complexity from:
- Estimated hours (>8h = advanced+)
- Number of deliverables
- Number of required skills
- Credit value
- Keywords in description ("complex", "multi-page", etc.)

### 7.5 Real-time Availability

- Integration with calendar (Google Calendar)
- "Do not disturb" mode
- Automatic availability based on current task load

---

## Part 8: Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create new database tables (skills, artist_skills, task_offers)
- [ ] Add new columns to existing tables
- [ ] Implement basic skill matching
- [ ] Add complexity field to task creation

### Phase 2: Scoring Algorithm (Week 2-3)
- [ ] Implement all scoring functions
- [ ] Create composite score calculation
- [ ] Add timezone handling with luxon/date-fns-tz
- [ ] Build artist ranking system

### Phase 3: Offer Workflow (Week 3-4)
- [ ] Implement OFFERED status and offer tracking
- [ ] Build accept/decline endpoints
- [ ] Create expiration background job
- [ ] Add escalation chain logic

### Phase 4: Notifications & UI (Week 4-5)
- [ ] Add offer notifications (push, email, WhatsApp)
- [ ] Build artist offer acceptance UI
- [ ] Create admin escalation dashboard
- [ ] Add client visibility into assignment status

### Phase 5: Analytics & Tuning (Week 5-6)
- [ ] Build matching analytics dashboard
- [ ] Implement metric calculations (acceptance rate, etc.)
- [ ] A/B test scoring weights
- [ ] Tune based on real data

---

## Part 9: Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Avg time to assignment | Instant (wrong match) | < 15 min (right match) |
| First-offer acceptance rate | N/A | > 70% |
| Task reassignment rate | Unknown | < 10% |
| Artist satisfaction (survey) | Unknown | > 4.0/5.0 |
| Client satisfaction (survey) | Unknown | > 4.5/5.0 |
| Skill match accuracy | 0% | > 85% |

---

## Appendix A: Example Scoring Scenario

**Task:**
- Category: Video/Motion
- Required skills: After Effects, Motion Graphics
- Complexity: Advanced
- Deadline: 48 hours
- Time created: 2:00 PM UTC

**Artist A:**
- Skills: [After Effects (expert), Motion Graphics (advanced), Premiere (intermediate)]
- Timezone: UTC (2:00 PM local)
- Experience: Senior (75 completed tasks)
- Active tasks: 2
- Rating: 4.8

**Scores:**
- Skill: 100 (has all required skills)
- Timezone: 100 (peak hours)
- Experience: 100 (Senior for Advanced task)
- Workload: 60 (2 active tasks)
- Performance: 96 (4.8 rating)

**Composite:** (100×0.35) + (100×0.20) + (100×0.20) + (60×0.15) + (96×0.10) = **93.6**

**Artist B:**
- Skills: [After Effects (intermediate), Figma (expert)]
- Timezone: UTC+8 (10:00 PM local)
- Experience: Mid (30 completed tasks)
- Active tasks: 1
- Rating: 4.5

**Scores:**
- Skill: 50 (missing Motion Graphics - but has After Effects)
- Timezone: 50 (late evening)
- Experience: 70 (Mid for Advanced task)
- Workload: 80 (1 active task)
- Performance: 90 (4.5 rating)

**Composite:** (50×0.35) + (50×0.20) + (70×0.20) + (80×0.15) + (90×0.10) = **60.5**

**Result:** Artist A gets first offer with score 93.6 vs Artist B's 60.5

---

## Appendix B: Decline Reason Categories

```typescript
type DeclineReason =
  | 'too_busy'           // Already have too much work
  | 'skill_mismatch'     // Don't have the required skills
  | 'deadline_too_tight' // Can't meet the deadline
  | 'low_credits'        // Payment not worth the effort
  | 'personal_conflict'  // Scheduling conflict
  | 'client_history'     // Bad experience with client
  | 'other';             // Free-text reason
```

---

## Questions for Stakeholder Review

1. What should be the maximum number of concurrent tasks per artist?
2. Should artists be able to set their own working hours?
3. How should we handle timezone for remote/traveling artists?
4. What is the acceptable wait time for clients before escalating to admin?
5. Should we allow clients to request specific artists?
6. How do we handle skill gaps (no artists with required skills)?
7. Should artists be penalized for frequent declines?
8. What notification channels are mandatory vs optional?

---

*Document Version: 1.0*
*Last Updated: January 2025*
*Author: Claude Code*
