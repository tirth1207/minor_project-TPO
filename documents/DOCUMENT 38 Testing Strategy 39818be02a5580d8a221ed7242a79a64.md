# DOCUMENT 38: Testing Strategy

*Given team constraints, testing is "Light but Critical".*

| **Type** | **Tool** | **Scope** | **Coverage Target** |
| --- | --- | --- | --- |
| **Unit** | Vitest | **`eligibility-engine.ts`**, **`offer-state-machine.ts`** | 100% of these pure logic files |
| **Component** | Vitest + React Testing Library | Shared UI Kit components (Button, Modal) | 20% (Only if time permits) |
| **E2E (Critical Paths)** | Playwright | 1. Login flow. 2. Student applies to job. 3. Mentor approves profile. 4. Company shortlists. | 4 core scripts only |