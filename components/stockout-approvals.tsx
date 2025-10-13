"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { StockoutRequest, InventoryItem } from "@/types/inventory"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface ApprovalsProps {
  onApproved?: () => void
}

export function Approvals({ onApproved }: ApprovalsProps) {
  const [requests, setRequests] = useState<(StockoutRequest & { item?: InventoryItem })[]>([])
  const [loading, setLoading] = useState(true)
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({})
  const supabase = createClient()
  const { toast } = useToast()

  async function fetchRequests() {
    setLoading(true)
    const { data, error } = await supabase
      .from("stockout_requests")
      .select("*, inventory:inventory(*)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
    if (error) {
      console.error("[v0] Error fetching requests", error)
      setLoading(false)
      return
    }
    const mapped = (data || []).map((r: any) => ({ ...r, item: r.inventory }))
    setRequests(mapped)
    setLoading(false)
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  async function approveRequest(req: StockoutRequest & { item?: InventoryItem }) {
    try {
      if (!req.item) return
      const note = decisionNotes[req.id] || null
      const newQuantity = req.item.quantity - req.quantity
      if (newQuantity < 0) {
        toast({ title: "Cannot approve", description: "Resulting quantity would be negative.", variant: "destructive" })
        return
      }
      // Update inventory
      const { error: invErr } = await supabase.from("inventory").update({ quantity: newQuantity }).eq("id", req.inventory_id)
      if (invErr) throw invErr
      // Log
      const { error: logErr } = await supabase.from("inventory_logs").insert({
        inventory_id: req.inventory_id,
        action_type: "stock_out",
        item_name: req.item.item_name,
        previous_quantity: req.item.quantity,
        new_quantity: newQuantity,
        quantity_change: -req.quantity,
        notes: note || "Approved stock-out request",
      })
      if (logErr) throw logErr
      // Mark request approved
      const user = (await supabase.auth.getUser()).data.user
      const { error: updErr } = await supabase
        .from("stockout_requests")
        .update({ status: "approved", approved_by: user?.id ?? null, decision_notes: note })
        .eq("id", req.id)
      if (updErr) throw updErr
      toast({ title: "Approved", description: "Stock-out applied." })
      await fetchRequests()
      onApproved?.()
    } catch (error) {
      console.error("[v0] Approve error", error)
      toast({ title: "Error", description: "Failed to approve request.", variant: "destructive" })
    }
  }

  async function denyRequest(req: StockoutRequest) {
    try {
      const note = decisionNotes[req.id] || null
      const user = (await supabase.auth.getUser()).data.user
      const { error } = await supabase
        .from("stockout_requests")
        .update({ status: "denied", approved_by: user?.id ?? null, decision_notes: note })
        .eq("id", req.id)
      if (error) throw error
      toast({ title: "Denied", description: "Request denied." })
      await fetchRequests()
    } catch (error) {
      console.error("[v0] Deny error", error)
      toast({ title: "Error", description: "Failed to deny request.", variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock-out Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-muted-foreground">No pending requests.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Requested Qty</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Decision Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{req.item?.item_name}</TableCell>
                    <TableCell>{req.quantity} {req.item?.unit}</TableCell>
                    <TableCell className="max-w-[240px] whitespace-pre-wrap">{req.notes || "—"}</TableCell>
                    <TableCell className="min-w-[240px]">
                      <Textarea
                        value={decisionNotes[req.id] || ""}
                        onChange={(e) => setDecisionNotes((p) => ({ ...p, [req.id]: e.target.value }))}
                        placeholder="Optional notes"
                        rows={2}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" onClick={() => denyRequest(req)}>Deny</Button>
                      <Button onClick={() => approveRequest(req)}>Approve</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


