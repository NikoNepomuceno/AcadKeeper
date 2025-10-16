"use client"

import { useState, useEffect } from "react"
import { LayoutDashboard, Package, History, BarChart3, Menu, X, LogOut, Users, Shield, Crown, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface SidebarNavProps {
  activeView: string
  onViewChange: (view: string) => void
}

export function SidebarNav({ activeView, onViewChange }: SidebarNavProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const router = useRouter()
  const { toast } = useToast()
  const { profile, isAdmin, isSuperAdmin } = useAuth()
  const supabase = createClient()

  const navItems = isSuperAdmin
    ? [
        // Super Admin sees only the Super Admin section
        { id: "superadmin", label: "Super Admin", icon: Crown },
      ]
    : [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "inventory", label: "Inventory", icon: Package },
        { id: "logs", label: "Activity Log", icon: History },
        ...(isAdmin
          ? [
              { id: "approvals", label: "Approvals", icon: Shield },
              { id: "users", label: "User Management", icon: Users },
            ]
          : []),
        { id: "settings", label: "Settings", icon: Settings },
      ]

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      toast({
        title: "Success",
        description: "Logged out successfully",
      })

      router.push("/auth/login")
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  useEffect(() => {
    async function fetchPending() {
      const { count, error } = await supabase
        .from("stockout_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
      if (!error) setPendingApprovals(count || 0)
    }
    fetchPending()
    const interval = setInterval(fetchPending, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-background border shadow-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-full flex-col gap-2 p-4">
          <div className="mb-4 mt-12 md:mt-4">
            <h2 className="text-xl font-bold">AcadKeeper</h2>
            <p className="text-sm text-muted-foreground">School Supplies</p>
          </div>

          {profile && (
            <div className="mb-4 rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile.email}</p>
                  <Badge variant={isAdmin ? "default" : "secondary"} className="mt-1 text-xs">
                    {profile.role.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={activeView === item.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    if (item.id === "superadmin") {
                      router.push("/superAdmin")
                      setIsOpen(false)
                      return
                    }
                    if (item.id === "settings") {
                      router.push("/settings")
                      setIsOpen(false)
                      return
                    }
                    // For other views, navigate to main dashboard with the specific view
                    if (item.id === "dashboard" || item.id === "inventory" || item.id === "logs" || item.id === "approvals" || item.id === "users") {
                      router.push(`/?view=${item.id}`)
                      setIsOpen(false)
                      return
                    }
                    onViewChange(item.id)
                    setIsOpen(false)
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                  {item.id === "approvals" && pendingApprovals > 0 && (
                    <span className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-medium leading-4 text-white">
                      {pendingApprovals}
                    </span>
                  )}
                </Button>
              )
            })}
          </nav>

          <div className="border-t pt-4">
            <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 text-destructive hover:text-destructive"
                  disabled={isLoggingOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Logout?</AlertDialogTitle>
                  <AlertDialogDescription>You will be signed out.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white">Logout</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setIsOpen(false)} />}
    </>
  )
}
