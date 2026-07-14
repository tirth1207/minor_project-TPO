# DOCUMENT 8: Non-Functional Requirements

| **ID** | **Category** | **Requirement Description** | **Target Metric / Standard** |
| --- | --- | --- | --- |
| NFR-01 | Security | Multi-tenant Data Isolation | 100% Row Level Security (RLS) enforcement on all tables containing **`college_id`** or **`dept_id`**. Zero data leakage in API responses. |
| NFR-02 | Security | Authentication Security | Bcrypt hashed passwords (handled by Supabase Auth). JWT expiration <= 1 hour. HttpOnly secure refresh tokens. |
| NFR-03 | Performance | Page Load Time | First Contentful Paint (FCP) < 1.5s on 4G networks. |
| NFR-04 | Performance | AI Queue Handling | UI must not hang during AI generation. Max wait time communicated to user (e.g., "May take up to 2 minutes"). 40 RPM limit strictly obeyed via backend throttling. |
| NFR-05 | Scalability | Concurrent Users | System must handle at least 500 concurrent users (mixed read/write) without degradation, suitable for medium/large colleges. |
| NFR-06 | Usability | Design Language | Apple Minimalism. High whitespace, San Francisco or Inter font, subtle shadows, zero clutter. All components detailed but visually lightweight. |
| NFR-07 | Usability | Accessibility | Core flows (Login, Apply, Accept Offer) must meet WCAG 2.1 Level A standards (keyboard navigable, proper ARIA labels). |
| NFR-08 | Reliability | Uptime | Target 99.5% uptime during placement season (excluding scheduled maintenance). |
| NFR-09 | Maintainability | Code Structure | Modular architecture. A junior developer must be able to own a specific module (e.g., **`/modules/company`**) without understanding the whole codebase. |
| NFR-10 | Compatibility | Browser Support | Latest 2 versions of Chrome, Safari, Firefox, and Edge. No support for IE11. |