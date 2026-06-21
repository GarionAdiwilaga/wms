# Shared Memory & Handoff Protocol

When operating in this repository, you must treat the repository as the **Source of Truth** for all context, as the user frequently splits work across different chat sessions. 

You must maintain and interact with three specific memory files located in the `wms/` directory:
1. `wms/CURRENT_STATUS.md` (The Handoff Document)
2. `wms/DECISIONS.md` (The Permanent Memory)
3. `wms/HANDOFF.md` (The Temporary Context)

### 1. Initialization (Start of Chat)
Before taking action or generating plans on a new task, you MUST read:
- `wms/CURRENT_STATUS.md` to understand the active phase, blockers, and next tasks.
- `wms/HANDOFF.md` for immediate context from the previous chat.
- `wms/DECISIONS.md` (or search it) to ensure you do not violate previously settled architectural or business rules.

### 2. Execution (During Task)
If a major architectural, technical, or business decision is made during your session, you MUST append it to `wms/DECISIONS.md`. Format it strictly:
```markdown
### [Topic Name]
**Decision:** [What was decided]
**Business Rule:** [Any related rule]
**Reason:** [Why it was decided to prevent future contradiction]
```

### 3. Conclusion (End of Chat / Switching Tasks)
Before concluding your session or when the user indicates a handoff to a new chat, you MUST update:
- `wms/CURRENT_STATUS.md`: Keep it structured with headings for `## Phase`, `## Last Completed`, `## Current Branch`, `## Current Focus`, `## Next Task`, and `## Blockers`.
- `wms/HANDOFF.md`: Update it with the current `Date`, `Completed` items, `Current` focus, `Next` steps, and specific `Notes` that the next agent needs to know.
