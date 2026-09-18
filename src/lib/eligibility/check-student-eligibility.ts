/**
 * Single source of truth for student ↔ job eligibility.
 *
 * IMPORTANT:
 * - This is deterministic business logic. AI must never decide eligibility.
 * - A student must satisfy ALL hard requirements:
 *   1. Approved student profile
 *   2. Student is not already placed
 *   3. Job + college mapping are approved
 *   4. Branch matches
 *   5. CGPA meets minimum
 *   6. Active backlogs are within the maximum
 *   7. Every required job skill is present in the student's profile
 *
 * The current database model exposes these job requirements through:
 * job_postings.min_cgpa
 * job_postings.max_backlogs
 * job_postings.skills
 * job_eligible_branches
 * job_college_mappings
 *
 * Keep this file deterministic and explainable. Do not use an LLM here.
 */

type EligibilityStudent = {
  id: string
  cgpa: number | null
  active_backlogs: number | null
  branch: string | null
  skills: string[] | null
  profile_status: string | null
  is_placed: boolean | null
}

type EligibilityJob = {
  id: string
  min_cgpa: number | null
  max_backlogs: number | null
  skills: string[] | null
  global_status: string | null
}

type EligibilityBranch = {
  branch_name: string | null
}

type EligibilityMapping = {
  id: string
  org_id: string
  local_status: string
}

export type StudentEligibilityReasons = {
  profileApproved: boolean
  notPlaced: boolean
  collegeMapping: boolean
  jobApproved: boolean
  branch: boolean
  cgpa: boolean
  backlogs: boolean
  skills: boolean
}

export type StudentEligibilityDetails = {
  eligible: boolean
  reasons: StudentEligibilityReasons

  matchedSkills: string[]
  missingSkills: string[]

  student: {
    cgpa: number
    activeBacklogs: number
    branch: string
    skills: string[]
  }

  job: {
    minCgpa: number
    maxBacklogs: number
    requiredSkills: string[]
    eligibleBranches: string[]
  }

  failedRequirements: string[]
}

/**
 * Normalizes a skill so matching is case-insensitive and tolerant of:
 * - spaces
 * - hyphens
 * - underscores
 * - dots
 * - plus signs
 * - # symbols
 *
 * Examples:
 *   "React.js"       -> "reactjs"
 *   "React JS"       -> "reactjs"
 *   "Node.js"        -> "nodejs"
 *   "C++"            -> "c"
 *   "C#"             -> "c"
 *
 * The aliases below preserve common programming-language spellings that
 * would otherwise lose meaning during punctuation normalization.
 */
