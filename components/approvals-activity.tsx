"use client"

import React from "react"
import type { StockoutRequest } from "@/types/inventory"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type ApprovalsRange = "day" | "week" | "month" | "year"

export type ApprovalsActivityProps = {
  requests: (StockoutRequest & { item_name?: string; unit?: string })[]
  range?: ApprovalsRange
  onRangeChange?: (range: ApprovalsRange) => void
}

export const ApprovalsActivity: React.FC<ApprovalsActivityProps> = ({ requests, range, onRangeChange }) => {
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

  function statusBadge(status: StockoutRequest["status"]) {
    const variant = status === "approved" ? "default" : status === "pending" ? "secondary" : "destructive"
    return <Badge variant={variant as any}>{status.toUpperCase()}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Approvals Activity</CardTitle>
          {onRangeChange && (
            <Select value={range} onValueChange={(v) => onRangeChange(v as ApprovalsRange)}>
              <SelectTrigger size="sm" className="w-44">
                <SelectValue placeholder="Filter range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No approvals activity for the selected range.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                    <TableCell>{r.item_name || "—"}</TableCell>
                    <TableCell>
                      {r.quantity} {r.unit || ""}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="max-w-[320px] whitespace-pre-wrap">
                      {r.status === "pending" ? r.notes || "—" : r.decision_notes || r.notes || "—"}
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


