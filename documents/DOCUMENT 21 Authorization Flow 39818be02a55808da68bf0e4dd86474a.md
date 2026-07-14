# DOCUMENT 21: Authorization Flow

### **21.1 Database-Level Execution (Row Level Security)**

Authorization is primarily handled at the PostgreSQL layer, not in Next.js. When a request hits the database, Supabase injects the JWT into the session context.

**sql**

- - Example RLS Policy on student_profiles table

CREATE POLICY "Mentors can only see students in their department"

ON student_profiles FOR SELECT

USING (

dept_id = (current_setting('request.jwt.claims') ->> 'dept_id')::uuid

AND (current_setting('request.jwt.claims') ->> 'role') = 'MENTOR'

);

### **21.2 Application-Level Execution (Next.js Middleware)**

For route protection (UI level), we use Next.js **`middleware.ts`**.

1. Request hits **`/student/*`**.
2. Middleware extracts JWT from cookie.
3. Middleware checks **`role`** claim.
4. If **`role != 'STUDENT'`**, redirect to **`/unauthorized`**.
5. If **`role == 'STUDENT'`**, allow request to proceed to the RLS-protected API/Server Action.