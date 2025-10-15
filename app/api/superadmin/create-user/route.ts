import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { email, password, role } = await req.json()
    if (!email || !password || !["admin", "staff"].includes(role)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Verify caller is superAdmin
    const supabaseServer = await createClient()
    const {
      data: { user },
    } = await supabaseServer.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile, error: profileErr } = await supabaseServer
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()
    if (profileErr || !profile || profile.role !== "superAdmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Validate password strength: at least one uppercase, one digit, and one special character
    const passwordIsValid = /(?=.*[A-Z])(?=.*\d)(?=.*[~`!@#$%^&*()_+\-={}\[\]|\\:;"'<>,.?/]).+/.test(password)
    if (!passwordIsValid) {
      return NextResponse.json(
        {
          error: "Password must include at least one uppercase letter, one number, and one special character.",
        },
        { status: 400 }
      )
    }

    const service = createServiceClient()

    // Prevent duplicate email (check existing profiles by email)
    const { data: existing } = await service
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }
    // Create auth user
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createErr || !created.user) {
      // Map known duplicate email error to 409
      const message = createErr?.message || "Failed to create auth user"
      const isDuplicate = /already exists|already registered|duplicate/i.test(message)
      return NextResponse.json({ error: message }, { status: isDuplicate ? 409 : 500 })
    }

    // Insert profile with role
    const { error: upsertErr } = await service.from("user_profiles").upsert(
      { user_id: created.user.id, email, role },
      { onConflict: "user_id" }
    )
    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}


