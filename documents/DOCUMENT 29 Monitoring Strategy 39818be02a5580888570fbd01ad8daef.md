# DOCUMENT 29: Monitoring Strategy

| Layer | Tool | Metric Monitored | Alert Trigger |
| --- | --- | --- | --- |
| **Frontend** | Vercel Analytics | Web Vitals (FCP, LCP, CLS) | CLS > 0.1 or LCP > 2.5s |
| **Backend** | Vercel Logs | Server Action errors, 500 status codes | > 5 errors in 5 mins |
| **Database** | Supabase Dashboard | DB CPU usage, Connection pool usage, RLS policy latency | Pool > 80% capacity |
| **AI Queue** | Custom Log Drain (Stdout) | Nvidia API 429 errors, Queue length | Queue length > 50 pending |