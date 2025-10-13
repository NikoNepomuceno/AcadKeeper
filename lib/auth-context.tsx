"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type { UserProfile, UserRole } from "@/types/inventory"

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  role: UserRole | null
  isSuperAdmin: boolean
  isAdmin: boolean
  isStaff: boolean
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  isSuperAdmin: false,
  isAdmin: false,
  isStaff: false,
  loading: true,
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(userId: string) {
    try {
      const { data, error } = await supabase.from("user_profiles").select("*").eq("user_id", userId).single()

      if (error) {
        console.error("[v0] Error fetching user profile:", error)
        // If profile doesn't exist, wait a bit and retry (trigger might be processing)
        if (error.code === "PGRST116") {
          console.log("[v0] Profile not found, retrying in 1 second...")
          setTimeout(() => fetchUserProfile(userId), 1000)
          return
        }
        throw error
      }

      console.log("[v0] User profile loaded successfully:", { role: data.role, email: data.email })
      setProfile(data)
    } catch (error) {
      console.error("[v0] Failed to fetch user profile:", error)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }

  const role = profile?.role ?? null
  const isSuperAdmin = role === "superAdmin"
  const isAdmin = role === "admin"
  const isStaff = role === "staff"

  return (
    <AuthContext.Provider value={{ user, profile, role, isSuperAdmin, isAdmin, isStaff, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
