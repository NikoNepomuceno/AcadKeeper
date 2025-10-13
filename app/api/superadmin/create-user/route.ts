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

    const service = createServiceClient()
    // Create auth user
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createErr || !created.user) {
      return NextResponse.json({ error: createErr?.message || "Failed to create auth user" }, { status: 500 })
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


