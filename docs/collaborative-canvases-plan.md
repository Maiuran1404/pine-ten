# Collaborative Canvases — Feature Plan

## Status: Planning (2026-02-22)

---

## What Are Canvases?

The right-panel views in the chat briefing flow. Four types:

- **Storyboard** (video) — scenes with duration, script, camera notes, transitions
- **Layout** (website) — sections with headline, CTA, content blocks, reorderable
- **Content Calendar** (content/marketing) — weekly posts, pillars, CTAs, cadence
- **Design Spec** (brand/design) — format, dimensions, key elements, copy guidance

Currently: AI-generated, read-only. Users refine via chat feedback only.

---

## Current Architecture (As-Is)

### Data Flow

```
Chat API → AI response → BriefingStateMachine → briefingState.structure → StructurePanel renders canvas
```

### Storage

- **In-memory**: `briefingState.structure` (React state via hooks)
- **Draft persistence**: `chatDrafts.briefingState` (JSONB) + localStorage fallback (server sync disabled due to duplicate bug)
- **Task snapshot**: `tasks.structureData` (JSONB, written once at submit, never mutated)

### Key Types

```typescript
type StructureData =
  | { type: 'storyboard'; scenes: StoryboardScene[] }
  | { type: 'layout'; sections: LayoutSection[] }
  | { type: 'calendar'; outline: ContentCalendarOutline }
  | { type: 'single_design'; specification: DesignSpec }
```

### What Exists But Isn't Wired

- `onSceneEdit(sceneNumber, field, value)` — callback prop defined, not connected
- `onSectionEdit(sectionIndex, field, value)` — callback prop defined, not connected
- `onSectionReorder(sections)` — callback prop defined, partial drag UI exists
- `onRegenerateScene(scene)` — callback prop defined, no API endpoint
- `onRegenerateField(scene, field)` — callback prop defined, no API endpoint

### What Doesn't Exist

- No canvas table (canvas data lives inside draft/task JSONB)
- No sharing/invitation system (workspace dropdown has disabled buttons)
- No real-time infrastructure (Supabase used for storage only, no Realtime)
- No workspace membership table
- No comment/annotation system
- No direct editing UI on any canvas element

---

## Decisions Made

| Question                     | Decision                                                                  |
| ---------------------------- | ------------------------------------------------------------------------- |
| Collaboration model          | Comment/suggest — collaborators view + annotate, creator edits            |
| Canvas as first-class entity | Yes — own table, own URL, own lifecycle                                   |
| Direct editing               | Yes — prerequisite before collaboration                                   |
| Sharing model                | Share-link based (Figma-style), no workspace concept for MVP              |
| Payment/submission           | Creator pays and submits, collaborators are advisory only                 |
| Chat relationship            | Canvas detached from chat once shared — collaborators only see the canvas |
| MVP scope                    | Saveable canvas + share link + view + comment. Creator edits + submits    |

---

## Open Questions

1. **Share link access level** — should the link be view-only by default, or should the creator choose "can comment" vs "can view" when generating the link?
2. **Anonymous commenting** — can someone with the link comment without logging in (just name/email), or do they need a Crafted account?
3. **Comment granularity** — should comments attach to specific fields within a scene (e.g., the "duration" field of scene 3), or just to the scene/section as a whole?
4. **Comment notifications** — email-based, in-app, both?
5. **Version history** — should canvases track versions (snapshots) so comments reference the right state? Or is current-state-only fine for MVP?
6. **Canvas without chat** — can a user create a canvas from scratch (no AI chat), or is chat always the starting point?

---

## Phased Implementation Plan

### Phase 1: Direct Editing (No Collaboration Yet)

**Goal**: Users can directly edit canvas content without going through the AI chat.

**Scope**:

- Wire up existing `onSceneEdit`, `onSectionEdit` callbacks in StructurePanel
- Add inline editing UI for all 4 canvas types:
  - Storyboard: click scene title/description/duration/script → inline textarea/input
  - Layout: click section headline/CTA/content → inline edit
  - Content Calendar: click post content/CTA/pillar details → inline edit
  - Design Spec: click format/dimensions/key elements → inline edit
