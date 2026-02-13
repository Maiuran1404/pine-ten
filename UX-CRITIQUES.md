# Crafted UX/UI Critiques & Solutions

## Testing Summary

Tested complete user flow as a new customer for Crafted, from dashboard to task submission attempt.

---

## CRITICAL ISSUES (Blocking User Flow)

### 1. No Submit Button After Creative Brief

**Problem:** The AI generates a complete Creative Brief with "Ready to create this!" but there is NO visible submit button anywhere. Progress bar is stuck at 58% "Refine your requirements". Users literally cannot submit their task.

**Impact:** Complete flow blocker - users cannot complete their primary goal.

**Solution:**

- Add a prominent "Submit Task" or "Create This" button after the Creative Brief
- Or implement the fallback submit detection we added earlier (check if it's working)
- Progress bar should advance to "Review your request" (80%) when brief is generated
- Add clear CTA: "Ready to submit? Click here to send to our designers"

---

### 2. Duplicate Recents in Sidebar

**Problem:** Every message exchange creates a NEW draft entry in the sidebar, all with the SAME name "Instagram - Launch (Organic)". After a conversation, there are 5+ identical entries cluttering the sidebar.

**Impact:** Confusing navigation, users can't tell which draft is which.

**Solution:**

- Only create ONE draft per conversation, update it as conversation progresses
- Generate unique names based on conversation content (e.g., "Coffee Brand Carousel - Jan 20")
- Add timestamps or context to differentiate drafts
- Consider only showing drafts when moodboard has items (already partially implemented)

---

### 3. Style Grid Appears Multiple Times

**Problem:** The 8-style selection grid keeps appearing multiple times throughout the conversation, even after user has already selected styles and added them to moodboard.

**Impact:** Redundant UI, confusing flow, users unsure if they need to select again.

**Solution:**

- Only show style grid ONCE initially
- After styles are added to moodboard, collapse the grid or show a summary
- If AI wants to show more styles, use a different UI (e.g., "Want to see more styles?")
- Don't duplicate style grids in each AI response

---

## MAJOR ISSUES (Significant UX Pain Points)

### 4. "Hover to Add to Moodboard" Not Discoverable

**Problem:** The only way to add a style to the moodboard is to hover over the card and click the appearing "Add to Moodboard" button. This interaction is not intuitive or discoverable.

**Impact:** Users might click cards expecting them to be added, but nothing happens. They may miss the hover functionality entirely.

**Solution:**

- Make "Add to Moodboard" visible by default (not just on hover)
- Add a persistent "+" button on each card
- Or allow click to add (single click = add, double click = preview)
- Add an onboarding tooltip: "Hover over any style to add it to your moodboard"

---

### 5. Progress Bar Not Updating Properly

**Problem:** Progress bar stuck at 58% "Refine your requirements" even after:

- User answered all questions
- AI generated complete Creative Brief
- AI said "Ready to create this!"

**Impact:** User doesn't know where they are in the process or what's next.

**Solution:**

- Update progress when Creative Brief is generated (should be 75-80%)
- Show "Review your request" stage when brief is complete
- Only show "Submit for creation" when submit button is available
- Add clear stage completion indicators

---

### 6. Credits Display Confusing

**Problem:** "0 credits" shown with a red dot on the dashboard. No explanation of:

- What credits are
- How to get them
- What happens if you have 0

**Impact:** Creates anxiety and confusion for new users. They may think they can't use the service.

**Solution:**

- Add tooltip explaining credits on hover
- Link to credits page/pricing
- Show message like "Free trial: 1 design included" for new users
- Remove alarming red dot or change to informational blue

---

### 7. "Matches Your Brand Colors" Section Unclear

**Problem:** Dashboard shows scrolling style images under "Matches Your Brand Colors" heading. Not clear:

- What these are for
- If they're clickable
- How they relate to the chat flow

**Impact:** Wasted screen real estate, confusing purpose.

**Solution:**

- Make clickable - clicking should start a chat with that style pre-selected
- Add subtitle: "Click any style to start designing"
- Or integrate into the chat experience instead of showing on dashboard

---

## MEDIUM ISSUES (UX Friction Points)

### 8. Style Cards Get Cut Off

**Problem:** Only 3-4 style cards visible at a time, rest require scrolling. Hard to see all 8 options at once.

**Solution:**

- Make style grid responsive - show more cards on wider screens
- Add scroll indicators or "See all 8 styles" button
- Consider horizontal carousel with peek preview

---

### 9. Moodboard Panel Too Small

**Problem:** Moodboard on the right shows tiny thumbnails. Hard to see style details or compare selected items.

**Solution:**

- Make moodboard expandable/collapsible
- Click thumbnail to see larger preview
- Add comparison view for selected styles
- Show more metadata (style axis, description)

---

### 10. Previously Selected Options Still Clickable

**Problem:** In conversation history, quick option buttons that were already selected still appear clickable. User might accidentally select again.

**Solution:**

- Disable previously selected options
- Grey out or visually mark "selected" state
- Already partially implemented but not consistent

---

### 11. Chat Title Changes Mid-Conversation

**Problem:** Chat title changed from "Instagram Posts" to "Instagram Stories" during conversation without user action.

**Solution:**

- Keep title consistent throughout conversation
- Only change if deliverable type explicitly changes
- Or use generic title like "Design Request"

---

### 12. Toast Notifications Easy to Miss

**Problem:** When adding style to moodboard, only feedback is a brief toast notification that disappears quickly.

**Solution:**

- Animate the moodboard panel when item is added
- Show persistent count increase
- Add subtle sound feedback (optional)
- Consider confetti or micro-animation for delight

---

## MINOR ISSUES (Polish/Nice-to-Have)

### 13. No Image Preview/Zoom

**Problem:** Can't see style images in detail without adding to moodboard.

**Solution:** Add lightbox/modal preview on click or long-press.

### 14. No Undo for Moodboard Actions

**Problem:** No way to undo removing an item from moodboard.

**Solution:** Add undo toast after remove action.

### 15. Example Prompts Text Small

**Problem:** Example prompt buttons on dashboard have small text, hard to read.

**Solution:** Increase font size or show clearer labels.

---

## RECOMMENDATIONS FOR 10x UX IMPROVEMENT

### 1. Simplify the Flow

- Reduce steps from 5 to 3: Brief → Style → Submit
- Combine "Choose style" and "Refine requirements" into one step
- Auto-advance when user has moodboard items and answered key questions

### 2. Always Show Clear CTA

- Every screen should have ONE clear next action
- "Add to moodboard" → "Review your selection" → "Submit for creation"
- Never leave user wondering "what now?"

### 3. Better Onboarding

- Show first-time user tutorial
- Highlight key interactions (hover to add, progress bar)
- Explain what happens after submit

### 4. Visual Feedback Everywhere

- Animate state changes
- Show loading states meaningfully
- Celebrate milestones (style added, brief complete)

### 5. Mobile-First Mindset

- Test on mobile - hover interactions don't work
- Need tap-based alternatives
- Consider thumb-zone for key actions

---

## Screenshots Reference

- `ux-test-1-dashboard.png` - Initial dashboard state
- `ux-test-2-styles-shown.png` - Styles displayed after prompt
- `ux-test-3-moodboard-1-item.png` - First item added to moodboard
- `ux-test-4-moodboard-3-items.png` - Multiple items in moodboard
- `ux-test-5-creative-brief.png` - Creative brief generated (no submit button!)
- `ux-test-session2-issues.png` - Session 2 showing duplicate drafts and repeated style grids

All screenshots saved to `.playwright-mcp/` directory.

---

# Session 2 Testing (Post-Fixes)

## Testing Summary

Tested after implementing fixes for: submit button detection, draft title timestamps, and style grid collapsing.

**What's Working:**

- ✅ Draft titles now include timestamps (e.g., "Carousel - Launch (Organic) · 12:44 pm")
- ✅ "Ready to submit?" fallback banner appears when AI says "ready"
- ✅ Collapsed style summaries show for older messages ("8 style options shown · 1 added to moodboard")
- ✅ Moodboard correctly tracks selected styles

**What's NOT Working:**

---

## NEW CRITICAL ISSUES

### 16. Style Grid Keeps Appearing (5+ times per conversation)

**Problem:** Despite user selecting a style and adding to moodboard, the AI keeps showing NEW full style grids in every response. In one conversation, the style grid appeared 5+ times.

**Root Cause:** The AI includes `[DELIVERABLE_STYLES: type]` marker in every response, even when user already made a selection. The collapsed summary only applies to the message that had styles, but new messages keep generating new grids.

**Impact:** Extremely confusing - user thinks they need to pick again, UI becomes cluttered.

**Solution:**

- Track when user has made a style selection in context
- Don't show new style grids if moodboard already has items of that type
- AI prompt needs: "Do NOT show style options again if user already selected styles"
- Only show style grid on FIRST response, never again unless user explicitly asks

---

### 17. Duplicate Draft Entries Multiply Rapidly

**Problem:** Sidebar shows 5+ entries of "Carousel - Launch (Organic) · 12:45 pm" - all pointing to different UUIDs. Each API call seems to create a new draft.

**Root Cause:** Server sync is assigning new UUIDs, and the client treats each as a separate draft. The deduplication by draft ID isn't working because the ID keeps changing.

**Impact:** Sidebar becomes unusable, users can't find their actual draft.

**Solution:**

- Debug the draft sync logic - client and server IDs should match
- Only show ONE draft per conversation in sidebar
- Deduplicate by title + timestamp, not just ID
- Consider removing server sync and using localStorage only

---

### 18. AI Doesn't Generate [TASK_READY] JSON Format

**Problem:** When user clicks "Generate Summary", AI writes a plain text "TASK SUMMARY" instead of the proper `[TASK_READY]...[/TASK_READY]` JSON block. This means no Task Confirmation Bar appears.

**Root Cause:** The AI prompt request message ("Please generate the task summary so I can submit it.") doesn't trigger the formal JSON output format.

**Impact:** Users can never complete submission - the "Ready to submit?" banner just keeps appearing in a loop.

**Solution:**

- Modify the fallback message to explicitly request: "Generate the [TASK_READY] block with JSON so I can submit"
- Or: When "TASK SUMMARY" is detected in response, parse it and create the task object programmatically
- Better: Train AI to always output [TASK_READY] when a complete brief exists

---

### 19. "Ready to Submit?" Banner Loops Infinitely

**Problem:** Even after clicking "Generate Summary", the banner reappears because AI response still contains "ready to submit" patterns.

**Root Cause:** The pattern matching is too aggressive and triggers even when the AI already generated a summary.

**Solution:**

- After user clicks "Generate Summary", disable the banner for that session
- Or: Check if previous message was "Please generate the task summary..." and hide banner
- Or: Only show banner if pendingTask is null AND message count > X AND no previous summary attempt

---

## NEW MAJOR ISSUES

### 20. AI Response Too Enthusiastic Despite Prompt

**Problem:** AI says "Perfect!", "Great choice! 🎯", uses emojis (☕, 🚀, ✅) despite system prompt saying:

- "Never enthusiastic or overly affirming"
- "NO emojis unless absolutely warranted"

**Impact:** Feels fake and AI-like, breaks the "senior creative operator" persona.

**Solution:**

- Strengthen prompt: "NEVER use emojis. NEVER say 'Perfect!' or 'Great choice!'"
- Add negative examples to prompt
- Consider model temperature adjustment

---

### 21. Wrong Style Recommendations for Context

**Problem:** For a "coffee subscription carousel", the AI recommended:

- "Dark Tech Product Showcase" as "Best match"
- "Dashboard Analytics Social Posts"
- "HIDRATE" (skincare)
- "Kpop North" (K-pop aesthetic)

None of these fit a warm, cozy coffee brand.

**Impact:** Users lose trust in AI recommendations, have to manually find appropriate styles.

**Solution:**

- Improve brand-matching algorithm to consider industry context
- "Coffee" should weight toward food/warm/organic styles
- Penalize tech/corporate styles for food products
- Use semantic understanding of user's business

---

### 22. Brand Colors Exposed to User in Chat

**Problem:** AI says "Your brand colors (#6B73FF primary, #F5F5F5 backgrounds, #333333 text) woven naturally" - users don't need to see hex codes.

**Impact:** Confusing, too technical, breaks immersion.

**Solution:**

- AI should NOT mention hex codes to users
- Just say "using your brand colors" without specifics
- Or show a visual color swatch instead of text

---

### 23. Pricing Shows "1 credit" for 5-Slide Carousel

**Problem:** A 5-slide Instagram carousel with custom content shows "Estimated Credits: 1 credit" - this is unrealistically low.

**Impact:** Sets wrong expectations, causes trust issues when actual price is higher.

**Solution:**

- Review credit calculation logic
- 5-slide carousel should be 15-25 credits minimum
- Show credit range rather than fixed number until finalized

---

## MEDIUM ISSUES

### 24. Old Quick Option Buttons Still Active

**Problem:** After selecting "Instagram", the button isn't disabled. User can click "LinkedIn" later and confuse the context.

**Solution:** Disable all option buttons once any is selected, or visually mark the selected one prominently.

### 25. Chat Title Changes from User Query

**Problem:** Title changed from "Create a carousel for my new coffee subs..." to "Instagram Posts" mid-conversation.

**Solution:** Lock title from first user message, never change it.

---

## PRIORITY FIX ORDER

1. **P0 - Blocking:** AI doesn't generate [TASK_READY] JSON → users can't submit
2. **P0 - Blocking:** Style grid shown 5+ times → clutters UI, confuses users
3. **P1 - Major:** Duplicate drafts in sidebar → unusable navigation
4. **P1 - Major:** Wrong style recommendations → poor user experience
5. **P2 - Medium:** AI too enthusiastic/uses emoji → breaks persona
6. **P2 - Medium:** Progress bar stuck at 58% → unclear flow state
