"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import type { InventoryItem, InventoryLog, StockoutRequest } from "@/types/inventory"
import { InventoryTable } from "@/components/inventory-table"
import { Approvals } from "@/components/stockout-approvals"
import { SidebarNav } from "@/components/sidebar-nav"
import { LowStockAlert } from "@/components/low-stock-alert"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { useLoading } from "@/components/loading-provider"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useSearchParams } from "next/navigation"

// Defer heavy client components until needed
const DashboardStats = dynamic(() => import("@/components/dashboard-stats").then((m) => m.DashboardStats), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] rounded-md border flex items-center justify-center text-muted-foreground">
      Loading dashboard...
    </div>
  ),
})

const InventoryForm = dynamic(() => import("@/components/inventory-form").then((m) => m.InventoryForm), { ssr: false })
const StockAdjustment = dynamic(() => import("@/components/stock-adjustment").then((m) => m.StockAdjustment), {
  ssr: false,
})
const ActivityLog = dynamic(() => import("@/components/activity-log").then((m) => m.ActivityLog), { ssr: false })
const ApprovalsActivity = dynamic(
  () => import("@/components/approvals-activity").then((m) => m.ApprovalsActivity),
  { ssr: false },
)
const UserManagement = dynamic(() => import("@/components/user-management").then((m) => m.UserManagement), {
  ssr: false,
})

export function InventoryDashboard() {
  type LogRange = "day" | "week" | "month" | "year"
  const [items, setItems] = useState<InventoryItem[]>([])
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [approvalEvents, setApprovalEvents] = useState<(StockoutRequest & { item_name?: string; unit?: string })[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isStockOpen, setIsStockOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState("dashboard")
  const { isAdmin } = useAuth()
  const [isFormMasked, setIsFormMasked] = useState(false)
  const [logRange, setLogRange] = useState<LogRange>("week")
  const { setIsLoading } = useLoading()
  const searchParams = useSearchParams()

  const supabase = createClient()

  // Handle URL-based navigation
  useEffect(() => {
    const view = searchParams.get('view')
    if (view && ['dashboard', 'inventory', 'logs', 'approvals', 'users'].includes(view)) {
      setActiveView(view)
    }
  }, [searchParams])

  useEffect(() => {
    fetchItems()
    fetchLogs()
    fetchApprovalsActivity()
  }, [showArchived, logRange])

  // Clear any global loading overlay once the dashboard shell mounts
  useEffect(() => {
    setIsLoading(false)
  }, [])

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("is_archived", showArchived)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching items:", error)
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }

  function getRangeStartIso(range: LogRange) {
    const now = new Date()
    const start = new Date(now)
    if (range === "day") {
      start.setHours(0, 0, 0, 0)
    } else if (range === "week") {
      // Start of week: Monday
      const day = (now.getDay() + 6) % 7 // Mon=0 ... Sun=6
      start.setDate(now.getDate() - day)
      start.setHours(0, 0, 0, 0)
    } else if (range === "month") {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
    } else if (range === "year") {
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
    }
    return start.toISOString()
  }

  async function fetchLogs() {
    const startIso = getRangeStartIso(logRange)
    const { data, error } = await supabase
      .from("inventory_logs")
      .select("*")
      .gte("created_at", startIso)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching logs:", error)
    } else {
      setLogs(data || [])
    }
  }

  async function fetchApprovalsActivity() {
    const startIso = getRangeStartIso(logRange)
    const { data, error } = await supabase
      .from("stockout_requests")
      .select("*, inventory:inventory(item_name, unit)")
      .gte("created_at", startIso)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching approvals activity:", error)
    } else {
      const mapped = (data || []).map((r: any) => ({ ...r, item_name: r.inventory?.item_name, unit: r.inventory?.unit }))
      setApprovalEvents(mapped)
    }
  }

  function handleEdit(item: InventoryItem) {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  function handleStockAdjustment(item: InventoryItem) {
    setStockItem(item)
    setIsStockOpen(true)
  }

  function handleCloseForm() {
    setIsFormOpen(false)
    setEditingItem(null)
  }

  function handleCloseStock() {
    setIsStockOpen(false)
    setStockItem(null)
  }

  async function handleFormSuccess() {
    await fetchItems()
    await fetchLogs()
    handleCloseForm()
  }

  async function handleStockSuccess() {
    await fetchItems()
    await fetchLogs()
    handleCloseStock()
  }

  function handleUserRefresh() {
    // This is a no-op for the inventory dashboard since UserManagement
    // handles its own data fetching internally
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav activeView={activeView} onViewChange={setActiveView} />

      <div className="flex-1 md:ml-64">
        <div className="container mx-auto p-4 md:p-6 space-y-6">
          <LowStockAlert />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-balance">AcadKeeper Inventory</h1>
              <p className="text-muted-foreground mt-2">Manage your school supplies with comprehensive tracking</p>
            </div>
            {activeView === "inventory" && isAdmin && (
              <Button onClick={() => setIsFormOpen(true)} size="lg" className="w-full sm:w-auto">
                <Plus className="mr-2 h-5 w-5" />
                Add Item
              </Button>
            )}
          </div>

          {activeView === "dashboard" && <DashboardStats />}

          {activeView === "inventory" && (
            <InventoryTable
              items={items}
              loading={loading}
              showArchived={showArchived}
              onToggleArchived={() => setShowArchived(!showArchived)}
              onEdit={handleEdit}
              onStockAdjustment={handleStockAdjustment}
              onRefresh={fetchItems}
              onLogRefresh={fetchLogs}
            />
          )}

          {activeView === "logs" && (
            <Tabs defaultValue="inventory" className="w-full">
              <TabsList>
                <TabsTrigger value="inventory">Inventory Activity</TabsTrigger>
                <TabsTrigger value="approvals">Approvals Activity</TabsTrigger>
              </TabsList>
              <TabsContent value="inventory">
                <ActivityLog {...({ logs, range: logRange, onRangeChange: setLogRange } as any)} />
              </TabsContent>
              <TabsContent value="approvals">
                <ApprovalsActivity
                  {...({ requests: approvalEvents, range: logRange, onRangeChange: setLogRange } as any)}
                />
              </TabsContent>
            </Tabs>
          )}

          {activeView === "approvals" && isAdmin && (
            <Approvals onApproved={async () => { await fetchItems(); await fetchLogs(); }} />
          )}

          {activeView === "users" && isAdmin && <UserManagement onRefresh={handleUserRefresh} />}

          {activeView === "analytics" && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Analytics view coming soon...</p>
            </div>
          )}

          {activeView === "superadmin" && isAdmin && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Open the Super Admin page from the sidebar link.</p>
            </div>
          )}

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isFormMasked ? "invisible pointer-events-none" : ""}`}>
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
              </DialogHeader>
              <InventoryForm
                item={editingItem}
                onSuccess={handleFormSuccess}
                onCancel={handleCloseForm}
                onConfirmDialogOpenChange={(open) => setIsFormMasked(open)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isStockOpen} onOpenChange={setIsStockOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust Stock</DialogTitle>
              </DialogHeader>
              {stockItem && (
                <StockAdjustment item={stockItem} onSuccess={handleStockSuccess} onCancel={handleCloseStock} />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
