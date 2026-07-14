# DOCUMENT 5: User Stories

**Module: Authentication & Onboarding**

| **ID** | **User Story** | **Acceptance Criteria (Brief)** |
| --- | --- | --- |
| US-01 | As a Super Admin, I want to approve a newly registered college so that they can start configuring their institution. | SA sees pending college in dashboard; clicks approve; college status becomes 'ACTIVE'; college admin receives notification. |
| US-02 | As a College Admin, I want to generate a unique invite link for a department so that students can join securely. | CA selects department -> clicks generate -> unique URL is created -> CA copies and shares via WhatsApp. |
| US-03 | As a Student, I want to register via the invite link so that I am automatically mapped to the correct college and department. | Student clicks link -> fills name/email/pass -> verifies email -> is saved with correct **`college_id`** and **`dept_id`**. |
| US-04 | As a Company, I want to register globally so I can post jobs across multiple colleges. | Company registers -> verifies email -> status is 'PENDING' -> waits for Super Admin approval. |

**Module: Profile Management**

| **ID** | **User Story** | **Acceptance Criteria (Brief)** |
| --- | --- | --- |
| US-05 | As a Student, I want to add external URLs for my resume so that I don't have to upload heavy files. | Student pastes Drive link -> system validates it's a valid URL format -> saves to DB. |
| US-06 | As a Mentor, I want to reject a profile and mark a resume link as "Not Public" so the student knows exactly what to fix. | Mentor clicks reject -> selects "Private Link" tag -> student gets notified -> student edits link -> resubmits. |
| US-07 | As a Student, I want to update my hobbies without needing mentor approval again so that I can keep my profile fresh. | Student edits hobbies/skills (non-critical) -> saves -> **`profile_status`** remains 'APPROVED'. |
| US-08 | As a Student, if I update my CGPA, I want my profile status to reset to 'PENDING' so that the mentor can verify the change. | Student edits CGPA -> saves -> **`profile_status`** becomes 'PENDING' -> apply button disappears. |

**Module: Job & Application**

| **ID** | **User Story** | **Acceptance Criteria (Brief)** |
| --- | --- | --- |
| US-09 | As a Company, I want to toggle "Require AI Mock Test" so that only serious/prepared students apply. | Company checks box -> saves job -> unapproved students see "Pass Mock Test to Apply" button. |
| US-10 | As a Student, I want to see why I am ineligible for a job so that I am not confused. | Student views job -> system highlights "CGPA too low" or "Wrong Branch" in red text. |
| US-11 | As a Student, I want to see how many people applied to a job (without names) so I know the competition. | Student views job -> sees "42 applicants" -> cannot see who they are. |
| US-12 | As a Company, I want to sort applicants by CGPA (Rule-based) so I can quickly find the best fit. | Company views applicants -> list is pre-sorted by CGPA desc -> company selects top 10 -> clicks "Bulk Shortlist". |

**Module: Offers & Placement**

| **ID** | **User Story** | **Acceptance Criteria (Brief)** |
| --- | --- | --- |
| US-13 | As a Student, I want to hold multiple offers so I can make the best career decision. | Student has 3 offers -> none are auto-withdrawn yet -> student views comparison dashboard. |
| US-14 | As a Student, when I accept an offer, I want the others to auto-withdraw so I don't have to reject them manually. | Student clicks "Accept" on Offer A -> Offer B & C become 'WITHDRAWN' -> Companies B & C get notified -> student is locked from future apps. |
| US-15 | As a Company, I want to revoke an offer in a rare case so I have legal/operational flexibility. | Company clicks "Revoke Offer" -> Offer state changes -> Student is notified -> if student had no other offers, they are unlocked to apply again. |