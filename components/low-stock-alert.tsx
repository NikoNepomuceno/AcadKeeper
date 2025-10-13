"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { InventoryItem } from "@/types/inventory"
import { toast } from "@/hooks/use-toast"

export function LowStockAlert() {
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [hasShown, setHasShown] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchLowStockItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hasShown && lowStockItems.length > 0) {
      const visibleItems = lowStockItems.slice(0, 5)
      const remaining = lowStockItems.length - visibleItems.length

      toast({
        title: "Critical Stock Alert!",
        description: (
          <div>
            {lowStockItems.length} item{lowStockItems.length > 1 ? "s are" : " is"} at or below minimum stock level:
            <ul className="mt-2 list-disc list-inside">
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <strong>{item.item_name}</strong> - {item.quantity} {item.unit} remaining
                </li>
              ))}
              {remaining > 0 && <li>...and {remaining} more</li>}
            </ul>
          </div>
        ),
        variant: "destructive",
      })
      setHasShown(true)
    }
  }, [lowStockItems, hasShown])

  async function fetchLowStockItems() {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("is_archived", false)

    if (!error && data) {
      const critical = data.filter((item) => item.quantity <= item.minimum_stock)
      setLowStockItems(critical)
    }
  }

  return null
}
