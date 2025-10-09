"use client"

import { useState } from "react"
import type { InventoryItem } from "@/types/inventory"
import { createClient } from "@/lib/supabase/client"
import { CATEGORIES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreVertical, Edit, Archive, ArchiveRestore, TrendingUp, TrendingDown, Search } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
} from "@/components/ui/alert-dialog"

interface InventoryTableProps {
  items: InventoryItem[]
  loading: boolean
  showArchived: boolean
  onToggleArchived: () => void
  onEdit: (item: InventoryItem) => void
  onStockAdjustment: (item: InventoryItem) => void
  onRefresh: () => void
  onLogRefresh: () => void
}

export function InventoryTable({
  items,
  loading,
  showArchived,
  onToggleArchived,
  onEdit,
  onStockAdjustment,
  onRefresh,
  onLogRefresh,
}: InventoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false)
  const [itemToArchive, setItemToArchive] = useState<InventoryItem | null>(null)

  const supabase = createClient()
  const { toast } = useToast()
  const { isAdmin } = useAuth()

  function handleArchive(item: InventoryItem) {
    setItemToArchive(item)
    setIsArchiveConfirmOpen(true)
  }

  async function confirmArchive() {
    if (!itemToArchive) return

    const newArchivedState = !itemToArchive.is_archived

    const { error } = await supabase.from("inventory").update({ is_archived: newArchivedState }).eq("id", itemToArchive.id)

    if (error) {
      console.error("[v0] Error archiving item:", error)
      toast({
        title: "Error",
        description: "Failed to archive item. Please try again.",
        variant: "destructive",
      })
      return
    }

    await supabase.from("inventory_logs").insert({
      inventory_id: itemToArchive.id,
      action_type: newArchivedState ? "archived" : "restored",
      item_name: itemToArchive.item_name,
      previous_quantity: itemToArchive.quantity,
      new_quantity: itemToArchive.quantity,
      notes: newArchivedState ? "Item archived" : "Item restored from archive",
    })

    toast({
      title: "Success",
      description: newArchivedState ? "Item archived successfully" : "Item restored successfully",
    })

    setIsArchiveConfirmOpen(false)
    setItemToArchive(null)
    onRefresh()
    onLogRefresh()
  }

  function getStockStatus(item: InventoryItem) {
    if (item.quantity === 0) {
      return { label: "Out of Stock", className: "bg-red-600 text-white hover:bg-red-700" }
    } else if (item.quantity <= item.minimum_stock) {
      return { label: "Low Stock", className: "bg-red-600 text-white hover:bg-red-700" }
    } else if (item.quantity <= item.minimum_stock * 1.5) {
      return { label: "Running Low", className: "bg-orange-500 text-white hover:bg-orange-600" }
    }
    return { label: "In Stock", className: "bg-green-600 text-white hover:bg-green-700" }
  }

  const uniqueLocations = Array.from(new Set(items.map((item) => item.location).filter(Boolean)))

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "out" && item.quantity === 0) ||
      (statusFilter === "low" && item.quantity > 0 && item.quantity <= item.minimum_stock) ||
      (statusFilter === "running-low" &&
        item.quantity > item.minimum_stock &&
        item.quantity <= item.minimum_stock * 1.5) ||
      (statusFilter === "in-stock" && item.quantity > item.minimum_stock * 1.5)

    const matchesLocation = locationFilter === "all" || item.location === locationFilter

    return matchesSearch && matchesCategory && matchesStatus && matchesLocation
  })

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
        <div className="flex items-center justify-between">
          <CardTitle>{showArchived ? "Archived Items" : "Active Inventory"}</CardTitle>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Switch id="show-archived" checked={showArchived} onCheckedChange={onToggleArchived} />
              <Label htmlFor="show-archived">Show Archived</Label>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="running-low">Running Low</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueLocations.map((location) => (
                <SelectItem key={location} value={location!}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {items.length === 0
              ? "No items found. Add your first item to get started."
              : "No items match your filters."}
          </p>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const status = getStockStatus(item)
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.location || "—"}</TableCell>
                        <TableCell>
                          <Badge className={status.className}>{status.label}</Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(item)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onStockAdjustment(item)}>
                                  {item.quantity > 0 ? (
                                    <TrendingDown className="mr-2 h-4 w-4" />
                                  ) : (
                                    <TrendingUp className="mr-2 h-4 w-4" />
                                  )}
                                  Adjust Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleArchive(item)}>
                                  {item.is_archived ? (
                                    <>
                                      <ArchiveRestore className="mr-2 h-4 w-4" />
                                      Restore
                                    </>
                                  ) : (
                                    <>
                                      <Archive className="mr-2 h-4 w-4" />
                                      Archive
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredItems.map((item) => {
                const status = getStockStatus(item)
                return (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-lg truncate">{item.item_name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{item.category}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="font-medium">{item.quantity} {item.unit}</span>
                          {item.location && <span className="text-muted-foreground">{item.location}</span>}
                        </div>
                        <div className="mt-2">
                          <Badge className={status.className}>{status.label}</Badge>
                        </div>
                      </div>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(item)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onStockAdjustment(item)}>
                              {item.quantity > 0 ? (
                                <TrendingDown className="mr-2 h-4 w-4" />
                              ) : (
                                <TrendingUp className="mr-2 h-4 w-4" />
                              )}
                              Adjust Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchive(item)}>
                              {item.is_archived ? (
                                <>
                                  <ArchiveRestore className="mr-2 h-4 w-4" />
                                  Restore
                                </>
                              ) : (
                                <>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </CardContent>

      {/* Archive confirmation dialog */}
      <AlertDialog open={isArchiveConfirmOpen} onOpenChange={setIsArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {itemToArchive?.is_archived ? "Restore item?" : "Archive item?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemToArchive?.is_archived
                ? `Are you sure you want to restore "${itemToArchive.item_name}"? This will make it visible in the active inventory.`
                : `Are you sure you want to archive "${itemToArchive?.item_name}"? This will hide it from the active inventory but preserve all data.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive}>
              {itemToArchive?.is_archived ? "Restore" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
