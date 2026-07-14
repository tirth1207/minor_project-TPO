# DOCUMENT 27: Deployment Architecture

| Step | Tool | Action |
| --- | --- | --- |
| 1. Code Push | GitHub | Dev merges PR into `main` branch. |
| 2. CI Trigger | GitHub Actions | Runs `npm run lint`, `npm run type-check`, `npm run test`. |
| 3. Build | Vercel Build | Installs deps, runs `next build`. Generates optimized RSC payloads. |
| 4. DB Migrations | Supabase CLI | Vercel build step triggers `supabase db push` to apply any pending schema migrations to Cloud DB. |
| 5. Deploy | Vercel Edge | New serverless functions and static assets distributed globally. |
| 6. Zero-Downtime | Vercel | Instant rollback enabled if health checks fail. |