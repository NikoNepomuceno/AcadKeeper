"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UserProfile } from "@/types/inventory"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Shield, UserCog, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface UserManagementProps {
  onRefresh?: () => void
}

export function UserManagement({ onRefresh }: UserManagementProps = {}) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [targetUserForSuspend, setTargetUserForSuspend] = useState<{ id: string; email: string } | null>(null)
  const supabase = createClient()
  const { toast } = useToast()
  const { isSuperAdmin, isAdmin } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false })

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

  async function toggleUserStatus(userId: string, currentStatus: "Active" | "Suspended") {
    if (!isSuperAdmin && !isAdmin) {
      toast({ title: "Forbidden", description: "Only admin or super admin can change status", variant: "destructive" })
      return
    }
    const newStatus = currentStatus === "Active" ? "Suspended" : "Active"
    const res = await fetch("/api/superadmin/update-user-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status: newStatus }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast({ title: "Error", description: body?.error || "Failed to update status", variant: "destructive" })
      return
    }
    toast({ title: "Success", description: `User ${newStatus.toLowerCase()}` })
    fetchUsers()
    onRefresh?.()
  }

  function requestSuspend(userId: string, email: string) {
    setTargetUserForSuspend({ id: userId, email })
    setConfirmText("")
    setConfirmOpen(true)
  }


  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = !q
      ? users
      : users.filter((u) => {
      const email = (u.email || "").toLowerCase()
      const role = (u.role || "").toLowerCase()
      return email.includes(q) || role.includes(q)
      })
    // Sort: Active first, then Suspended; keep most recent created_at within groups
    return [...base].sort((a, b) => {
      if (a.status !== b.status) return a.status === "Active" ? -1 : 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
    <>
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
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell>
                    <Badge
                      className={user.status === "Active" ? "bg-green-600 text-white hover:bg-green-600" : "bg-red-600 text-white hover:bg-red-600"}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions">
                          <Menu className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.status === "Suspended" ? (
                          <DropdownMenuItem
                            className="text-green-700 hover:text-green-800 hover:bg-green-50 focus:bg-green-50"
                            onClick={() => toggleUserStatus(user.user_id, user.status)}
                          >
                            Activate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-red-700 hover:text-red-800 hover:bg-red-50 focus:bg-red-50"
                            onClick={() => requestSuspend(user.user_id, user.email)}
                          >
                            Suspend
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                  <Badge
                    className={user.status === "Active" ? "bg-green-600 text-white hover:bg-green-600" : "bg-red-600 text-white hover:bg-red-600"}
                  >
                    {user.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.status === "Suspended" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-700 border-green-300 hover:bg-green-50"
                      onClick={() => toggleUserStatus(user.user_id, user.status)}
                    >
                      Activate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-700 border-red-300 hover:bg-red-50"
                      onClick={() => requestSuspend(user.user_id, user.email)}
                    >
                      Suspend
                    </Button>
                  )}
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
              <p className="flex-1">Full access: Create, Read, Update, Archive items. Activate/suspend users, change user roles, and view all logs.</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <Badge variant="secondary" className="w-fit">
                STAFF
              </Badge>
              <p className="flex-1">Read-only access: View inventory items and activity logs only.</p>
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            Admin and Super Admin can toggle user status:
            <span className="ml-2">Active ➝ Suspended disables login</span>
          </p>
        </div>
      </CardContent>
    </Card>
    {/* Suspend Confirmation Modal */}
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to suspend this user?</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-sm text-muted-foreground">
            Type "confirm suspend {targetUserForSuspend?.email}" to enable the suspend action.
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={targetUserForSuspend ? `confirm suspend ${targetUserForSuspend.email}` : ""}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            disabled={
              !targetUserForSuspend || confirmText !== `confirm suspend ${targetUserForSuspend.email}`
            }
            onClick={async () => {
              if (!targetUserForSuspend) return
              await toggleUserStatus(targetUserForSuspend.id, "Active")
              setConfirmOpen(false)
            }}
          >
            Suspend
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
