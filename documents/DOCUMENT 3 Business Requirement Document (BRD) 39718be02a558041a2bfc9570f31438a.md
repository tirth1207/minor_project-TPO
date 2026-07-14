# DOCUMENT 3: Business Requirement Document (BRD)

### **3.1 Business Goals & Objectives**

| **ID** | **Business Goal** | **Success Metric** | **Target** |
| --- | --- | --- | --- |
| BG-01 | Reduce administrative overhead for TPOs | Time spent managing placement drives | Decrease by 80% vs Excel |
| BG-02 | Prevent eligibility errors | Number of ineligible applications submitted | 0% (blocked at UI level) |
| BG-03 | Improve student interview readiness | AI mock interview completion rate | >70% of eligible students |
| BG-04 | Ensure data security across colleges | Zero cross-tenant data leaks | 100% RLS enforcement |

### **3.2 Business Rules**

1. **Tenancy Isolation:** A College Admin *cannot* view data outside their assigned College ID. A Mentor *cannot* view students outside their assigned Department ID.
2. **Profile Gating:** A student with a **`profile_status != 'APPROVED'`** cannot view the "Apply" button on any job posting.
3. **Offer Exclusivity:** Once a student's offer state transitions to **`ACCEPTED`**, the student's **`is_placed`** boolean flips to **`true`**, revoking all future application permissions.
4. **Document Validity:** The system does not verify external URLs; the liability of link validity (public access) falls on the Mentor during the approval process.