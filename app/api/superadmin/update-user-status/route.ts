import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

// POST body: { userId: string, status: 'Active' | 'Suspended', notes?: string }
export async function POST(req: NextRequest) {
  try {
    const { userId, status, notes } = await req.json()
    if (!userId || !["Active", "Suspended"].includes(status)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Verify caller is superAdmin
    const supabaseServer = await createClient()
    const {
      data: { user: caller },
    } = await supabaseServer.auth.getUser()
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile, error: profileErr } = await supabaseServer
      .from("user_profiles")
      .select("role")
      .eq("user_id", caller.id)
      .single()
    if (profileErr || !profile || profile.role !== "superAdmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const service = createServiceClient()

    // Get current status for audit and to avoid unnecessary writes
    const { data: targetProfile, error: targetErr } = await service
      .from("user_profiles")
      .select("status, user_id")
      .eq("user_id", userId)
      .single()
    if (targetErr || !targetProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    if (targetProfile.status === status) {
      return NextResponse.json({ ok: true, unchanged: true })
    }

    // Update status
    const { error: updateErr } = await service
      .from("user_profiles")
      .update({ status })
      .eq("user_id", userId)
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Write audit row
    await service.from("user_status_audit").insert({
      target_user_id: userId,
      changed_by_user_id: caller.id,
      old_status: targetProfile.status,
      new_status: status,
      notes: notes ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}


