# DOCUMENT 36: Logging Strategy

| Level | Tool | What is Logged | Format |
| --- | --- | --- | --- |
| **Application Errors** | Vercel Logs / Server Console | Uncaught Server Action errors, Zod validation failures | `console.error({ message, stack, userId })` |
| **AI Queue** | Supabase Table `mock_interviews` | Status changes (`GENERATING` -> `FAILED`), API error messages from Nvidia | Structured JSON in `ai_feedback` column |
| **Audit Trail** | Implicit via DB `updated_at` | Profile changes, Status transitions | `updated_at` timestamps on all rows. |