import { redirect } from "next/navigation"
import { requireApprovedStudent } from "@/lib/auth/require-approved-student"

export default async function StudentRootPage() {
  const student = await requireApprovedStudent()

  if (!student.ok) {
    redirect("/student/profile")
  }

  redirect("/student/dashboard")
}
