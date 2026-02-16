# Chat Experience Bug Fix Status

## Completed

| Bug | Description                                        | Commit    | Status |
| --- | -------------------------------------------------- | --------- | ------ |
| #9  | Whitespace collapsing destroys markdown formatting | `ac50b1e` | Fixed  |
| #1  | `[QUICK_OPTIONS]` raw JSON leaking into chat       | `baf2a62` | Fixed  |
| #6  | State machine quick options not rendering as chips | `bbfbd55` | Fixed  |
| #5  | "You decide & submit" button always visible        | `437618b` | Fixed  |
| #4  | "Generate Summary" button appears mid-conversation | `59b4abe` | Fixed  |
| #7  | No progress stepper visible                        | `6326a36` | Fixed  |
| #3  | No structured output components wired into chat    | `abf6042` | Fixed  |

## Deferred

| Bug | Description                         | Reason                              |
| --- | ----------------------------------- | ----------------------------------- |
| #8  | AI responses lack proper formatting | Resolved by Bug #9 fix              |
| #10 | 0 credits                           | Configuration issue, not a code bug |
| #11 | State machine stages not activating | Resolved by Bug #3, #6, #7 fixes    |
| #12 | Generic empty state suggestions     | Low priority                        |