- Edit state flows through existing `briefingState` → draft persistence pipeline
- No new database tables or API endpoints

**Key Files to Modify**:

- `src/components/chat/storyboard-view.tsx` — add edit mode to scene cards
- `src/components/chat/structure-panel.tsx` — wire callbacks to state mutations
- `src/components/chat/layout-preview.tsx` — add inline editing
- `src/components/chat/brief-panel/content-calendar.tsx` — add inline editing
- `src/components/chat/design-spec-view.tsx` — add inline editing
- `src/hooks/use-storyboard.ts` — add edit handlers that update `briefingState.structure`
- `src/components/chat/useChatInterfaceData.ts` — expose edit handlers from facade

**UX Pattern**:

- Click on any text field → transforms to editable input/textarea
- Escape or click outside → cancel
- Enter or blur → save
- Visual indicator (pencil icon on hover, blue outline when editing)
- "Edited" badge on manually modified fields vs AI-generated content

**No database changes.** Edits flow through the same `briefingState` → localStorage/draft persistence path.

---

### Phase 2: Canvas as First-Class Entity + Save/Resume

**Goal**: Canvases have their own identity, URL, and lifecycle independent of chat.

#### Database Schema

```sql
-- New table
CREATE TABLE canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL DEFAULT 'Untitled Canvas',
  type TEXT NOT NULL, -- 'storyboard' | 'layout' | 'calendar' | 'single_design'
  structure_data JSONB NOT NULL, -- StructureData (same shape as current)
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'shared' | 'submitted'
  draft_id UUID REFERENCES chat_drafts(id), -- back-reference to source chat
  task_id UUID REFERENCES tasks(id), -- set when submitted as a task
  moodboard_items JSONB DEFAULT '[]',
  style_references JSONB DEFAULT '[]',
  visual_direction JSONB,
  thumbnail_url TEXT, -- auto-generated preview image
  workspace_id UUID, -- NULL for MVP, reserved for future team feature
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_canvases_owner ON canvases(owner_id);
CREATE INDEX idx_canvases_status ON canvases(status);
```

#### Canvas Extraction Flow

```
Chat briefing reaches STRUCTURE stage
  → briefingState.structure populated by AI
  → User can edit directly (Phase 1)
  → "Save as Canvas" action creates a canvas record
  → Canvas gets its own URL: /dashboard/canvases/[id]
  → Creator can continue editing via chat (updates linked canvas)
  → Creator can edit directly on canvas page (no chat needed)
```

#### New Routes

- `GET /dashboard/canvases` — canvas list page ("My Canvases")
- `GET /dashboard/canvases/[id]` — standalone canvas view/edit page
- `GET /api/canvases` — list user's canvases
- `GET /api/canvases/[id]` — get canvas by ID (owner or share token)
- `POST /api/canvases` — create canvas (from chat or standalone)
- `PATCH /api/canvases/[id]` — update canvas structure/metadata
- `DELETE /api/canvases/[id]` — delete canvas (owner only)
- `POST /api/canvases/[id]/submit` — submit canvas as a task (deducts credits)

#### Canvas List View (Dashboard)

- Grid of canvas cards with:
  - Thumbnail preview (auto-generated or first scene image)
  - Title, type badge, last edited timestamp
  - Status badge (Draft / Shared / Submitted)
  - Quick actions: Open, Share, Delete
- Filter by type, sort by date
- Empty state: "Create your first canvas by starting a brief"

#### Standalone Canvas Page

- Full-width canvas rendering (no chat sidebar)
- Edit toolbar at top: title editing, type indicator, save status
- All direct editing from Phase 1 works here
- "Back to Chat" button if canvas has a linked draft
- "Submit" button (triggers task creation + credit deduction)

---

### Phase 3: Share Links + Commenting (Collaborative MVP)

**Goal**: Creator can share a canvas via link. Recipients can view and leave comments on specific elements.

#### Database Schema

