import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    const seedToken = process.env.SEED_TOKEN
    if (!seedToken) return NextResponse.json({ error: "SEED_TOKEN not set" }, { status: 500 })
    if (!token || token !== seedToken) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ error: "Missing email or password" }, { status: 400 })

    const service = createServiceClient()

    // Check if user exists
    const existing = await service.auth.admin.getUserByEmail(email)
    if (existing.data?.user) {
      // Optionally update password
      await service.auth.admin.updateUserById(existing.data.user.id, { password })
      // Ensure profile is superAdmin
      const { error: upsertErr } = await service.from("user_profiles").upsert(
        { user_id: existing.data.user.id, email, role: "superAdmin" },
        { onConflict: "user_id" }
      )
      if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })
      return NextResponse.json({ ok: true, updated: true })
    }

    // Create new auth user
    const created = await service.auth.admin.createUser({ email, password, email_confirm: true })
    if (created.error || !created.data?.user) {
      return NextResponse.json({ error: created.error?.message || "Failed to create user" }, { status: 500 })
    }

    // Insert profile
    const { error: upsertErr } = await service.from("user_profiles").upsert(
      { user_id: created.data.user.id, email, role: "superAdmin" },
      { onConflict: "user_id" }
    )
    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, created: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}


