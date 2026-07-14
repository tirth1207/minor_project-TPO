# DOCUMENT 12: Data Flow Diagrams (DFD)

*Represented structurally for database and system mapping.*

### **Level 0: Context Diagram**

**System:** TPO Management System (0.0)
**External Entities:** Super Admin, College Admin, Mentor, Student, Company, Nvidia NIM AI API

| **External Entity** | **Data Flow To System** | **Data Flow From System** |
| --- | --- | --- |
| **Student** | Profile details, External URLs, Application requests, Mock test requests, Offer acceptance | Eligibility status, Application status, Interview round updates, AI Mock scores, Offer letters |
| **Company** | Company details, Job posting details, Shortlist selections, Round results, Offer details, Revocation requests | Approval status, Eligible applicant lists (sorted), Student profiles (with AI scores if applicable) |
| **College Admin** | Department requests, Job approval/rejection, Invite link generation requests | Dashboard stats, Mentor progress reports, Pending job list |
| **Mentor** | Profile approval/rejection, Rejection tags | Pending student list, Student profile data |
| **Super Admin** | College approvals, Company approvals, Department approvals | Global platform stats, Pending request queues |
| **Nvidia AI API** | Prompt payloads (Job role + questions) | AI generated questions, AI evaluation scores |

### **Level 1: High-Level System Processes**

**Data Stores:** D1 (Users/Auth), D2 (Profiles), D3 (Organizations), D4 (Jobs), D5 (Applications), D6 (AI Queue)

| **Process ID** | **Process Name** | **Input Data** | **Output Data** | **Data Stores Accessed** |
| --- | --- | --- | --- | --- |
| **1.0** | Auth & Onboarding | Email/Pass, Magic Link Token | JWT, User ID | D1, D3 |
| **2.0** | Profile Management | Profile JSON, URLs | Approval State | D1, D2, D3 |
| **3.0** | Job Post Management | Job JSON, Branch criteria | Job ID, Approval State | D3, D4 |
| **4.0** | Eligibility & Application | Student ID, Job ID | Application ID, Error Msgs | D2, D4, D5 |
| **5.0** | Interview & Offers | Shortlist IDs, Round results | Offer State, Placement Status | D4, D5, D2 |
| **6.0** | AI Mock Engine | Job Role ID | Question Set, Score | D5, D6 (Queue) |