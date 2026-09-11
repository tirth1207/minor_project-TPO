/**
 * Single source of truth for placement eligibility.
 *
 * Eligibility is a deterministic database rule. AI must never be used to
 * decide whether a student is eligible for a placement drive.
 */
export async function checkStudentEligibility(
  supabase: any,
  studentId: string,
  jobId: string,
): Promise<boolean> {
  if (!studentId || !jobId) {
    throw new Error("studentId and jobId are required for eligibility checks")
  }

  const { data, error } = await supabase.rpc("check_student_eligibility", {
    p_student_id: studentId,
    p_job_id: jobId,
  })

  if (error) {
    console.error("[Eligibility] Database eligibility check failed:", error)
    throw new Error("Unable to verify job eligibility")
  }

  return data === true
}
