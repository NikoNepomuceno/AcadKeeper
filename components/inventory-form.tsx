"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { InventoryItem } from "@/types/inventory"
import { CATEGORIES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
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

interface InventoryFormProps {
  item: InventoryItem | null
  onSuccess: () => void
  onCancel: () => void
  onConfirmDialogOpenChange?: (open: boolean) => void
}

export function InventoryForm({ item, onSuccess, onCancel, onConfirmDialogOpenChange }: InventoryFormProps) {
  const [formData, setFormData] = useState({
    item_name: "",
    category: "",
    quantity: 0,
    unit: "",
    minimum_stock: 0,
    location: "",
    notes: "",
  })
  const [initialData, setInitialData] = useState({
    item_name: "",
    category: "",
    quantity: 0,
    unit: "",
    minimum_stock: 0,
    location: "",
    notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false)
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false)
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
      setInitialData({
        item_name: item.item_name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        minimum_stock: item.minimum_stock,
        location: item.location || "",
        notes: item.notes || "",
      })
    } else {
      // For create mode, use the default empty state as initial snapshot
      setInitialData({
        item_name: "",
        category: "",
        quantity: 0,
        unit: "",
        minimum_stock: 0,
        location: "",
        notes: "",
      })
    }
  }, [item])

  useEffect(() => {
    onConfirmDialogOpenChange?.(isConfirmSaveOpen || isConfirmCancelOpen)
  }, [isConfirmSaveOpen, isConfirmCancelOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (item) {
      setIsConfirmSaveOpen(true)
      return
    }

    // Basic semantic validation: prevent obviously wrong name/category combos
    const itemNameTrimmed = formData.item_name.trim()
    if (
      itemNameTrimmed.toLowerCase() === "paper" &&
      formData.category !== "Paper Products"
    ) {
      toast({
        title: "Invalid category",
        description: "Item 'Paper' must be under 'Paper Products' category.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Duplicate prevention: do not create if an item with same name+category exists (case-insensitive)
      {
        const { data: existingItem, error: existingError } = await supabase
          .from("inventory")
          .select("id")
          .ilike("item_name", itemNameTrimmed)
          .eq("category", formData.category)
          .eq("is_archived", false)
          .maybeSingle()

        if (existingError && existingError.code !== "PGRST116") {
          // Unexpected error (ignore no rows error PGRST116 coming from maybeSingle)
          throw existingError
        }

        if (existingItem) {
          toast({
            title: "Duplicate item",
            description: "An item with the same name and category already exists.",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
      }

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

  async function confirmSave() {
    if (!item) return
    // Basic semantic validation: prevent obviously wrong name/category combos
    const itemNameTrimmed = formData.item_name.trim()
    if (
      itemNameTrimmed.toLowerCase() === "paper" &&
      formData.category !== "Paper Products"
    ) {
      toast({
        title: "Invalid category",
        description: "Item 'Paper' must be under 'Paper Products' category.",
        variant: "destructive",
      })
      setIsConfirmSaveOpen(false)
      return
    }
    setLoading(true)
    try {
      // Duplicate prevention on update: block if another item (different id) has same name+category
      {
        const { data: conflictItems, error: conflictError } = await supabase
          .from("inventory")
          .select("id")
          .ilike("item_name", itemNameTrimmed)
          .eq("category", formData.category)
          .eq("is_archived", false)

        if (conflictError) throw conflictError

        const hasConflict = (conflictItems || []).some((row) => row.id !== item.id)
        if (hasConflict) {
          toast({
            title: "Duplicate item",
            description: "Another item with the same name and category already exists.",
            variant: "destructive",
          })
          setLoading(false)
          setIsConfirmSaveOpen(false)
          return
        }
      }

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
      setIsConfirmSaveOpen(false)
    }
  }

  const isDirty = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialData), [formData, initialData])

  function onCancelClick() {
    if (isDirty) {
      setIsConfirmCancelOpen(true)
      return
    }
    onCancel()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <Button type="button" variant="outline" onClick={onCancelClick}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : item ? "Update Item" : "Add Item"}
        </Button>
      </div>

      {/* Confirm update dialog */}
      <AlertDialog open={isConfirmSaveOpen} onOpenChange={setIsConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update item?</AlertDialogTitle>
            <AlertDialogDescription>This will overwrite the current item details.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>Update</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm discard changes dialog */}
      <AlertDialog open={isConfirmCancelOpen} onOpenChange={setIsConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>Your unsaved edits will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
