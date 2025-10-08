"use client"

import type { InventoryLog } from "@/types/inventory"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Archive, TrendingUp, TrendingDown, ArchiveRestore } from "lucide-react"

interface ActivityLogProps {
  logs: InventoryLog[]
}

export function ActivityLog({ logs }: ActivityLogProps) {
  function getActionIcon(actionType: string) {
    switch (actionType) {
      case "created":
        return <Plus className="h-4 w-4" />
      case "updated":
        return <Edit className="h-4 w-4" />
      case "archived":
        return <Archive className="h-4 w-4" />
      case "restored":
        return <ArchiveRestore className="h-4 w-4" />
      case "stock_in":
        return <TrendingUp className="h-4 w-4" />
      case "stock_out":
        return <TrendingDown className="h-4 w-4" />
      default:
        return null
    }
  }

  function getActionBadge(actionType: string) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      created: "default",
      updated: "secondary",
      archived: "outline",
      restored: "outline",
      stock_in: "default",
      stock_out: "destructive",
    }

    return (
      <Badge variant={variants[actionType] || "default"} className="flex items-center gap-1 w-fit">
        {getActionIcon(actionType)}
        {actionType.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  function getLogDescription(log: InventoryLog) {
    switch (log.action_type) {
      case "created":
        return `Added ${log.item_name} with initial quantity of ${log.new_quantity}`
      case "updated":
        return `Updated ${log.item_name} details`
      case "archived":
        return `Archived ${log.item_name}`
      case "restored":
        return `Restored ${log.item_name} from archive`
      case "stock_in":
        return `Added ${log.quantity_change} ${log.item_name} to stock (${log.previous_quantity} → ${log.new_quantity})`
      case "stock_out":
        return `Removed ${Math.abs(log.quantity_change || 0)} ${log.item_name} from stock (${log.previous_quantity} → ${log.new_quantity})`
      default:
        return log.notes || "Activity recorded"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No activity recorded yet.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">{formatDate(log.created_at)}</TableCell>
                    <TableCell>{getActionBadge(log.action_type)}</TableCell>
                    <TableCell>{getLogDescription(log)}</TableCell>
                    <TableCell className="text-muted-foreground">{log.notes || "—"}</TableCell>
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
