"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { InventoryItem } from "@/types/inventory"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LowStockAlert() {
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [dismissed, setDismissed] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchLowStockItems()
  }, [])

  async function fetchLowStockItems() {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("is_archived", false)
      .lte("quantity", supabase.rpc("minimum_stock"))

    if (!error && data) {
      const critical = data.filter((item) => item.quantity <= item.minimum_stock)
      setLowStockItems(critical)
    }
  }

  if (dismissed || lowStockItems.length === 0) {
    return null
  }

  return (
    <Alert variant="destructive" className="relative">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Critical Stock Alert!</AlertTitle>
      <AlertDescription>
        {lowStockItems.length} item{lowStockItems.length > 1 ? "s are" : " is"} at or below minimum stock level:
        <ul className="mt-2 list-disc list-inside">
          {lowStockItems.slice(0, 5).map((item) => (
            <li key={item.id}>
              <strong>{item.item_name}</strong> - {item.quantity} {item.unit} remaining
            </li>
          ))}
          {lowStockItems.length > 5 && <li>...and {lowStockItems.length - 5} more</li>}
        </ul>
      </AlertDescription>
      <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => setDismissed(true)}>
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  )
}
