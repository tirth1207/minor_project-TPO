export const dynamic = "force-dynamic"

import { requireUser } from "@/lib/auth/require-user"
import { NextResponse } from "next/server"

const MAX_NAME_LENGTH = 100
const MAX_ENROLLMENT_LENGTH = 50
const MAX_ADDRESS_LENGTH = 300
const MAX_BIO_LENGTH = 500
const MAX_LIST_ITEMS = 20

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function isValidPhone(value: string) {
  return /^(?:\+91[-\s]?)?[6-9]\d{9}$/.test(value)
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return !Number.isNaN(date.getTime()) && date <= today
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) {
    return null
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function GET() {
  try {
    const auth = await requireUser()

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const { supabase, user, dbUser } = auth
    const role = dbUser?.role || user.app_metadata?.role

    if (role !== "STUDENT") {
      return NextResponse.json(
        { error: "Forbidden: Student access only" },
        { status: 403 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from("student_profiles")
      .select(`
        *,
        user:users!student_profiles_user_id_fkey(
          id,
          org_id,
          dept_id,
          department:departments!users_dept_id_fkey(
            id,
            name
          ),
          organization:organizations!users_org_id_fkey(
            id,
            name
          )
        ),
        mentor:users!student_profiles_mentor_id_fkey(
          id,
          mentor_profile:mentor_profiles!mentor_profiles_user_id_fkey(
            id,
            name,
            employee_id,
            designation,
            qualification,
            specialization,
            phone,
            profile_status
          )
        )
      `)
      .eq("user_id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("Student profile fetch error:", profileError)

      return NextResponse.json(
        {
          error: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        },
        { status: 400 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error: unknown) {
    console.error("GET /api/students/profile failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireUser()

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const { supabase, user, dbUser } = auth
    const role = dbUser?.role || user.app_metadata?.role

    if (role !== "STUDENT") {
      return NextResponse.json(
        { error: "Forbidden: Student access only" },
        { status: 403 }
      )
    }

    const body = await request.json()

    const {
      name,
      enrollment_no,
      dob,
      address,
      phone,
      bio,
      cgpa,
      active_backlogs,
      semester,
      branch,
      skills,
      hobbies,
      resume_url,
      marksheet_url,
      social_links,
    } = body

    const normalizedName = typeof name === "string" ? name.trim() : ""
    const normalizedEnrollment =
      typeof enrollment_no === "string" ? enrollment_no.trim() : ""
    const normalizedDob = typeof dob === "string" ? dob.trim() : ""
    const normalizedAddress =
      typeof address === "string" ? address.trim() : ""
    const normalizedPhone = typeof phone === "string" ? phone.trim() : ""
    const normalizedBio = typeof bio === "string" ? bio.trim() : ""
    const normalizedBranch = typeof branch === "string" ? branch.trim() : ""
    const normalizedResumeUrl =
      typeof resume_url === "string" ? resume_url.trim() : ""
    const normalizedMarksheetUrl =
      typeof marksheet_url === "string" ? marksheet_url.trim() : ""

    const parsedCgpa = Number(cgpa)
    const parsedBacklogs = Number(active_backlogs)
    const parsedSemester = Number(semester)
    const normalizedSkills = normalizeList(skills)
    const normalizedHobbies = normalizeList(hobbies)

    const errors: string[] = []

    if (!normalizedName) {
      errors.push("Full name is required.")
    } else if (!/^[A-Za-zÀ-ÿ.' -]+$/.test(normalizedName)) {
      errors.push("Full name contains invalid characters.")
    } else if (normalizedName.length > MAX_NAME_LENGTH) {
      errors.push(`Full name must be ${MAX_NAME_LENGTH} characters or fewer.`)
    }

    if (!normalizedEnrollment) {
      errors.push("Enrollment number is required.")
    } else if (
      normalizedEnrollment.length > MAX_ENROLLMENT_LENGTH ||
      !/^[A-Za-z0-9._/-]+$/.test(normalizedEnrollment)
    ) {
      errors.push("Enrollment number contains invalid characters or is too long.")
    }

    if (!isValidDate(normalizedDob)) {
      errors.push("Enter a valid date of birth that is not in the future.")
    }

    if (!normalizedAddress) {
      errors.push("Address is required.")
    } else if (
      normalizedAddress.length < 10 ||
      normalizedAddress.length > MAX_ADDRESS_LENGTH
    ) {
      errors.push(`Address must be between 10 and ${MAX_ADDRESS_LENGTH} characters.`)
    }

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      errors.push("Enter a valid Indian mobile number.")
    }

    if (!normalizedBio) {
      errors.push("Professional bio is required.")
    } else if (
      normalizedBio.length < 20 ||
      normalizedBio.length > MAX_BIO_LENGTH
    ) {
      errors.push(
        `Professional bio must be between 20 and ${MAX_BIO_LENGTH} characters.`
      )
    }

    if (!Number.isFinite(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
      errors.push("CGPA must be between 0 and 10.")
    }

    if (
      !Number.isInteger(parsedBacklogs) ||
      parsedBacklogs < 0 ||
      parsedBacklogs > 50
    ) {
      errors.push("Active backlogs must be a whole number between 0 and 50.")
    }

    if (
      !Number.isInteger(parsedSemester) ||
      parsedSemester < 1 ||
      parsedSemester > 10
    ) {
      errors.push("Semester must be between 1 and 10.")
    }

    if (!normalizedBranch || normalizedBranch.length > 100) {
      errors.push("Branch is required and must be 100 characters or fewer.")
    }

    if (!normalizedSkills || normalizedSkills.length === 0) {
      errors.push("At least one skill is required.")
    } else if (normalizedSkills.length > MAX_LIST_ITEMS) {
      errors.push(`You can add up to ${MAX_LIST_ITEMS} skills.`)
    } else if (normalizedSkills.some((skill) => skill.length > 50)) {
      errors.push("Each skill must be 50 characters or fewer.")
    }

    if (!normalizedHobbies || normalizedHobbies.length === 0) {
      errors.push("At least one hobby is required.")
    } else if (normalizedHobbies.length > MAX_LIST_ITEMS) {
      errors.push(`You can add up to ${MAX_LIST_ITEMS} hobbies.`)
    } else if (normalizedHobbies.some((hobby) => hobby.length > 50)) {
      errors.push("Each hobby must be 50 characters or fewer.")
    }

    if (!normalizedResumeUrl || !isValidUrl(normalizedResumeUrl)) {
      errors.push("A valid HTTP or HTTPS resume URL is required.")
    }

    if (normalizedMarksheetUrl && !isValidUrl(normalizedMarksheetUrl)) {
      errors.push("Marksheet URL must be a valid HTTP or HTTPS URL.")
    }

    if (
      social_links !== null &&
      (typeof social_links !== "object" || Array.isArray(social_links))
    ) {
      errors.push("Social links must be an object.")
    }

    const normalizedSocialLinks: Record<string, string> = {}

    if (
      social_links &&
      typeof social_links === "object" &&
      !Array.isArray(social_links)
    ) {
      for (const key of ["linkedin", "github", "portfolio"]) {
        const value =
          typeof social_links[key] === "string"
            ? social_links[key].trim()
            : ""

        if (value) {
          if (!isValidUrl(value)) {
            errors.push(`${key} must be a valid HTTP or HTTPS URL.`)
          } else {
            normalizedSocialLinks[key] = value
          }
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Please correct the profile validation errors.",
          code: "VALIDATION_ERROR",
          fields: errors,
        },
        { status: 400 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from("student_profiles")
      .update({
        name: normalizedName,
        enrollment_no: normalizedEnrollment,
        dob: normalizedDob,
        address: normalizedAddress,
        phone: normalizedPhone,
        bio: normalizedBio,
        cgpa: parsedCgpa,
        active_backlogs: parsedBacklogs,
        semester: parsedSemester,
        branch: normalizedBranch,
        skills: normalizedSkills,
        hobbies: normalizedHobbies,
        resume_url: normalizedResumeUrl,
        marksheet_url: normalizedMarksheetUrl || null,
        social_links: normalizedSocialLinks,
      })
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ profile: updated })
  } catch (error: unknown) {
    console.error("PUT /api/students/profile failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}
