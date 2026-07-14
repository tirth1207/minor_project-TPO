# DOCUMENT 31: API Security Checklist

| Check | Implementation Detail |
| --- | --- |
| **Rate Limiting (Global)** | Vercel default edge rate limits (1000 req/min). |
| **Rate Limiting (AI)** | Custom 40 RPM limiter in `/api/ai/mock`. Uses DB advisory locks to sync across serverless instances. |
| **Payload Validation** | Every Server Action / API route wrapped in `zodSchema.safeParse(data)`. Rejects malformed requests instantly. |
| **Authorization Check** | Even though RLS exists, Server Actions do a quick `if (user.role !== 'COMPANY') throw new UnauthorizedError()` as a defense-in-depth measure. |
| **Sensitive Data** | AI API key stored in Vercel Environment Variables (`NVIDIA_API_KEY`). Never sent to client. |