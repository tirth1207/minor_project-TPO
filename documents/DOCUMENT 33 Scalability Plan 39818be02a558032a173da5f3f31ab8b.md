# DOCUMENT 33: Scalability Plan

| Component | Current Limit | Scaling Solution (If needed) |
| --- | --- | --- |
| **Next.js (Vercel)** | Serverless execution timeout (10s default, 60s max). | Ensure AI calls do NOT run in standard serverless functions. AI MUST run in background queue or edge function with 5min timeout. |
| **Database (Supabase)** | Free tier limits (500MB, 50k rows). Pro tier (8GB, unlimited rows). | Upgrade to Pro. Enable Point-in-Time Recovery. |
| **DB Connections** | Vercel opens many concurrent connections. | Use Supabase Connection Pooling (Supavisor) in `server.ts`. Transaction mode for Server Actions. |
| **AI Queue (40 RPM)** | Hard limit by Nvidia. | Cannot scale vertically. Must scale horizontally by caching common mock interview questions in DB to bypass API calls for identical job roles. |