function normalizeSkill(value: unknown): string {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()

  if (!raw) return ""

  const aliases: Record<string, string> = {
    "c++": "cpp",
    "c plus plus": "cpp",
    "c#": "csharp",
    "c sharp": "csharp",
    ".net": "dotnet",
    "asp.net": "aspnet",
    "node.js": "nodejs",
    "node js": "nodejs",
    "react.js": "reactjs",
    "react js": "reactjs",
    "next.js": "nextjs",
    "next js": "nextjs",
    "vue.js": "vuejs",
    "vue js": "vuejs",
    "express.js": "expressjs",
    "express js": "expressjs",
    "tailwind css": "tailwind",
    "postgresql": "postgres",
    "postgre sql": "postgres",
    "mongo db": "mongodb",
    "machine learning": "machinelearning",
    "deep learning": "deeplearning",
    "artificial intelligence": "ai",
    "amazon web services": "aws",
    "google cloud platform": "gcp",
    "microsoft azure": "azure",
  }

  if (aliases[raw]) return aliases[raw]

  return raw
    .replace(/\s+/g, "")
    .replace(/[._\-/#]+/g, "")
}

/**
 * Returns a normalized, unique skill list.
 */
function normalizeSkills(values: unknown): string[] {
  if (!Array.isArray(values)) return []

  return Array.from(
    new Set(
      values
        .map(normalizeSkill)
        .filter(Boolean)
    )
  )
}

/**
 * Human-readable version of a normalized skill.
 */
function displaySkill(value: string): string {
  return value
    .replace(/^cpp$/, "C++")
    .replace(/^csharp$/, "C#")
    .replace(/^dotnet$/, ".NET")
    .replace(/^aspnet$/, "ASP.NET")
    .replace(/^nodejs$/, "Node.js")
    .replace(/^reactjs$/, "React.js")
    .replace(/^nextjs$/, "Next.js")
    .replace(/^vuejs$/, "Vue.js")
    .replace(/^expressjs$/, "Express.js")
    .replace(/^tailwind$/, "Tailwind CSS")
    .replace(/^postgres$/, "PostgreSQL")
    .replace(/^mongodb$/, "MongoDB")
    .replace(/^machinelearning$/, "Machine Learning")
    .replace(/^deeplearning$/, "Deep Learning")
    .replace(/^ai$/, "AI")
    .replace(/^aws$/, "AWS")
    .replace(/^gcp$/, "GCP")
    .replace(/^azure$/, "Azure")
}

/**
 * Check eligibility and return the complete explanation.
 *
 * This intentionally performs the checks from the current database instead
 * of trusting eligibility flags sent by the browser.
 */
export async function getStudentEligibility(
  supabase: any,
  studentId: string,
  jobId: string,
  orgId?: string | null,
): Promise<StudentEligibilityDetails> {
  if (!studentId || !jobId) {
    throw new Error("studentId and jobId are required for eligibility checks")
  }

  const [
    { data: student, error: studentError },
    { data: job, error: jobError },
    { data: branches, error: branchesError },
  ] = await Promise.all([
    supabase
      .from("student_profiles")
      .select(
        "id, cgpa, active_backlogs, branch, skills, profile_status, is_placed"
      )
      .eq("id", studentId)
      .maybeSingle(),

    supabase
      .from("job_postings")
      .select(
        "id, min_cgpa, max_backlogs, skills, global_status"
      )
      .eq("id", jobId)
      .maybeSingle(),

    supabase
      .from("job_eligible_branches")
      .select("branch_name")
      .eq("job_id", jobId),
  ])

  if (studentError) {
    console.error("[Eligibility] Failed to load student:", studentError)
    throw new Error("Unable to load student eligibility data")
  }

  if (jobError) {
    console.error("[Eligibility] Failed to load job:", jobError)
    throw new Error("Unable to load job eligibility data")
  }

  if (branchesError) {
    console.error("[Eligibility] Failed to load eligible branches:", branchesError)
    throw new Error("Unable to load job branch requirements")
  }

  if (!student) {
    throw new Error("Student profile not found")
  }

  if (!job) {
    throw new Error("Job posting not found")
  }

  /**
   * If an organization is supplied, require the actual approved mapping.
   * This prevents a student from being considered eligible for a job that
   * exists globally but is not approved for their college.
   */
  let mappingApproved = true

  if (orgId) {
    const { data: mapping, error: mappingError } = await supabase
      .from("job_college_mappings")
      .select("id, org_id, local_status")
      .eq("job_id", jobId)
      .eq("org_id", orgId)
      .eq("local_status", "APPROVED")
      .maybeSingle()

    if (mappingError) {
      console.error("[Eligibility] Failed to load college mapping:", mappingError)
      throw new Error("Unable to verify college job approval")
    }

    mappingApproved = Boolean(mapping)
  }

  const studentSkills = normalizeSkills(student.skills)
  const requiredSkills = normalizeSkills(job.skills)

  const studentSkillSet = new Set(studentSkills)

  const matchedSkills = requiredSkills.filter((skill) =>
    studentSkillSet.has(skill)
  )

  const missingSkills = requiredSkills.filter(
    (skill) => !studentSkillSet.has(skill)
  )

  const eligibleBranches = (Array.isArray(branches) ? branches : [])
    .map((branch: EligibilityBranch) => String(branch.branch_name ?? "").trim())
    .filter(Boolean)

  const studentBranch = String(student.branch ?? "").trim()

  /**
   * An empty eligible-branch list means the company did not restrict the
   * drive by branch. This preserves the existing application's behavior.
   */
  const branchMatches =
    eligibleBranches.length === 0 ||
    eligibleBranches.some(
      (branch) =>
        branch.toLowerCase() === studentBranch.toLowerCase()
    )

  const studentCgpa = Number(student.cgpa ?? 0)
  const minimumCgpa = Number(job.min_cgpa ?? 0)

  const activeBacklogs = Number(student.active_backlogs ?? 0)
  const maximumBacklogs = Number(job.max_backlogs ?? 0)

  const reasons: StudentEligibilityReasons = {
    profileApproved: student.profile_status === "APPROVED",
    notPlaced: student.is_placed !== true,
    collegeMapping: mappingApproved,
    jobApproved: job.global_status === "APPROVED",
    branch: branchMatches,
    cgpa: studentCgpa >= minimumCgpa,
    backlogs: activeBacklogs <= maximumBacklogs,
    skills: missingSkills.length === 0,
  }

  const failedRequirements: string[] = []

  if (!reasons.profileApproved) {
    failedRequirements.push("Student profile is not approved by the mentor")
  }

  if (!reasons.notPlaced) {
    failedRequirements.push("Student is already marked as placed")
  }

  if (!reasons.collegeMapping) {
    failedRequirements.push("Job is not approved for this college")
  }

  if (!reasons.jobApproved) {
    failedRequirements.push("Job posting is not approved")
  }

  if (!reasons.branch) {
    failedRequirements.push(
      `Branch "${studentBranch || "Not specified"}" is not eligible`
    )
  }

  if (!reasons.cgpa) {
    failedRequirements.push(
      `CGPA ${studentCgpa.toFixed(2)} is below required ${minimumCgpa.toFixed(2)}`
    )
  }

  if (!reasons.backlogs) {
    failedRequirements.push(
      `Active backlogs ${activeBacklogs} exceed allowed ${maximumBacklogs}`
    )
  }

  if (!reasons.skills) {
    failedRequirements.push(
      `Missing required skills: ${missingSkills
        .map(displaySkill)
        .join(", ")}`
    )
  }

  const eligible = Object.values(reasons).every(Boolean)

  return {
    eligible,
    reasons,
    matchedSkills: matchedSkills.map(displaySkill),
    missingSkills: missingSkills.map(displaySkill),
    student: {
      cgpa: studentCgpa,
      activeBacklogs,
      branch: studentBranch,
      skills: studentSkills.map(displaySkill),
    },
    job: {
      minCgpa: minimumCgpa,
      maxBacklogs: maximumBacklogs,
      requiredSkills: requiredSkills.map(displaySkill),
      eligibleBranches,
    },
    failedRequirements,
  }
}

/**
 * Backwards-compatible boolean API.
 *
 * Existing application, mock-assessment and server-side callers can continue
 * to use:
 *
 *   await checkStudentEligibility(supabase, studentId, jobId)
 *
 * while the jobs API can use getStudentEligibility() when it needs the
 * detailed reasons and matched/missing skills.
 */
export async function checkStudentEligibility(
  supabase: any,
  studentId: string,
  jobId: string,
  orgId?: string | null,
): Promise<boolean> {
  const result = await getStudentEligibility(
    supabase,
    studentId,
    jobId,
    orgId,
  )

  return result.eligible
}

/**
 * Optional helper for UI/API layers that need a concise explanation.
 */
export function formatEligibilityFailure(
  result: StudentEligibilityDetails,
): string {
  if (result.eligible) {
    return "Eligible"
  }

  return result.failedRequirements.join("; ")
}
