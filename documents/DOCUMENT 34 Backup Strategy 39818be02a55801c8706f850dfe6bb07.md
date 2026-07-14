# DOCUMENT 34: Backup Strategy

| Data Type | Backup Method | Frequency | Retention |
| --- | --- | --- | --- |
| **PostgreSQL DB** | Supabase Cloud Native Backups | Daily | 7 days (Free), 30 days (Pro) |
| **Schema Migrations** | Supabase CLI migration files in Git repo | On every schema change | Indefinite (Git history) |
| **Frontend Assets** | Vercel Deployment Snapshots | On every deploy | Unlimited (Vercel handles) |
| **Environment Vars** | Vercel Environment Variables (Encrypted at rest) | Manual update | N/A |