"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UserProfile } from "@/types/inventory"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Shield, UserCog } from "lucide-react"
import { Input } from "@/components/ui/input"

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const supabase = createClient()
  const { toast } = useToast()
  const { isSuperAdmin } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase.from("user_profiles").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }

  async function updateUserRole(userId: string, newRole: "admin" | "staff") {
    if (!isSuperAdmin) {
      toast({ title: "Forbidden", description: "Only super admin can change roles", variant: "destructive" })
      return
    }
    const { error } = await supabase.from("user_profiles").update({ role: newRole }).eq("user_id", userId)

    if (error) {
      console.error("[v0] Error updating user role:", error)
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Success",
      description: "User role updated successfully",
    })

    fetchUsers()
  }

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const email = (u.email || "").toLowerCase()
      const role = (u.role || "").toLowerCase()
      return email.includes(q) || role.includes(q)
    })
  }, [users, query])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user roles and permissions</CardDescription>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email or role..."
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Created At</TableHead>
                {/* <TableHead className="text-right">Actions</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      <Shield className="mr-1 h-3 w-3" />
                      {user.role.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {/* <Select
                      value={user.role}
                      onValueChange={(value: "admin" | "staff") => updateUserRole(user.user_id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select> */}
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No users match "{query}".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-lg">{user.email}</h3>
                  <p className="text-sm text-muted-foreground">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    <Shield className="mr-1 h-3 w-3" />
                    {user.role.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
          {filteredUsers.length === 0 && (
            <div className="text-center text-muted-foreground py-8">No users match "{query}".</div>
          )}
        </div>

        <div className="mt-6 rounded-lg border bg-muted/50 p-4">
          <h3 className="font-semibold mb-2">Role Permissions</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <Badge variant="default" className="w-fit">
                ADMIN
              </Badge>
              <p className="flex-1">Full access: Create, Read, Update, Archive items. Manage users and view all logs.</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <Badge variant="secondary" className="w-fit">
                STAFF
              </Badge>
              <p className="flex-1">Read-only access: View inventory items and activity logs only.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
