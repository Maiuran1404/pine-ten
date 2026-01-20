
## CRITICAL: Database Safety Rules

**NEVER run seed scripts or any commands that delete/clear database data without EXPLICIT user permission.**

- Always check if a script deletes data before running it
- If a script clears tables, ASK the user first
- Prefer scripts that APPEND data rather than replace
- When in doubt, DO NOT run destructive operations
- Database data is precious and often cannot be recovered

This rule exists because 377 deliverable style references were accidentally deleted by running a seed script without permission.
