"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { SettingsPage } from "@/components/settings"
import { SidebarNav } from "@/components/sidebar-nav"

export default function Settings() {
  const router = useRouter()
  const { loading, user } = useAuth()
  const [activeView, setActiveView] = useState("settings")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav activeView={activeView} onViewChange={setActiveView} />
      
      <div className="flex-1 md:ml-64">
        <div className="container mx-auto p-4 md:p-6">
          <SettingsPage />
        </div>
      </div>
    </div>
  )
}
