# DOCUMENT 6: Acceptance Criteria

*Detailed Given-When-Then scenarios for critical system paths.*

| **ID** | **US Ref** | **Scenario** | **Given** | **When** | **Then** |
| --- | --- | --- | --- | --- | --- |
| AC-01 | US-03 | Student registers via valid link | A valid, unused department invite link exists | Student fills registration form and submits | Account is created with correct **`college_id`** and **`dept_id`**, link is marked as used, verification email is sent |
| AC-02 | US-06 | Mentor rejects profile due to private link | Student profile is pending, resume URL is a restricted Drive link | Mentor clicks reject, selects "Private Link" tag, adds comment | Profile status becomes **`REJECTED`**, student gets in-app notification with mentor's comment, student can edit link and resubmit |
| AC-03 | US-08 | Student updates critical field | Student profile is **`APPROVED`** | Student updates CGPA from 7.5 to 8.0 and saves | Profile status automatically reverts to **`PENDING_APPROVAL`**, student cannot apply to jobs until mentor re-approves |
| AC-04 | US-10 | Ineligible student views job | Job requires CGPA >= 8.0 and Branch = CE. Student is ME with 8.5 CGPA | Student navigates to job details page | "Apply" button is hidden. UI displays red text: "Ineligible: Branch mismatch" |
| AC-05 | US-12 | Company uses bulk shortlist | Company has 50 eligible applicants sorted by CGPA | Company checks boxes for top 10 students, clicks "Bulk Shortlist" | Selected 10 students move to **`SHORTLISTED`** state, notifications sent to them, they disappear from the main applicant pool for this job |
| AC-06 | US-14 | Student accepts offer | Student has 3 active offers (Offer A, B, C) | Student clicks "Accept" on Offer A | Offer A -> **`ACCEPTED`**. Offers B & C -> **`AUTO_WITHDRAWN`**. Student **`is_placed`** = true. Companies B & C get withdrawal notifications. Student's application UI is disabled. |