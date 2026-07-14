# DOCUMENT 20: Authentication Flow

*This details the specific flows for Registration, Magic Links, and JWT structure.*

### **20.1 Student Registration via Magic Link Flow**

1. **Link Generation:** College Admin calls **`POST /api/college-admin/invites`** -> System generates **`token`** -> System creates URL **`https://app.com/register?token=abc`**.
2. **Student Visit:** Student clicks link -> Next.js **`page.tsx`** reads **`?token=abc`** from URL.
3. **Form Submission:** Student fills Email, Password -> Frontend calls custom **`POST /api/auth/register`**.
4. **Backend Processing:** API Route calls **`supabase.auth.admin.createUser()`** (to bypass default Supabase email confirmation for a moment, allowing us to map the user).
5. **Mapping:** API Route looks up **`invite_links`** table by **`token`**. Inserts into **`users`** table with **`role='STUDENT'`**, **`org_id`**, and **`dept_id`** pulled from the invite link.
6. **Verification Trigger:** API Route triggers Supabase to send the verification email.
7. **Completion:** Student clicks email link -> **`auth.users.email_confirmed_at`** is set -> Student can now log in.

### **20.2 JWT Structure & RLS Claims**

Supabase JWTs contain a **`payload`** object. We will use a Postgres hook (trigger) on **`auth.users`** to mirror necessary data into **`raw_app_meta_data`** so it is available in the JWT without extra DB queries.

```json
{
	"sub": "uuid-of-user",	
	"email": "student@college.com",
	"role": "STUDENT",	
	"org_id": "uuid-of-college",
	"dept_id": "uuid-of-department",
	"aud": "authenticated"
}
```

*RLS Policies in PostgreSQL will use **`auth.uid()`** to match the **`id`** column, and **`(auth.jwt() ->> 'org_id')::uuid`** to enforce college-level isolation.*