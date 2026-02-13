# Chat & Submission Flow - Bug Report

## Testing Summary

Tested the complete chat and task submission flow on localhost:3000

---

## CRITICAL BUGS

### 1. Task Submission Completely Broken

**Severity:** CRITICAL
**Location:** Task submission flow
**Description:** The AI claims "Your task has been submitted to our creative team" but NO task is actually created. Verified by checking /dashboard/tasks which shows "No tasks yet."
**Expected:** Task should be created in database and appear in Tasks list
**Actual:** Task is not created despite success message

### 2. No Credit Validation Before Submission

**Severity:** CRITICAL
**Location:** Brief panel / submission flow
**Description:** User has 0 credits but task costs 3 credits. No error or warning is shown. The submission proceeds (though ultimately fails silently).
**Expected:** Clear error message like "Insufficient credits. You need 3 credits but have 0."
**Actual:** No validation, submission appears to succeed

---

## SIGNIFICANT BUGS

### 3. AI Response Starts with "Choice -"

**Severity:** Medium
**Location:** `src/lib/ai/chat.ts` - BANNED_OPENERS regex
**Description:** AI response begins with "Choice -" which is awkward. The BANNED_OPENERS list has `/^Choice[!,.\s]+/i` but doesn't match "Choice -"
**Expected:** Clean conversational opener
**Actual:** "Choice - I love it!" or similar awkward starts
**Fix:** Add `/^Choice\s*-\s*/i` to BANNED_OPENERS

### 4. AUDIENCE Field Shows User's Message

**Severity:** Medium
**Location:** Brief panel extraction
**Description:** The AUDIENCE field in the brief panel shows the user's input message verbatim instead of extracted audience info
**Expected:** "Young professionals" or actual target audience
**Actual:** "i need a instagram post for my coffee shop"

### 5. SUMMARY Field Shows User's Message

**Severity:** Medium
**Location:** Brief panel extraction
**Description:** The SUMMARY field shows the user's message instead of an AI-generated project summary
**Expected:** "Instagram post design for a coffee shop brand"
**Actual:** "i need a instagram post for my coffee shop"

### 6. Chat Flow Stuck in Style Selection Loop

**Severity:** Medium
**Location:** Chat state management
**Description:** After selecting a style, the AI keeps showing style options again instead of proceeding to submission
**Expected:** Linear flow: message → styles → confirm → submit
**Actual:** Loops back to showing styles repeatedly

### 7. AI Response Missing Proper Punctuation

**Severity:** Low
**Location:** AI response formatting
**Description:** Some AI responses lack proper sentence structure and punctuation
**Expected:** Well-formatted response with proper grammar
**Actual:** Run-on sentences or abrupt endings

---

## UX IMPROVEMENTS

### 8. Green Dot Misleading for Zero Credits

**Location:** Credits display in sidebar
**Issue:** Shows green dot with "0 credits available" - green implies positive/good
**Suggestion:** Use red/orange indicator when credits are 0 or low

### 9. Style Cards Hidden Below Fold

**Location:** Chat interface
**Issue:** Style reference cards appear below the visible area, requiring scroll
**Suggestion:** Auto-scroll to show styles, or show them more prominently

### 10. No Clear "Select Style" Button

**Location:** Style preview modal
**Issue:** When previewing a style, there's no obvious "Select This Style" button
**Suggestion:** Add prominent CTA button in modal

### 11. Brief Panel Fields Not Editable

**Location:** Right panel brief summary
**Issue:** Extracted fields (SUMMARY, INTENT, etc.) cannot be edited by user
**Suggestion:** Make fields editable for user corrections

### 12. No Loading State During Submission

**Location:** Submit button
**Issue:** No visual feedback that submission is processing
**Suggestion:** Add spinner/loading state on submit button

### 13. No Confirmation Before Spending Credits

**Location:** Submission flow
**Issue:** No final confirmation like "This will use 3 credits. Continue?"
**Suggestion:** Add confirmation dialog before deducting credits

### 14. Chat Input Placeholder Too Generic

**Location:** Chat input field
**Issue:** Placeholder doesn't guide users on what to type
**Suggestion:** Use examples like "Describe your design project..."

---

## How to Reproduce

1. Go to http://localhost:3000/dashboard/chat
2. Type "i need an instagram post for my coffee shop"
3. Send the message
4. Observe AI response starts with "Choice -"
5. Check the Brief panel - SUMMARY and AUDIENCE show your message
6. Select a style from the cards
7. AI may loop back to showing styles again
8. Eventually click "Submit Task"
9. AI claims success but check /dashboard/tasks - NO task created

---

## Priority Fix Order

1. **CRITICAL:** Fix task submission - tasks must actually be created
2. **CRITICAL:** Add credit validation before submission
3. **Medium:** Fix field extraction (SUMMARY, AUDIENCE, etc.)
4. **Medium:** Fix BANNED_OPENERS to catch "Choice -"
5. **Medium:** Fix chat flow state machine to not loop
6. **Low:** UX improvements
