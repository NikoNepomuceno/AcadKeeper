"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { InventoryItem, InventoryLog } from "@/types/inventory"
import { InventoryTable } from "@/components/inventory-table"
import { InventoryForm } from "@/components/inventory-form"
import { ActivityLog } from "@/components/activity-log"
import { StockAdjustment } from "@/components/stock-adjustment"
import { SidebarNav } from "@/components/sidebar-nav"
import { DashboardStats } from "@/components/dashboard-stats"
import { LowStockAlert } from "@/components/low-stock-alert"
import { UserManagement } from "@/components/user-management"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"

export function InventoryDashboard() {
  type LogRange = "day" | "week" | "month" | "year"
  const [items, setItems] = useState<InventoryItem[]>([])
  const [logs, setLogs] = useState<InventoryLog[]>([])
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

  const supabase = createClient()

  useEffect(() => {
    fetchItems()
    fetchLogs()
  }, [showArchived, logRange])

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

  return (
    <div className="flex min-h-screen">
      <SidebarNav activeView={activeView} onViewChange={setActiveView} />

      <div className="flex-1 md:ml-64">
        <div className="container mx-auto p-6 space-y-6">
          <LowStockAlert />

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-balance">AcadKeeper Inventory</h1>
              <p className="text-muted-foreground mt-2">Manage your school supplies with comprehensive tracking</p>
            </div>
            {activeView === "inventory" && isAdmin && (
              <Button onClick={() => setIsFormOpen(true)} size="lg">
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
            <ActivityLog {...({ logs, range: logRange, onRangeChange: setLogRange } as any)} />
          )}

          {activeView === "users" && isAdmin && <UserManagement />}

          {activeView === "analytics" && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Analytics view coming soon...</p>
            </div>
          )}

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className={`max-w-2xl ${isFormMasked ? "invisible pointer-events-none" : ""}`}>
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
