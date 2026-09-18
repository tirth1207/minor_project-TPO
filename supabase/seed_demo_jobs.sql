-- Demo job postings for the RCTI TPO student placement flow.
-- IMPORTANT:
-- 1. This script deletes ONLY job postings and their dependent records.
-- 2. It does NOT delete company_profiles, users, organizations, or departments.
-- 3. Existing company profiles must already exist with the names below.
-- 4. Jobs are marked APPROVED and mapped APPROVED to every ACTIVE organization
--    so they are immediately visible to eligible students.

BEGIN;

-- The current schema already defines this column. IF NOT EXISTS keeps this seed
-- safe if an older database is missing it.
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS skills text[];

-- Remove current job postings only.
-- Because dependent tables use ON DELETE CASCADE, this also removes branches,
-- college mappings, applications, application rounds, offers, and related
-- mock/interview records that depend on those job postings.
DELETE FROM public.job_postings;

DO $$
DECLARE
  v_company_id uuid;
  v_job_id uuid;
  v_org record;
BEGIN
  -- 1. TechNova Technologies
  SELECT id INTO v_company_id
  FROM public.company_profiles
  WHERE company_name = 'TechNova Technologies'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company profile not found: TechNova Technologies';
  END IF;

  INSERT INTO public.job_postings
    (company_id, title, description, skills, ctc_min, ctc_max, location,
     work_mode, min_cgpa, max_backlogs, date_of_visit, require_mock,
     mock_pass_score, global_status, rounds)
  VALUES
    (v_company_id,
     'Software Developer',
     'TechNova Technologies is hiring Software Developers to join its engineering team. The selected candidates will work on developing, testing, debugging, and maintaining software applications. Candidates will collaborate with development and product teams to build scalable and reliable solutions.

The role provides an opportunity to work with modern programming technologies and participate in real-world software development projects.',
     ARRAY['C++','Java','Python','SQL','Git'],
     6.0, 8.0, 'Ahmedabad, Gujarat', 'HYBRID', 7.0, 0,
     CURRENT_DATE + 14, true, 60, 'APPROVED',
     '[{"name":"Aptitude Test","status":"PENDING"},{"name":"Technical Interview","status":"PENDING"},{"name":"HR Interview","status":"PENDING"}]'::jsonb)
  RETURNING id INTO v_job_id;

  INSERT INTO public.job_eligible_branches (job_id, branch_name)
  VALUES (v_job_id, 'Computer Engineering');

  -- 2. DevMatrix Solutions
  SELECT id INTO v_company_id
  FROM public.company_profiles
  WHERE company_name = 'DevMatrix Solutions'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company profile not found: DevMatrix Solutions';
  END IF;

  INSERT INTO public.job_postings
    (company_id, title, description, skills, ctc_min, ctc_max, location,
     work_mode, min_cgpa, max_backlogs, date_of_visit, require_mock,
     mock_pass_score, global_status, rounds)
  VALUES
    (v_company_id,
     'Python Developer',
     'DevMatrix Solutions is looking for Python Developers to work on backend applications, automation tools, APIs, and data-driven software solutions. The selected candidates will participate in designing, developing, testing, and maintaining Python-based applications.

Candidates should have a strong understanding of programming fundamentals and be comfortable working with databases and backend technologies.',
     ARRAY['Python','Flask','SQL','Git','REST API'],
     5.5, 7.5, 'Ahmedabad, Gujarat', 'REMOTE', 7.5, 0,
     CURRENT_DATE + 18, true, 55, 'APPROVED',
     '[{"name":"Online Assessment","status":"PENDING"},{"name":"Technical Interview","status":"PENDING"},{"name":"HR Interview","status":"PENDING"}]'::jsonb)
  RETURNING id INTO v_job_id;

  INSERT INTO public.job_eligible_branches (job_id, branch_name)
  VALUES (v_job_id, 'Computer Engineering');

  -- 3. PixelStack Technologies
  SELECT id INTO v_company_id
  FROM public.company_profiles
  WHERE company_name = 'PixelStack Technologies'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company profile not found: PixelStack Technologies';
  END IF;

  INSERT INTO public.job_postings
    (company_id, title, description, skills, ctc_min, ctc_max, location,
     work_mode, min_cgpa, max_backlogs, date_of_visit, require_mock,
     mock_pass_score, global_status, rounds)
  VALUES
    (v_company_id,
     'Frontend Developer',
     'PixelStack Technologies is hiring Frontend Developers to build responsive and user-friendly web applications. The selected candidates will work closely with designers and backend developers to implement modern web interfaces and interactive features.

The role involves developing reusable components, optimizing web applications, fixing UI issues, and ensuring a consistent user experience across devices.',
     ARRAY['HTML','CSS','JavaScript','React','Git'],
     5.0, 7.0, 'Ahmedabad, Gujarat', 'HYBRID', 7.0, 0,
     CURRENT_DATE + 21, false, 50, 'APPROVED',
     '[{"name":"Technical Assessment","status":"PENDING"},{"name":"Technical Interview","status":"PENDING"},{"name":"HR Interview","status":"PENDING"}]'::jsonb)
  RETURNING id INTO v_job_id;

  INSERT INTO public.job_eligible_branches (job_id, branch_name)
  VALUES (v_job_id, 'Computer Engineering');

  -- 4. DataCore Analytics - deliberately ineligible for the demo student
  SELECT id INTO v_company_id
  FROM public.company_profiles
  WHERE company_name = 'DataCore Analytics'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company profile not found: DataCore Analytics';
  END IF;

  INSERT INTO public.job_postings
    (company_id, title, description, skills, ctc_min, ctc_max, location,
     work_mode, min_cgpa, max_backlogs, date_of_visit, require_mock,
     mock_pass_score, global_status, rounds)
  VALUES
    (v_company_id,
     'Data Analyst',
     'DataCore Analytics is looking for Data Analysts to support business decision-making through data analysis and visualization. The selected candidates will work with structured datasets, prepare reports, identify trends, and create meaningful insights for different business teams.

Candidates should have good analytical thinking and familiarity with data analysis tools, databases, and visualization platforms.',
     ARRAY['Python','SQL','Power BI','Excel'],
     6.0, 8.5, 'Gandhinagar, Gujarat', 'ONSITE', 8.5, 0,
     CURRENT_DATE + 25, true, 60, 'APPROVED',
     '[{"name":"Aptitude Test","status":"PENDING"},{"name":"Technical Interview","status":"PENDING"},{"name":"HR Interview","status":"PENDING"}]'::jsonb)
  RETURNING id INTO v_job_id;

  INSERT INTO public.job_eligible_branches (job_id, branch_name)
  VALUES (v_job_id, 'Computer Engineering');

  -- 5. CodeCraft Systems
  SELECT id INTO v_company_id
  FROM public.company_profiles
  WHERE company_name = 'CodeCraft Systems'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company profile not found: CodeCraft Systems';
  END IF;

  INSERT INTO public.job_postings
    (company_id, title, description, skills, ctc_min, ctc_max, location,
     work_mode, min_cgpa, max_backlogs, date_of_visit, require_mock,
     mock_pass_score, global_status, rounds)
  VALUES
    (v_company_id,
     'Java Developer',
     'CodeCraft Systems is recruiting Java Developers to work on enterprise software applications and backend services. The selected candidates will be involved in application development, API integration, database operations, testing, and maintenance.

Candidates should have a good understanding of object-oriented programming and Java development concepts.',
     ARRAY['Java','Spring Boot','SQL','Git','OOP'],
     5.5, 7.5, 'Vadodara, Gujarat', 'ONSITE', 7.0, 0,
     CURRENT_DATE + 28, true, 60, 'APPROVED',
     '[{"name":"Coding Assessment","status":"PENDING"},{"name":"Technical Interview","status":"PENDING"},{"name":"HR Interview","status":"PENDING"}]'::jsonb)
  RETURNING id INTO v_job_id;

  INSERT INTO public.job_eligible_branches (job_id, branch_name)
  VALUES (v_job_id, 'Computer Engineering');

  -- 6. CloudForge Technologies - deliberately skill-ineligible for the demo student
  SELECT id INTO v_company_id
  FROM public.company_profiles
  WHERE company_name = 'CloudForge Technologies'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company profile not found: CloudForge Technologies';
  END IF;

  INSERT INTO public.job_postings
    (company_id, title, description, skills, ctc_min, ctc_max, location,
     work_mode, min_cgpa, max_backlogs, date_of_visit, require_mock,
     mock_pass_score, global_status, rounds)
  VALUES
    (v_company_id,
     'Backend Developer',
     'CloudForge Technologies is hiring Backend Developers to develop APIs, server-side applications, and database-driven systems. The selected candidates will work on building reliable backend services and integrating them with frontend applications.

Candidates will have opportunities to work with modern backend technologies, databases, APIs, and cloud-based development practices.',
     ARRAY['Node.js','TypeScript','PostgreSQL','REST API','Git'],
     6.5, 9.0, 'Ahmedabad, Gujarat', 'HYBRID', 7.5, 0,
     CURRENT_DATE + 32, true, 65, 'APPROVED',
     '[{"name":"Coding Assessment","status":"PENDING"},{"name":"Technical Interview","status":"PENDING"},{"name":"HR Interview","status":"PENDING"}]'::jsonb)
  RETURNING id INTO v_job_id;

  INSERT INTO public.job_eligible_branches (job_id, branch_name)
  VALUES (v_job_id, 'Computer Engineering');

  -- Make every active organization able to see the seeded drives.
  -- Student eligibility still requires the student's own org mapping.
  FOR v_job_id IN
    SELECT id FROM public.job_postings
  LOOP
    FOR v_org IN
      SELECT id FROM public.organizations WHERE status = 'ACTIVE'
    LOOP
      INSERT INTO public.job_college_mappings (job_id, org_id, local_status)
      VALUES (v_job_id, v_org.id, 'APPROVED')
      ON CONFLICT (job_id, org_id)
      DO UPDATE SET local_status = 'APPROVED';
    END LOOP;
  END LOOP;
END $$;

COMMIT;

-- Verification:
-- SELECT jp.title, cp.company_name, jp.skills, jp.min_cgpa, jp.max_backlogs,
--        jp.global_status, jcm.local_status, jeb.branch_name
-- FROM public.job_postings jp
-- JOIN public.company_profiles cp ON cp.id = jp.company_id
-- LEFT JOIN public.job_college_mappings jcm ON jcm.job_id = jp.id
-- LEFT JOIN public.job_eligible_branches jeb ON jeb.job_id = jp.id
-- ORDER BY jp.title;
