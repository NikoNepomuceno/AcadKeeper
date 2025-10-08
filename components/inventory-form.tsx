"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { InventoryItem } from "@/types/inventory"
import { CATEGORIES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface InventoryFormProps {
  item: InventoryItem | null
  onSuccess: () => void
  onCancel: () => void
}

export function InventoryForm({ item, onSuccess, onCancel }: InventoryFormProps) {
  const [formData, setFormData] = useState({
    item_name: "",
    category: "",
    quantity: 0,
    unit: "",
    minimum_stock: 0,
    location: "",
    notes: "",
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const supabase = createClient()

  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        minimum_stock: item.minimum_stock,
        location: item.location || "",
        notes: item.notes || "",
      })
    }
  }, [item])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (item) {
        const { error } = await supabase.from("inventory").update(formData).eq("id", item.id)

        if (error) throw error

        await supabase.from("inventory_logs").insert({
          inventory_id: item.id,
          action_type: "updated",
          item_name: formData.item_name,
          previous_quantity: item.quantity,
          new_quantity: formData.quantity,
          notes: "Item details updated",
        })

        toast({
          title: "Success",
          description: "Item updated successfully",
        })
      } else {
        const { data, error } = await supabase.from("inventory").insert([formData]).select().single()

        if (error) throw error

        await supabase.from("inventory_logs").insert({
          inventory_id: data.id,
          action_type: "created",
          item_name: formData.item_name,
          new_quantity: formData.quantity,
          notes: "New item added to inventory",
        })

        toast({
          title: "Success",
          description: "Item added successfully",
        })
      }

      onSuccess()
    } catch (error) {
      console.error("[v0] Error saving item:", error)
      toast({
        title: "Error",
        description: "Failed to save item. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="item_name">Item Name *</Label>
          <Input
            id="item_name"
            value={formData.item_name}
            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) || 0 })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Unit *</Label>
          <Input
            id="unit"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="e.g., pieces, boxes, packs"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="minimum_stock">Minimum Stock *</Label>
          <Input
            id="minimum_stock"
            type="number"
            min="0"
            value={formData.minimum_stock}
            onChange={(e) =>
              setFormData({
                ...formData,
                minimum_stock: Number.parseInt(e.target.value) || 0,
              })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Storage Room A"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional information about this item"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : item ? "Update Item" : "Add Item"}
        </Button>
      </div>
    </form>
  )
}
