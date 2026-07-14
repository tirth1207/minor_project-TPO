# DOCUMENT 37: Analytics Plan

### **Dashboard Widgets (Per Role)**

| **Role** | **KPI** | **Chart Type** | **Data Source** |
| --- | --- | --- | --- |
| **Super Admin** | Total Active Colleges | Stat Card | **`organizations`** table |
| **Super Admin** | Total Registered Students | Stat Card | **`student_profiles`** table |
| **College Admin** | Profile Approval Rate | Donut Chart | **`student_profiles`** (Approved vs Pending per dept) |
| **College Admin** | Applications per Department | Bar Chart | **`applications`** joined with **`users`** |
| **Student** | My Application Status Tracker | Kanban Board / Stepper | **`applications`** & **`application_rounds`** for user |
| **Company** | Funnel: Applied -> Shortlisted -> Offered | Funnel Chart | **`applications`** grouped by **`status`** for company's jobs |