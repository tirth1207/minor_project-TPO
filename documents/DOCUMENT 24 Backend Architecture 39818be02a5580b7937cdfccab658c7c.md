# DOCUMENT 24: Backend Architecture

| **Aspect** | **Decision** | **Rationale** |
| --- | --- | --- |
| **Pattern** | Server Actions (Primary) + API Routes (Edge Cases) | Server Actions are co-located with forms, vastly reducing boilerplate for junior devs. API routes *only* used for AI streaming/proxying. |
| **Data Fetching** | **`supabase.server.ts`** | Uses **`cookies()`** to pass the user's JWT securely to the DB, enabling RLS. |
| **Validation** | Zod | Strict schema validation on *every* Server Action input before DB write. |
| **AI Queue Implementation** | PostgreSQL Advisory Locks + Cron | Since Vercel is stateless, we use **`pg_try_advisory_lock`** to ensure only one serverless function processes the AI queue at a time, strictly obeying 40 RPM. |
| **Error Handling** | Unified **`errors.ts`** | Custom error classes (**`UnauthorizedError`**, **`EligibilityError`**) caught by a global try-catch wrapper in Server Actions to return consistent JSON to the frontend. |