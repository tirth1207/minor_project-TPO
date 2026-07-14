# DOCUMENT 4: Software Requirement Specification (SRS)

### **4.1 System Overview**

The system is a monolithic Next.js application utilizing Supabase as a Backend-as-a-Service (BaaS). The frontend communicates directly with Supabase via the **`@supabase/auth-helpers-nextjs`** and **`@supabase/ssr`** packages. AI features are proxied through a Next.js API route to securely hold the Nvidia NIM API key and manage the 40 RPM rate limit queue.

### **4.2 Operating Environment**

- **Production:** Vercel (Next.js) + Supabase Cloud (Managed PostgreSQL).
- **Development:** Local Next.js dev server + Supabase Local CLI.

### **4.3 Assumptions & Dependencies**

- **Assumption:** Students have access to Google Drive/OneDrive to host their resumes and mark them as public.
- **Dependency:** Nvidia NIM API uptime. If the API goes down, the AI Mock Interview feature fails gracefully (showing a "System Busy" message).
- **Dependency:** Supabase RLS performance. Complex multi-tenant queries must be optimized with proper indexing on **`college_id`** and **`department_id`**.