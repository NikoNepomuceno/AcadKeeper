"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { InventoryItem } from "@/types/inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"

interface StockAdjustmentProps {
  item: InventoryItem
  onSuccess: () => void
  onCancel: () => void
}

export function StockAdjustment({ item, onSuccess, onCancel }: StockAdjustmentProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const { isAdmin } = useAuth()

  // Default staff to stock-out only; admins can choose
  const [adjustmentType, setAdjustmentType] = useState<"in" | "out">(isAdmin ? "in" : "out")
  const [quantity, setQuantity] = useState<number>(0)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (!isAdmin) {
        // Staff path: only allow Stock Out via request creation
        if (adjustmentType !== "out") {
          toast({
            title: "Not allowed",
            description: "Staff can only request Stock Out.",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
        // Validate quantity does not exceed available and item not out of stock
        if (item.quantity <= 0) {
          toast({ title: "Out of stock", description: "This item is currently out of stock.", variant: "destructive" })
          setLoading(false)
          return
        }
        if (quantity > item.quantity) {
          toast({ title: "Invalid quantity", description: "Requested quantity exceeds available stock.", variant: "destructive" })
          setLoading(false)
          return
        }
        // Create a stock-out request
        const { error: reqError } = await supabase.from("stockout_requests").insert({
          inventory_id: item.id,
          requested_by: (await supabase.auth.getUser()).data.user?.id,
          quantity,
          notes: notes || null,
        })
        if (reqError) throw reqError
        toast({ title: "Request submitted", description: "Waiting for admin approval." })
        onSuccess()
        return
      }

      // Admin path: immediate adjust (in or out)
      const quantityChange = adjustmentType === "in" ? quantity : -quantity
      const newQuantity = item.quantity + quantityChange
      if (newQuantity < 0) {
        toast({ title: "Error", description: "Cannot reduce stock below 0", variant: "destructive" })
        setLoading(false)
        return
      }
      const { error: updateError } = await supabase.from("inventory").update({ quantity: newQuantity }).eq("id", item.id)
      if (updateError) throw updateError
      const { error: logError } = await supabase.from("inventory_logs").insert({
        inventory_id: item.id,
        action_type: adjustmentType === "in" ? "stock_in" : "stock_out",
        item_name: item.item_name,
        previous_quantity: item.quantity,
        new_quantity: newQuantity,
        quantity_change: quantityChange,
        notes: notes || `Stock ${adjustmentType === "in" ? "added" : "removed"}`,
      })
      if (logError) throw logError
      toast({ title: "Success", description: `Stock ${adjustmentType === "in" ? "added" : "removed"} successfully` })
      onSuccess()
    } catch (error) {
      console.error("[v0] Error adjusting stock:", error)
      toast({
        title: "Error",
        description: "Failed to adjust stock. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const newQuantity = adjustmentType === "in" ? item.quantity + quantity : item.quantity - quantity
  const isOutOfStock = item.quantity <= 0
  const exceedsStock = quantity > item.quantity

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-2xl font-bold">{item.item_name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Quantity</p>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {item.quantity} {item.unit}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-3">
          <Label>Adjustment Type</Label>
          <RadioGroup value={adjustmentType} onValueChange={(value) => setAdjustmentType(value as "in" | "out")}> 
            {isAdmin && (
              <div className="flex items-center space-x-2 rounded-lg border p-4 cursor-pointer hover:bg-accent">
                <RadioGroupItem value="in" id="stock-in" />
                <Label htmlFor="stock-in" className="flex items-center gap-2 cursor-pointer flex-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium">Stock In</p>
                    <p className="text-sm text-muted-foreground">Add items to inventory</p>
                  </div>
                </Label>
              </div>
            )}
            <div className="flex items-center space-x-2 rounded-lg border p-4 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="out" id="stock-out" />
              <Label htmlFor="stock-out" className="flex items-center gap-2 cursor-pointer flex-1">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <div>
                  <p className="font-medium">Stock Out</p>
                  <p className="text-sm text-muted-foreground">Remove items from inventory</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity || ""}
            onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 0)}
            placeholder="Enter quantity"
            required
          />
        </div>

        {quantity > 0 && isAdmin && (
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">New Quantity:</p>
                <p className={`text-lg font-bold ${newQuantity < 0 ? "text-destructive" : ""}`}>
                  {item.quantity} {adjustmentType === "in" ? "+" : "-"} {quantity} = {newQuantity} {item.unit}
                </p>
              </div>
              {newQuantity < 0 && <p className="text-sm text-destructive mt-2">Cannot reduce stock below 0</p>}
              {newQuantity <= item.minimum_stock && newQuantity >= 0 && (
                <p className="text-sm text-secondary mt-2">Warning: Stock will be at or below minimum level</p>
              )}
            </CardContent>
          </Card>
        )}
        {!isAdmin && quantity > 0 && (
          <Card className="bg-muted">
            <CardContent className="pt-6">
              {isOutOfStock && <p className="text-sm text-destructive">Item is out of stock</p>}
              {exceedsStock && !isOutOfStock && (
                <p className="text-sm text-destructive">Requested quantity exceeds available stock ({item.quantity} {item.unit})</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for adjustment (optional)"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={
          loading ||
          quantity <= 0 ||
          (!isAdmin && (adjustmentType !== "out" || isOutOfStock || exceedsStock)) ||
          (isAdmin && newQuantity < 0)
        }>
          {loading
            ? "Processing..."
            : isAdmin
            ? "Confirm Adjustment"
            : "Submit Stock-Out Request"}
        </Button>
      </div>
    </form>
  )
}