```sql
-- Share links
CREATE TABLE canvas_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE, -- random URL-safe token
  created_by TEXT NOT NULL REFERENCES users(id),
  access_level TEXT NOT NULL DEFAULT 'comment', -- 'view' | 'comment'
  expires_at TIMESTAMP, -- NULL = never expires
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_share_links_token ON canvas_share_links(token);

-- Comments/annotations
CREATE TABLE canvas_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES users(id), -- NULL if anonymous
  author_name TEXT, -- for anonymous commenters
  author_email TEXT, -- for anonymous commenters (optional)

  -- Element targeting (what the comment is attached to)
  element_type TEXT NOT NULL, -- 'scene' | 'section' | 'post' | 'spec' | 'canvas'
  element_index INTEGER, -- scene number, section index, etc. NULL for canvas-level
  element_field TEXT, -- 'description' | 'duration' | 'headline' | NULL for whole element

  -- Comment content
  content TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by TEXT REFERENCES users(id),
  resolved_at TIMESTAMP,

  -- Threading
  parent_id UUID REFERENCES canvas_comments(id), -- for replies

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_canvas ON canvas_comments(canvas_id);
CREATE INDEX idx_comments_element ON canvas_comments(canvas_id, element_type, element_index);
```

#### Share Link Flow

```
Creator clicks "Share" on canvas
  → Modal with share link: app.getcrafted.ai/canvas/[id]?token=xxx
  → Creator can choose: "Can view" or "Can view & comment"
  → Copy link button
  → Optional: set expiration
  → Manage active links (revoke, change access)
```

#### Shared Canvas View (for collaborators)

- Route: `GET /canvas/[id]?token=xxx` (public route, no auth required for viewing)
- Read-only canvas rendering (same components, no edit affordances)
- If access_level = 'comment':
  - Comment indicators on elements (dots/badges showing comment count)
  - Click on any element → comment popover/sidebar
  - Enter name (if not logged in) + comment text
  - See existing comments threaded below the element
- If logged in: author_id tracked, otherwise author_name/email
- No access to chat history, moodboard details, or brief fields

#### Comment UX on Creator Side

- Comment indicators visible on canvas elements (red dots with count)
- Click to expand comment thread inline or in a sidebar
- "Resolve" button to mark comment as addressed
- Filter: All / Unresolved / Resolved
- Notification (in-app badge) when new comments arrive

#### API Endpoints

- `POST /api/canvases/[id]/share` — generate share link
- `GET /api/canvases/[id]/share` — list active share links
- `DELETE /api/canvases/[id]/share/[linkId]` — revoke share link
- `GET /api/canvas/[id]` — public canvas view (validates share token)
- `POST /api/canvas/[id]/comments` — add comment (validates share token)
- `GET /api/canvas/[id]/comments` — list comments
- `PATCH /api/canvas/[id]/comments/[commentId]` — resolve/edit comment
- `DELETE /api/canvas/[id]/comments/[commentId]` — delete comment (author or owner)

---

## Architecture Considerations

### Why NOT Real-Time for MVP

Real-time collaboration (CRDT/OT, multi-cursor, live sync) is massive infrastructure:

- Requires Yjs/Liveblocks/PartyKit or similar
- Conflict resolution for structured data (scenes, sections) is non-trivial
- Adds WebSocket infrastructure, presence tracking, cursor sync
- The canvas types are discrete structured cards, not freeform text — real-time concurrent editing is less natural here

The comment/annotation model sidesteps all of this. Comments are append-only (no conflicts), canvas edits are single-writer (creator only). Polling or simple refetch on focus is sufficient — no WebSocket needed.

### Token-Based Share Links

Share tokens should be:

- 32+ character random URL-safe strings (e.g., `nanoid(32)`)
- Not guessable or sequential
- Revocable by the creator
- Optionally time-limited
- Validated server-side on every request

No auth required to view a shared canvas — the token IS the authorization. This is the Figma model. If the link leaks, the creator can revoke it and generate a new one.

### Element Addressing Scheme

Comments need to reference specific canvas elements. The addressing scheme:

```typescript
interface CommentTarget {
  elementType: 'scene' | 'section' | 'post' | 'spec' | 'canvas'
  elementIndex: number | null // scene 3, section 1, etc.
  elementField: string | null // 'description', 'duration', 'headline', etc.
}
```

This is stable as long as elements aren't reordered. If the creator reorders scenes after comments are placed, comments may point to the wrong scene. Options:

