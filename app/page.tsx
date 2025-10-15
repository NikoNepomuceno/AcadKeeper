"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { InventoryDashboard } from "@/components/inventory-dashboard"

export default function Home() {
  const router = useRouter()
  const { isSuperAdmin, loading } = useAuth()

  useEffect(() => {
    if (!loading && isSuperAdmin) {
      router.replace("/superAdmin")
    }
  }, [isSuperAdmin, loading, router])

  return (
    <main className="min-h-screen bg-background">
      {!isSuperAdmin && <InventoryDashboard />}
    </main>
  )
}
