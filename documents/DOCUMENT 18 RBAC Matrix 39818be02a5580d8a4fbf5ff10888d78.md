# DOCUMENT 18: RBAC Matrix

*Defines exactly what data each role can interact with. **`RLS`** denotes this is enforced at the database level, not just API level.*

| **Entity / Action** | **Super Admin** | **College Admin** | **Mentor** | **Student** | **Company** |
| --- | --- | --- | --- | --- | --- |
| **Organizations (Colleges)** | Create, Read, Update (Status), Delete | Read (Own Only - RLS) | - | - | - |
| **Departments** | Create, Read, Update (Status) | Request Create, Read (Own Only - RLS) | Read (Assigned Only - RLS) | - | - |
| **Users (Global)** | Read All | Read (Own College - RLS) | Read (Assigned Dept - RLS) | Read (Self Only) | Read (Self Only) |
| **Student Profiles** | Read All | Read (Own College - RLS) | Read (Assigned Dept), **Update (Status)** | Read (Self), **Update (Self)** | Read (Applicants Only) |
| **Job Postings (Global)** | Read All, **Update (Global Status)** | Read (Targeted to them) | Read (Visible to dept) | Read (Eligible Only) | **Create, Read (Own), Update (Own)** |
| **Job Mappings (Local)** | Read All | **Update (Local Status)** | - | - | - |
| **Applications** | Read All | Read (Own College - RLS) | - | **Create (Self)**, Read (Self) | **Read (Own Jobs)**, **Update (Shortlist/Reject)** |
| **Interview Rounds** | Read All | Read (Own College - RLS) | - | Read (Self) | **Create, Update (Own Jobs)** |
| **Offers** | Read All | Read (Own College - RLS) | - | **Update (Accept/Reject Self)** | **Create, Update (Revoke Own)** |
| **AI Mock Interviews** | - | - | - | **Create, Read, Update (Self)** | Read (Scores if gate enabled) |
| **Invite Links** | - | **Create, Read (Own)** | - | Read (Use) | - |