- **MVP**: Accept this limitation. Comments reference by index. If scenes reorder, comments stay on the index.
- **V2**: Add stable element IDs to scenes/sections so comments track the element, not the position.

Recommendation: For MVP, use index-based addressing. Add a note in the UI: "Comments may shift if you reorder scenes." Add stable IDs in V2 when it matters.

### Canvas Thumbnails

For the canvas list view, auto-generated thumbnails would be nice but complex. Options:

- **MVP**: Use the first scene image (from `sceneImageData`) or a type-specific placeholder icon
- **V2**: Server-side canvas rendering to PNG via Puppeteer/Playwright

### Future: Workspace Layer

The schema includes `workspace_id` on canvases (nullable). When teams are needed:

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  company_id UUID REFERENCES companies(id), -- link to brand
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id),
  user_id TEXT REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'admin' | 'member' | 'viewer'
  PRIMARY KEY (workspace_id, user_id)
);
```

All canvases in a workspace are visible to members. This replaces share links for team contexts but share links still work for external collaborators.

---

## Effort Estimates (Rough Sizing)

| Phase   | Scope              | Key Work                                                                                             |
| ------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| Phase 1 | Direct Editing     | Inline edit UI for 4 canvas types, wire callbacks, state mutation handlers                           |
| Phase 2 | First-Class Entity | New DB table + migration, CRUD API, canvas list page, standalone canvas page, extract-from-chat flow |
| Phase 3 | Share + Comments   | Share link system, public canvas route, comment UI + API, notifications                              |

---

## Tech Stack Additions

| Need                  | Recommendation                           | Why                                                                       |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| Share tokens          | `nanoid`                                 | Already fast, URL-safe, no new dep needed if `crypto.randomUUID` suffices |
| Rich text in comments | Plain text for MVP                       | Avoid Markdown/WYSIWYG complexity                                         |
| Notifications         | In-app badge + optional email via Resend | Resend already in stack                                                   |
| Canvas page routing   | Next.js App Router public route group    | New `(public)` route group for `/canvas/[id]`                             |

---

## File Structure (Projected)

```
src/
  app/
    (client)/dashboard/canvases/         # Canvas list + detail pages
      page.tsx                           # List view
      [id]/page.tsx                      # Standalone canvas editor
    (public)/canvas/                     # Public shared canvas view
      [id]/page.tsx                      # Shared canvas (token-gated)
  api/
    canvases/
      route.ts                          # GET (list), POST (create)
      [id]/
        route.ts                        # GET, PATCH, DELETE
        share/route.ts                  # POST (create link), GET (list links)
        share/[linkId]/route.ts         # DELETE (revoke)
        submit/route.ts                 # POST (submit as task)
        comments/
          route.ts                      # GET (list), POST (create)
          [commentId]/route.ts          # PATCH (resolve), DELETE
  components/
    canvas/
      canvas-editor.tsx                 # Standalone canvas editor wrapper
      inline-edit-field.tsx             # Reusable inline edit component
      comment-indicator.tsx             # Dot/badge on elements
      comment-thread.tsx                # Threaded comments popover
      share-dialog.tsx                  # Share link modal
      canvas-card.tsx                   # Card for list view
  db/
    schema.ts                           # + canvases, canvas_share_links, canvas_comments tables
  hooks/
    use-canvas.ts                       # Canvas CRUD operations
    use-canvas-comments.ts              # Comment operations
    use-canvas-share.ts                 # Share link management
  lib/
    validations/
      canvas.ts                         # Zod schemas for canvas operations
```

---

## Summary

The collaborative canvas feature is three phases built on top of each other:

1. **Direct Editing** — make canvases editable by the creator (prerequisite)
2. **First-Class Entity** — give canvases their own identity, URL, persistence, and lifecycle
3. **Share + Comment** — let others view and annotate via share links

Each phase delivers standalone value. Phase 1 improves the existing product even without collaboration. Phase 2 enables save/resume which users need regardless. Phase 3 adds the collaborative layer.

The comment/annotation model is deliberately simpler than real-time collaboration. It avoids CRDT/OT complexity, WebSocket infrastructure, and conflict resolution — all of which can be added in a future V2 if the use case demands it.
