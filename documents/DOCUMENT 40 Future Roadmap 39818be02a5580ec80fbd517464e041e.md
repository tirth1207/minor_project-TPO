# DOCUMENT 40: Future Roadmap

### **V2 (Post-Submission / Next Semester)**

- **Native File Storage:** Integrate Supabase Storage Buckets. Add resume parsing to auto-fill student CGPA/skills.
- **Advanced Eligibility Engine:** Add 10th/12th percentage cutoffs and exact Skill matching (e.g., Job requires "React", checks if "React" is in student **`skills`** array).
- **AI Shortlisting:** Implement Vector Embeddings (pgvector) for student resumes. Allow companies to use AI to rank applicants based on Job Description similarity, replacing the V1 rule-based sorting.

### **V3 (SaaS Transition)**

- **Billing & Subscriptions:** Stripe integration. College Admins pay per seat (per student/mentor) or per job posting.
- **White Labeling:** Allow colleges to add their own logo and primary colors, replacing the default Apple-minimalist theme.
- **Alumni Network:** Expand roles to include "Alumni". Allow alumni to post referrals or mentor current students.