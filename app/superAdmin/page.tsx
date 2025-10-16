"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { UserManagement } from "@/components/user-management"
import { SidebarNav } from "@/components/sidebar-nav"
import { useLoading } from "@/components/loading-provider"

export default function SuperAdminPage() {
  const { isSuperAdmin, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const { setIsLoading } = useLoading()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"admin" | "staff">("staff")
  const [submitting, setSubmitting] = useState(false)
  const [activeView, setActiveView] = useState("superadmin")
  const [refreshUsers, setRefreshUsers] = useState(0)

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.replace("/")
    }
  }, [isSuperAdmin, loading, router])

  // Ensure global loading overlay is cleared when this page mounts
  useEffect(() => {
    setIsLoading(false)
  }, [setIsLoading])

  function handleUserRefresh() {
    setRefreshUsers(prev => prev + 1)
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Email and password are required", variant: "destructive" })
      return
    }
    // Client-side quick password validation (mirrors API rules)
    const passwordIsValid = /(?=.*[A-Z])(?=.*\d)(?=.*[~`!@#$%^&*()_+\-={}\[\]|\\:;"'<>,.?/]).+/.test(password)
    if (!passwordIsValid) {
      toast({
        title: "Weak password",
        description: "Include at least one uppercase, one number, and one special character.",
        variant: "destructive",
      })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/superadmin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create user")
      toast({ title: "User created", description: `Account for ${email} created` })
      setEmail("")
      setPassword("")
      handleUserRefresh()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create user", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav activeView={activeView} onViewChange={setActiveView} />

      <div className="flex-1 md:ml-64">
        <div className="container mx-auto p-4 md:p-6 space-y-6">
          <h1 className="text-2xl sm:text-4xl font-bold">Super Admin</h1>
          <p className="text-muted-foreground">Create accounts and manage users and roles</p>

          <Card>
            <CardHeader>
              <CardTitle>Create User</CardTitle>
              <CardDescription>Create an Admin or Staff account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="grid gap-4 sm:grid-cols-3">
                <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input type="password" placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="flex gap-2">
                  <Select value={role} onValueChange={(v) => setRole(v as any)}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <UserManagement onRefresh={handleUserRefresh} />
        </div>
      </div>
    </div>
  )
}


