# DOCUMENT 30: Security Checklist

| Category | Check | Status (Default) |
| --- | --- | --- |
| **Auth** | Passwords hashed via Bcrypt (Supabase default) | ✅ Enabled |
| **Auth** | JWT expiration set to 1 hour | ✅ Enabled |
| **Auth** | Refresh token rotation enabled | ✅ Enabled |
| **Network** | All connections forced to HTTPS | ✅ Enabled (Vercel/Supabase) |
| **Network** | CORS strictly set to `https://yourdomain.com` | ⚠️ Must configure in Supabase Dashboard |
| **Database** | RLS enabled on ALL tables except `auth.users` | ⚠️ Must enforce in migrations |
| **Database** | Service Role Key never exposed to client | ✅ Handled by Supabase SSR setup |
| **App** | Input sanitization against XSS via React default escaping | ✅ Enabled |
| **App** | SQL Injection prevented via Supabase parameterized queries | ✅ Enabled |
| **App** | CSRF protection via SameSite cookies (Supabase default) | ✅ Enabled |