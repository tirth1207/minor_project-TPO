# DOCUMENT 32: Performance Strategy

| Area | Strategy | Expected Impact |
| --- | --- | --- |
| **Routing** | Use React Server Components (RSC) for all initial page loads. Zero client-side JS for layout/nav. | Massive reduction in Time to Interactive (TTI). |
| **Data Fetching** | Fetch only necessary columns in Supabase queries (avoid `select *`). | Lower DB payload size. |
| **Indexing** | Add composite indexes on `applications(student_id, status)` and `job_postings(company_id, global_status)`. | Sub-millisecond query times for dashboard lists. |
| **AI Queue** | Return HTTP 202 Accepted immediately to client. Client polls `/status` every 3 seconds. | User sees instant feedback; no request timeouts. |
| **Assets** | Vercel Edge CDN caches static assets (CSS, JS, Fonts). | Global fast load times. |