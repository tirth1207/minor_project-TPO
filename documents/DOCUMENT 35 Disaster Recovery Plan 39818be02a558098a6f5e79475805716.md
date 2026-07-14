# DOCUMENT 35: Disaster Recovery Plan

| Scenario | RTO (Recovery Time) | RPO (Recovery Point) | Action Plan |
| --- | --- | --- | --- |
| **Vercel Outage** | < 5 mins | 0 (No data loss) | DNS failover to secondary hosting (e.g., Cloudflare Pages) if critical, otherwise wait for Vercel resolution. |
| **Supabase DB Failure** | < 1 hour | < 24 hours | Contact Supabase support. Restore from daily backup to a new Supabase project. Update Vercel env vars to new DB URL. |
| **Accidental Data Delete** | < 30 mins | 0 (If caught immediately) | Use Supabase Dashboard "Pause" DB feature to stop writes. Clone the database from the previous day's backup and extract deleted rows. |
| **Nvidia AI Outage** | N/A | N/A | Graceful degradation. Mock interview feature displays "System under maintenance. Please try again later." Rest of app functions normally. |